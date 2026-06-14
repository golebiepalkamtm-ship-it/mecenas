"""
Zwarty „arkusz sprawy” z pełnego OCR — mniej tokenów w prompcie, bez utraty pełnego tekstu.

Pełny tekst zostaje w: sesji, Supabase (full_body), RAG (chunki).
Model dostaje: ten skrót + fragmenty RAG (dosłowne) + (gdy mieści się) większy wycinek akt.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from services.deadline_engine import parse_polish_date

_MAX_LIST = 24
_MAX_LINE_LEN = 220

_SYGN_RE = re.compile(
    r"(?:sygn(?:atura)?\.?|sprawa|znak)\s*[:\s]*"
    r"([A-Za-z0-9][A-Za-z0-9./\-–—\s]{4,60})",
    re.IGNORECASE,
)
_ART_RE = re.compile(
    r"\bart\.?\s*\d+[a-ząćęłńóśźż]*"
    r"(?:\s*§\s*\d+[a-ząćęłńóśźż]*)?"
    r"(?:\s+(?:k\.?p\.?a\.?|k\.?p\.?|k\.?p\.?k\.?|k\.?c\.?|k\.?s\.?h\.?|k\.?r\.?|u\.?k\.?p\.?d\.?|u\.?s\.?p\.?o\.?k\.?p\.?))?",
    re.IGNORECASE,
)
_DATE_RE = re.compile(r"\b(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\b")
_ORGAN_RE = re.compile(
    r"(?:starost\w+|prezydent\w+|wojewod\w+|minister\w+|sąd\w+|prokuratur\w+|"
    r"komisja\s+odwoławcz\w+|samorządow\w+\s+kolegium\s+odwoławcz\w+|"
    r"urząd\w+|wydział\w+)\s+[\wąćęłńóśźż\-]+",
    re.IGNORECASE,
)
_PERSON_RE = re.compile(
    r"\b([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{2,})\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{2,}(?:-[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{2,})?)\b"
)


def _uniq(items: List[str], limit: int = _MAX_LIST) -> List[str]:
    seen: set[str] = set()
    out: List[str] = []
    for raw in items:
        s = (raw or "").strip()
        if not s or len(s) > 500:
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(s[:_MAX_LINE_LEN])
        if len(out) >= limit:
            break
    return out


def _page_headers(text: str) -> List[str]:
    headers: List[str] = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("--- STRONA ") and line.endswith("---"):
            headers.append(line)
        elif len(line) > 15 and line.isupper() and len(line) < 120:
            headers.append(line)
    return _uniq(headers, 12)


def build_fact_sheet(text: str) -> Dict[str, Any]:
    """Deterministyczny skrót strukturalny (bez LLM) — ok. 1–4k znaków JSON."""
    cleaned = (text or "").replace("\x00", "").strip()
    if not cleaned:
        return {}

    sygnatury = _SYGN_RE.findall(cleaned)
    przepisy = _ART_RE.findall(cleaned)
    daty_raw = _DATE_RE.findall(cleaned)
    daty_parsed: List[str] = []
    for d in daty_raw:
        p = parse_polish_date(d)
        if p:
            daty_parsed.append(p.strftime("%Y-%m-%d"))
    organy = _ORGAN_RE.findall(cleaned)
    osoby = [f"{a} {b}" for a, b in _PERSON_RE.findall(cleaned)]

    # Pierwsze i ostatnie zdania (kontekst bez środka)
    lines = [ln.strip() for ln in cleaned.splitlines() if ln.strip()]
    head = " ".join(lines[:8])[:1200]
    tail = " ".join(lines[-8:])[:1200]

    return {
        "znaki_ocr": len(cleaned),
        "strony_markery": _page_headers(cleaned),
        "sygnatury": _uniq(sygnatury),
        "daty_iso": _uniq(daty_parsed),
        "przepisy_wzmianki": _uniq(przepisy),
        "organy": _uniq(organy),
        "osoby": _uniq(osoby),
        "poczatek_dokumentu": head,
        "koniec_dokumentu": tail,
    }


def format_fact_sheet_for_prompt(sheet: Optional[Dict[str, Any]]) -> str:
    if not sheet:
        return ""
    compact = json.dumps(sheet, ensure_ascii=False, separators=(",", ":"))
    if len(compact) > 6000:
        compact = compact[:6000] + "…"
    return (
        "\n[KARTA SPRAWY — skrót strukturalny z pełnego OCR; NIE zastępuje akt]\n"
        "Poniżej indeks faktów (daty, sygnatury, przepisy). "
        "Dosłowne brzmienie i środek pisma — w blokach RAG i fragmencie dokumentu.\n"
        f"{compact}\n"
    )
