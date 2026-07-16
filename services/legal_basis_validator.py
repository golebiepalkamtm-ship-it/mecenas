"""Real-time Legal Basis Validator — sidecar blokujący hallucynowane artykuły.

Paradygmat: zapobieganie błędów > naprawa błędów.
Ekspert fizycznie nie może wygenerować nieistniejącego artykułu,
bo sidecar odrzuca go *w trakcie* pipeline'u, nie po fakcie.

Architektura:
    1. Pre-fetch: ValidArticlesCache budowany z RAG results (Etap 6.5)
    2. Validate: po każdym run_agent — walidacja legal_basis per argument
    3. Reject/Suggest: invalid basis → lista najbliższych artykułów z hash set
    4. Retry: ekspert regeneruje TYLKO odrzucone argumenty (max 1 retry)
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, FrozenSet, List, Optional, Set, Tuple

from services.retrieval.types import get_retrieval_title

logger = logging.getLogger(__name__)

# --- Regex do ekstrakcji artykułów z tekstu RAG ---

_ART_RE = re.compile(
    r"\bart\.?\s*(\d+[a-z]?)"
    r"(?:\s*§\s*(\d+))?"
    r"(?:\s+ust\.?\s*(\d+))?",
    re.IGNORECASE,
)

_ARTYKUL_RE = re.compile(
    r"\bartykuł\s*(\d+[a-z]?)"
    r"(?:\s*§\s*(\d+))?",
    re.IGNORECASE,
)


def _normalize_basis(raw: str) -> str:
    """Normalizuje zapis artykułu do kanonicznej formy porównawczej.

    'Art. 77 § 1 O.p.' → 'art. 77 §1'
    'art. 415 KC'      → 'art. 415'
    'artykuł 58'        → 'art. 58'
    """
    text = raw.strip().lower()
    text = re.sub(r"\bartykuł\b", "art.", text)
    text = re.sub(r"\s+", " ", text)

    # Wyciągnij numer artykułu i paragraf
    m = re.search(r"art\.?\s*(\d+[a-z]?)(?:\s*§\s*(\d+))?", text)
    if not m:
        return text.strip()

    num = m.group(1)
    par = m.group(2)
    if par:
        return f"art. {num} §{par}"
    return f"art. {num}"


def extract_article_keys_from_text(text: str) -> Set[str]:
    """Wyciąga wszystkie unikalne klucze artykułów z bloku tekstu RAG/ELI/SAOS."""
    if not text:
        return set()
    keys: Set[str] = set()
    for pattern in (_ART_RE, _ARTYKUL_RE):
        for m in pattern.finditer(text):
            num = m.group(1).lower()
            par = m.group(2) if len(m.groups()) >= 2 else None
            key = f"art. {num}"
            if par:
                key += f" §{par}"
            keys.add(key)
            # Dodaj też bez paragrafu — art. 77 matchuje art. 77 §1
            if par:
                keys.add(f"art. {num}")
    return keys


@dataclass
class ValidationResult:
    """Wynik walidacji jednej podstawy prawnej."""
    basis: str
    normalized: str
    is_valid: bool
    nearest_suggestions: List[str] = field(default_factory=list)


@dataclass
class ValidatedAnalysis:
    """Wynik walidacji pełnej analizy eksperta."""
    all_valid: bool
    validated_count: int
    rejected_count: int
    results: List[ValidationResult] = field(default_factory=list)
    rejected_argument_ids: List[str] = field(default_factory=list)


class ValidArticlesCache:
    """In-memory hash set artykułów obecnych w kontekście RAG.

    Budowany raz na początku pipeline'u (Etap 6.5), odpytywany
    z zerowym kosztem (~0ms per lookup) podczas walidacji (Etap 8).
    """

    def __init__(self, article_keys: FrozenSet[str], raw_corpus: str = ""):
        self._keys = article_keys
        self._raw_corpus = raw_corpus.lower()
        self._sorted_keys = sorted(article_keys)  # dla sugestii

    @classmethod
    def build_from_rag_results(
        cls,
        legal_results: Optional[List[Dict[str, Any]]] = None,
        user_results: Optional[List[Dict[str, Any]]] = None,
        saos_results: Optional[List[Dict[str, Any]]] = None,
        eli_results: Optional[List[Dict[str, Any]]] = None,
        document_text: str = "",
    ) -> "ValidArticlesCache":
        """Buduje cache z wyników RAG retrieval (Etap 6/7).

        Single-pass O(n) — zero latency overhead. Wywoływany raz.
        """
        all_keys: Set[str] = set()
        corpus_parts: List[str] = []

        for batch in (legal_results, user_results, saos_results, eli_results):
            if not batch:
                continue
            for row in batch:
                content = row.get("content") or ""
                title = get_retrieval_title(row)
                blob = f"{title} {content}"
                corpus_parts.append(blob)
                all_keys.update(extract_article_keys_from_text(blob))

        if document_text:
            corpus_parts.append(document_text)
            all_keys.update(extract_article_keys_from_text(document_text))

        corpus = "\n".join(corpus_parts)

        logger.info(
            "[SIDECAR] ValidArticlesCache built: %d unique article keys from %d sources",
            len(all_keys),
            sum(len(b or []) for b in (legal_results, user_results, saos_results, eli_results) if b),
        )

        return cls(frozenset(all_keys), corpus)

    @property
    def size(self) -> int:
        return len(self._keys)

    @property
    def keys(self) -> FrozenSet[str]:
        return self._keys

    def contains(self, basis: str) -> bool:
        """Sprawdza czy artykuł istnieje w cache (O(1) hash lookup)."""
        normalized = _normalize_basis(basis)
        if normalized in self._keys:
            return True
        # Fallback: sprawdź czy numer artykułu występuje w surowym korpusie
        # (np. "art. 77" w tekście "Na podstawie art. 77 ordynacji podatkowej...")
        if normalized in self._raw_corpus:
            return True
        return False

    def suggest_nearest(self, invalid_basis: str, top_k: int = 5) -> List[str]:
        """Sugeruje najbliższe artykuły z cache (levenshtein na znormalizowanych kluczach).

        Koszt: O(n) scan po ~200-1000 kluczach — nadal <1ms.
        """
        if not self._sorted_keys:
            return []

        normalized = _normalize_basis(invalid_basis)

        # Szybki heurystyczny ranking: artykuły o zbliżonym numerze
        try:
            m = re.search(r"(\d+)", normalized)
            if not m:
                return self._sorted_keys[:top_k]
            target_num = int(m.group(1))
        except (ValueError, AttributeError):
            return self._sorted_keys[:top_k]

        scored: List[Tuple[int, str]] = []
        for key in self._sorted_keys:
            km = re.search(r"(\d+)", key)
            if not km:
                continue
            try:
                diff = abs(int(km.group(1)) - target_num)
                scored.append((diff, key))
            except ValueError:
                continue

        scored.sort(key=lambda x: x[0])
        return [s[1] for s in scored[:top_k]]


def validate_single_basis(basis: str, cache: ValidArticlesCache) -> ValidationResult:
    """Waliduje pojedynczą podstawę prawną przeciwko cache.

    Returns:
        ValidationResult z is_valid=True jeśli artykuł istnieje w korpusie.
    """
    normalized = _normalize_basis(basis)
    is_valid = cache.contains(basis)

    suggestions: List[str] = []
    if not is_valid:
        suggestions = cache.suggest_nearest(basis, top_k=5)
        logger.warning(
            "[SIDECAR] REJECTED basis '%s' (normalized: '%s') — nearest: %s",
            basis,
            normalized,
            suggestions[:3],
        )

    return ValidationResult(
        basis=basis,
        normalized=normalized,
        is_valid=is_valid,
        nearest_suggestions=suggestions,
    )


def validate_expert_arguments(
    analysis_json: Dict[str, Any],
    cache: ValidArticlesCache,
) -> ValidatedAnalysis:
    """Waliduje pełną analizę eksperta (ExpertAnalysis jako dict po parsowaniu JSON).

    Iteruje po key_arguments → legal_basis → validate_single_basis().
    Ustawia validated=True/False per argument i zwraca raport.
    """
    arguments = analysis_json.get("key_arguments", [])
    if not arguments:
        return ValidatedAnalysis(
            all_valid=True, validated_count=0, rejected_count=0
        )

    total_valid = 0
    total_rejected = 0
    all_results: List[ValidationResult] = []
    rejected_ids: List[str] = []

    for arg in arguments:
        bases = arg.get("legal_basis", [])
        # Backward compat: stara schema miała legal_basis jako string
        if isinstance(bases, str):
            bases = [bases] if bases.strip() else []
            arg["legal_basis"] = bases

        arg_valid = True
        for basis in bases:
            result = validate_single_basis(basis, cache)
            all_results.append(result)
            if not result.is_valid:
                arg_valid = False

        if arg_valid:
            arg["validated"] = True
            total_valid += 1
        else:
            arg["validated"] = False
            total_rejected += 1
            rejected_ids.append(arg.get("id", "UNKNOWN"))

    all_ok = total_rejected == 0

    if all_ok:
        logger.info(
            "[SIDECAR] All %d arguments validated ✓ (cache size: %d)",
            total_valid,
            cache.size,
        )
    else:
        logger.warning(
            "[SIDECAR] %d/%d arguments REJECTED — IDs: %s",
            total_rejected,
            total_valid + total_rejected,
            rejected_ids,
        )

    return ValidatedAnalysis(
        all_valid=all_ok,
        validated_count=total_valid,
        rejected_count=total_rejected,
        results=all_results,
        rejected_argument_ids=rejected_ids,
    )


def build_regeneration_prompt(
    rejected_results: List[ValidationResult],
    original_argument: Dict[str, Any],
    available_articles: List[str],
) -> str:
    """Buduje prompt do regeneracji odrzuconego argumentu.

    Ekspert dostaje: swój oryginalny argument + informację co było błędne
    + listę dostępnych artykułów z korpusu.
    """
    rejected_bases = [r.basis for r in rejected_results if not r.is_valid]
    suggestions = []
    for r in rejected_results:
        if not r.is_valid:
            suggestions.extend(r.nearest_suggestions[:3])
    suggestions = list(dict.fromkeys(suggestions))  # deduplicate preserving order

    return (
        f"Twój argument '{original_argument.get('argument_short', '')}' "
        f"zawierał NIEISTNIEJĄCE podstawy prawne: {', '.join(rejected_bases)}.\n\n"
        f"Te artykuły NIE występują w dostarczonym korpusie prawnym.\n"
        f"Dostępne artykuły najbliższe tematycznie: {', '.join(suggestions[:8])}.\n\n"
        f"Pełna lista dostępnych artykułów (fragment): {', '.join(available_articles[:20])}\n\n"
        f"ZREGENERUJ ten argument używając WYŁĄCZNIE artykułów z powyższej listy. "
        f"Zachowaj oryginalną logikę argumentu, zmień tylko legal_basis na istniejące przepisy."
    )
