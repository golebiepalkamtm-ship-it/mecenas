"""
Terminy procesowe — liczone wyłącznie od daty doręczenia przesyłki.

Zasada (KPA/KPC/OP): bieg terminu nie rozpoczyna się od daty wydania pisma
na dokumencie, lecz od doręczenia (odbiór, ZPO/UPO, fikcja doręczenia).
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

# --- Wyłącznie konteksty doręczenia (data startu terminu) ---
_DELIVERY_PATTERNS: List[Tuple[re.Pattern, str]] = [
    (
        re.compile(
            r"(?:dor[eę]czon[oa]|dor[eę]czenia|data\s+dor[eę]czenia|"
            r"odebran[oa]|data\s+odbioru|"
            r"przesyłk[eę]\s+odebran[aą]|potwierdzenie\s+odbioru|"
            r"zpo|upo|zwrotne\s+potwierdzenie)"
            r"(?:\s+(?:w\s+)?(?:dnia|dniu))?\s*[:\-]?\s*"
            r"(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})",
            re.IGNORECASE,
        ),
        "delivery_explicit",
    ),
    (
        re.compile(
            r"(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s*"
            r"(?:r\.?\s*)?(?:—|-)?\s*"
            r"(?:dor[eę]czon[oa]|odebran[oa]|data\s+odbioru)",
            re.IGNORECASE,
        ),
        "delivery_date_before_label",
    ),
    (
        re.compile(
            r"(?:uznano\s+za\s+dor[eę]czon[oa]|fikcyjnie\s+dor[eę]czon[oa]|"
            r"fikcja\s+dor[eę]czenia)\s+(?:w\s+dniu\s+|dnia\s+)?"
            r"(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})",
            re.IGNORECASE,
        ),
        "fictitious_delivery",
    ),
]

# Daty wydania pisma — tylko do ostrzeżenia, NIE do liczenia terminu
_DOCUMENT_ISSUE_PATTERNS: List[re.Pattern] = [
    re.compile(
        r"(?:data\s+pisma|data\s+decyzji|data\s+postanowienia|"
        r"wydano\s+(?:w\s+)?|w\s+[\wąćęłńóśźż]+\s+dnia)\s*[:\-]?\s*"
        r"(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})",
        re.IGNORECASE,
    ),
    re.compile(
        r"(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})\s*,?\s*"
        r"(?:r\.?\s*)?(?:—|-)?\s*(?:miejscowość|sygnatura)",
        re.IGNORECASE,
    ),
]


def parse_polish_date(value: str) -> Optional[datetime]:
    if not value:
        return None
    parts = re.split(r"[\.\-/]", value.strip())[:3]
    if len(parts) < 3:
        return None
    try:
        day, month, year = (int(p) for p in parts)
        if year < 100:
            year += 2000
        return datetime(year, month, day)
    except (ValueError, TypeError):
        return None


def _easter_date(year: int) -> datetime:
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    ell = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * ell) // 451
    month = (h + ell - 7 * m + 114) // 31
    day = ((h + ell - 7 * m + 114) % 31) + 1
    return datetime(year, month, day)


def polish_holidays(year: int) -> Set[Any]:
    fixed = {
        (1, 1), (1, 6), (5, 1), (5, 3), (8, 15),
        (11, 1), (11, 11), (12, 25), (12, 26),
    }
    easter = _easter_date(year)
    dates = {datetime(year, m, d).date() for m, d in fixed}
    dates.add(easter.date())
    dates.add((easter + timedelta(days=1)).date())
    dates.add((easter + timedelta(days=60)).date())
    return dates


def calculate_legal_deadline(delivery_date: datetime, term_days: int) -> datetime:
    """
    Ostatni dzień terminu z przesunięciem (art. 115 k.c. — sobota/niedziela/święto).
    Liczba dni liczona od dnia doręczenia (zgodnie z pouczeniem w piśmie).
    """
    deadline = delivery_date + timedelta(days=term_days)
    while True:
        d = deadline.date()
        if deadline.weekday() in (5, 6) or d in polish_holidays(deadline.year):
            deadline += timedelta(days=1)
        else:
            break
    return deadline


def extract_delivery_dates(text: str) -> List[Dict[str, Any]]:
    """Wyciąga daty doręczenia z OCR/tekstu (regex)."""
    if not text:
        return []
    found: List[Dict[str, Any]] = []
    seen: Set[str] = set()
    for pattern, source in _DELIVERY_PATTERNS:
        for m in pattern.finditer(text):
            raw_date = m.group(1)
            if raw_date in seen:
                continue
            dt = parse_polish_date(raw_date)
            if not dt:
                continue
            seen.add(raw_date)
            ctx_start = max(0, m.start() - 40)
            ctx_end = min(len(text), m.end() + 40)
            found.append({
                "delivery_date": dt.strftime("%d.%m.%Y"),
                "delivery_datetime": dt,
                "source": source,
                "context": text[ctx_start:ctx_end].replace("\n", " ").strip(),
            })
    return found


def extract_document_issue_dates(text: str) -> List[str]:
    """Daty wydania pisma — informacyjnie, bez użycia do terminu."""
    if not text:
        return []
    seen: Set[str] = set()
    out: List[str] = []
    for pattern in _DOCUMENT_ISSUE_PATTERNS:
        for m in pattern.finditer(text):
            raw = m.group(1)
            if raw in seen:
                continue
            dt = parse_polish_date(raw)
            if dt:
                seen.add(raw)
                out.append(dt.strftime("%d.%m.%Y"))
    return out


def _skip_non_actionable(description: str) -> bool:
    lowered = (description or "").lower()
    if "wszczęci" in lowered and "zawiadom" in lowered:
        return True
    if "zawiadomien" in lowered and "wszczęci" in lowered and "odwoł" not in lowered:
        return True
    if "wszczęci" in lowered and "postępowan" in lowered and "odwoł" not in lowered:
        return True
    return False


def build_alerts_from_items(
    items: List[Dict[str, Any]],
    reference_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Buduje alerty terminów z pozycji LLM/regex.
    Wymaga delivery_date — document_date nigdy nie uruchamia licznika.
    """
    ref = reference_date or datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    alerts: List[Dict[str, Any]] = []

    for item in items:
        try:
            description = (item.get("description") or "Doręczenie pisma z pouczeniem").strip()
            if _skip_non_actionable(description):
                continue

            term_days = int(item.get("term_days") or 14)
            needs_confirm = bool(item.get("needs_delivery_confirmation"))
            document_date_str = item.get("document_date") or item.get("event_date_document")
            delivery_str = (
                item.get("delivery_date")
                or item.get("event_date")  # legacy — tylko jeśli oznaczone jako doręczenie
            )

            # Legacy: event_date używane tylko gdy opis wskazuje doręczenie
            if not item.get("delivery_date") and item.get("event_date"):
                legacy_desc = description.lower()
                if not any(
                    w in legacy_desc
                    for w in ("doręcz", "dorecz", "odebran", "odbior", "zpo", "upo", "fikcj")
                ):
                    delivery_str = None
                    needs_confirm = True

            delivery_dt = parse_polish_date(delivery_str) if delivery_str else None
            doc_dt = parse_polish_date(document_date_str) if document_date_str else None

            if needs_confirm or not delivery_dt:
                doc_hint = document_date_str or (doc_dt.strftime("%d.%m.%Y") if doc_dt else "nieznana")
                alerts.append({
                    "type": "pending_delivery",
                    "delivery_date": None,
                    "document_date": doc_hint,
                    "deadline_date": None,
                    "days_left": None,
                    "term_days": term_days,
                    "description": (
                        f"⚠️ [WYMAGANA DATA DORĘCZENIA] {description}. "
                        f"Termin ({term_days} dni) liczy się od daty odebrania przesyłki (ZPO/UPO/odbiór), "
                        f"NIE od daty wydania pisma ({doc_hint}). "
                        f"Podaj datę doręczenia, aby wyliczyć ostatni dzień czynności."
                    ),
                })
                continue

            deadline = calculate_legal_deadline(delivery_dt, term_days)
            days_left = (deadline - ref).days

            if days_left < 0:
                desc = (
                    f"⚠️ [TERMIN UPŁYNĄŁ] {description}. "
                    f"Doręczenie: {delivery_dt.strftime('%d.%m.%Y')}. "
                    f"Ostatni dzień czynności: {deadline.strftime('%d.%m.%Y')} "
                    f"(spóźnienie {abs(days_left)} dni — rozważ przywrócenie terminu)."
                )
            else:
                desc = (
                    f"⚠️ [KRYTYCZNY TERMIN] {description}. "
                    f"Data doręczenia przesyłki: {delivery_dt.strftime('%d.%m.%Y')}. "
                    f"Ostatni dzień czynności: {deadline.strftime('%d.%m.%Y')} "
                    f"(pozostało {days_left} dni)."
                )

            alerts.append({
                "type": "deadline",
                "delivery_date": delivery_dt.strftime("%d.%m.%Y"),
                "document_date": doc_dt.strftime("%d.%m.%Y") if doc_dt else None,
                "event_date": delivery_dt.strftime("%d.%m.%Y"),  # kompatybilność wsteczna UI
                "deadline_date": deadline.strftime("%d.%m.%Y"),
                "days_left": days_left,
                "term_days": term_days,
                "description": desc,
            })
        except Exception as ex:
            print(f"   [DEADLINE ENGINE] Błąd pozycji: {ex}")
            continue

    return alerts


def merge_regex_into_llm_items(
    llm_items: List[Dict[str, Any]],
    text: str,
) -> List[Dict[str, Any]]:
    """Uzupełnia brakujące delivery_date z regex OCR."""
    regex_hits = extract_delivery_dates(text)
    if not regex_hits and not llm_items:
        return llm_items

    merged = list(llm_items)
    primary_delivery = regex_hits[0]["delivery_date"] if regex_hits else None

    for item in merged:
        if item.get("delivery_date"):
            continue
        if primary_delivery:
            # OCR/ZPO: data doręczenia ma pierwszeństwo przed datą wydania pisma
            item["delivery_date"] = primary_delivery
            item["needs_delivery_confirmation"] = False
            item["date_source"] = "ocr_delivery_regex"

    if not merged and regex_hits:
        for hit in regex_hits[:2]:
            merged.append({
                "delivery_date": hit["delivery_date"],
                "term_days": 14,
                "description": f"Doręczenie (wykryte w tekście: …{hit['context'][-60:]})",
                "date_source": hit["source"],
            })

    return merged


# Czynności już wykonane — wykrywane w tekście akt
_FILING_PATTERNS: List[Tuple[re.Pattern, str]] = [
    (
        re.compile(
            r"(?:odwołani[ea]\s+(?:z\s+)?(?:dnia\s+)?|wniesion[oa]\s+odwołani[ea]|"
            r"złożon[oa]\s+odwołani[ea]|odwołanie\s+z\s+|już\s+złożon[oa]\s+odwołani[ea])"
            r"[^\d]{0,20}(\d{1,2}[.\-/]\d{1,2}(?:[.\-/]\d{2,4})?)",
            re.IGNORECASE,
        ),
        "odwolanie",
    ),
    (
        re.compile(
            r"(?:skarg[ae]\s+(?:z\s+)?(?:dnia\s+)?|wniesion[oa]\s+skarg[ae]|złożon[oa]\s+skarg[ae])\s*"
            r"(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})",
            re.IGNORECASE,
        ),
        "skarga",
    ),
    (
        re.compile(
            r"(?:zażaleni[ea]\s+(?:z\s+)?(?:dnia\s+)?|wniesion[oa]\s+zażaleni[ea])\s*"
            r"(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4})",
            re.IGNORECASE,
        ),
        "zazalenie",
    ),
]


def extract_filings(text: str) -> List[Dict[str, Any]]:
    if not text:
        return []
    out: List[Dict[str, Any]] = []
    seen: Set[Tuple[str, str]] = set()
    for pattern, kind in _FILING_PATTERNS:
        for m in pattern.finditer(text):
            raw = m.group(1)
            dt = parse_polish_date(raw)
            if not dt:
                continue
            key = (kind, dt.strftime("%d.%m.%Y"))
            if key in seen:
                continue
            seen.add(key)
            out.append({"type": kind, "date": dt.strftime("%d.%m.%Y"), "datetime": dt})
    return out


def infer_procedural_stage(text: str) -> str:
    t = (text or "").lower()
    if any(x in t for x in ("wsa", "wojewódzki sąd administracyjny", "skarga do wojewódzkiego")):
        return "postępowanie sądowe (WSA)"
    if any(x in t for x in ("sko", "samorządowe kolegium", "odwoławcz", "odwołanie do sko")):
        return "postępowanie odwoławcze (SKO)"
    if "odwołanie" in t and any(x in t for x in ("wniesion", "złożon", "z dnia")):
        return "po wniesieniu odwołania"
    if any(x in t for x in ("decyzj", "postanowieni", "zarządzeni")):
        return "po wydaniu decyzji / pisma organu I instancji"
    return "etap do ustalenia z akt"


def build_procedural_brief(text: str) -> Dict[str, Any]:
    """
    Jednolity opis stanu sprawy dla adwokata i alertów — żeby nie było sprzeczności.
    """
    deliveries = extract_delivery_dates(text)
    filings = extract_filings(text)
    stage = infer_procedural_stage(text)
    lines: List[str] = [f"**Etap postępowania:** {stage}."]

    if deliveries:
        d = deliveries[0]["delivery_date"]
        lines.append(
            f"**Doręczenie pisma organu:** {d} — od tej daty (nie od daty wydania w nagłówku) "
            f"liczy się termin na czynność strony."
        )
    else:
        lines.append(
            "**Doręczenie:** brak jednoznacznej daty w tekście — nie wyliczaj terminu bez ZPO/UPO."
        )

    for f in filings:
        label = {"odwolanie": "Odwołanie", "skarga": "Skarga", "zazalenie": "Zażalenie"}.get(
            f["type"], f["type"]
        )
        lines.append(f"**{label}:** wniesione / złożone — data z akt: {f['date']}.")

    if not filings:
        lines.append("**Czynności strony:** w tekście nie wykryto daty złożenia odwołania/skargi.")

    return {
        "stage": stage,
        "deliveries": deliveries,
        "filings": filings,
        "summary_lines": lines,
    }


def _alert_covers_odwolanie(description: str) -> bool:
    d = (description or "").lower()
    return "odwoł" in d or "odwol" in d


def refine_alerts_with_context(
    alerts: List[Dict[str, Any]],
    text: str,
    reference_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Usuwa mylące alarmy (np. „termin odwołania upłynął” gdy odwołanie już w terminie złożone).
    """
    brief = build_procedural_brief(text)
    filings = brief.get("filings") or []
    ref = reference_date or datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    refined: List[Dict[str, Any]] = []

    for alert in alerts:
        atype = alert.get("type")
        desc = alert.get("description") or ""
        deadline_str = alert.get("deadline_date")
        deadline_dt = parse_polish_date(deadline_str) if deadline_str else None

        odw_filings = [f for f in filings if f.get("type") == "odwolanie"]
        if atype == "deadline" and _alert_covers_odwolanie(desc) and odw_filings and deadline_dt:
            filing_dt = odw_filings[0].get("datetime")
            if filing_dt and filing_dt <= deadline_dt:
                refined.append({
                    **alert,
                    "type": "completed_on_time",
                    "days_left": None,
                    "description": (
                        f"✅ **Odwołanie złożone w terminie.** Doręczenie decyzji: "
                        f"{alert.get('delivery_date', '?')}. Ostatni dzień na odwołanie: "
                        f"{deadline_str}. Z akt wynika odwołanie z dnia {odw_filings[0]['date']} — "
                        f"nie ma opóźnienia w tym kroku. Pilnuj teraz rozstrzygnięcia SKO."
                    ),
                })
                continue

        if atype == "deadline" and _alert_covers_odwolanie(desc):
            stage = (brief.get("stage") or "").lower()
            if "sko" in stage or "odwoławcz" in stage:
                continue

        if atype == "deadline" and alert.get("days_left") is not None and alert["days_left"] < 0:
            if not odw_filings and "odwoł" in (brief.get("stage") or "").lower():
                pass
            refined.append(alert)
            continue

        refined.append(alert)

    return refined


def format_coherent_deadline_block(
    brief: Dict[str, Any],
    alerts: List[Dict[str, Any]],
) -> str:
    """
    Jedna spójna sekcja na początek odpowiedzi — zamiast paniki i sprzecznych dat.
    """
    lines = ["\n\n---\n\n## 📋 Stan sprawy i terminy (wyjaśnienie)\n"]
    for line in brief.get("summary_lines") or []:
        lines.append(f"- {line}\n")

    actionable = [a for a in alerts if a.get("type") not in ("completed_on_time",)]
    completed = [a for a in alerts if a.get("type") == "completed_on_time"]

    if completed:
        lines.append("\n**Co już jest zrobione:**\n")
        for a in completed:
            lines.append(f"- {a.get('description', '')}\n")

    pending = [a for a in actionable if a.get("type") == "pending_delivery"]
    urgent = [
        a for a in actionable
        if a.get("type") == "deadline" and (a.get("days_left") is None or a.get("days_left", 99) <= 14)
    ]

    if pending:
        lines.append("\n**Do uzupełnienia:**\n")
        for a in pending:
            lines.append(f"- {a.get('description', '')}\n")

    if urgent:
        lines.append("\n**Terminy do pilnowania:**\n")
        for a in urgent:
            if a.get("days_left") is not None and a["days_left"] < 0:
                lines.append(
                    f"- ⏰ {a.get('description', '')} "
                    f"(rozważ przywrócenie terminu lub inną czynność).\n"
                )
            else:
                lines.append(f"- ⏰ {a.get('description', '')}\n")
    elif not completed and not pending:
        lines.append(
            "\n_Brak pilnych terminów do wyliczenia z akt — oprzyj plan na raportach ekspertów._\n"
        )

    lines.append("\n---\n\n")
    return "".join(lines)


URGENCY_LLM_SYSTEM_PROMPT = (
    "Jesteś specjalistą od terminów w polskim prawie procesowym (KPC, KPA, Ordynacja podatkowa).\n\n"
    "ZASADA BEZWZGLĘDNA: termin biegnie od DATY DORĘCZENIA przesyłki (odbiór przez adresata, "
    "ZPO/UPO, fikcja doręczenia — art. 57 i nast. KPA), NIGDY od daty wydania/decyzji "
    "widocznej w nagłówku pisma.\n\n"
    "W polu delivery_date podaj WYŁĄCZNIE datę doręczenia/odbioru, jeśli jest w tekście.\n"
    "W polu document_date możesz podać datę z nagłówka pisma — NIE służy do obliczeń.\n"
    "Jeśli jest tylko data wydania pisma bez daty doręczenia: delivery_date = null, "
    "needs_delivery_confirmation = true.\n\n"
    "NIE twórz terminów dla: zawiadomienia o wszczęciu bez pouczenia; samych dat wydania; "
    "informacji bez terminu i prawa do czynności.\n"
    "Nie zgaduj dat doręczenia. term_days tylko z pouczenia (liczba całkowita).\n\n"
    "Zwróć wyłącznie JSON (lista lub []):\n"
    '[{"delivery_date": "10.05.2026", "document_date": "01.05.2026", '
    '"term_days": 14, "needs_delivery_confirmation": false, '
    '"description": "Odwołanie od decyzji — doręczenie z pouczeniem"}]'
)
