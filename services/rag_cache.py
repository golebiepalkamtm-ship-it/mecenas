"""Prosty cache TTL dla wyników RAG / SAOS / ELI (powtarzalne zapytania w tej samej sesji)."""
from __future__ import annotations

import hashlib
import json
import time
from typing import Any, Optional

from config import settings


class TTLCache:
    def __init__(self, ttl_seconds: int = 300, max_entries: int = 128):
        self.ttl = ttl_seconds
        self.max_entries = max_entries
        self._store: dict[str, tuple[float, Any]] = {}

    def configure(self, *, ttl_seconds: Optional[int] = None, max_entries: Optional[int] = None) -> None:
        if ttl_seconds is not None:
            self.ttl = ttl_seconds
        if max_entries is not None:
            self.max_entries = max_entries

    def make_key(self, prefix: str, **payload: Any) -> str:
        raw = json.dumps(payload, sort_keys=True, default=str)
        digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]
        return f"{prefix}:{digest}"

    def get(self, key: str) -> Optional[Any]:
        if self.ttl <= 0:
            self._store.pop(key, None)
            return None
        entry = self._store.get(key)
        if not entry:
            return None
        ts, val = entry
        if time.time() - ts > self.ttl:
            del self._store[key]
            return None
        return val

    def set(self, key: str, val: Any) -> None:
        if self.ttl <= 0:
            return
        if len(self._store) >= self.max_entries:
            oldest_key = min(self._store, key=lambda k: self._store[k][0])
            del self._store[oldest_key]
        self._store[key] = (time.time(), val)


rag_cache = TTLCache(
    ttl_seconds=settings.rag_cache_ttl_seconds,
    max_entries=settings.rag_cache_max_entries,
)
