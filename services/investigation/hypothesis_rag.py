"""RAG / SAOS / ELI powiązane z hipotezami — równolegle z limitem."""
from __future__ import annotations

import asyncio
import copy
import logging
from typing import Any, Dict, List, Tuple

from config import settings
from services.retrieval_service import retrieval_service
from services.investigation.types import Hypothesis, CaseInvestigationState

logger = logging.getLogger(__name__)


def _legal_row_to_dict(row: Dict[str, Any], hypothesis_id: str, rnd: int) -> Dict[str, Any]:
    out = copy.deepcopy(row)
    meta = dict(out.get("metadata") or {})
    meta["hypothesis_id"] = hypothesis_id
    meta["inv_round"] = rnd
    out["metadata"] = meta
    return out


async def gather_evidence_for_hypotheses(
    hypotheses: List[Hypothesis],
    *,
    query_for_retrieval: str,
    use_rag_legal: bool,
    use_saos: bool,
    use_eli: bool,
    state: CaseInvestigationState,
    round_index: int = 0,
    max_concurrency: int = 4,
    cache_namespace: str = "inv_hyp",
) -> Tuple[Dict[str, List[Dict[str, Any]]], Dict[str, List[Dict[str, Any]]], Dict[str, List[Dict[str, Any]]]]:
    """
    Zwraca: per_hypothesis legal rows, saos rows, eli rows (jako listy dictów jak z retrieval_service).
    """
    sem = asyncio.Semaphore(max_concurrency)

    async def one_hyp(h: Hypothesis) -> Tuple[str, List, List, List]:
        async with sem:
            kw = h.rag_keywords or h.label
            acts = h.act_terms if h.act_terms else None
            ns = f"{cache_namespace}_{round_index}_{h.id}"
            legal_l: List = []
            saos_l: List = []
            eli_l: List = []
            if state.budget_retrieval_calls >= settings.investigation_max_retrieval_calls:
                return h.id, legal_l, saos_l, eli_l

            async def _leg():
                if not use_rag_legal:
                    return []
                state.budget_retrieval_calls += 1
                return await retrieval_service.search_supabase(
                    kw, act_terms=acts, match_count=5, cache_namespace=ns
                )

            async def _s():
                if not use_saos:
                    return []
                state.budget_retrieval_calls += 1
                return await retrieval_service.search_saos(
                    kw, limit=4, user_query=query_for_retrieval, cache_namespace=ns
                )

            async def _e():
                if not use_eli:
                    return []
                state.budget_retrieval_calls += 1
                base_kw = kw
                if h.eli_queries:
                    base_kw = "; ".join(h.eli_queries[:2]) or kw
                return await retrieval_service.search_eli(
                    base_kw, limit=3, user_query=query_for_retrieval, cache_namespace=ns
                )

            legal_l, saos_l, eli_l = await asyncio.gather(_leg(), _s(), _e())
            return h.id, legal_l, saos_l, eli_l

    results = await asyncio.gather(*[one_hyp(h) for h in hypotheses])
    by_legal: Dict[str, List[Dict[str, Any]]] = {}
    by_saos: Dict[str, List[Dict[str, Any]]] = {}
    by_eli: Dict[str, List[Dict[str, Any]]] = {}
    for hid, legal_l, saos_l, eli_l in results:
        by_legal[hid] = [_legal_row_to_dict(r, hid, round_index) for r in legal_l]
        by_saos[hid] = []
        for r in saos_l:
            row = dict(r)
            row["metadata"] = {"hypothesis_id": hid, "inv_round": round_index}
            by_saos[hid].append(row)
        by_eli[hid] = []
        for r in eli_l:
            row = dict(r)
            row["metadata"] = {"hypothesis_id": hid, "inv_round": round_index}
            by_eli[hid].append(row)
    return by_legal, by_saos, by_eli


def merge_evidence_into_legal_list(
    base_legal: List[Dict[str, Any]],
    by_hyp_legal: Dict[str, List[Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    """Scala bazowy RAG z wierszami per hipoteza; dedup po (id, content hash)."""
    seen: set = set()
    merged: List[Dict[str, Any]] = []

    def _key(r: Dict[str, Any]) -> str:
        rid = r.get("id")
        c = (r.get("content") or "")[:200]
        return f"{rid}:{hash(c)}"

    for r in base_legal:
        k = _key(r)
        if k not in seen:
            seen.add(k)
            merged.append(r)

    for _, rows in by_hyp_legal.items():
        for r in rows:
            k = _key(r)
            if k not in seen:
                seen.add(k)
                merged.append(r)
    return merged


def format_hypothesis_sections_for_context(
    by_legal: Dict[str, List[Dict[str, Any]]],
    by_saos: Dict[str, List[Dict[str, Any]]],
    by_eli: Dict[str, List[Dict[str, Any]]],
    hypotheses: List[Hypothesis],
) -> str:
    parts: List[str] = []
    for h in hypotheses:
        parts.append(f"\n### [HIPOTEZA {h.id}: {h.label}]\n{h.description}\n")
        le = by_legal.get(h.id) or []
        if le:
            parts.append("[RAG — fragmenty]\n" + "\n---\n".join(x.get("content", "")[:1200] for x in le[:4]))
        se = by_saos.get(h.id) or []
        if se:
            parts.append("\n[SAOS]\n" + "\n---\n".join(x.get("content", "")[:1200] for x in se[:2]))
        ee = by_eli.get(h.id) or []
        if ee:
            parts.append("\n[ELI]\n" + "\n---\n".join(x.get("content", "")[:1200] for x in ee[:2]))
    return "\n".join(parts)
