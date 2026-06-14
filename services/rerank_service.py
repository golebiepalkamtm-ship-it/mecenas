"""Reranking fragmentów RAG po retrieval (heurystyka + opcjonalnie Cohere API)."""
from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional

import httpx

from services.legal_rank import annotate_with_legal_rank, legal_rank_boost

logger = logging.getLogger(__name__)

COHERE_RERANK_URL = "https://api.cohere.com/v1/rerank"
DEFAULT_COHERE_MODEL = "rerank-multilingual-v3.0"


def _base_score(row: Dict[str, Any]) -> float:
    for key in ("rrf_score", "similarity", "score"):
        val = row.get(key)
        if val is not None:
            try:
                return float(val)
            except (TypeError, ValueError):
                pass
    return 0.0


def _keyword_boost(content: str, query: str) -> float:
    content_l = (content or "").lower()
    words = {w for w in re.findall(r"\w{4,}", (query or "").lower()) if len(w) > 3}
    if not words:
        return 0.0
    hits = sum(content_l.count(w) for w in words)
    return min(0.35, hits * 0.04)


def heuristic_rerank(
    results: List[Dict[str, Any]],
    query: str,
    *,
    top_k: int = 8,
) -> List[Dict[str, Any]]:
    if not results:
        return []
    for r in results:
        r_ranked = annotate_with_legal_rank(r)
        r.update(
            {
                "legal_rank": r_ranked.get("legal_rank"),
                "legal_rank_label": r_ranked.get("legal_rank_label"),
                "source_type": r_ranked.get("source_type", r.get("source_type")),
            }
        )
        base = _base_score(r)
        boost = _keyword_boost(r.get("content", ""), query)
        rank_boost = legal_rank_boost(r, query)
        r["legal_rank_boost"] = rank_boost
        r["rerank_score"] = base + boost + rank_boost
        r["rerank_method"] = "heuristic"
    ranked = sorted(results, key=lambda x: float(x.get("rerank_score", 0.0)), reverse=True)
    return ranked[:top_k]


async def cohere_rerank(
    results: List[Dict[str, Any]],
    query: str,
    *,
    api_key: str,
    model: str = DEFAULT_COHERE_MODEL,
    top_k: int = 8,
) -> List[Dict[str, Any]]:
    if not results or not api_key.strip():
        return heuristic_rerank(results, query, top_k=top_k)

    docs = [(r.get("content") or "")[:4000] for r in results]
    payload = {
        "model": model,
        "query": (query or "")[:2000],
        "documents": docs,
        "top_n": min(top_k, len(docs)),
        "return_documents": False,
    }
    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(COHERE_RERANK_URL, json=payload, headers=headers)
        if res.status_code != 200:
            logger.warning("[RERANK] Cohere HTTP %s — fallback heurystyczny", res.status_code)
            return heuristic_rerank(results, query, top_k=top_k)
        data = res.json()
        order = data.get("results") or []
        out: List[Dict[str, Any]] = []
        for item in order:
            idx = int(item.get("index", 0))
            if 0 <= idx < len(results):
                row = dict(results[idx])
                row_ranked = annotate_with_legal_rank(row)
                row.update(
                    {
                        "legal_rank": row_ranked.get("legal_rank"),
                        "legal_rank_label": row_ranked.get("legal_rank_label"),
                        "source_type": row_ranked.get("source_type", row.get("source_type")),
                    }
                )
                rank_boost = legal_rank_boost(row, query) * 0.75
                row["legal_rank_boost"] = rank_boost
                row["rerank_score"] = float(item.get("relevance_score", 0.0)) + rank_boost
                row["rerank_method"] = "cohere"
                out.append(row)
        return out[:top_k] if out else heuristic_rerank(results, query, top_k=top_k)
    except Exception as e:
        logger.warning("[RERANK] Cohere wyjątek: %s — fallback heurystyczny", e)
        return heuristic_rerank(results, query, top_k=top_k)


async def rerank_legal_chunks(
    results: List[Dict[str, Any]],
    query: str,
    *,
    provider: str = "heuristic",
    top_k: int = 8,
    cohere_api_key: Optional[str] = None,
    cohere_model: str = DEFAULT_COHERE_MODEL,
) -> List[Dict[str, Any]]:
    """Jednolity punkt rerankingu po hybrid/vector retrieval."""
    prov = (provider or "heuristic").strip().lower()
    key = (cohere_api_key or os.getenv("COHERE_API_KEY") or "").strip()

    if prov == "cohere" and key:
        return await cohere_rerank(
            results, query, api_key=key, model=cohere_model, top_k=top_k
        )
    return heuristic_rerank(results, query, top_k=top_k)


async def rerank_mixed_kb_chunks(
    legal_results: List[Dict[str, Any]],
    user_results: List[Dict[str, Any]],
    query: str,
    *,
    provider: str = "heuristic",
    legal_top_k: int = 8,
    user_top_k: int = 4,
    cohere_api_key: Optional[str] = None,
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Rerank legal i user — osobne top_k po wspólnym scoringu."""
    combined = [dict(r, kb_source="legal") for r in legal_results]
    combined += [dict(r, kb_source="user") for r in user_results]
    ranked = await rerank_legal_chunks(
        combined,
        query,
        provider=provider,
        top_k=legal_top_k + user_top_k,
        cohere_api_key=cohere_api_key,
    )
    legal_out: List[Dict[str, Any]] = []
    user_out: List[Dict[str, Any]] = []
    for row in ranked:
        if row.get("kb_source") == "user" and len(user_out) < user_top_k:
            user_out.append(row)
        elif row.get("kb_source") != "user" and len(legal_out) < legal_top_k:
            legal_out.append(row)
    return legal_out, user_out


async def rerank_external_sources(
    saos_results: List[Dict[str, Any]],
    eli_results: List[Dict[str, Any]],
    query: str,
    *,
    provider: str = "heuristic",
    top_k: int = 6,
    cohere_api_key: Optional[str] = None,
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Łączny rerank SAOS + ELI, potem podział z powrotem (max połowa każdego typu)."""
    tagged: List[Dict[str, Any]] = []
    for r in saos_results:
        row = dict(r)
        row["source_type"] = "SAOS"
        tagged.append(annotate_with_legal_rank(row))
    for r in eli_results:
        row = dict(r)
        row["source_type"] = "ELI"
        tagged.append(annotate_with_legal_rank(row))
    if not tagged:
        return [], []
    ranked = await rerank_legal_chunks(
        tagged,
        query,
        provider=provider,
        top_k=min(top_k, len(tagged)),
        cohere_api_key=cohere_api_key,
    )
    saos_out: List[Dict[str, Any]] = []
    eli_out: List[Dict[str, Any]] = []
    half = max(1, top_k // 2)
    for row in ranked:
        st = row.get("source_type")
        if st == "SAOS" and len(saos_out) < half:
            saos_out.append(row)
        elif st == "ELI" and len(eli_out) < half:
            eli_out.append(row)
        elif st == "SAOS" and len(saos_out) < top_k:
            saos_out.append(row)
        elif st == "ELI" and len(eli_out) < top_k:
            eli_out.append(row)
    return saos_out, eli_out
