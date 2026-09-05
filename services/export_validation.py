"""Export Gate — deterministyczna bramka walidacji cytowań przed DOCX/PDF.

Zapobiega eksportowi pisma z niezweryfikowanymi powołaniami prawnymi.
Wpięcie: routes/documents.py endpoint /export-docx, PRZED markdown_to_docx_bytes().

Architektura:
    1. Ekstrakcja: wyciąga cytaty art./§ z finalnego Markdown
    2. Weryfikacja: sprawdza każdy cytat wobec:
       - korpusu z sesji (RAG legal + user + ELI + SAOS)
       - opcjonalnie: cache sesji audit-trail
    3. Decyzja: pass/warn/block + lista niezweryfikowanych

Integracja z Lex Machina: adaptacja konceptu export_gate.py (bramka
deterministyczna) do istniejącej infrastruktury CitationGuard LexMind.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

from services.citation_guard import (
    ArticleCitation,
    build_verification_corpus,
    extract_citations,
    is_citation_verified,
)

logger = logging.getLogger(__name__)


@dataclass
class ExportValidationResult:
    """Wynik bramki eksportowej."""

    passed: bool
    total_citations: int
    verified_count: int
    unverified_count: int
    unverified_citations: List[str] = field(default_factory=list)
    action: str = "allow"  # allow / warn / block
    details: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "passed": self.passed,
            "total_citations": self.total_citations,
            "verified_count": self.verified_count,
            "unverified_count": self.unverified_count,
            "unverified_citations": self.unverified_citations,
            "action": self.action,
            "details": self.details,
        }


def validate_export(
    document_text: str,
    *,
    verification_corpus: str = "",
    legal_results: Optional[List[Dict[str, Any]]] = None,
    user_results: Optional[List[Dict[str, Any]]] = None,
    saos_results: Optional[List[Dict[str, Any]]] = None,
    eli_results: Optional[List[Dict[str, Any]]] = None,
    expert_analysis: str = "",
    legal_basis_text: str = "",
    mode: str = "warn",
) -> ExportValidationResult:
    """Waliduje cytowania w gotowym tekście pisma przed eksportem DOCX.

    Args:
        document_text: Finalny Markdown pisma do eksportu.
        verification_corpus: Opcjonalny pre-built corpus (z sesji pipeline).
        legal_results: Wyniki RAG z bazy prawnej.
        user_results: Wyniki RAG z dokumentów użytkownika.
        saos_results: Wyniki z SAOS.
        eli_results: Wyniki z ELI/ISAP.
        expert_analysis: Tekst debaty ekspertów (jeśli dostępny).
        legal_basis_text: Blok podstaw prawnych z pipeline.
        mode: "off" / "warn" / "strict"
            - off: brak walidacji, zawsze allow
            - warn: walidacja, ale pozwala eksport z ostrzeżeniem
            - strict: blokuje eksport jeśli są niezweryfikowane cytaty

    Returns:
        ExportValidationResult z decyzją i listą niezweryfikowanych.
    """
    if mode == "off" or not document_text:
        return ExportValidationResult(
            passed=True,
            total_citations=0,
            verified_count=0,
            unverified_count=0,
            action="allow",
        )

    # 1. Ekstrakcja cytowań z pisma
    citations = extract_citations(document_text)
    if not citations:
        return ExportValidationResult(
            passed=True,
            total_citations=0,
            verified_count=0,
            unverified_count=0,
            action="allow",
        )

    # 2. Budowa korpusu weryfikacyjnego (jeśli nie dostarczony)
    if not verification_corpus:
        verification_corpus = build_verification_corpus(
            document_text="",
            combined_context="",
            legal_results=legal_results,
            user_results=user_results,
            saos_results=saos_results,
            eli_results=eli_results,
            expert_analysis=expert_analysis,
            legal_basis_text=legal_basis_text,
        )

    # 3. Weryfikacja każdego cytatu
    verified: List[ArticleCitation] = []
    unverified: List[ArticleCitation] = []
    details: List[Dict[str, Any]] = []

    for cite in citations:
        is_ok = is_citation_verified(
            cite,
            verification_corpus,
            expert_analysis=expert_analysis,
            legal_results=legal_results,
            trust_expert_debate=True,
            trust_legal_kb=True,
        )
        if is_ok:
            verified.append(cite)
            details.append({
                "citation": cite.raw,
                "key": cite.key,
                "act": cite.act_code,
                "status": "verified",
            })
        else:
            unverified.append(cite)
            details.append({
                "citation": cite.raw,
                "key": cite.key,
                "act": cite.act_code,
                "status": "unverified",
            })

    # 4. Decyzja
    has_unverified = len(unverified) > 0
    unverified_keys = [c.raw for c in unverified]

    if mode == "strict" and has_unverified:
        action = "block"
        passed = False
    elif mode == "warn" and has_unverified:
        action = "warn"
        passed = True  # pozwalamy, ale z ostrzeżeniem
    else:
        action = "allow"
        passed = True

    result = ExportValidationResult(
        passed=passed,
        total_citations=len(citations),
        verified_count=len(verified),
        unverified_count=len(unverified),
        unverified_citations=unverified_keys,
        action=action,
        details=details,
    )

    logger.info(
        "[EXPORT_GATE] citations=%d verified=%d unverified=%d action=%s",
        result.total_citations,
        result.verified_count,
        result.unverified_count,
        result.action,
    )

    return result
