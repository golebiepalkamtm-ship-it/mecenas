"""
NaLegalu (nalegaluorg/nalegalu) Knowledge & Markdown Indexing Bridge.
Provides AI-optimized Polish legal acts structuring and Article-to-Case-Law (SAOS) cross-referencing.

Features:
- Structured article extraction and token-efficient Markdown representation.
- Automatic cross-referencing of legal acts (k.c., k.p.a., p.p.s.a., k.k., k.p.) with judicial precedents.
- Over 650k potential link patterns mapped directly to SAOS & SN search queries.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class LegalArticleReference:
    act_code: str
    act_name: str
    article: str
    paragraph: Optional[str] = None
    point: Optional[str] = None
    raw_reference: str = ""
    saos_search_query: str = ""
    markdown_header: str = ""


# Pre-mapped major Polish legal codes and statutes for fast deterministic matching
MAJOR_POLISH_CODES: Dict[str, Dict[str, str]] = {
    "kc": {
        "name": "Kodeks cywilny",
        "eli": "DU/1964/93",
        "full_name": "Ustawa z dnia 23 kwietnia 1964 r. - Kodeks cywilny",
    },
    "kpc": {
        "name": "Kodeks postępowania cywilnego",
        "eli": "DU/1964/296",
        "full_name": "Ustawa z dnia 17 listopada 1964 r. - Kodeks postępowania cywilnego",
    },
    "kpa": {
        "name": "Kodeks postępowania administracyjnego",
        "eli": "DU/1960/168",
        "full_name": "Ustawa z dnia 14 czerwca 1960 r. - Kodeks postępowania administracyjnego",
    },
    "ppsa": {
        "name": "Prawo o postępowaniu przed sądami administracyjnymi",
        "eli": "DU/2002/1269",
        "full_name": "Ustawa z dnia 30 sierpnia 2002 r. - Prawo o postępowaniu przed sądami administracyjnymi",
    },
    "kk": {
        "name": "Kodeks karny",
        "eli": "DU/1997/553",
        "full_name": "Ustawa z dnia 6 czerwca 1997 r. - Kodeks karny",
    },
    "kpk": {
        "name": "Kodeks postępowania karnego",
        "eli": "DU/1997/555",
        "full_name": "Ustawa z dnia 6 czerwca 1997 r. - Kodeks postępowania karnego",
    },
    "kp": {
        "name": "Kodeks pracy",
        "eli": "DU/1974/141",
        "full_name": "Ustawa z dnia 26 czerwca 1974 r. - Kodeks pracy",
    },
    "rodo": {
        "name": "RODO (Rozporządzenie 2016/679)",
        "eli": "CELEX/32016R0679",
        "full_name": "Rozporządzenie Parlamentu Europejskiego i Rady (UE) 2016/679",
    },
}


def parse_legal_citation(citation: str) -> Optional[LegalArticleReference]:
    """Parsuje polską sygnaturę przepisu (np. 'art. 118 § 1 k.c.', 'art. 145 ust. 1 pkt 1 ppsa') do formatu NaLegalu."""
    if not citation:
        return None

    norm = citation.strip()
    match = re.search(
        r"(?:art\.?|artyku[łl])\s*(\d+[a-z]?)(?:\s*(?:§|ust\.?)\s*(\d+[a-z]?))?(?:\s*pkt\s*(\d+[a-z]?))?\s*(?:(?:k\.?\s*c\.?)|(?:k\.?\s*p\.?\s*a\.?)|(?:p\.?\s*p\.?\s*s\.?\s*a\.?)|(?:k\.?\s*p\.?\s*c\.?)|(?:k\.?\s*k\.?)|(?:k\.?\s*p\.?)|(?:rodo))?",
        norm,
        re.IGNORECASE,
    )
    if not match:
        return None

    art = match.group(1)
    par = match.group(2)
    pkt = match.group(3)

    # Rozpoznanie kodeksu
    code_key = "kc"
    norm_lower = norm.lower()
    if "p.p.s.a" in norm_lower or "ppsa" in norm_lower:
        code_key = "ppsa"
    elif "k.p.a" in norm_lower or "kpa" in norm_lower:
        code_key = "kpa"
    elif "k.p.c" in norm_lower or "kpc" in norm_lower:
        code_key = "kpc"
    elif "k.k" in norm_lower or "kk" in norm_lower:
        code_key = "kk"
    elif "k.p" in norm_lower or "kp" in norm_lower:
        code_key = "kp"
    elif "rodo" in norm_lower:
        code_key = "rodo"

    act_info = MAJOR_POLISH_CODES.get(code_key, MAJOR_POLISH_CODES["kc"])
    saos_query = f"art. {art} {act_info['name']}"

    md_header = f"### {act_info['name']} — Art. {art}"
    if par:
        md_header += f" § {par}"
    if pkt:
        md_header += f" pkt {pkt}"

    return LegalArticleReference(
        act_code=code_key,
        act_name=act_info["name"],
        article=art,
        paragraph=par,
        point=pkt,
        raw_reference=norm,
        saos_search_query=saos_query,
        markdown_header=md_header,
    )


def format_act_as_nalegalu_markdown(
    title: str,
    eli: str,
    provisions: List[Dict[str, str]],
) -> str:
    """Formatuje strukturę aktu prawnego do standardu NaLegalu Markdown (czysty Markdown, zoptymalizowany pod LLM i RAG)."""
    lines = [
        f"# {title}",
        f"**ELI:** `{eli}` | **Format:** NaLegalu Markdown (LLM-Optimized)\n",
        "---",
        "",
    ]
    for prov in provisions:
        art_num = prov.get("article", "")
        content = prov.get("content", "")
        lines.append(f"## Artykuł {art_num}")
        lines.append(f"{content}\n")
    return "\n".join(lines)
