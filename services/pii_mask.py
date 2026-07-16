"""Współdzielona anonimizacja PII na wejściu pipeline'u oraz przed logowaniem wyjść modelu.

Chroni dane osobowe (PESEL, NIP, e-mail itp.) z zachowaniem:
- sygnatur akt sądowych (dane publiczne, niezbędne dla RAG/SAOS)
- dat (niezbędne dla timeline_builder / deadline_engine)
- spójnego mapowania encji w ramach sesji ([OSOBA_1] zamiast [ZANONIMIZOWANO])
"""
from __future__ import annotations

import hashlib
import re
from typing import Dict, Optional, Tuple

# ---------------------------------------------------------------------------
# Wzorce sygnatur akt sądowych (WHITELIST — nie maskujemy)
# ---------------------------------------------------------------------------
# Przykłady: I ACa 123/24, II SA/Wr 456/23, IV CSK 78/22, III CZP 1/21
_COURT_SIGNATURE_RE = re.compile(
    r"\b[IVX]{1,4}\s+"                        # numer wydziału (I, II, IV, XII)
    r"[A-Z]{1,4}(?:[a-z]{0,3})?"              # kategoria (ACa, SA, CSK, CZP, C, K)
    r"(?:/[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]{1,4})?"  # oddział (SA/Wr, SA/Wa)
    r"\s+\d{1,6}/\d{2,4}\b"                   # numer/rok
)

# Sygnatury KRS, KW, NKW — też publiczne
_REGISTRY_RE = re.compile(
    r"\b(?:KRS|KW|NKW)\s*[:\-]?\s*[A-Z0-9/]{4,20}\b",
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Walidacja PESEL (suma kontrolna modulo 10)
# ---------------------------------------------------------------------------
_PESEL_WEIGHTS = (1, 3, 7, 9, 1, 3, 7, 9, 1, 3)


def _is_valid_pesel(digits: str) -> bool:
    """Sprawdza sumę kontrolną PESEL — odrzuca przypadkowe 11-cyfrowe ciągi."""
    if len(digits) != 11 or not digits.isdigit():
        return False
    total = sum(int(d) * w for d, w in zip(digits, _PESEL_WEIGHTS))
    check = (10 - (total % 10)) % 10
    return check == int(digits[10])


# ---------------------------------------------------------------------------
# Spójne mapowanie encji (deterministyczne w ramach wywołania)
# ---------------------------------------------------------------------------
class _EntityMapper:
    """Przypisuje spójne etykiety anonimizacji: [OSOBA_1], [FIRMA_2] itp."""

    def __init__(self) -> None:
        self._map: Dict[str, str] = {}
        self._counters: Dict[str, int] = {}

    def get_label(self, original: str, category: str = "DANE") -> str:
        key = f"{category}:{original}"
        if key in self._map:
            return self._map[key]
        count = self._counters.get(category, 0) + 1
        self._counters[category] = count
        label = f"[{category}_{count}]"
        self._map[key] = label
        return label


# ---------------------------------------------------------------------------
# Wzorce PII do maskowania
# ---------------------------------------------------------------------------
# PESEL — 11 cyfr z walidacją sumy kontrolnej
_PESEL_RE = re.compile(r"\b(\d{11})\b")

# Dowód osobisty — 3 litery + 6 cyfr
_ID_CARD_RE = re.compile(r"\b([A-Za-z]{3}\d{6})\b")

# E-mail
_EMAIL_RE = re.compile(
    r"\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b"
)

# NIP — 10 cyfr (ale NIE sygnatury akt, które mają separatory)
_NIP_RE = re.compile(r"\b(\d{10})\b")

# REGON — 9 lub 14 cyfr
_REGON_RE = re.compile(r"\b(\d{9})\b|\b(\d{14})\b")

# Telefon — +48 xxx xxx xxx lub 9 cyfr ze spacjami
_PHONE_RE = re.compile(
    r"\b(\+48\s*\d{3}\s*\d{3}\s*\d{3})\b"
    r"|\b(\d{3}\s+\d{3}\s+\d{3})\b"
)

# Numer konta bankowego — 26 cyfr (IBAN PL)
_IBAN_RE = re.compile(r"\b(PL\s*)?\d{2}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b")


# ---------------------------------------------------------------------------
# Ochrona regionów (sygnatury) przed maskowaniem
# ---------------------------------------------------------------------------
def _find_protected_ranges(text: str) -> list[Tuple[int, int]]:
    """Zbiera zakresy znaków, które NIE powinny być maskowane."""
    protected: list[Tuple[int, int]] = []
    for pattern in (_COURT_SIGNATURE_RE, _REGISTRY_RE):
        for m in pattern.finditer(text):
            protected.append((m.start(), m.end()))
    return protected


def _is_in_protected(pos: int, end: int, protected: list[Tuple[int, int]]) -> bool:
    """Czy pozycja znajduje się wewnątrz chronionego zakresu."""
    for ps, pe in protected:
        if ps <= pos < pe or ps < end <= pe:
            return True
    return False


# ---------------------------------------------------------------------------
# Główna funkcja maskowania
# ---------------------------------------------------------------------------
def mask_pii(text: str, *, mapper: Optional[_EntityMapper] = None) -> str:
    """Maskuje PII z zachowaniem sygnatur akt sądowych i spójnym mapowaniem.

    Args:
        text: Tekst do anonimizacji.
        mapper: Opcjonalny mapper encji dla spójnych etykiet w ramach sesji.
                Jeśli None, każde wywołanie tworzy nowy mapper.
    """
    if not text:
        return ""

    if mapper is None:
        mapper = _EntityMapper()

    protected = _find_protected_ranges(text)

    # PESEL — z walidacją sumy kontrolnej
    def _replace_pesel(m: re.Match) -> str:
        if _is_in_protected(m.start(), m.end(), protected):
            return m.group(0)
        if _is_valid_pesel(m.group(1)):
            return mapper.get_label(m.group(1), "PESEL")
        return m.group(0)

    text = _PESEL_RE.sub(_replace_pesel, text)

    # Dowód osobisty
    def _replace_id(m: re.Match) -> str:
        if _is_in_protected(m.start(), m.end(), protected):
            return m.group(0)
        return mapper.get_label(m.group(0), "DOWÓD")

    text = _ID_CARD_RE.sub(_replace_id, text)

    # E-mail
    def _replace_email(m: re.Match) -> str:
        if _is_in_protected(m.start(), m.end(), protected):
            return m.group(0)
        return mapper.get_label(m.group(0), "EMAIL")

    text = _EMAIL_RE.sub(_replace_email, text)

    # IBAN (konto bankowe)
    def _replace_iban(m: re.Match) -> str:
        if _is_in_protected(m.start(), m.end(), protected):
            return m.group(0)
        return mapper.get_label(m.group(0), "KONTO")

    text = _IBAN_RE.sub(_replace_iban, text)

    # NIP — 10 cyfr (ale nie części sygnatur/numerów faktur)
    def _replace_nip(m: re.Match) -> str:
        if _is_in_protected(m.start(), m.end(), protected):
            return m.group(0)
        return mapper.get_label(m.group(1), "NIP")

    text = _NIP_RE.sub(_replace_nip, text)

    # REGON — 9 lub 14 cyfr
    def _replace_regon(m: re.Match) -> str:
        if _is_in_protected(m.start(), m.end(), protected):
            return m.group(0)
        val = m.group(1) or m.group(2)
        return mapper.get_label(val, "REGON")

    text = _REGON_RE.sub(_replace_regon, text)

    # Telefon
    def _replace_phone(m: re.Match) -> str:
        if _is_in_protected(m.start(), m.end(), protected):
            return m.group(0)
        val = m.group(1) or m.group(2)
        return mapper.get_label(val, "TELEFON")

    text = _PHONE_RE.sub(_replace_phone, text)

    return text
