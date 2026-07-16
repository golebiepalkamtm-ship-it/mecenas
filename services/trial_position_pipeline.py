"""Skrócony MOA dla etapu pozycji w Salii rozprawy (bez pełnego orchestratora)."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

from config import settings
from moa.prompt_builder import get_role_prompt, merge_role_catalog
from services.llm_gateway import call_with_fallback, call_with_fallback_stream
from services.model_resolution import resolve_model_id
from services.trial_context import chat_context_block, scaled_tokens

logger = logging.getLogger(__name__)

TRIAL_POSITION_EXPERT_PREAMBLE = (
    "[SALA ROZPRAWY — EKSPERT POZYCJI]\n"
    "Przygotuj fragment pozycji procesowej swojej roli. Konkret, bez streszczenia ogólników.\n"
    "Oznacz niepewności jako [wymaga weryfikacji]. Maks. zwięźle.\n\n"
)

TRIAL_POSITION_SYNTHESIS_SYSTEM = """[SALA ROZPRAWY — SYNTEZA POZYCJI STRONY]
Złóż z analiz ekspertów jednolitą pozycję procesową strony (obrona lub oskarżenie).
Nie jesteś sędzią rozprawy końcowej — to materiał wejściowy do symulacji.

FORMAT (markdown):
## Tezy główne
## Podstawa prawna i faktyczna
## Argumentacja
## Ryzyka procesowe
## Wnioski
"""


def _position_user_message(side: str, question: str, chat_context: str = "") -> str:
    label = "OSKARŻENIE" if side == "prosecution" else "OBRONA"
    ctx = chat_context_block(chat_context)
    return (
        f"[ETAP POZYCJI: {label}]\n\n"
        f"Sprawa (skrót):\n{question.strip()}\n"
        f"{ctx}\n\n"
        f"Zadanie: na podstawie POWYŻSZEGO materiału z czatu zbuduj kompletną pozycję "
        f"strony {label}. Nie wymyślaj faktów spoza materiału."
    )


def _build_expert_prompt(
    side: str,
    role_id: str,
    question: str,
    architect: str,
    role_catalog: Dict[str, str],
    chat_context: str = "",
) -> str:
    role_block = role_catalog.get(role_id) or get_role_prompt(role_id, side)  # type: ignore[arg-type]
    return (
        f"{architect.strip()}\n\n"
        f"{TRIAL_POSITION_EXPERT_PREAMBLE}"
        f"{role_block}\n\n"
        f"{_position_user_message(side, question, chat_context)}"
    )


async def _run_one_expert(
    model_id: str,
    role_name: str,
    prompt: str,
    max_tokens: int,
    semaphore: asyncio.Semaphore,
) -> Dict[str, Any]:
    async with semaphore:
        start = time.time()
        try:
            resolved = resolve_model_id(model_id)
            text, used = await call_with_fallback(
                resolved,
                [{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.25,
                timeout=75.0,
                log_context=f"TRIAL position {role_name}",
            )
            body = (text or "").strip() or "(Brak treści od modelu.)"
            return {
                "model": used,
                "role": role_name,
                "response": body,
                "success": bool((text or "").strip()),
                "latency_ms": int((time.time() - start) * 1000),
            }
        except Exception as exc:
            logger.error("[TRIAL] Ekspert %s: %s", role_name, exc)
            return {
                "model": model_id,
                "role": role_name,
                "response": f"Błąd: {exc}",
                "success": False,
                "latency_ms": 0,
            }


def _format_expert_block(analyses: List[Dict[str, Any]]) -> str:
    parts: List[str] = []
    for a in analyses:
        parts.append(
            f"### {a.get('role', 'Ekspert')} ({a.get('model', '?')})\n{a.get('response', '')}"
        )
    return "\n\n".join(parts)


async def stream_trial_position(
    *,
    side: str,
    question: str,
    selected_models: Optional[List[str]],
    aggregator_model: Optional[str],
    architect_prompt: Optional[str],
    expert_roles: Optional[Dict[str, str]],
    role_catalog: Optional[Dict[str, str]],
    chat_context: str = "",
    elaboration_mode: str = "standard",
) -> AsyncIterator[Dict[str, Any]]:
    """Lite MOA: równolegli eksperci (max N) → stream syntezy pozycji."""
    from moa.prompt_builder import DEFENSE_UNIVERSE, PROSECUTION_UNIVERSE

    universe = PROSECUTION_UNIVERSE if side == "prosecution" else DEFENSE_UNIVERSE
    arch = (architect_prompt or "").strip() or universe["identity"]
    catalog = merge_role_catalog(role_catalog, side=side)  # type: ignore[arg-type]

    raw_models = [m.strip() for m in (selected_models or []) if m and m.strip()]
    max_experts = settings.trial_position_max_experts
    models = raw_models[:max_experts]

    if not models:
        from moa.dynamic_models import get_default_primary_model
        
        models = [resolve_model_id(get_default_primary_model())]

    role_map = expert_roles or {}
    judge = resolve_model_id(
        aggregator_model or models[0] or get_default_primary_model(),
    )
    expert_tokens = scaled_tokens(
        settings.trial_position_expert_max_tokens, elaboration_mode
    )
    synth_tokens = scaled_tokens(
        settings.trial_position_synthesis_max_tokens, elaboration_mode
    )
    parallel = settings.trial_position_parallel

    yield {
        "type": "metadata",
        "message": f"[TRIAL] Pozycja {side}: {len(models)} ekspert(ów), synteza…",
    }

    analyses: List[Dict[str, Any]] = []

    if len(models) == 1:
        role_id = role_map.get(models[0], "inquisitor")
        prompt = _build_expert_prompt(side, role_id, question, arch, catalog, chat_context)
        yield {
            "type": "metadata",
            "message": f"[TRIAL] Ekspert: {role_id}",
        }
        one = await _run_one_expert(
            models[0],
            role_id,
            prompt,
            expert_tokens,
            asyncio.Semaphore(1),
        )
        analyses = [one]
    else:
        semaphore = asyncio.Semaphore(parallel)
        tasks: List[Tuple[str, str, str]] = []
        for idx, model_id in enumerate(models):
            role_id = role_map.get(model_id) or list(catalog.keys())[idx % len(catalog)]
            prompt = _build_expert_prompt(side, role_id, question, arch, catalog, chat_context)
            tasks.append((model_id, role_id, prompt))

        yield {
            "type": "metadata",
            "message": f"[TRIAL] Analiza {len(tasks)} ekspertów (równolegle)…",
        }

        results = await asyncio.gather(
            *[
                _run_one_expert(mid, rid, pr, expert_tokens, semaphore)
                for mid, rid, pr in tasks
            ],
        )
        analyses = list(results)

    yield {
        "type": "metadata",
        "message": "[TRIAL] Składanie pozycji strony (sędzia syntezy)…",
        "expert_analyses": analyses,
    }

    expert_block = _format_expert_block(analyses)
    synth_user = (
        f"{_position_user_message(side, question, chat_context)}\n\n"
        f"--- ANALIZY EKSPERTÓW ---\n{expert_block[:24000]}"
    )
    judge_side_prompt = universe["judge"]
    system_content = (
        f"{arch}\n\n{judge_side_prompt}\n\n{TRIAL_POSITION_SYNTHESIS_SYSTEM}"
    )

    stream = None
    used_model = judge
    try:
        stream, used_model = await call_with_fallback_stream(
            judge,
            [
                {"role": "system", "content": system_content},
                {"role": "user", "content": synth_user},
            ],
            max_tokens=synth_tokens,
            temperature=0.22,
            timeout=90.0,
        )
    except Exception:
        logger.warning(
            "[TRIAL] Strumień syntezy pozycji nieudany — fallback bez streamu",
            exc_info=True,
        )
        stream = None

    if stream is None:
        text, used_model = await call_with_fallback(
            judge,
            [
                {"role": "system", "content": system_content},
                {"role": "user", "content": synth_user},
            ],
            max_tokens=synth_tokens,
            temperature=0.22,
            timeout=90.0,
            log_context="TRIAL position synthesis",
        )
        if text:
            yield {"type": "chunk", "text": text}
        return

    try:
        while True:
            chunk = await stream.__anext__()
            content = chunk.choices[0].delta.content or ""
            if content:
                yield {"type": "chunk", "text": content}
    except StopAsyncIteration:
        pass

    logger.info("[TRIAL] Pozycja %s zakończona (sędzia: %s)", side, used_model)
