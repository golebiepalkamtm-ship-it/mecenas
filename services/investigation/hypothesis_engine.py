"""Generator hipotez prawniczych (JSON) — pod retrieval per hipoteza."""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable, List, Optional

from config import settings
from services.investigation.types import CaseInvestigationState, Hypothesis

logger = logging.getLogger(__name__)

_HYP_SYSTEM = """Jesteś analitykiem prawnym. Na podstawie dokumentu i pytania wygeneruj listę HIPOTEZ strategicznych/procesowych.
Zwróć WYŁĄCZNIE poprawny JSON (bez markdown), tablica obiektów:
[{"id":"H1","label":"krótki tytuł","description":"1-2 zdania","priority":1-5,"rag_keywords":"frazy pod wyszukiwarkę RAG PL, po przecinku","act_terms":["fragment nazwy aktu jeśli dotyczy"],"eli_queries":["hasło pod ISAP/ELI"]}]
Maksymalnie N hipotez; priorytetyzuj: procedura, właściwość, doręczenie/termin, podstawa prawna, UE/ETPC, błędy dowodowe, przedawnienie.
Pole rag_keywords MUSI być jednym stringiem (nie tablicą). Pola act_terms i eli_queries mogą być puste listy."""


def _strip_markdown_fences(text: str) -> str:
    t = (text or "").strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s*```\s*$", "", t)
    return t.strip()


def _repair_json_array(raw: str) -> Optional[str]:
    """Próba naprawy obciętej tablicy JSON (domknięcie stringów/obiektów)."""
    s = raw.strip()
    if not s.startswith("["):
        return None
    suffixes = (
        "",
        '"}]',
        '"} ]',
        "}]",
        "}",
        "]",
    )
    for suffix in suffixes:
        candidate = s + suffix
        try:
            json.loads(candidate)
            return candidate
        except json.JSONDecodeError:
            continue
    trimmed = re.sub(r",\s*$", "", s)
    for suffix in ('"}]', "}]"):
        try:
            json.loads(trimmed + suffix)
            return trimmed + suffix
        except json.JSONDecodeError:
            continue
    return None


def _parse_hypothesis_json(raw: str) -> Optional[list]:
    raw = _strip_markdown_fences(raw)
    if not raw:
        return None
    m = re.search(r"\[[\s\S]*\]", raw)
    blob = m.group(0) if m else raw
    try:
        data = json.loads(blob)
        return data if isinstance(data, list) else None
    except json.JSONDecodeError:
        repaired = _repair_json_array(blob if blob.startswith("[") else raw)
        if repaired:
            try:
                data = json.loads(repaired)
                return data if isinstance(data, list) else None
            except json.JSONDecodeError:
                pass
    return None


def _as_str_list(val: Any) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return [str(x).strip() for x in val if x and str(x).strip()]
    if isinstance(val, str):
        return [p.strip() for p in re.split(r"[,;]+", val) if p.strip()]
    return [str(val).strip()] if str(val).strip() else []


def _normalize_rag_keywords(val: Any, label: str) -> str:
    if isinstance(val, list):
        return ", ".join(str(x).strip() for x in val if x and str(x).strip())
    if isinstance(val, str) and val.strip():
        return val.strip()
    return label


def _normalize_hypothesis_item(item: dict, index: int, cap: int) -> Hypothesis:
    hid = str(item.get("id") or f"H{index + 1}")
    label = str(item.get("label") or hid)
    return Hypothesis(
        id=hid,
        label=label,
        description=str(item.get("description") or ""),
        priority=int(item.get("priority") or (cap - index)),
        rag_keywords=_normalize_rag_keywords(item.get("rag_keywords"), label),
        act_terms=_as_str_list(item.get("act_terms")),
        eli_queries=_as_str_list(item.get("eli_queries")),
    )


async def generate_hypotheses(
    *,
    call_llm: Callable[..., Any],
    model_id: str,
    document_excerpt: str,
    user_query: str,
    history_snippet: str,
    memory_hint: str,
    max_count: int,
    state: CaseInvestigationState,
) -> List[Hypothesis]:
    """call_llm: async (model, messages, max_tokens, temperature, timeout) -> (text, used_model)"""
    cap = max(1, min(max_count, settings.hypothesis_max_count))
    user_block = (
        f"PYTANIE KLIENTA:\n{user_query[:2000]}\n\n"
        f"DOKUMENT (fragment):\n{document_excerpt[:8000]}\n\n"
    )
    if history_snippet.strip():
        user_block += f"HISTORIA (skrót):\n{history_snippet[:1500]}\n\n"
    if memory_hint.strip():
        user_block += f"PAMIĘĆ SPRAWY (poprzednie rundy):\n{memory_hint[:2000]}\n\n"
    user_block += f"Wygeneruj co najwyżej {cap} hipotez."
    if state.budget_llm_calls >= settings.investigation_max_llm_calls:
        logger.warning("[INV] Budżet LLM — pomijam generowanie hipotez")
        return []
    state.budget_llm_calls += 1
    text, _ = await call_llm(
        model_id,
        [{"role": "system", "content": _HYP_SYSTEM.replace("N hipotez", f"{cap} hipotez")}, {"role": "user", "content": user_block}],
        max_tokens=1800,
        temperature=0.15,
        timeout=45.0,
    )
    raw = (text or "").strip()
    if not raw:
        return []
    data = _parse_hypothesis_json(raw)
    if data is None:
        logger.warning("[INV] Nie udało się sparsować JSON hipotez")
        return []
    out: List[Hypothesis] = []
    for i, item in enumerate(data[:cap]):
        if not isinstance(item, dict):
            continue
        out.append(_normalize_hypothesis_item(item, i, cap))
    if not out:
        out.append(
            Hypothesis(
                id="H_default",
                label="Ogólna analiza prawna",
                description="Brak strukturalnych hipotez z modelu — szeroki retrieval.",
                priority=1,
                rag_keywords=user_query[:400],
                act_terms=[],
                eli_queries=[],
            )
        )
    state.facts_summary = state.facts_summary or f"Wygenerowano {len(out)} hipotez"
    state.hypotheses = out
    logger.info("[INV] Hipotezy: %s", [h.id for h in out])
    return out
