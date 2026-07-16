"""Budowa przypisów z pełnym brzmieniem przepisów do weryfikacji w UI."""
from __future__ import annotations

import os
import re
import httpx
from typing import Any, Dict, List, Optional, Set

from services.citation_eli_l1 import fetch_eli_act_text

from services.citation_guard import (
    ArticleCitation,
    build_verification_corpus,
    citation_display_label,
    extract_citations,
    is_citation_verified,
)
from services.retrieval.types import RetrievalItem, get_retrieval_title


def _rows_blob(rows: Optional[List[RetrievalItem]]) -> str:
    if not rows:
        return ""
    parts: List[str] = []
    for row in rows:
        parts.append(row.get("content") or "")
        parts.append(get_retrieval_title(row))
    return "\n".join(parts)


def _extract_excerpt_from_text(text: str, cite: ArticleCitation, max_chars: int = 12_000) -> str:
    if not text:
        return ""
    num = cite.article_num
    par = cite.paragraph
    if par:
        start_pat = rf"(?is)\bart\.?\s*{re.escape(num)}\s*\.?\s*(?:§|ust\.?|ustęp)?\s*\.?\s*{re.escape(par)}\b"
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



async def _fetch_excerpt_from_supabase_by_article(cite: ArticleCitation) -> str:
    """
    Wykonuje zapytanie do tabeli knowledge_base_legal w Supabase szukając artykułu.
    Filtruje za pomocą ilike po content (np. '%art. X%').
    Następnie dopasowuje wyniki w Pythonie po nazwie aktu (act_code).
    """
    supabase_url = os.getenv("SUPABASE_URL") or ""
    supabase_key = os.getenv("SUPABASE_ANON_KEY") or ""
    if not supabase_url or not supabase_key:
        return ""

    num = cite.article_num
    url = f"{supabase_url.rstrip('/')}/rest/v1/knowledge_base_legal"
    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "apikey": supabase_key,
        "Accept": "application/json",
    }
    
    # Szukamy zarówno "art. <num>" jak i "artykuł <num>" ze zwiększonym limitem do 100
    params = {
        "or": f"(content.ilike.%art. {num}%,content.ilike.%artykuł {num}%)",
        "limit": "100"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=headers, params=params)
        if res.status_code != 200:
            return ""
        rows = res.json()
        if not rows or not isinstance(rows, list):
            return ""

        # Słownik słów kluczowych dla aktów prawnych w języku polskim
        keywords_map = {
            "kpk": ["karn", "k.p.k"],
            "kk": ["karn", "k.k", "kodeks karny", "k.k."],
            "kpa": ["administrac", "k.p.a"],
            "kpc": ["cywiln", "k.p.c", "postępowania cywilnego"],
            "kc": ["cywiln", "k.c", "k.c."],
            "kp": ["pracy", "k.p"],
            "ppsa": ["sądami administracyjnymi", "p.p.s.a", "ppsa"],
            "op": ["podatkow", "ordynac", "o.p."],
            "upea": ["egzekucyj", "u.p.e.a", "upea"],
            "upn": ["narkoman", "u.p.n.", "upn", "przeciwdziałaniu narkomanii"],
            "u.p.n.": ["narkoman", "u.p.n.", "upn", "przeciwdziałaniu narkomanii"],
            "kw": ["wykrocz", "k.w.", "k.w"],
        }

        # KROK 1: Najpierw szukamy wierszy, które pasują do act_code
        if cite.act_code:
            act_code_lower = cite.act_code.lower()
            matching_rows = []
            for row in rows:
                meta = row.get("metadata") or {}
                filename = str(meta.get("filename") or "").lower()
                content = str(row.get("content") or "").lower()
                
                # Sprawdzamy czy act_code lub powiązane słowa kluczowe są w nazwie pliku lub treści
                is_match = act_code_lower in filename
                
                # Reguły disambiguacji najczęstszych kolizji nazw aktów
                if act_code_lower == "kk" and ("postępowania" in filename or "skarbowy" in filename or "wykonawczy" in filename):
                    is_match = False
                if act_code_lower == "kc" and ("postępowania" in filename or "handlowych" in filename):
                    is_match = False
                if act_code_lower == "kp" and ("postępowania" in filename or "karnego" in filename or "cywilnego" in filename or "administracyjnego" in filename):
                    is_match = False
                if act_code_lower == "kpk" and ("postępowania" not in filename or "skarbowy" in filename):
                    is_match = False
                if act_code_lower == "kpc" and "postępowania" not in filename:
                    is_match = False
                
                if not is_match:
                    for kw in keywords_map.get(act_code_lower, []):
                        if kw in filename:
                            is_match = True
                            if act_code_lower == "kk" and ("postępowania" in filename or "skarbowy" in filename or "wykonawczy" in filename):
                                is_match = False
                            if act_code_lower == "kc" and ("postępowania" in filename or "handlowych" in filename):
                                is_match = False
                            if act_code_lower == "kp" and ("postępowania" in filename or "karnego" in filename or "cywilnego" in filename or "administracyjnego" in filename):
                                is_match = False
                            if act_code_lower == "kpk" and ("postępowania" not in filename or "skarbowy" in filename):
                                is_match = False
                            if act_code_lower == "kpc" and "postępowania" not in filename:
                                is_match = False
                            break
                if is_match:
                    matching_rows.append(row)
            
            # Przeszukujemy dopasowane wiersze (z rankingiem dla "Art. [Num]")
            ranked_rows = []
            for row in matching_rows:
                content = row.get("content") or ""
                has_capital_art = bool(re.search(rf"\bArt\.\s*{re.escape(num)}\b", content))
                score = 100 if has_capital_art else 0
                ranked_rows.append((score, row))
            ranked_rows.sort(key=lambda x: x[0], reverse=True)

            for score, row in ranked_rows:
                content = row.get("content") or ""
                excerpt = _extract_excerpt_from_text(content, cite)
                if excerpt:
                    return excerpt
            
            # Jeśli act_code jest podany i nie znaleziono dopasowania, NIE robimy ogólnego fallbacku (KROK 2),
            # aby umożliwić pobranie z API ELI.
            return ""

        # KROK 2: Jeśli brak dopasowania do act_code (lub brak act_code), bierzemy dowolny wiersz z pasującym fragmentem
        ranked_all_rows = []
        for row in rows:
            content = row.get("content") or ""
            has_capital_art = bool(re.search(rf"\bArt\.\s*{re.escape(num)}\b", content))
            score = 100 if has_capital_art else 0
            ranked_all_rows.append((score, row))
        ranked_all_rows.sort(key=lambda x: x[0], reverse=True)

        for score, row in ranked_all_rows:
            content = row.get("content") or ""
            excerpt = _extract_excerpt_from_text(content, cite)
            if excerpt:
                return excerpt

    except Exception:
        pass
    return ""


async def _find_excerpt(
    cite: ArticleCitation,
    *,
    legal_results: Optional[List[RetrievalItem]],
    eli_results: Optional[List[RetrievalItem]],
    document_text: str,
    combined_context: str,
    legal_basis_text: str,
) -> tuple[str, str]:
    """Zwraca (excerpt, source_type) — RAG prawny, blok prawny, ELI, Supabase lub ELI API."""
    # Przeszukujemy wyłącznie oryginalne źródła prawne (RAG legal, blok prawny, ELI RAG).
    # Wykluczamy document_text oraz combined_context, gdyż są to opisy spraw/dokumentów klienta.
    search_order = (
        (_rows_blob(legal_results), "law"),
        (legal_basis_text or "", "law"),
        (_rows_blob(eli_results), "eli"),
    )
    for blob, source_type in search_order:
        ex = _extract_excerpt_from_text(blob, cite)
        if ex:
            return ex, source_type

    # 1. Fallback: Dynamiczne pobieranie z Supabase (knowledge_base_legal)
    db_ex = await _fetch_excerpt_from_supabase_by_article(cite)
    if db_ex:
        return db_ex, "law"

    # 2. Fallback: Dynamiczne pobieranie pełnej treści aktu przez ELI Sejm API
    if cite.act_code:
        try:
            eli_blob = await fetch_eli_act_text(cite.act_code)
            if eli_blob:
                eli_ex = _extract_excerpt_from_text(eli_blob, cite)
                if eli_ex:
                    return eli_ex, "eli"
        except Exception:
            pass

    return "", "unknown"


async def build_cited_sources_for_answer(
    answer_text: str,
    *,
    document_text: str = "",
    combined_context: str = "",
    legal_basis_text: str = "",
    legal_results: Optional[List[RetrievalItem]] = None,
    saos_results: Optional[List[RetrievalItem]] = None,
    eli_results: Optional[List[RetrievalItem]] = None,
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

        excerpt, source_type = await _find_excerpt(
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
            # Sprawdzenie bez względu na wielkość liter, czy sygnatura występuje w odpowiedzi
            if sygn.lower() not in (answer_text or "").lower():
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
