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
    "kk": "Kodeks karny",
    "kp": "Kodeks pracy",
    "kw": "Kodeks wykroczeń",
    "upn": "Ustawa o przeciwdziałaniu narkomanii",
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

    try:
        from services.retrieval_service import retrieval_service
        breaker = retrieval_service._breakers.get("ELI")
    except Exception:
        breaker = None

    if breaker and not breaker.allow_request():
        logger.warning("[ELI L1] Zapytanie do Sejm API zablokowane przez CircuitBreaker.")
        return ""

    url = "https://api.sejm.gov.pl/eli/acts/search"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://api.sejm.gov.pl/"
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get(url, params={"title": title, "limit": 40}, headers=headers)
            if res.status_code != 200:
                if breaker:
                    breaker.on_failure(f"http_{res.status_code}")
                return ""
            if breaker:
                breaker.on_success()
            data = res.json()
            items = data if isinstance(data, list) else data.get("items") or []
            
            # Wybieramy najlepszy akt (jednolity tekst lub główny akt) z uwzględnieniem ujednoznacznienia
            valid_items = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                t_lower = (item.get("title") or "").lower()
                # Ujednoznacznienie dla kk, kc, kpk, kpc
                if code == "kk":
                    if "wykonawcz" in t_lower or "postępowan" in t_lower or "skarbow" in t_lower:
                        continue
                elif code == "kc":
                    if "postępowan" in t_lower:
                        continue
                elif code == "kpk":
                    if "postępowan" not in t_lower or "cywiln" in t_lower:
                        continue
                elif code == "kpc":
                    if "postępowan" not in t_lower or "karn" in t_lower:
                        continue
                valid_items.append(item)
                
            best_item = None
            if valid_items:
                # Szukamy tekstu jednolitego
                unified = [it for it in valid_items if "jednolitego tekstu" in (it.get("title") or "").lower()]
                if unified:
                    best_item = unified[0]
                else:
                    # Szukamy aktu głównego (brak "o zmianie")
                    main_acts = [it for it in valid_items if "o zmianie" not in (it.get("title") or "").lower()]
                    if main_acts:
                        best_item = main_acts[0]
                    else:
                        best_item = valid_items[0]
                        
            if not best_item:
                return ""
                
            # Pobieramy pełny tekst HTML
            publisher_raw = best_item.get("publisher") or ""
            publisher = "DU" if "DU" in publisher_raw else "MP"
            year = best_item.get("year")
            pos = best_item.get("pos")
            if not year or not pos:
                return ""
                
            padded_pos = str(pos).zfill(7)
            text_url = f"https://api.sejm.gov.pl/eli/acts/{publisher}/{year}/{padded_pos}/text.html"
            
            text_res = await client.get(text_url)
            if text_res.status_code != 200:
                return ""
                
            html_content = text_res.text
            blob = re.sub(r"<[^>]+>", " ", html_content)
            blob = re.sub(r"\s+", " ", blob).strip().lower()
            _cache_set(cache_key, blob)
            return blob
    except Exception as e:
        logger.debug("[ELI L1] fetch %s: %s", title, e)
        if breaker:
            breaker.on_failure(str(e))
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
