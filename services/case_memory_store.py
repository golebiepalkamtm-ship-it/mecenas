"""Case memory — zapis JSONB do Supabase (dual-write z SQLite)."""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL") or ""
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or ""
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""


def _supabase_auth_headers() -> Optional[Dict[str, str]]:
    key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
    if not key:
        return None
    return {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }


def upsert_case_memory_supabase(
    session_id: str,
    state_dict: Dict[str, Any],
    *,
    case_id: Optional[str] = None,
) -> bool:
    if not SUPABASE_URL:
        return False
    headers = _supabase_auth_headers()
    if not headers:
        return False
    row = {
        "session_id": session_id,
        "case_id": case_id or session_id,
        "state_json": state_dict,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/case_memory"
    try:
        with httpx.Client(timeout=20.0) as client:
            res = client.post(url, json=row, headers=headers)
        if res.status_code in (200, 201):
            return True
        if res.status_code in (400, 409):
            patch_url = f"{url}?session_id=eq.{session_id}"
            with httpx.Client(timeout=20.0) as client:
                res2 = client.patch(
                    patch_url,
                    json={"state_json": state_dict, "updated_at": row["updated_at"]},
                    headers=headers,
                )
            return res2.status_code in (200, 204)
        logger.warning("[case_memory] HTTP %s %s", res.status_code, res.text[:200])
    except Exception as e:
        logger.warning("[case_memory] upsert: %s", e)
    return False
