"""Wykrywanie prostych zapytań o przepisy — szybka ścieżka bez debaty MOA."""
from __future__ import annotations

import re
from typing import List, Optional

# Krótkie pytanie o konkretny artykuł / kodeks bez aktów sprawy
_ART_REF = re.compile(
    r"\bart\.?\s*\d+"
    r"|\bartyku[łl]\s*\d+"
    r"|\b§\s*\d+",
    re.IGNORECASE,
)
_CODE_REF = re.compile(
    r"\b(k\.?\s*k\.?|kk|kpc|kpa|kpk|k\.?\s*c\.?|ordynacja\s+podatkowa|u\.?\s*o\.?\s*p\.?)\b",
    re.IGNORECASE,
)
_CASE_MARKERS = re.compile(
    r"\b(odwołanie|skarga|wniosek|decyzj|postanowien|sygnatur|doręcz|starost|wsa|nsa|"
    r"prokurat|oskarż|zaskarż|załącz|pismo|organ|termin\s+odwoł)\b",
    re.IGNORECASE,
)

_TRAFFIC_STOP_TOPIC = re.compile(
    r"\b(kontrol\w*\s+drog\w*|zatrzyman\w*\s+do\s+kontrol\w*|"
    r"policj\w*\s+kontrol\w*|patrol\w*\s+drog\w*|radiow[oó]z)\b",
    re.IGNORECASE,
)


def is_traffic_stop_topic(query: str) -> bool:
    q = (query or "").strip()
    if not q:
        return False
    return _TRAFFIC_STOP_TOPIC.search(q) is not None


def is_fast_statutory_query(
    query: str,
    *,
    document_text: str = "",
    attachments: Optional[List] = None,
    max_query_chars: int = 400,
    max_doc_chars: int = 400,
) -> bool:
    """
    True = pytanie wyłącznie o przepis/orzecznictwo, bez analizy aktu sprawy.
    Pomija debatę 3 ekspertów, router LLM i ciężki audyt cytowań.
    """
    q = (query or "").strip()
    if not q or len(q) > max_query_chars:
        return False

    doc = (document_text or "").strip()
    if len(doc) > max_doc_chars:
        return False
    if attachments and len(attachments) > 0:
        return False
    if _CASE_MARKERS.search(q):
        return False

    has_art = bool(_ART_REF.search(q))
    has_code = bool(_CODE_REF.search(q))
    if has_art or has_code:
        return True

    # Pytanie ogólne o przepisy, brak załączników i krótkie zapytanie
    if len(doc) == 0 and (not attachments) and len(q) < max_query_chars:
        return True

    # „co to jest przestępstwo posiadania” + kk w jednym krótkim zdaniu
    if len(q) < 120 and has_code:
        return True

    return False


def fast_path_keywords(query: str) -> str:
    """Słowa kluczowe bez dodatkowego wywołania LLM (router Etap 6)."""
    q = (query or "").strip()
    parts: List[str] = []

    q_low = q.lower()
    if "kontrol" in q_low and "drog" in q_low:
        return "kontrola drogowa, zatrzymanie pojazdu, prawo o ruchu drogowym"

    for m in _ART_REF.finditer(q):
        parts.append(m.group(0).strip())

    for m in _CODE_REF.finditer(q):
        code = m.group(0).strip()
        if code.lower() in ("kk", "k.k.", "k k"):
            parts.append("kodeks karny")
        elif code.lower() in ("kpc", "k.p.c."):
            parts.append("kodeks postępowania cywilnego")
        elif code.lower() in ("kpa", "k.p.a."):
            parts.append("kodeks postępowania administracyjnego")
        elif code.lower() in ("kpk", "k.p.k."):
            parts.append("kodeks postępowania karnego")
        else:
            parts.append(code)

    if "narkoman" in q.lower() or "narkotyk" in q.lower():
        parts.append("ustawa o przeciwdziałaniu narkomanii")

    seen: List[str] = []
    for p in parts:
        low = p.lower()
        if low not in {x.lower() for x in seen}:
            seen.append(p)

    if seen:
        return ", ".join(seen[:5])
    return q[:120]
