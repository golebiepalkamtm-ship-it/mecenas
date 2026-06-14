from __future__ import annotations

import re
from typing import Any, Dict, Optional, Tuple


LegalRank = Tuple[int, str]


def _norm(s: Any) -> str:
    if s is None:
        return ""
    if isinstance(s, str):
        return s
    return str(s)


def _lower(s: Any) -> str:
    return _norm(s).lower()


_RE_CASE_LAW_HINT = re.compile(
    r"\b(orzecznictw|wyrok|uchwał|postanowien|sygn\.?|sn\b|nsa\b|ws[ae]\b|"
    r"tsue\b|tk\b|skład\s+\d+\s+sędzi|ii\s+fsk|i\s+osk|iii\s+czp)\b",
    re.IGNORECASE,
)

_RE_NORM_HINT = re.compile(
    r"\b(art\.|artykuł|§|ust\.|ustawa|kodeks|konstytucj|rozporządzen|dyrektyw|"
    r"traktat|dz\.\s*u\.|isap|eli)\b",
    re.IGNORECASE,
)


def query_prefers_case_law(query: str) -> bool:
    return bool(_RE_CASE_LAW_HINT.search(query or ""))


def query_prefers_norms(query: str) -> bool:
    q = query or ""
    if query_prefers_case_law(q):
        return False
    return bool(_RE_NORM_HINT.search(q)) or True


def allowed_source_types_for_query(query: str) -> Optional[list[str]]:
    q = (query or "").lower()
    if "konstytuc" in q:
        if "rozporządzen" in q or "rozporzadzen" in q:
            return None
        if "ustaw" in q or "kodeks" in q:
            return None
        return ["constitution", "statute"]
    return None


def suggest_act_terms_for_query(query: str) -> Optional[list[str]]:
    q = (query or "").lower()
    if ("kontrol" in q and "drog" in q) or ("zatrzym" in q and "kontrol" in q and "drog" in q):
        return ["Prawo o ruchu drogowym", "ruch drogowy"]
    if "dowód rejestracyj" in q or "dowod rejestracyj" in q:
        return ["Prawo o ruchu drogowym"]
    return None


def classify_legal_rank(
    *,
    source_type: Optional[str] = None,
    title: Optional[str] = None,
    filename: Optional[str] = None,
    act_terms: Any = None,
    content: Optional[str] = None,
) -> LegalRank:
    st_raw = (_norm(source_type) or "").strip()
    st = st_raw.upper()
    st_l = st_raw.lower()

    if st_l in ("constitution",):
        return 100, "Konstytucja"
    if st_l in ("statute",):
        return 80, "Ustawa"
    if st_l in ("regulation",):
        return 65, "Rozporządzenie"
    if st_l in ("case_law",):
        return 45, "Orzecznictwo"
    if st_l in ("user_doc",):
        return 20, "Akta klienta"
    blob = " ".join(
        part
        for part in (
            _lower(title),
            _lower(filename),
            _lower(act_terms),
            _lower(content)[:4000],
        )
        if part
    )

    if st in ("SAOS", "CASE_LAW", "JUDGMENT"):
        return 45, "Orzecznictwo"
    if st in ("USER_KB", "CLIENT_DOC", "AKTA"):
        return 20, "Akta klienta"

    if "konstytucj" in blob:
        return 100, "Konstytucja"
    if any(k in blob for k in ("traktat", "dyrektyw", "rozporzadzenie (ue", "rozporządzenie (ue", "parlamentu europejskiego")):
        return 90, "Prawo UE"
    if "rozporządzen" in blob or "rozporzadzen" in blob:
        return 65, "Rozporządzenie"
    if any(k in blob for k in ("uchwała rady", "uchwala rady", "prawo miejscowe", "rada gminy", "sejmik", "zarządzenie wojewody", "zarzadzenie wojewody")):
        return 55, "Prawo miejscowe"
    if any(k in blob for k in ("kodeks", "ustawa", "dz. u", "dz.u", "dziennik ustaw", "kpa", "kpc", "kpk", "kk", "kc", "op", "ppsa")):
        return 80, "Ustawa"

    if st in ("ELI", "ISAP", "ACT"):
        return 70, "Akt prawny"

    return 10, "Inne"


def annotate_with_legal_rank(
    row: Dict[str, Any],
    *,
    default_source_type: Optional[str] = None,
) -> Dict[str, Any]:
    r = dict(row or {})
    metadata = r.get("metadata") if isinstance(r.get("metadata"), dict) else {}
    st = r.get("source_type") or default_source_type
    title = r.get("title") or r.get("tytul")
    filename = None
    if isinstance(metadata, dict):
        filename = metadata.get("filename") or metadata.get("source_filename")
    act_terms = None
    if isinstance(metadata, dict):
        act_terms = metadata.get("act_terms") or metadata.get("act") or metadata.get("acts")
    rank, label = classify_legal_rank(
        source_type=_norm(st) if st is not None else None,
        title=_norm(title) if title is not None else None,
        filename=_norm(filename) if filename is not None else None,
        act_terms=act_terms,
        content=_norm(r.get("content")) if r.get("content") is not None else None,
    )
    r["legal_rank"] = rank
    r["legal_rank_label"] = label
    if st:
        r["source_type"] = st
    return r


def legal_rank_boost(row: Dict[str, Any], query: str) -> float:
    annotated = annotate_with_legal_rank(row)
    rank = float(annotated.get("legal_rank") or 0.0)
    label = _norm(annotated.get("legal_rank_label"))
    q = query or ""

    if query_prefers_case_law(q):
        if label == "Orzecznictwo":
            return 0.14
        return max(-0.06, (rank / 100.0 - 0.6) * -0.06)

    if query_prefers_norms(q):
        return (rank / 100.0) * 0.12

    return (rank / 100.0) * 0.06
