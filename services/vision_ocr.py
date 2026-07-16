"""Vision OCR — dosłowna transkrypcja obrazu (bez skrótów), z kontynuacją przy limicie tokenów."""
from __future__ import annotations

import base64
import logging
from typing import Any, List, Optional, Tuple

from config import settings
from prompts.loader import load_prompt

logger = logging.getLogger(__name__)

_OCR_PROMPT: Optional[str] = None
_OCR_CONTINUE_PROMPT: Optional[str] = None


def _ocr_system_prompt() -> str:
    global _OCR_PROMPT
    if _OCR_PROMPT is None:
        try:
            _OCR_PROMPT = load_prompt("ocr_verbatim")
        except FileNotFoundError:
            _OCR_PROMPT = (
                "Przepisz DOSŁOWNIE cały tekst z obrazu — każdą literę i cyfrę. "
                "Bez streszczeń i komentarzy."
            )
    return _OCR_PROMPT


def _ocr_continue_prompt() -> str:
    global _OCR_CONTINUE_PROMPT
    if _OCR_CONTINUE_PROMPT is None:
        try:
            _OCR_CONTINUE_PROMPT = load_prompt("ocr_verbatim_continue")
        except FileNotFoundError:
            _OCR_CONTINUE_PROMPT = (
                "Kontynuuj dosłowną transkrypcję od miejsca przerwania. "
                "Nie powtarzaj wcześniejszego tekstu."
            )
    return _OCR_CONTINUE_PROMPT


def _image_message_content(b64_jpeg: str, extra_user_text: str = "") -> List[dict]:
    parts: List[dict] = []
    if extra_user_text.strip():
        parts.append({"type": "text", "text": extra_user_text.strip()})
    parts.append(
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64_jpeg}"},
        }
    )
    return parts


def _finish_reason(completion: Any) -> str:
    try:
        choice = completion.choices[0]
        return str(getattr(choice, "finish_reason", "") or "")
    except (AttributeError, IndexError, TypeError):
        return ""


async def run_verbatim_vision_ocr(
    client: Any,
    image_bytes: bytes,
    *,
    preprocess: bool = True,
) -> Tuple[str, Optional[str]]:
    """
    Zwraca (tekst, id_modelu) lub ("", None) gdy wszystkie modele zawiodły.
  Przy finish_reason=length dokleja kolejne partie (kontynuacja).
    """
    if not image_bytes:
        return "", None

    raw = image_bytes
    if preprocess:
        try:
            from utils.image_preprocessor import preprocess_image_for_ocr

            raw = preprocess_image_for_ocr(image_bytes)
        except Exception as exc:
            logger.warning("[vision_ocr] preprocess failed: %s — używam oryginału", exc)

    b64 = base64.b64encode(raw).decode("utf-8")
    from database import get_setting
    assigned_ocr = get_setting("assigned_model_ocr", "")
    if assigned_ocr:
        vision_models = [assigned_ocr]
    else:
        vision_models = list(settings.vision_ocr_models)
    max_tokens = settings.vision_ocr_max_tokens
    max_rounds = max(1, settings.vision_ocr_max_continuations + 1)
    temperature = settings.vision_ocr_temperature

    last_err: Optional[BaseException] = None
    for model_name in vision_models:
        try:
            messages: List[dict] = [
                {
                    "role": "user",
                    "content": _image_message_content(b64, _ocr_system_prompt()),
                }
            ]
            full_parts: List[str] = []
            truncated = False

            for round_idx in range(max_rounds):
                openai_client = client
                if hasattr(openai_client, "_client") and not hasattr(openai_client, "chat"):
                    openai_client = openai_client._client
                completion = await openai_client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                piece = (completion.choices[0].message.content or "").strip()
                if piece:
                    full_parts.append(piece)

                reason = _finish_reason(completion)
                if reason == "length" and round_idx < max_rounds - 1:
                    truncated = True
                    messages.append({"role": "assistant", "content": piece})
                    messages.append(
                        {
                            "role": "user",
                            "content": _ocr_continue_prompt(),
                        }
                    )
                    logger.info(
                        "[vision_ocr] continuation round=%s model=%s chars_so_far=%s",
                        round_idx + 2,
                        model_name,
                        sum(len(p) for p in full_parts),
                    )
                    continue
                break

            text = "\n".join(full_parts).strip()
            if len(text) > 40000:
                logger.warning(
                    "[vision_ocr] OCR text too large (%s chars), truncating to 40k to avoid context explosion",
                    len(text)
                )
                text = text[:40000] + "\n... [PRZYCIĘTO ZE WZGLĘDU NA LIMIT ZNAKÓW OCR]"
                
            if not text:
                continue

            if truncated:
                logger.warning(
                    "[vision_ocr] possible incomplete OCR after %s rounds model=%s chars=%s",
                    max_rounds,
                    model_name,
                    len(text),
                )

            logger.info(
                "[vision_ocr] ok model=%s chars=%s rounds=%s truncated=%s",
                model_name,
                len(text),
                len(full_parts),
                truncated,
            )
            return text, model_name
        except Exception as exc:
            last_err = exc
            logger.error("[vision_ocr] model=%s err=%s", model_name, exc)

    if last_err:
        raise last_err
    return "", None
