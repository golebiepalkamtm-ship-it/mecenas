"""Wielorundowy sparing: obrona → atak → korekta (z budżetem LLM)."""
from __future__ import annotations

import logging
from typing import Any, Callable, List

from config import settings
from services.investigation.types import CaseInvestigationState

logger = logging.getLogger(__name__)


async def run_iterative_adversarial(
    *,
    defense_text: str,
    call_llm: Callable[..., Any],
    model_id: str,
    state: CaseInvestigationState,
    context_header: str,
) -> str:
    addendum_parts: List[str] = []
    text = defense_text
    max_r = max(1, settings.adversarial_max_rounds)
    for r in range(max_r):
        if state.budget_llm_calls >= settings.investigation_max_llm_calls:
            break
        state.budget_llm_calls += 1
        attack_prompt = (
            f"{context_header}\n\n"
            "Jesteś adwokatem przeciwnika. Znajdź najsilniejsze KONTRARGUMENTY i luki w poniższej argumentacji. "
            "Nie wymyślaj nowych przepisów bez oznaczenia [do weryfikacji].\n\n"
            f"--- ARGUMENTACJA ---\n{text[:12000]}"
        )
        attack, _ = await call_llm(
            model_id,
            [{"role": "user", "content": attack_prompt}],
            max_tokens=1200,
            temperature=0.25,
            timeout=55.0,
        )
        if not (attack or "").strip():
            break
        state.budget_llm_calls += 1
        refine_prompt = (
            f"{context_header}\n\n"
            "Odpowiedz na kontrargumenty jako adwokat klienta: wzmocnij linię obrony lub przyznaj ryzyko. "
            "Każda nowa norma musi być w dokumencie lub RAG z kontekstu.\n\n"
            f"--- KONTRARGUMENTY (runda {r+1}) ---\n{attack[:8000]}\n\n"
            f"--- TWOJA WCZEŚNIEJSZA LINIA ---\n{text[:6000]}"
        )
        refined, _ = await call_llm(
            model_id,
            [{"role": "user", "content": refine_prompt}],
            max_tokens=1400,
            temperature=0.18,
            timeout=60.0,
        )
        addendum_parts.append(f"### [ADV runda {r+1} — kontr]\n{attack[:3500]}")
        if (refined or "").strip():
            text = refined
            addendum_parts.append(f"### [ADV runda {r+1} — korekta]\n{refined[:4000]}")
    out = "\n\n".join(addendum_parts)
    state.adversarial_addendum = out
    logger.info("[INV] Adversarial: %s znaków dodatku", len(out))
    return out
