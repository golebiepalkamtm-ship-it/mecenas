"""Pomocniki runtime orchestratora — flagi i progi."""
from __future__ import annotations

from typing import Any, List, Optional

from config import settings


def resolve_use_rag_user(
    *,
    config_enabled: bool,
    param_use_rag_user: Optional[bool],
    has_extracted_text: bool,
    has_attachments: bool,
) -> bool:
    if param_use_rag_user is True:
        return True
    if param_use_rag_user is False:
        return False
    if not config_enabled:
        return False
    return has_extracted_text or has_attachments


def should_enable_investigation(
    *,
    text_len: int,
    response_mode: str,
    has_attachments: bool,
) -> bool:
    if settings.feature_investigation_v2:
        return True
    if not settings.feature_investigation_v2_auto:
        return False
    if (response_mode or "").lower() == "strategic":
        return True
    if text_len >= settings.investigation_auto_min_chars:
        return True
    if has_attachments:
        return True
    return False


def hallucination_block_min_for_mode(response_mode: str) -> int:
    mode = (response_mode or "strategic").strip().lower()
    if mode == "draft":
        return settings.hallucination_block_min_cites_draft
    if mode == "strategic":
        return settings.hallucination_block_min_cites_strategic
    if mode == "citizen":
        return settings.hallucination_block_min_cites_citizen
    return settings.hallucination_block_min_cites_advisor


def merge_act_terms(
    base: Optional[List[Any]],
    extra: Optional[List[str]],
) -> Optional[list]:
    out: list = []
    for src in (base or [], extra or []):
        for item in src:
            s = str(item).strip()
            if s and s not in out:
                out.append(s)
    return out or None


def _pl_ascii_fold(text: str) -> str:
    """Wariant bez polskich znaków — dopasowanie do filename w bazie (np. postepowania vs postępowania)."""
    return text.translate(
        str.maketrans(
            "ąćęłńóśźżĄĆĘŁŃÓŚŹŻ",
            "acelnoszzACELNOSZZ",
        )
    )


# Skróty ustaw → frazy pod dopasowanie w hybrid_search (filename / content)
ACT_ABBREV_EXPANSIONS: dict[str, list[str]] = {
    "KPA": [
        "kodeks postępowania administracyjnego",
        "kodeks postepowania administracyjnego",
        "postępowania administracyjnego",
        "postepowania administracyjnego",
        "kpa",
    ],
    "KPC": ["kodeks postępowania cywilnego", "kodeks postepowania cywilnego", "kpc"],
    "KPK": ["kodeks postępowania karnego", "kodeks postepowania karnego", "kpk"],
    "KK": ["kodeks karny"],
    "KC": ["kodeks cywilny"],
    "OP": ["ordynacja podatkowa"],
    "UPEA": ["postępowanie egzekucyjne w administracji", "upea"],
    "KP": ["kodeks pracy"],
    "PPSA": ["prawo o postępowaniu przed sądami administracyjnymi", "ppsa"],
}


def _append_act_term(out: list[str], term: str) -> None:
    t = term.strip()
    if not t or t in out:
        return
    out.append(t)
    folded = _pl_ascii_fold(t)
    if folded != t and folded not in out:
        out.append(folded)


def expand_act_terms_for_rag(terms: Optional[List[Any]]) -> Optional[list[str]]:
    """Rozwija skróty (KPA) do pełnych fraz; warianty ASCII dla filename w Supabase."""
    if not terms:
        return None
    out: list[str] = []
    for item in terms:
        raw = str(item).strip()
        if not raw:
            continue
        key = raw.upper().replace(".", "")
        _append_act_term(out, raw)
        for phrase in ACT_ABBREV_EXPANSIONS.get(key, []):
            _append_act_term(out, phrase)
    return out or None


def act_terms_for_table(table_name: str, terms: Optional[List[Any]]) -> Optional[list[str]]:
    """Filtr act_terms tylko dla bazy prawniczej; akta użytkownika (skany) go nie używają."""
    if table_name == "knowledge_base_user":
        return None
    return expand_act_terms_for_rag(terms)
