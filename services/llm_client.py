"""Klient LLM z retry (tenacity) i łańcuchem modeli zapasowych."""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any, Callable, Optional, Tuple, Dict

from tenacity import (
    AsyncRetrying,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

from config import settings
from services.pii_mask import mask_pii

logger = logging.getLogger(__name__)

# Globalny rejestr zadań oczekujących na decyzję użytkownika (Interactive Model Recovery)
PENDING_RESOLUTIONS: Dict[str, asyncio.Future] = {}


def effective_max_tokens(model_id: str, max_tokens: int) -> int:
    """Zapewnia dostateczny budżet tokenów dla modeli z rozumowaniem/CoT i ucinaniem tekstu."""
    mid = (model_id or "").lower()
    if "gpt-4o" in mid and max_tokens < 16:
        return 16
    # Tylko modele czysto 'reasoning', które nie potrafią skończyć myślenia w 1-2k tokenów,
    # podbijamy do 4096, aby zapobiec ucięciu w połowie. Zbyt duże max_tokens (np. 8192)
    # może powodować zwracanie pustych odpowiedzi przez API (brak obsługi tak długich generacji).
    if any(k in mid for k in ["r1", "o1", "o3", "qwen3", "sonnet-5", "claude-3-7", "claude-3.7"]) and max_tokens < 4096:
        return max(max_tokens, 4096)
    return max_tokens


def format_call_error(exc: BaseException) -> str:
    if isinstance(exc, (asyncio.TimeoutError, TimeoutError)):
        return "przekroczono limit czasu odpowiedzi (timeout)"
    msg = str(exc).strip()
    return msg if msg else repr(exc)


def is_transient_error(exc: BaseException) -> bool:
    """Weryfikuje, czy błąd jest przejściowy (np. błąd sieci, 429, 5xx) i warto ponowić próbę."""
    try:
        import openai
        if isinstance(exc, openai.APIStatusError):
            # 400 (Bad request), 401 (Auth error), 402 (Insufficient credits), 403 (Permission), 404 (Not found)
            # Te błędy są permanentne dla danej konfiguracji/modelu/konta i nie powinny być ponawiane.
            if exc.status_code in [400, 401, 402, 403, 404]:
                return False
    except ImportError:
        pass

    # Przekroczenie czasu (asyncio.TimeoutError) i błędy sieciowe (ConnectionError, itp.) są przejściowe.
    if isinstance(exc, (asyncio.TimeoutError, TimeoutError, ConnectionError)):
        return True

    # Inne wyjątki domyślnie ponawiamy
    return True


def _extract_affordable_tokens(exc: BaseException) -> Optional[int]:
    """Parsuje błąd OpenRouter 402: 'You requested up to X tokens, but can only afford Y'."""
    msg = str(exc)
    m = re.search(r"can\s+only\s+afford\s+(\d+)", msg, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None


class LLMClientService:
    def __init__(
        self,
        client: Any,
        *,
        fallback_models: Optional[list[str]] = None,
        resolve_model_id: Optional[Callable[[Optional[str]], str]] = None,
        status_callback: Optional[Any] = None,
    ):
        self._client = client
        self._explicit_fallbacks = fallback_models
        self._explicit_resolve = resolve_model_id
        self._status_callback = status_callback

    @property
    def fallbacks(self) -> list[str]:
        if self._explicit_fallbacks is not None:
            return self._explicit_fallbacks
        from config import settings

        return list(settings.fallback_models)

    def _resolve(self, model_id: Optional[str]) -> str:
        if self._explicit_resolve:
            return self._explicit_resolve(model_id)
        from config import settings

        return settings.resolve_model_id(model_id)

    async def call(
        self,
        model_id: str,
        messages: list,
        *,
        max_tokens: int = 1000,
        temperature: float = 0.2,
        timeout: Optional[float] = None,
        log_context: str = "",
        response_format: Optional[Any] = None,
    ) -> Tuple[str, str]:
        """Pojedynczy model z exponential backoff (tenacity)."""
        model_id = self._resolve(model_id)
        max_tokens = effective_max_tokens(model_id, max_tokens)
        call_timeout = timeout or settings.llm_timeout_primary
        attempts = max(1, settings.llm_retry_attempts)

        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(attempts),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            retry=retry_if_exception(is_transient_error),
            reraise=True,
        ):
            with attempt:
                try:
                    kwargs: dict[str, Any] = {
                        "model": model_id,
                        "messages": messages,
                        "max_tokens": max_tokens,
                        "temperature": temperature,
                    }
                    if response_format:
                        # Jeśli model to o1/o3/deepseek-v4-flash i nowsze, stosujemy structured outputs przez parse (albo response_format)
                        import pydantic

                        if isinstance(response_format, type) and issubclass(
                            response_format, pydantic.BaseModel
                        ):
                            # openai-python sdk 1.40+ używa `response_format=PydanticModel` w beta.chat.completions.parse lub bezpośrednio.
                            # Standardowa paczka OpenAI pozwala to przekazać do response_format, jesli włączymy `strict: true`.
                            try:
                                completion = await asyncio.wait_for(
                                    self._client.beta.chat.completions.parse(
                                        **kwargs, response_format=response_format
                                    ),
                                    timeout=max(call_timeout, 20.0),
                                )
                                if hasattr(completion, "choices") and completion.choices:
                                    content = completion.choices[0].message.content or ""
                                elif isinstance(completion, dict) and completion.get("choices"):
                                    content = completion["choices"][0].get("message", {}).get("content", "") or ""
                                else:
                                    raise ValueError(f"Oczekiwano choices, ale otrzymano: {completion}")
                                result = content.strip()
                                if not result:
                                    raise ValueError("Model zwrócił pustą odpowiedź (parse format).")
                                _log_model_response(model_id, result, log_context)
                                return result, model_id
                            except Exception as parse_err:
                                logger.warning(
                                    "[llm] beta.parse nie powiódł się dla %s (%s). Przełączam na zwykły text...",
                                    model_id,
                                    parse_err,
                                )
                                kwargs.pop("response_format", None)
                                kwargs["max_tokens"] = max(kwargs.get("max_tokens", 4000), 8192)
                                kwargs["messages"] = list(kwargs["messages"])
                                kwargs["messages"].append(
                                    {
                                        "role": "system",
                                        "content": f"Zwróć wynik jako poprawny JSON zgodny ze strukturą (TYLKO JSON, bez znaczników markdown): {response_format.model_json_schema()}",
                                    }
                                )

                    completion = await asyncio.wait_for(
                        self._client.chat.completions.create(**kwargs),
                        timeout=max(call_timeout, 20.0),
                    )
                    if hasattr(completion, "choices") and completion.choices:
                        content = completion.choices[0].message.content or ""
                    elif isinstance(completion, dict) and completion.get("choices"):
                        content = completion["choices"][0].get("message", {}).get("content", "") or ""
                    else:
                        raise ValueError(f"Oczekiwano choices, ale otrzymano: {completion}")
                    result = content.strip()
                    if not result:
                        logger.error(f"[llm] OpenRouter Empty Response Raw: {completion}")
                        raise ValueError("Model zwrócił pustą odpowiedź.")
                    _log_model_response(model_id, result, log_context)
                    return result, model_id
                except Exception as exc:
                    affordable = _extract_affordable_tokens(exc)
                    if affordable and affordable > 16 and max_tokens > affordable:
                        new_max = max(16, affordable - 20)
                        logger.warning(
                            "OpenRouter 402: Model %s wymaga zredukowania max_tokens z %d do %d (dopuszczalne: %d). Ponawiam...",
                            model_id, max_tokens, new_max, affordable
                        )
                        max_tokens = new_max
                        continue
                    logger.warning(
                        "Model %s failed (attempt): %s",
                        model_id,
                        format_call_error(exc),
                    )
                    raise

        raise RuntimeError(f"Model {model_id} failed after {attempts} attempts")

    async def call_with_fallback(
        self,
        model_id: str,
        messages: list,
        *,
        max_tokens: int = 1000,
        temperature: float = 0.2,
        timeout: float = 60.0,
        status_callback=None,
        log_context: str = "",
        response_format: Optional[Any] = None,
    ) -> Tuple[str, str]:
        """Wykonuje wywołanie do API, automatycznie przechodząc po łańcuchu fallbacków."""
        chain = [model_id] + [m for m in self.fallbacks if m and m != model_id]
        last_err = None
        active_status_callback = status_callback or self._status_callback

        for idx, candidate in enumerate(chain):
            current_model = self._resolve(candidate)
            try:
                if idx > 0 and active_status_callback:
                    notify_msg = f"[Fallback] Przełączam na model zapasowy: {current_model}"
                    try:
                        if asyncio.iscoroutinefunction(active_status_callback):
                            await active_status_callback({"type": "metadata", "message": notify_msg})
                        else:
                            active_status_callback({"type": "metadata", "message": notify_msg})
                    except Exception:
                        pass
                        
                return await self.call(
                    current_model,
                    messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    timeout=max(timeout, 20.0),
                    log_context=log_context or "ODPOWIEDŹ",
                    response_format=response_format,
                )
            except Exception as err:
                last_err = err
                err_detail = format_call_error(err)
                logger.warning("[llm] Model %s failed: %s. Próbuję kolejny model...", current_model, err_detail)
                if active_status_callback:
                    warn_msg = f"[Uwaga: Model {current_model} niedostępny ({err_detail}). Próba modelu zapasowego...]"
                    try:
                        if asyncio.iscoroutinefunction(active_status_callback):
                            await active_status_callback({"type": "metadata", "message": warn_msg})
                        else:
                            active_status_callback({"type": "metadata", "message": warn_msg})
                    except Exception:
                        pass
                continue

        # Jeśli cały łańcuch zawiódł
        raise RuntimeError(f"Wszystkie modele w łańcuchu {chain} zawiodły. Ostatni błąd: {last_err}")

    async def call_with_fallback_stream(
        self,
        model_id: str,
        messages: list,
        *,
        max_tokens: int = 2000,
        temperature: float = 0.3,
        timeout: float = 30.0,
        status_callback=None,
    ):
        """Strumień przechodzący po łańcuchu fallbacków."""
        chain = [model_id] + [m for m in self.fallbacks if m and m != model_id]
        last_err = None
        active_status_callback = status_callback or self._status_callback

        for idx, candidate in enumerate(chain):
            current_model = self._resolve(candidate)
            primary_timeout = max(timeout, settings.llm_stream_timeout_primary)
            effective_tokens = effective_max_tokens(current_model, max_tokens)
            try:
                if idx > 0 and active_status_callback:
                    notify_msg = f"[Fallback Strumień] Przełączam na model zapasowy: {current_model}"
                    try:
                        if asyncio.iscoroutinefunction(active_status_callback):
                            await active_status_callback({"type": "metadata", "message": notify_msg})
                        else:
                            active_status_callback({"type": "metadata", "message": notify_msg})
                    except Exception:
                        pass

                raw_stream = await asyncio.wait_for(
                    self._client.chat.completions.create(
                        model=current_model,
                        messages=messages,
                        max_tokens=effective_tokens,
                        temperature=temperature,
                        stream=True,
                    ),
                    timeout=primary_timeout,
                )

                try:
                    first_chunk = await asyncio.wait_for(
                        raw_stream.__anext__(), timeout=15.0
                    )
                except StopAsyncIteration:
                    raise RuntimeError("Strumień zwrócił 0 elementów (pusta odpowiedź).")

                async def wrapped_stream():
                    yield first_chunk
                    async for chunk in raw_stream:
                        yield chunk

                logger.info("[llm] stream_started model=%s", current_model)
                return wrapped_stream(), current_model
            except Exception as exc:
                last_err = exc
                err_detail = format_call_error(exc)
                logger.warning(
                    "[llm] stream_failed model=%s error=%s. Próbuję kolejny model...",
                    current_model,
                    err_detail,
                )
                if active_status_callback:
                    warn_msg = f"[Uwaga: Strumień modelu {current_model} zawiódł ({err_detail}). Przełączam na zapasowy...]"
                    try:
                        if asyncio.iscoroutinefunction(active_status_callback):
                            await active_status_callback({"type": "metadata", "message": warn_msg})
                        else:
                            active_status_callback({"type": "metadata", "message": warn_msg})
                    except Exception:
                        pass
                continue

        raise RuntimeError(f"Wszystkie modele w strumieniu {chain} zawiodły. Ostatni błąd: {last_err}")


def _log_model_response(
    model_id: str, text: str, context: str = "", max_preview: int = 600
) -> None:
    label = f"[MODEL {context}]" if context else "[MODEL]"
    body = (text or "").strip()
    if not body:
        logger.info("%s %s: (pusta odpowiedź)", label, model_id)
        return
    safe_body = mask_pii(body)
    snippet = safe_body[:max_preview]
    logger.info(
        "%s %s — %d znaków (log z mask. PII):\n%s%s",
        label,
        model_id,
        len(body),
        "\n".join(f"   | {line}" for line in snippet.splitlines()),
        f"\n   | ... (+{len(safe_body) - max_preview} znaków)"
        if len(safe_body) > max_preview
        else "",
    )
