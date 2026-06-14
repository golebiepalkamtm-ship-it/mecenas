from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, List, Set, Tuple


@dataclass(frozen=True)
class PrivateContextDecision:
    use_private_context: bool
    reason: str
    matched_markers: List[str]


_FIRST_PERSON = re.compile(
    r"\b(ja|mnie|mi|moj[aei]?|moim|mojej|mój|moja|moje|nasz|nasza|nasze)\b",
    re.IGNORECASE,
)

_DOC_REF = re.compile(
    r"\b(ten\s+dokument|w\s+dokumencie|w\s+załączniku|w\s+za[lł]ączniku|"
    r"akta|pismo|decyzj[aei]|odwo[lł]ani[ea]|skarg[ai]|"
    r"sygn\.?|znak\s+sprawy|k\.d\.|sko|starost[ay]|urz[aą]d|"
    r"załączon[a-z]*|za[lł]ącznik[a-z]*|materiał[a-z]*|plik[a-z]*|dokument[a-z]*|"
    r"analiz[a-z]*|przeanaliz[a-z]*|zanaliz[a-z]*|odczytaj[a-z]*|przeczytaj[a-z]*|to)\b",
    re.IGNORECASE,
)

_CASE_MARKER = re.compile(
    r"(\bkd\.\d+|\bkd\.\d+\.\d+|\bkd\.\d+\.\d+\.\d+|"
    r"\b[a-z]{1,4}\.\d+\.\d+\.\d+\.\d+|"
    r"\b\d{2}\.\d{2}\.\d{4}\b|"
    r"\bsygn\.\s*[a-z0-9/ -]{4,}\b)",
    re.IGNORECASE,
)

_STOPWORDS: Set[str] = {
    "prawo",
    "ustawa",
    "kodeks",
    "przepis",
    "procedura",
    "policja",
    "policji",
    "kontrola",
    "kontroli",
    "drogowa",
    "drogowej",
    "zatrzymanie",
    "zatrzymania",
    "zatrzymaniu",
    "kierowca",
    "kierowcy",
    "kierowcę",
    "kierowce",
    "pojazd",
    "pojazdu",
    "jak",
    "jaka",
    "jakie",
    "jaką",
    "co",
    "czy",
    "kiedy",
    "gdzie",
    "dlaczego",
    "oraz",
    "który",
    "która",
    "które",
    "się",
    "sie",
}


def _tokens(text: str) -> Iterable[str]:
    for t in re.findall(r"[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9]{3,}", text or ""):
        yield t.lower()


def assess_private_context_relevance(
    *,
    user_query: str,
    masked_doc_text: str,
    masked_chat_history: str = "",
) -> PrivateContextDecision:
    q = (user_query or "").strip()
    if not q:
        return PrivateContextDecision(False, "empty_query", [])

    has_any_private = bool((masked_doc_text or "").strip()) or bool((masked_chat_history or "").strip())
    if not has_any_private:
        return PrivateContextDecision(False, "no_private_context", [])

    matched: List[str] = []
    if _FIRST_PERSON.search(q):
        matched.append("first_person")
    if _DOC_REF.search(q):
        matched.append("doc_reference")
    if matched:
        return PrivateContextDecision(True, "explicit_markers", matched)

    if _CASE_MARKER.search(q):
        return PrivateContextDecision(True, "explicit_case_marker", ["case_marker"])

    doc_head = (masked_doc_text or "")[:8000].lower()
    q_terms = [t for t in _tokens(q) if len(t) >= 5 and t not in _STOPWORDS]
    if not q_terms:
        return PrivateContextDecision(False, "generic_query", [])

    hits = 0
    hit_terms: List[str] = []
    for term in sorted(set(q_terms)):
        if term in doc_head:
            hits += 1
            hit_terms.append(term)
            if hits >= 3 and any(len(x) >= 8 for x in hit_terms):
                return PrivateContextDecision(True, "token_overlap", hit_terms[:6])

    return PrivateContextDecision(False, "generic_query", [])
