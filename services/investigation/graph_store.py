"""Best-effort zapis krawędzi prawnych do Postgres (Supabase) — opcjonalny."""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import httpx

from services.citation_guard import extract_citations

logger = logging.getLogger(__name__)


def extract_and_persist_edges(legal_results: List[Dict[str, Any]], session_label: str = "") -> int:
    """
    Wyciąga proste encje z fragmentów RAG i zapisuje przez PostgREST (wymaga migracji + SERVICE_ROLE).
    Zwraca liczbę zapisanych krawędzi (uproszczony licznik).
    """
    url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        logger.debug("[GRAPH] Brak SUPABASE_URL / SERVICE_ROLE_KEY — pomijam persystencję grafu")
        return 0
    inserted = 0
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=ignore-duplicates",
    }
    rows_e: List[Dict[str, Any]] = []
    rows_edges: List[Dict[str, Any]] = []
    for row in legal_results[:30]:
        content = row.get("content") or ""
        fn = (row.get("metadata") or {}).get("filename") or "fragment"
        cites = extract_citations(content[:8000])
        for c in cites[:8]:
            label = f"art.{c.article_num} {c.act_code or ''}".strip()
            rows_e.append(
                {
                    "entity_type": "statute_article",
                    "canonical_label": label[:500],
                    "external_ref": c.raw[:300],
                    "source_session": session_label[:100] or None,
                }
            )
    if not rows_e:
        return 0
    try:
        with httpx.Client(timeout=25.0) as client:
            r = client.post(f"{url}/rest/v1/legal_entities", headers=headers, json=rows_e)
            if r.status_code not in (200, 201):
                logger.warning("[GRAPH] legal_entities HTTP %s %s", r.status_code, r.text[:200])
                return 0
            inserted = len(rows_e)
    except Exception as e:
        logger.warning("[GRAPH] %s", e)
        return 0
    return inserted
