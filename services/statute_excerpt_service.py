"""Budowa przypisów z pełnym brzmieniem przepisów do weryfikacji w UI."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set

from services.citation_guard import (
    ArticleCitation,
    build_verification_corpus,
    citation_display_label,
    extract_citations,
    is_citation_verified,
)


def _rows_blob(rows: Optional[List[Dict[str, Any]]]) -> str:
    if not rows:
        return ""
    parts: List[str] = []
    for row in rows:
        parts.append(row.get("content") or "")
        parts.append(row.get("title") or row.get("tytul") or "")
    return "\n".join(parts)


def _extract_excerpt_from_text(text: str, cite: ArticleCitation, max_chars: int = 12_000) -> str:
    if not text:
        return ""
    num = cite.article_num
    par = cite.paragraph
    if par:
        start_pat = (
            rf"(?is)\bart\.?\s*{re.escape(num)}\s*§\s*{re.escape(par)}"
            rf"(?:\s+pkt\.?\s*\d+)*"
        )
    else:
        start_pat = rf"(?is)\bart\.?\s*{re.escape(num)}\b"
    m = re.search(start_pat, text)
    if not m:
        m = re.search(rf"(?is)\bartykuł\s*{re.escape(num)}\b", text)
    if not m:
        return ""
    start = m.start()
    rest = text[start:]
    next_art = re.search(r"(?is)(?:\n\s*|\.\s+)(?:art\.?\s*\d|artykuł\s*\d)", rest[40:])
    end = start + (40 + next_art.start()) if next_art else min(len(text), start + max_chars)
    excerpt = text[start:end].strip()
    if len(excerpt) > max_chars:
        excerpt = excerpt[:max_chars].rstrip() + "\n\n[… fragment obcięty — sprawdź ISAP]"
    return excerpt


def _find_excerpt(
    cite: ArticleCitation,
    *,
    legal_results: Optional[List[Dict[str, Any]]],
    eli_results: Optional[List[Dict[str, Any]]],
    document_text: str,
    combined_context: str,
    legal_basis_text: str,
) -> tuple[str, str]:
    """Zwraca (excerpt, source_type) — RAG prawny, blok prawny, ELI, kontekst, akta."""
    search_order = (
        (_rows_blob(legal_results), "law"),
        (legal_basis_text or "", "law"),
        (_rows_blob(eli_results), "eli"),
        (combined_context or "", "law"),
        (document_text or "", "document"),
    )
    for blob, source_type in search_order:
        ex = _extract_excerpt_from_text(blob, cite)
        if ex:
            return ex, source_type
    return "", "unknown"


def build_cited_sources_for_answer(
    answer_text: str,
    *,
    document_text: str = "",
    combined_context: str = "",
    legal_basis_text: str = "",
    legal_results: Optional[List[Dict[str, Any]]] = None,
    saos_results: Optional[List[Dict[str, Any]]] = None,
    eli_results: Optional[List[Dict[str, Any]]] = None,
    expert_analysis: str = "",
    hallucinated_keys: Optional[Set[str]] = None,
    max_sources: int = 24,
) -> List[Dict[str, Any]]:
    """
    Dla każdego art. w odpowiedzi buduje przypis z pełnym brzmieniem (jeśli znaleziono w źródłach).
    """
    if not (answer_text or "").strip():
        return []

    citations = extract_citations(answer_text)
    if not citations:
        citations = []

    corpus = build_verification_corpus(
        document_text=document_text,
        combined_context=combined_context,
        legal_results=legal_results,
        eli_results=eli_results,
        expert_analysis=expert_analysis,
        legal_basis_text=legal_basis_text,
    )
    hallucinated = hallucinated_keys or set()
    out: List[Dict[str, Any]] = []
    seen: Set[str] = set()

    for cite in citations:
        if len(out) >= max_sources:
            break
        label = citation_display_label(cite)
        if label in seen:
            continue
        seen.add(label)

        excerpt, source_type = _find_excerpt(
            cite,
            legal_results=legal_results,
            eli_results=eli_results,
            document_text=document_text,
            combined_context=combined_context,
            legal_basis_text=legal_basis_text,
        )
        verified = is_citation_verified(
            cite,
            corpus,
            expert_analysis=expert_analysis,
            legal_results=legal_results,
            trust_expert_debate=True,
            trust_legal_kb=True,
            require_legal_rag=False,
        )
        if cite.key in hallucinated or label in hallucinated:
            verified = False

        idx = len(out) + 1
        ref_id = f"[{idx}]"
        if excerpt:
            snippet = excerpt[:320] + ("…" if len(excerpt) > 320 else "")
        elif verified:
            snippet = "Przepis zweryfikowany — kliknij ikonę 📖 obok cytatu lub rozwiń sekcję poniżej."
        else:
            snippet = "Brak pełnego brzmienia w RAG — sprawdź ISAP przed działaniem."

        out.append(
            {
                "ref_id": ref_id,
                "label": label,
                "source_type": source_type if excerpt else ("law" if verified else "unverified"),
                "snippet": snippet,
                "full_text": excerpt or None,
                "verified": verified,
                "url": "https://isap.sejm.gov.pl/",
            }
        )

    if saos_results and len(out) < max_sources:
        for row in saos_results:
            if len(out) >= max_sources:
                break
            if not isinstance(row, dict):
                continue
            sygn = str(row.get("sygnatura") or "").strip()
            if not sygn:
                continue
            if not re.search(
                rf"(?i)\bsygn\.?(?:\s*akt\.?)?\s*{re.escape(sygn)}\b",
                answer_text or "",
            ):
                if sygn not in (answer_text or ""):
                    continue
            label = f"Wyrok (SAOS) — sygn. {sygn}"
            if label in seen:
                continue
            seen.add(label)
            content = (row.get("full_text") or row.get("content") or "").strip()
            idx = len(out) + 1
            ref_id = f"[{idx}]"
            snippet = content[:320] + ("…" if len(content) > 320 else "") if content else f"Sygnatura: {sygn}"
            saos_id = row.get("id")
            url = (
                f"https://www.saos.org.pl/judgments/{saos_id}"
                if saos_id
                else "https://www.saos.org.pl/"
            )
            out.append(
                {
                    "ref_id": ref_id,
                    "label": label,
                    "source_type": "judgment",
                    "snippet": snippet,
                    "full_text": content or None,
                    "verified": True,
                    "url": url,
                }
            )

    return out
