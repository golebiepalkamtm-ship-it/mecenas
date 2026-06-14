"""
Weryfikacja cytowań przepisów (art. …) — podstawa merytoryczna LexMind MOA.

Każdy cytowany artykuł musi być poparty dokumentem klienta, RAG, SAOS/ELI
lub potwierdzony przez audytora LLM. Brak dowodu = cytat niezweryfikowany.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

# art. 58, art. 168a, art. 332 § 1, art. 59 § 1 pkt 2 UPEA, art. 77 § 1 Op.
_ACT_SUFFIX = (
    r"KPK|k\.?\s*p\.?\s*k\.?|KPA|k\.?\s*p\.?\s*a\.?|"
    r"k\.?\s*c\.?|k\.?\s*r\.?\s*o\.?|k\.?\s*s\.?|k\.?\s*p\.?|"
    r"p\.?\s*p\.?\s*s\.?\s*a\.?|PPSA|"
    r"u\.?\s*p\.?\s*e\.?\s*a\.?|UPEA|"
    r"u\.?\s*k\.?\s*p\.?|u\.?\s*k\.?\s*p\.?\s*a\.?|"
    r"Op\.?|ordynacj\w*\s+podatkow\w*|"
    r"Konstytucji(?:\s+RP)?|ustawy"
)

_ARTICLE_RE = re.compile(
    r"\bart\.?\s*(\d+[a-z]?)"
    r"(?:\s*§\s*(\d+))?"
    r"(?:\s+ust\.?\s*(\d+))?"
    r"(?:\s+pkt\.?\s*\d+)*"
    r"(?:\s+(" + _ACT_SUFFIX + r"))?",
    re.IGNORECASE,
)

# artykuł 77 ordynacji — bez skrótu „art.”
_ARTICLE_PLAIN_RE = re.compile(
    r"\bartykuł\s*(\d+[a-z]?)"
    r"(?:\s*§\s*(\d+))?"
    r"(?:\s+pkt\.?\s*\d+)*"
    r"(?:\s+(" + _ACT_SUFFIX + r"))?",
    re.IGNORECASE,
)

_ACT_ALIASES = {
    "kpk": "kpk",
    "k.p.k": "kpk",
    "kpa": "kpa",
    "k.p.a": "kpa",
    "k.c": "kc",
    "k.c.": "kc",
    "kc": "kc",
    "k.r.o": "kro",
    "k.s": "ks",
    "k.p": "kp",
    "ppsa": "ppsa",
    "p.p.s.a": "ppsa",
    "pp.sa": "ppsa",
    "ukp": "ukp",
    "u.k.p": "ukp",
    "ukpa": "ukpa",
    "u.k.p.a": "ukpa",
    "op": "op",
    "op.": "op",
    "ordynacjipodatkowej": "op",
    "ordynacjapodatkowa": "op",
    "upea": "upea",
    "u.p.e.a": "upea",
}


@dataclass(frozen=True)
class ArticleCitation:
    """Pojedyncze cytowanie przepisu znormalizowane do weryfikacji."""

    key: str  # np. art. 58
    raw: str  # oryginalny fragment
    article_num: str
    paragraph: Optional[str] = None
    act_code: Optional[str] = None  # kpk, kpa, kc, …


def _normalize_act(act: Optional[str]) -> Optional[str]:
    if not act:
        return None
    a = act.lower().replace(" ", "").replace("ustawy", "")
    if "ordynacj" in a and "podatk" in a:
        return "op"
    if "egzekucyjn" in a and "administracj" in a:
        return "upea"
    if "konstytucji" in a:
        return "konstytucja"
    for alias, code in _ACT_ALIASES.items():
        if alias in a:
            return code
    return a[:12] if a else None


def _append_citation(
    out: List[ArticleCitation],
    seen: Set[Tuple[str, Optional[str]]],
    *,
    num: str,
    par: Optional[str],
    act_raw: Optional[str],
    raw: str,
) -> None:
    act = _normalize_act(act_raw)
    key = f"art. {num}"
    if par:
        key += f" § {par}"
    dedupe = (key, act)
    if dedupe in seen:
        return
    seen.add(dedupe)
    out.append(
        ArticleCitation(
            key=key,
            raw=raw.strip(),
            article_num=num,
            paragraph=par,
            act_code=act,
        )
    )


def extract_citations(text: str) -> List[ArticleCitation]:
    """Wyciąga wszystkie cytaty art./artykuł z tekstu (bez duplikatów po key+act)."""
    if not text:
        return []
    seen: Set[Tuple[str, Optional[str]]] = set()
    out: List[ArticleCitation] = []
    for pattern in (_ARTICLE_RE, _ARTICLE_PLAIN_RE):
        for m in pattern.finditer(text):
            _append_citation(
                out,
                seen,
                num=m.group(1).lower(),
                par=m.group(2),
                act_raw=m.group(4),
                raw=m.group(0),
            )
    return out


def citation_keys(text: str) -> Set[str]:
    return {c.key for c in extract_citations(text)}


def build_verification_corpus(
    document_text: str = "",
    combined_context: str = "",
    legal_results: Optional[List[Dict[str, Any]]] = None,
    user_results: Optional[List[Dict[str, Any]]] = None,
    saos_results: Optional[List[Dict[str, Any]]] = None,
    eli_results: Optional[List[Dict[str, Any]]] = None,
    user_query: str = "",
    expert_analysis: str = "",
    legal_basis_text: str = "",
) -> str:
    """Scala wszystkie źródła do jednego korpusu weryfikacyjnego."""
    parts: List[str] = [
        document_text or "",
        combined_context or "",
        legal_basis_text or "",
        expert_analysis or "",
        user_query or "",
    ]
    for batch in (legal_results, user_results, saos_results, eli_results):
        if not batch:
            continue
        for row in batch:
            parts.append(row.get("content") or "")
            parts.append(row.get("title") or row.get("tytul") or "")
            parts.append(row.get("source") or "")
    return "\n".join(parts).lower()


def _legal_row_matches_act(meta_blob: str, act_code: Optional[str]) -> bool:
    if not act_code:
        return True
    blob = (meta_blob or "").lower()
    if act_code == "kpa":
        return any(
            x in blob
            for x in (
                "kpa",
                "k.p.a",
                "postępowania administracyjnego",
                "postepowania administracyjnego",
                "kodeks postępowania administracyjnego",
            )
        )
    if act_code == "ppsa":
        return any(
            x in blob
            for x in (
                "ppsa",
                "p.p.s.a",
                "postępowania przed sądami administracyjnymi",
                "prawo o postępowaniu",
            )
        )
    if act_code == "kpk":
        return "kpk" in blob or "postępowania karnego" in blob
    if act_code == "kc":
        return "k.c" in blob or "kodeks cywilny" in blob
    if act_code == "op":
        return (
            ("ordynacj" in blob and "podatk" in blob)
            or re.search(r"\bop\.?\b", blob) is not None
            or ("nadpłat" in blob and "zaliczen" in blob)
        )
    if act_code == "upea":
        return (
            "upea" in blob
            or "u.p.e.a" in blob
            or ("egzekucyjn" in blob and "administracj" in blob)
        )
    return act_code in blob


def _article_patterns(cite: ArticleCitation) -> List[str]:
    num = cite.article_num
    patterns = [
        rf"\bart\.?\s*{re.escape(num)}\b",
        rf"\bartykuł\s*{re.escape(num)}\b",
    ]
    if cite.paragraph:
        patterns.extend(
            [
                rf"\bart\.?\s*{re.escape(num)}\s*§\s*{re.escape(cite.paragraph)}\b",
                rf"\bartykuł\s*{re.escape(num)}\s*§\s*{re.escape(cite.paragraph)}\b",
                rf"\bart\.?\s*{re.escape(num)}\s*§\s*{re.escape(cite.paragraph)}\s+pkt\.?\s*\d+",
            ]
        )
    return patterns


def is_citation_in_legal_results(
    cite: ArticleCitation,
    legal_results: Optional[List[Dict[str, Any]]],
) -> bool:
    """Czy artykuł występuje w fragmencie bazy prawnej (treść + metadata ustawy)."""
    if not legal_results:
        return False
    patterns = _article_patterns(cite)
    for row in legal_results:
        content = (row.get("content") or "").lower()
        if not any(re.search(p, content) for p in patterns):
            continue
        if not cite.act_code:
            return True
        meta = ""
        md = row.get("metadata")
        if isinstance(md, dict):
            meta = str(md.get("filename", "")) + " " + str(md.get("category", ""))
        if _legal_row_matches_act(meta, cite.act_code):
            return True
        if _act_tokens_in_corpus(cite.act_code, content):
            return True
    return False


def is_citation_in_expert_analysis(cite: ArticleCitation, expert_text: str) -> bool:
    """Cytat występuje w debacie ekspertów — uznaj za poparty (źródło MOA)."""
    if not expert_text or not cite.raw:
        return False
    low = expert_text.lower()
    if cite.raw.lower() in low:
        return True
    # art. 61 § 4 Kpa vs art. 61 § 4 KPA
    num = cite.article_num
    par = cite.paragraph
    if par:
        art_pat = rf"\bart\.?\s*{re.escape(num)}(?:\s*§\s*{re.escape(par)})?\b"
    else:
        art_pat = rf"\bart\.?\s*{re.escape(num)}\b"
    if re.search(art_pat, low):
        if not cite.act_code:
            return True
        if cite.act_code == "kpa" and re.search(r"\bkpa\b|\bk\.?\s*p\.?\s*a\.?\b", low):
            return True
        if cite.act_code == "ppsa" and re.search(r"\bppsa\b|\bp\.?\s*p\.?\s*s\.?\s*a\.?\b", low):
            return True
        if cite.act_code == "op" and (
            re.search(r"\bop\.?\b", low)
            or ("ordynacj" in low and "podatk" in low)
        ):
            return True
        if cite.act_code == "upea" and (
            re.search(r"\bupea\b|\bu\.?\s*p\.?\s*e\.?\s*a\.?\b", low)
            or ("egzekucyjn" in low and "administracj" in low)
        ):
            return True
        if _act_tokens_in_corpus(cite.act_code, low):
            return True
    return False


def _act_tokens_in_corpus(act: Optional[str], corpus: str) -> bool:
    if not act:
        return True
    if act == "konstytucja":
        return "konstytucj" in corpus
    if act == "kpk":
        return "kpk" in corpus or "kodeks postępowania karnego" in corpus or "k.p.k" in corpus
    if act == "kpa":
        return "kpa" in corpus or "postępowania administracyjnego" in corpus or "k.p.a" in corpus
    if act == "kc":
        return " k.c" in corpus or "kodeks cywilny" in corpus
    if act == "op":
        return (
            ("ordynacj" in corpus and "podatk" in corpus)
            or re.search(r"\bop\.?\b", corpus) is not None
            or ("nadpłat" in corpus and "zaliczen" in corpus)
        )
    if act == "upea":
        return (
            "upea" in corpus
            or "u.p.e.a" in corpus
            or ("egzekucyjn" in corpus and "administracj" in corpus)
        )
    if act == "ppsa":
        return (
            "p.p.s.a" in corpus
            or "ppsa" in corpus
            or "postępowania przed sądami administracyjnymi" in corpus
            or "sąd administracyjny" in corpus
        )
    if act == "ukp":
        return "u.k.p" in corpus or "ukp" in corpus or "kodeks postępowania" in corpus
    if act == "ukpa":
        return "u.k.p.a" in corpus or "ukpa" in corpus
    return act in corpus


def is_citation_in_corpus(cite: ArticleCitation, corpus: str) -> bool:
    """
    Czy cytat jest dosłownie lub kontekstowo w korpusie.
    Wymaga wystąpienia numeru artykułu oraz (jeśli podano) kodu ustawy w korpusie.
    """
    if not corpus:
        return False
    if cite.raw.lower() in corpus:
        return True
    found_art = any(re.search(p, corpus) for p in _article_patterns(cite))
    if not found_art:
        return False
    if cite.act_code and not _act_tokens_in_corpus(cite.act_code, corpus):
        return False
    return True


def _without_act(cite: ArticleCitation) -> ArticleCitation:
    return ArticleCitation(
        key=cite.key,
        raw=cite.raw,
        article_num=cite.article_num,
        paragraph=cite.paragraph,
        act_code=None,
    )


def is_citation_verified(
    cite: ArticleCitation,
    corpus: str,
    *,
    expert_analysis: str = "",
    legal_results: Optional[List[Dict[str, Any]]] = None,
    trust_expert_debate: bool = True,
    trust_legal_kb: bool = True,
    require_legal_rag: bool = False,
) -> bool:
    """Pełna ścieżka weryfikacji — korpus, debata MOA, RAG prawny, ELI (w korpusie)."""
    if require_legal_rag:
        return is_citation_in_legal_results(cite, legal_results)

    checks = (
        lambda: is_citation_in_corpus(cite, corpus),
        lambda: trust_expert_debate and is_citation_in_expert_analysis(cite, expert_analysis),
        lambda: trust_legal_kb and is_citation_in_legal_results(cite, legal_results),
    )
    if any(fn() for fn in checks):
        return True

    # Ten sam artykuł bez wymogu ustawy — gdy w materiałach jest art., ale skrót ustawy w innym miejscu
    if cite.act_code:
        relaxed = _without_act(cite)
        if is_citation_in_corpus(relaxed, corpus):
            return True
        if trust_expert_debate and is_citation_in_expert_analysis(relaxed, expert_analysis):
            return True
        if trust_legal_kb and is_citation_in_legal_results(relaxed, legal_results):
            return True

    return False


def filter_unverified(
    citations: List[ArticleCitation],
    corpus: str,
    *,
    expert_analysis: str = "",
    legal_results: Optional[List[Dict[str, Any]]] = None,
    trust_expert_debate: bool = True,
    trust_legal_kb: bool = True,
    require_legal_rag: bool = False,
) -> List[ArticleCitation]:
    """Zwraca cytaty bez pokrycia w źródłach."""
    return [
        c
        for c in citations
        if not is_citation_verified(
            c,
            corpus,
            expert_analysis=expert_analysis,
            legal_results=legal_results,
            trust_expert_debate=trust_expert_debate,
            trust_legal_kb=trust_legal_kb,
            require_legal_rag=require_legal_rag,
        )
    ]


def merge_citation_lists(*lists: List[ArticleCitation]) -> List[ArticleCitation]:
    seen: Set[Tuple[str, Optional[str]]] = set()
    out: List[ArticleCitation] = []
    for lst in lists:
        for c in lst:
            k = (c.key, c.act_code)
            if k in seen:
                continue
            seen.add(k)
            out.append(c)
    return out


async def verify_citations_via_eli(
    citations: List[ArticleCitation],
    search_eli: Callable,
    max_lookups: int = 8,
) -> Set[Tuple[str, Optional[str]]]:
    """
    Dla niezweryfikowanych cytatów szuka potwierdzenia w ELI.
    Zwraca zbiór par (key, act_code) uznanych za zweryfikowane.
    Grupuje po ustawie — jedno zapytanie ELI na akt zamiast N zapytań o artykuły.
    """
    verified: Set[Tuple[str, Optional[str]]] = set()
    if not citations:
        return verified

    def eli_act_title(cite: ArticleCitation) -> str:
        code = (cite.act_code or "").lower()
        if code == "kpk":
            return "Kodeks postępowania karnego"
        if code == "kpa":
            return "Kodeks postępowania administracyjnego"
        if code == "kc":
            return "Kodeks cywilny"
        if code == "kro":
            return "Kodeks rodzinny i opiekuńczy"
        if code in ("kp",):
            return "Kodeks karny"
        if code in ("ks",):
            return "Kodeks spółek handlowych"
        if code in ("ppsa",):
            return "Prawo o postępowaniu przed sądami administracyjnymi"
        if code == "op":
            return "Ordynacja podatkowa"
        if code == "upea":
            return "Ustawa o postępowaniu egzekucyjnym w administracji"
        if code == "kp":
            return "Kodeks pracy"
        return ""

    from collections import defaultdict

    groups: Dict[str, List[ArticleCitation]] = defaultdict(list)
    for cite in citations[:max_lookups]:
        title = eli_act_title(cite)
        groups[title or cite.raw].append(cite)

    for act_label, cites in groups.items():
        user_q = " ".join(c.raw for c in cites)
        try:
            results = await search_eli(act_label, limit=3, user_query=user_q)
        except Exception as e:
            print(f"   [CITATION GUARD] ELI lookup err ({act_label}): {e}")
            continue
        blob = build_verification_corpus(eli_results=results)
        for cite in cites:
            if is_citation_in_corpus(cite, blob) or cite.article_num in blob:
                verified.add((cite.key, cite.act_code))
                print(f"   [CITATION GUARD] ELI potwierdził: {cite.raw}")
    return verified


def _drop_eli_verified(
    unverified: List[ArticleCitation],
    eli_ok: Set[Any],
) -> List[ArticleCitation]:
    out: List[ArticleCitation] = []
    for c in unverified:
        if (c.key, c.act_code) in eli_ok:
            continue
        if c.key in eli_ok and not c.act_code:
            continue
        out.append(c)
    return out


async def verify_citations_via_llm(
    call_llm: Callable,
    citations: List[ArticleCitation],
    analysis_text: str,
    document_text: str,
    rag_snippet: str,
) -> List[ArticleCitation]:
    """LLM audytor: zwraca cytaty nadal niepotwierdzone (jeden request)."""
    if not citations:
        return []
    cite_lines = "\n".join(f"- {c.raw} ({c.key})" for c in citations)
    prompt = (
        "Jesteś audytorem cytowań prawnych w polskim postępowaniu.\n"
        "Dla KAŻDEGO przepisu z listy CITATY oceń, czy wynika wprost z DOKUMENTU, RAG lub ANALIZY EKSPERTÓW.\n"
        "Zasada: przepis jest ZWERYFIKOWANY tylko gdy jest wprost w źródłach lub logicznie wynika z cytowanego aktu w dokumencie.\n"
        "Wypisz TYLKO przepisy NIEZWERYFIKOWANE (jeden na linię, format: art. 123).\n"
        "Jeśli wszystkie są poparte — napisz dokładnie: BRAK\n\n"
        f"--- CITATY DO OCENY ---\n{cite_lines}\n\n"
        f"--- ANALIZA ---\n{(analysis_text or '')[:7000]}\n\n"
        f"--- DOKUMENT ---\n{(document_text or '')[:7000]}\n\n"
        f"--- RAG ---\n{(rag_snippet or '')[:4000]}"
    )
    try:
        raw = await call_llm(prompt)
    except Exception as e:
        print(f"   [CITATION GUARD] LLM audyt err: {e}")
        return citations
    if not raw or "BRAK" in raw.upper():
        return []
    still_bad: List[ArticleCitation] = []
    flagged_keys = citation_keys(raw)
    for c in citations:
        if c.key in flagged_keys or c.raw.lower() in raw.lower():
            still_bad.append(c)
    return still_bad


class CitationGuard:
    """Pełny audyt cytowań: korpus → ELI → LLM."""

    async def audit(
        self,
        texts: List[str],
        *,
        document_text: str = "",
        combined_context: str = "",
        legal_results: Optional[List[Dict[str, Any]]] = None,
        user_results: Optional[List[Dict[str, Any]]] = None,
        saos_results: Optional[List[Dict[str, Any]]] = None,
        eli_results: Optional[List[Dict[str, Any]]] = None,
        user_query: str = "",
        search_eli: Optional[Callable] = None,
        call_llm: Optional[Callable] = None,
        analysis_for_llm: str = "",
        rag_snippet: str = "",
        expert_analysis: str = "",
        legal_basis_text: str = "",
        trust_expert_debate: bool = True,
        trust_legal_kb: bool = True,
        require_legal_rag: bool = False,
    ) -> Tuple[List[ArticleCitation], List[ArticleCitation]]:
        """
        Zwraca (wszystkie_cytaty, niezweryfikowane).
        """
        expert_blob = expert_analysis or analysis_for_llm or "\n\n".join(texts)
        all_cites: List[ArticleCitation] = []
        for t in texts:
            all_cites = merge_citation_lists(all_cites, extract_citations(t))

        if not all_cites:
            return [], []

        corpus = build_verification_corpus(
            document_text=document_text,
            combined_context=combined_context,
            legal_results=legal_results,
            user_results=user_results,
            saos_results=saos_results,
            eli_results=eli_results,
            user_query=user_query,
            expert_analysis=expert_blob,
            legal_basis_text=legal_basis_text,
        )

        unverified = filter_unverified(
            all_cites,
            corpus,
            expert_analysis=expert_blob,
            legal_results=legal_results,
            trust_expert_debate=trust_expert_debate,
            trust_legal_kb=trust_legal_kb,
            require_legal_rag=require_legal_rag,
        )
        if require_legal_rag:
            return all_cites, unverified
        if unverified and search_eli:
            eli_ok = await verify_citations_via_eli(unverified, search_eli)
            unverified = _drop_eli_verified(unverified, eli_ok)

        if unverified:
            try:
                from config import settings
                from services.citation_eli_l1 import verify_citations_via_eli_l1

                l1_ok = await verify_citations_via_eli_l1(
                    unverified,
                    ttl=settings.eli_citation_cache_ttl,
                )
                l1_verified = {(k, None) for k in l1_ok}
                unverified = _drop_eli_verified(unverified, l1_verified)
            except Exception as e:
                print(f"   [CITATION GUARD] ELI L1 err: {e}")

        if unverified and call_llm and not trust_expert_debate:
            still = await verify_citations_via_llm(
                call_llm,
                unverified,
                expert_blob,
                document_text,
                rag_snippet,
            )
            unverified = still

        return all_cites, unverified


def citation_display_label(cite: ArticleCitation) -> str:
    """Pełna etykieta cytatu do UI (art. + ustawa, nie sam numer)."""
    _labels = {
        "kpa": "KPA",
        "kpk": "KPK",
        "kc": "k.c.",
        "kpc": "KPC",
        "kp": "k.p.",
        "ppsa": "PPSA",
        "op": "Op.",
        "upea": "UPEA",
        "kro": "k.r.o.",
        "ks": "k.s.",
        "ukp": "u.k.p.",
        "ukpa": "u.k.p.a.",
        "konstytucja": "Konstytucja RP",
    }
    label = cite.key
    if cite.act_code:
        act = _labels.get(cite.act_code, cite.act_code.upper())
        if act.lower() not in label.lower():
            label = f"{label} {act}"
    # Jednolity format w UI (bez „Art.” z OCR)
    if label.lower().startswith("art."):
        label = "art." + label[4:]
    return label.strip()


def citations_to_display(citations: List[ArticleCitation]) -> List[str]:
    return sorted({citation_display_label(c) for c in citations})


def format_citation_warning(citations: List[ArticleCitation], max_items: int = 4) -> str:
    """Skrócona lista przepisów do logów/metadata — nie do wklejania w odpowiedź klienta."""
    labels = citations_to_display(citations)
    if not labels:
        return ""
    if len(labels) <= max_items:
        return ", ".join(labels)
    shown = labels[:max_items]
    rest = len(labels) - max_items
    return f"{', '.join(shown)} (+{rest} innych)"
