"""CitationGuard L1 — pobranie treści aktu z API ELI (cache w pamięci)."""
from __future__ import annotations

import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

from services.citation_guard import ArticleCitation, is_citation_in_corpus

logger = logging.getLogger(__name__)

_ELI_CACHE: Dict[str, Tuple[float, str]] = {}


def _cache_get(key: str, ttl: int) -> Optional[str]:
    entry = _ELI_CACHE.get(key)
    if not entry:
        return None
    ts, blob = entry
    if time.time() - ts > ttl:
        del _ELI_CACHE[key]
        return None
    return blob


def _cache_set(key: str, blob: str) -> None:
    _ELI_CACHE[key] = (time.time(), blob)


_ACT_TO_ELI_TITLE = {
    "kpa": "Kodeks postępowania administracyjnego",
    "kpc": "Kodeks postępowania cywilnego",
    "kpk": "Kodeks postępowania karnego",
    "kc": "Kodeks cywilny",
    "kp": "Kodeks karny",
    "ppsa": "Prawo o postępowaniu przed sądami administracyjnymi",
    "op": "Ordynacja podatkowa",
    "upea": "Ustawa o postępowaniu egzekucyjnym w administracji",
}


async def fetch_eli_act_text(act_code: Optional[str], *, ttl: int = 3600) -> str:
    """Wyszukuje akt po tytule i zwraca sklejony tekst (search API — MVP L1)."""
    code = (act_code or "").lower()
    title = _ACT_TO_ELI_TITLE.get(code, "")
    if not title:
        return ""
    cache_key = f"eli_act:{code}"
    cached = _cache_get(cache_key, ttl)
    if cached is not None:
        return cached

    url = "https://api.sejm.gov.pl/eli/acts/search"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get(url, params={"keyword": title, "limit": 3})
        if res.status_code != 200:
            return ""
        data = res.json()
        items = data if isinstance(data, list) else data.get("items") or []
        parts: List[str] = []
        for item in items[:2]:
            if isinstance(item, dict):
                for k in ("title", "tytul", "text", "content", "opis"):
                    v = item.get(k)
                    if isinstance(v, str) and v.strip():
                        parts.append(v)
        blob = re.sub(r"<[^>]+>", " ", " ".join(parts)).lower()
        _cache_set(cache_key, blob)
        return blob
    except Exception as e:
        logger.debug("[ELI L1] fetch %s: %s", title, e)
        return ""


async def verify_citations_via_eli_l1(
    citations: List[ArticleCitation],
    *,
    ttl: int = 3600,
    max_lookups: int = 6,
) -> set[str]:
    """Uzupełnia weryfikację — pełniejszy blob ustawy z ELI."""
    verified: set[str] = set()
    by_act: Dict[str, List[ArticleCitation]] = {}
    for c in citations[:max_lookups]:
        act = c.act_code or "_unknown"
        by_act.setdefault(act, []).append(c)

    for act, cites in by_act.items():
        blob = await fetch_eli_act_text(act if act != "_unknown" else None, ttl=ttl)
        if not blob:
            continue
        for cite in cites:
            if is_citation_in_corpus(cite, blob):
                verified.add(cite.key)
    return verified
