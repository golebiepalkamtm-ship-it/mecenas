"""Etap 5 — oś czasu i niespójności chronologiczne (deterministic)."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List

from services.deadline_engine import (
    extract_delivery_dates,
    extract_document_issue_dates,
    parse_polish_date,
)

_DATE_RE = re.compile(r"\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\b")
_PROC_RE = re.compile(
    r"\b(termin|terminu|odwo[lł]a[nń]|odwol|apelac|za[zż]al|sprzeciw|skarg|"
    r"dor[eę]cz|dorecz|odebran|odbior|zpo|upo|przywr[oó]cen|wezwan|pouczen)\b",
    re.IGNORECASE,
)


def should_build_timeline(
    *,
    document_text: str,
    user_query: str = "",
    attachments_count: int = 0,
    min_doc_chars: int = 3000,
) -> bool:
    t = (document_text or "").strip()
    q = (user_query or "").strip()
    if attachments_count > 1:
        return True
    if len(t) > min_doc_chars:
        return True
    blob = f"{q}\n{t[:4000]}".lower()
    if not blob.strip():
        return False
    if _PROC_RE.search(blob):
        return True
    if _DATE_RE.search(blob):
        return True
    return False


def build_timeline(text: str) -> Dict[str, Any]:
    """Buduje timeline z dat doręczenia i wydania pism."""
    if not (text or "").strip():
        return {"timeline": [], "inconsistencies": [], "gaps": []}

    events: List[Dict[str, Any]] = []
    for d in extract_delivery_dates(text):
        events.append({
            "date": d.get("delivery_date"),
            "type": "delivery",
            "label": "Doręczenie",
            "context": (d.get("context") or "")[:120],
        })
    for date_str in extract_document_issue_dates(text):
        events.append({
            "date": date_str,
            "type": "issue",
            "label": "Data wydania pisma",
            "context": "",
        })

    def _sort_key(ev: Dict[str, Any]) -> datetime:
        dt = parse_polish_date(str(ev.get("date") or ""))
        return dt or datetime.min

    events.sort(key=_sort_key)
    inconsistencies: List[str] = []
    gaps: List[str] = []

    parsed: List[tuple[datetime, Dict[str, Any]]] = []
    for ev in events:
        dt = parse_polish_date(str(ev.get("date") or ""))
        if dt:
            parsed.append((dt, ev))

    for i in range(1, len(parsed)):
        prev_dt, prev_ev = parsed[i - 1]
        cur_dt, cur_ev = parsed[i]
        if prev_ev.get("type") == "issue" and cur_ev.get("type") == "delivery":
            if cur_dt < prev_dt:
                inconsistencies.append(
                    f"Doręczenie ({cur_ev.get('date')}) przed datą wydania pisma ({prev_ev.get('date')})."
                )
        if (cur_dt - prev_dt).days > 365:
            gaps.append(
                f"Luka >1 rok między {prev_ev.get('date')} a {cur_ev.get('date')}."
            )

    return {
        "timeline": events[:20],
        "inconsistencies": inconsistencies[:8],
        "gaps": gaps[:5],
    }


def format_timeline_block(timeline_data: Dict[str, Any], max_chars: int = 1500) -> str:
    lines = ["[OŚ CZASU SPRAWY]"]
    for ev in timeline_data.get("timeline") or []:
        lines.append(
            f"- {ev.get('date')}: {ev.get('label')} ({ev.get('type')})"
        )
    for inc in timeline_data.get("inconsistencies") or []:
        lines.append(f"⚠ Niespójność: {inc}")
    for g in timeline_data.get("gaps") or []:
        lines.append(f"○ Luka: {g}")
    block = "\n".join(lines)
    if len(block) > max_chars:
        return block[: max_chars - 20] + "\n[…]"
    return block
