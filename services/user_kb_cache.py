"""Odczyt zapisanej treści dokumentu użytkownika po haśle pliku (SHA-256 bajtów)."""
from __future__ import annotations

import hashlib
import logging
from typing import Any, Dict, List, Optional

import httpx

from dotenv import load_dotenv
import os

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or ""

HEADERS = {
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "apikey": SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
}

TABLE = "knowledge_base_user"
STORAGE_FULL_BODY = "full_body"
STORAGE_CHUNK = "chunk"


def source_bytes_sha256(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


async def row_exists_source_file_hash(source_hash: str, timeout: float = 20.0) -> bool:
    """Czy jakikolwiek wiersz w knowledge_base_user ma ten hash pliku."""
    if not SUPABASE_URL or not source_hash or not SUPABASE_ANON_KEY:
        return False
    url = f"{SUPABASE_URL}/rest/v1/{TABLE}"
    params = {
        "select": "id",
        "limit": "1",
        "metadata->>source_file_hash": f"eq.{source_hash}",
    }
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            res = await client.get(url, headers=HEADERS, params=params)
            if res.status_code != 200:
                return False
            data = res.json()
            return isinstance(data, list) and len(data) > 0
    except Exception as exc:
        logger.warning("[user_kb_cache] row_exists: %s", exc)
        return False


async def fetch_full_text_by_source_hash(source_hash: str, timeout: float = 25.0) -> Optional[str]:
    """
    Zwraca pełny tekst zapisanego dokumentu (wiersz full_body) lub skleja chunki.
    """
    if not SUPABASE_URL or not source_hash or not SUPABASE_ANON_KEY:
        return None
    url = f"{SUPABASE_URL}/rest/v1/{TABLE}"

    async def _get(params: Dict[str, Any]) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=timeout) as client:
            res = await client.get(url, headers=HEADERS, params=params)
            if res.status_code != 200:
                logger.warning(
                    "[user_kb_cache] HTTP %s %s",
                    res.status_code,
                    (res.text or "")[:200],
                )
                return []
            data = res.json()
            return data if isinstance(data, list) else []

    # 1) Jedna paczka: pełna treść przy uploadzie
    rows = await _get(
        {
            "select": "content",
            "limit": "1",
            "metadata->>source_file_hash": f"eq.{source_hash}",
            "metadata->>storage_role": f"eq.{STORAGE_FULL_BODY}",
        }
    )
    if rows and rows[0].get("content"):
        logger.info("[user_kb_cache] hit full_body hash=%s…", source_hash[:12])
        return str(rows[0]["content"])

    # 2) Chunki (legacy / bez full_body): kolejność po chunk_index, potem id
    rows = await _get(
        {
            "select": "content,metadata,id",
            "metadata->>source_file_hash": f"eq.{source_hash}",
            "order": "id.asc",
            "limit": "500",
        }
    )
    if not rows:
        return None

    def _chunk_key(row: Dict[str, Any]) -> tuple[int, int]:
        meta = row.get("metadata") or {}
        if isinstance(meta, dict):
            try:
                idx = int(meta.get("chunk_index", 999999))
            except (TypeError, ValueError):
                idx = 999999
        else:
            idx = 999999
        rid = row.get("id") or 0
        try:
            rid = int(rid)
        except (TypeError, ValueError):
            rid = 0
        return (idx, rid)

    rows = [
        r
        for r in rows
        if (r.get("metadata") or {}).get("storage_role") != STORAGE_FULL_BODY
    ]
    if not rows:
        return None

    parts: List[str] = []
    for row in sorted(rows, key=_chunk_key):
        c = row.get("content")
        if c:
            parts.append(str(c))
    if not parts:
        return None
    text = "\n\n".join(parts)
    logger.info(
        "[user_kb_cache] hit chunks hash=%s… parts=%s chars=%s",
        source_hash[:12],
        len(parts),
        len(text),
    )
    return text
