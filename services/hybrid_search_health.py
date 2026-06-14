"""Health probe dla funkcji hybrid_search_* w Supabase."""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, List

import httpx

from services.indexing_service import indexing_service
from services.pipeline.runtime_helpers import expand_act_terms_for_rag

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL") or ""
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or ""


async def check_hybrid_search_rpc() -> Dict[str, Any]:
    """
    Wywołuje hybrid_search_legal z minimalnym zapytaniem.
    Zwraca status wdrożenia migracji SQL.
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return {
            "ok": False,
            "error": "SUPABASE_URL lub SUPABASE_ANON_KEY nie ustawione",
            "functions": [],
        }

    headers = {
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    functions_checked: List[Dict[str, Any]] = []
    all_ok = True

    try:
        embedding = await indexing_service.get_embedding("test prawo administracyjne")
    except Exception as e:
        return {
            "ok": False,
            "error": f"embedding_failed: {e}",
            "functions": [],
        }

    for rpc_name in ("hybrid_search_legal_v2", "hybrid_search_user_v2", "hybrid_search_legal", "hybrid_search_user"):
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/{rpc_name}"
        payload = {
            "query_text": "kodeks postępowania administracyjnego",
            "query_embedding": embedding,
            "match_count": 2,
            "vector_weight": 0.45,
            "k_rrf": 60,
        }
        entry: Dict[str, Any] = {"name": rpc_name, "ok": False, "http_status": None}
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(url, json=payload, headers=headers)
            entry["http_status"] = res.status_code
            if res.status_code == 200:
                data = res.json()
                entry["ok"] = True
                entry["result_count"] = len(data) if isinstance(data, list) else 0
            elif res.status_code == 404:
                entry["hint"] = (
                    "Uruchom supabase/migrations/20260520_hybrid_search_deploy.sql"
                )
                all_ok = False
            else:
                entry["body_preview"] = (res.text or "")[:200]
                all_ok = False
        except Exception as e:
            entry["error"] = str(e)
            all_ok = False
        functions_checked.append(entry)

    # Test filtra act_terms (KPA) — te same frazy co orchestrator (ASCII + postępowania)
    kpa_entry: Dict[str, Any] = {
        "name": "hybrid_search_legal_act_terms_KPA",
        "ok": False,
        "http_status": None,
    }
    try:
        url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/hybrid_search_legal"
        expanded_kpa = expand_act_terms_for_rag(["KPA"]) or []
        payload_kpa = {
            "query_text": "postepowanie administracyjne wszczecie",
            "query_embedding": embedding,
            "match_count": 3,
            "vector_weight": 0.45,
            "k_rrf": 60,
            "act_terms": expanded_kpa,
        }
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.post(url, json=payload_kpa, headers=headers)
        kpa_entry["http_status"] = res.status_code
        kpa_entry["act_terms_sent"] = expanded_kpa[:6]
        if res.status_code == 200:
            data_kpa = res.json()
            count = len(data_kpa) if isinstance(data_kpa, list) else 0
            kpa_entry["result_count"] = count
            kpa_entry["ok"] = count > 0
            if count == 0:
                kpa_entry["hint"] = (
                    "Brak trafień z act_terms KPA — sprawdź migrację "
                    "20260529_fix_hybrid_act_terms_filter.sql i indeks KPA w knowledge_base_legal"
                )
                all_ok = False
        else:
            kpa_entry["body_preview"] = (res.text or "")[:200]
            all_ok = False
    except Exception as e:
        kpa_entry["error"] = str(e)
        all_ok = False
    functions_checked.append(kpa_entry)

    return {
        "ok": all_ok,
        "functions": functions_checked,
        "migration_file": "supabase/migrations/20260529_fix_hybrid_act_terms_filter.sql",
    }
