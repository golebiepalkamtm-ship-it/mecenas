"""Szacowanie siły hipotez (LLM JSON) — metadane dla UI."""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable, List, Optional

from config import settings
from services.investigation.types import CaseInvestigationState, ClaimScore, Hypothesis

logger = logging.getLogger(__name__)


def _strip_markdown_fences(text: str) -> str:
    t = (text or "").strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s*```\s*$", "", t)
    return t.strip()


def _parse_scores_json(txt: str) -> Optional[list]:
    txt = _strip_markdown_fences(txt)
    if not txt:
        return None
    m = re.search(r"\[[\s\S]*\]", txt)
    if m:
        try:
            data = json.loads(m.group(0))
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass
    m_obj = re.search(r"\{[\s\S]*\}", txt)
    if m_obj:
        try:
            data = json.loads(m_obj.group(0))
            if isinstance(data, dict):
                return [data]
        except json.JSONDecodeError:
            pass
    return None


def _safe_float(val: Any, default: float = 0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


async def score_hypotheses(
    *,
    hypotheses: List[Hypothesis],
    evidence_snippet: str,
    call_llm: Callable[..., Any],
    model_id: str,
    state: CaseInvestigationState,
) -> List[ClaimScore]:
    if not hypotheses or state.budget_llm_calls >= settings.investigation_max_llm_calls:
        return []
    state.budget_llm_calls += 1
    hyp_lines = "\n".join(f"- {h.id}: {h.label} — {h.description}" for h in hypotheses)
    prompt = (
        "Oceń każdą hipotezę prawniczą w skali 0.0–1.0. Zwróć WYŁĄCZNIE JSON tablicy:\n"
        '[{"hypothesis_id":"H1","label":"...","legal_strength":0.8,"procedural_strength":0.7,'
        '"precedent_support":0.6,"contradiction_risk":0.4,"notes":"..."}]\n\n'
        f"HIPOTEZY:\n{hyp_lines}\n\nDOWODY (skrót):\n{evidence_snippet[:10000]}"
    )
    raw, _ = await call_llm(
        model_id,
        [{"role": "user", "content": prompt}],
        max_tokens=900,
        temperature=0.05,
        timeout=50.0,
    )
    txt = (raw or "").strip()
    out: List[ClaimScore] = []
    data = _parse_scores_json(txt)
    if data is None:
        logger.warning("[INV] claim_scores parse fail")
        state.claim_scores = out
        return out
    for item in data:
        if not isinstance(item, dict):
            continue
        out.append(
            ClaimScore(
                hypothesis_id=str(item.get("hypothesis_id") or ""),
                label=str(item.get("label") or ""),
                legal_strength=_safe_float(item.get("legal_strength")),
                procedural_strength=_safe_float(item.get("procedural_strength")),
                precedent_support=_safe_float(item.get("precedent_support")),
                contradiction_risk=_safe_float(item.get("contradiction_risk")),
                notes=str(item.get("notes") or ""),
            )
        )
    state.claim_scores = out
    return out
