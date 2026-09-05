from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx

from services.retrieval.types import RetrievalItem, normalize_retrieval_rows

# Szybki cache na dysku
CACHE_FILE = "cache/eli_cache.json"

def _load_cache() -> dict:
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def _save_cache(cache: dict):
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def _as_text(value: Any) -> str:
    if value is None or isinstance(value, bool):
        return ""
    return str(value)


def _strip_html(text: Any) -> str:
    source = _as_text(text)
    if not source:
        return ""
    clean = re.sub(r"<[^>]+>", " ", source)
    return re.sub(r"\s+", " ", clean).strip()


async def fetch_eli_once(
    client: httpx.AsyncClient,
    query: Any,
    limit: int,
) -> list[RetrievalItem]:
    url = "https://api.sejm.gov.pl/eli/acts/search"
    query_text = _as_text(query).strip()
    if not query_text:
        return []

    # Mapowanie popularnych skrótów prawniczych na pełne nazwy dla API Sejmu
    abbrev_map = {
        r"\bk\.?p\.?k\.?\b": "Kodeks postępowania karnego",
        r"\bk\.?k\.?\b": "Kodeks karny",
        r"\bk\.?p\.?c\.?\b": "Kodeks postępowania cywilnego",
        r"\bk\.?c\.?\b": "Kodeks cywilny",
        r"\bk\.?p\.?a\.?\b": "Kodeks postępowania administracyjnego",
        r"\bu\.?p\.?n\.?\b": "o przeciwdziałaniu narkomanii",
        r"\bu\.?p\.?a\.?\b": "Prawo o adwokaturze",
    }
    for abbrev, full_name in abbrev_map.items():
        query_text = re.sub(abbrev, full_name, query_text, flags=re.IGNORECASE)


    # Sprawdzanie cache przed wysłaniem żądania
    cache_key = f"{query_text}::{limit}"
    disk_cache = _load_cache()
    if cache_key in disk_cache:
        # Rekonstrukcja obiektów RetrievalItem z dict
        return normalize_retrieval_rows(disk_cache[cache_key])

    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://api.sejm.gov.pl/"
    }
    response = await client.get(url, params={"limit": limit, "keyword": query_text}, headers=headers)
    if response.status_code != 200:
        raise RuntimeError(f"eli_http_{response.status_code}")

    items = response.json().get("items", []) or []
    results: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue

        title = _as_text(item.get("title")).strip()
        display = _as_text(item.get("displayAddress") or item.get("address") or "")
        text_raw = item.get("textHTML")
        body = _strip_html(text_raw)
        if not body and isinstance(item.get("texts"), list) and item["texts"]:
            body = _strip_html(item["texts"][0])
        if not body:
            status = _as_text(item.get("status"))
            eli_value = _as_text(item.get("ELI"))
            body = f"Status: {status or '—'}. ELI: {eli_value or '—'}"

        header = f"{title}\n({display})"
        results.append(
            {
                "source": f"ELI — {display}",
                "tytul": title or display,
                "title": title,
                "content": f"{header}\n{body[:3000]}",
            }
        )

    final_results = normalize_retrieval_rows(results)
    
    # Zapis do cache (konwersja do dict dla serializacji)
    cache_to_save = []
    for r in final_results:
        if isinstance(r, dict): cache_to_save.append(r)
        elif hasattr(r, 'model_dump'): cache_to_save.append(r.model_dump())
        else: cache_to_save.append(dict(r))
        
    disk_cache[cache_key] = cache_to_save
    _save_cache(disk_cache)
    
    return final_results
