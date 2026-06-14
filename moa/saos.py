"""
Klient REST API SAOS (System Analizy Orzeczeń Sądowych).

Oficjalne API: https://www.saos.org.pl/api/search/judgments
Serwisy webowe (słowniki, autouzupełnianie):
https://www.saos.org.pl/help/index.php/dokumentacja-api/dodatkowe-serwisy
"""
from __future__ import annotations

from typing import Any, Optional
from urllib.parse import quote

import httpx

SAOS_API_BASE = "https://www.saos.org.pl/api"
SAOS_WEB_BASE = "https://www.saos.org.pl"
DEFAULT_TIMEOUT = 45.0
DUMP_TIMEOUT = 120.0

_HEADERS = {"Accept": "application/json"}


class SaosMaintenanceError(Exception):
    """SAOS zwrócił stronę przerwy technicznej zamiast JSON."""


def _is_maintenance_html(text: str) -> bool:
    lowered = text[:800].lower()
    return "<!doctype html" in lowered or "przerwa techniczna" in lowered


async def _request(
    url: str,
    params: Optional[dict[str, Any]] = None,
    *,
    timeout: float = DEFAULT_TIMEOUT,
) -> httpx.Response:
    async with httpx.AsyncClient(timeout=timeout) as client:
        return await client.get(url, params=params or {}, headers=_HEADERS)


async def _get_json(
    url: str,
    params: Optional[dict[str, Any]] = None,
    *,
    timeout: float = DEFAULT_TIMEOUT,
) -> Any:
    response = await _request(url, params, timeout=timeout)
    response.raise_for_status()
    if _is_maintenance_html(response.text):
        raise SaosMaintenanceError("SAOS jest chwilowo niedostępny (przerwa techniczna).")
    return response.json()


def _as_item_dicts(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        items = payload.get("items")
        if isinstance(items, list):
            return [item for item in items if isinstance(item, dict)]
    return []


async def get_saos_common_courts_list(page_size: int = 500) -> list[dict[str, Any]]:
    """Lista sądów powszechnych — szybki endpoint webowy."""
    try:
        payload = await _get_json(f"{SAOS_WEB_BASE}/cc/courts/list")
        courts = _as_item_dicts(payload)
    except Exception:
        payload = await _get_json(
            f"{SAOS_API_BASE}/dump/commonCourts",
            {"pageSize": min(max(page_size, 10), 100), "pageNumber": 0},
            timeout=DUMP_TIMEOUT,
        )
        courts = _as_item_dicts(payload)

    return [
        {
            "id": item.get("id"),
            "name": item.get("name"),
            "type": item.get("type"),
            "code": item.get("code"),
        }
        for item in courts
    ]


async def get_saos_common_court_divisions_list(court_id: int) -> list[dict[str, Any]]:
    """Wydziały sądu powszechnego."""
    payload = await _get_json(
        f"{SAOS_WEB_BASE}/cc/courts/{court_id}/courtDivisions/list"
    )
    return [
        {"id": item.get("id"), "name": item.get("name"), "code": item.get("code")}
        for item in _as_item_dicts(payload)
    ]


async def get_saos_sc_chambers_list() -> list[dict[str, Any]]:
    """Lista izb Sądu Najwyższego."""
    try:
        payload = await _get_json(f"{SAOS_WEB_BASE}/sc/chambers/list")
        chambers = _as_item_dicts(payload)
    except Exception:
        payload = await _get_json(
            f"{SAOS_API_BASE}/dump/scChambers",
            {"pageSize": 100, "pageNumber": 0},
        )
        chambers = _as_item_dicts(payload)

    return [{"id": item.get("id"), "name": item.get("name")} for item in chambers]


async def get_saos_sc_chamber_divisions_list(chamber_id: int) -> list[dict[str, Any]]:
    """Wydziały izby SN."""
    payload = await _get_json(
        f"{SAOS_WEB_BASE}/sc/chambers/{chamber_id}/chamberDivisions/list"
    )
    return [
        {"id": item.get("id"), "name": item.get("name")}
        for item in _as_item_dicts(payload)
    ]


async def get_saos_sc_judgment_forms_list() -> list[dict[str, Any]]:
    """Formy orzeczeń SN."""
    payload = await _get_json(f"{SAOS_WEB_BASE}/sc/judgmentForms/list")
    return [
        {"id": item.get("id"), "name": item.get("name")}
        for item in _as_item_dicts(payload)
    ]


async def get_saos_common_keywords(prefix: str) -> list[dict[str, Any]]:
    """Autouzupełnianie haseł tematycznych (słowa kluczowe sądów powszechnych)."""
    start = (prefix or "").strip()
    if not start:
        return []

    encoded = quote(start, safe="")
    payload = await _get_json(f"{SAOS_WEB_BASE}/keywords/COMMON/{encoded}")

    results: list[dict[str, Any]] = []
    for item in _as_item_dicts(payload):
        phrase = item.get("phrase") or item.get("name")
        if isinstance(phrase, str) and phrase.strip():
            results.append({"id": item.get("id"), "name": phrase.strip()})
    return results


async def search_saos_law_journal_entries(
    year: Optional[int] = None,
    journal_no: Optional[int] = None,
    entry: Optional[int] = None,
    text: Optional[str] = None,
    page_size: int = 20,
    page_number: int = 0,
) -> dict[str, Any]:
    """Wyszukiwanie pozycji dziennika ustaw powiązanych z orzeczeniami."""
    params: dict[str, Any] = {
        "pageSize": min(max(page_size, 10), 100),
        "pageNumber": max(page_number, 0),
    }
    if year is not None:
        params["year"] = year
    if journal_no is not None:
        params["journalNo"] = journal_no
    if entry is not None:
        params["entry"] = entry
    if text:
        params["text"] = text.strip()

    payload = await _get_json(
        f"{SAOS_WEB_BASE}/search/lawJournalEntries",
        params,
    )

    if isinstance(payload, list):
        items = [item for item in payload if isinstance(item, dict)]
        return {
            "items": items,
            "links": [],
            "info": {"totalResults": len(items)},
        }

    if isinstance(payload, dict):
        return payload

    return {"items": [], "links": [], "info": {"totalResults": 0}}


async def get_saos_judgment_details(judgment_id: int) -> Optional[dict[str, Any]]:
    """Pełne dane orzeczenia."""
    try:
        payload = await _get_json(f"{SAOS_API_BASE}/judgments/{judgment_id}")
        data = payload.get("data") if isinstance(payload, dict) else None
        return data if isinstance(data, dict) else payload
    except Exception as err:
        print(f"   [SAOS DETAILS ERR] {judgment_id}: {err}")
        return None


async def search_saos_judgments_raw(
    query: str = "",
    page_size: int = 20,
    page_number: int = 0,
    sorting_field: str = "JUDGMENT_DATE",
    sorting_direction: str = "DESC",
    legal_base: Optional[str] = None,
    referenced_regulation: Optional[str] = None,
    law_journal_entry_code: Optional[str] = None,
    judge_name: Optional[str] = None,
    case_number: Optional[str] = None,
    court_type: Optional[str] = None,
    cc_court_id: Optional[int] = None,
    cc_court_code: Optional[str] = None,
    cc_court_name: Optional[str] = None,
    cc_division_id: Optional[int] = None,
    cc_division_code: Optional[str] = None,
    cc_division_name: Optional[str] = None,
    cc_include_dependent_court_judgments: bool = False,
    sc_personnel_type: Optional[str] = None,
    sc_judgment_form: Optional[str] = None,
    sc_chamber_id: Optional[int] = None,
    sc_chamber_name: Optional[str] = None,
    sc_division_id: Optional[int] = None,
    sc_division_name: Optional[str] = None,
    judgment_types: Optional[list[str]] = None,
    keywords: Optional[list[str]] = None,
    judgment_date_from: Optional[str] = None,
    judgment_date_to: Optional[str] = None,
    **_: Any,
) -> dict[str, Any]:
    """Wyszukiwanie orzeczeń — mapowanie parametrów na oficjalne API SAOS."""
    params: list[tuple[str, str]] = [
        ("pageSize", str(min(max(page_size, 10), 100))),
        ("pageNumber", str(max(page_number, 0))),
        ("sortingField", sorting_field or "JUDGMENT_DATE"),
        ("sortingDirection", (sorting_direction or "DESC").upper()),
    ]

    def _add(name: str, value: Optional[Any]) -> None:
        if value is None:
            return
        if isinstance(value, str) and not value.strip():
            return
        params.append((name, str(value).strip() if isinstance(value, str) else str(value)))

    _add("all", query)
    _add("legalBase", legal_base)
    _add("referencedRegulation", referenced_regulation)
    _add("lawJournalEntryCode", law_journal_entry_code)
    _add("judgeName", judge_name)
    _add("caseNumber", case_number)
    _add("courtType", court_type)
    _add("ccCourtId", cc_court_id)
    _add("ccCourtCode", cc_court_code)
    _add("ccCourtName", cc_court_name)
    _add("ccDivisionId", cc_division_id)
    _add("ccDivisionCode", cc_division_code)
    _add("ccDivisionName", cc_division_name)
    if cc_include_dependent_court_judgments:
        params.append(("ccIncludeDependentCourtJudgments", "true"))
    _add("scPersonnelType", sc_personnel_type)
    _add("scJudgmentForm", sc_judgment_form)
    _add("scChamberId", sc_chamber_id)
    _add("scChamberName", sc_chamber_name)
    _add("scDivisionId", sc_division_id)
    _add("scDivisionName", sc_division_name)
    _add("judgmentDateFrom", judgment_date_from)
    _add("judgmentDateTo", judgment_date_to)

    if judgment_types:
        for jt in judgment_types:
            if jt:
                params.append(("judgmentTypes", str(jt).strip().upper()))

    if keywords:
        for kw in keywords:
            if kw and str(kw).strip():
                params.append(("keywords", str(kw).strip()))

    response = await _request(
        f"{SAOS_API_BASE}/search/judgments",
        dict(params),
        timeout=DEFAULT_TIMEOUT,
    )
    if _is_maintenance_html(response.text):
        raise SaosMaintenanceError("SAOS jest chwilowo niedostępny (przerwa techniczna).")
    response.raise_for_status()
    data = response.json()
    return data if isinstance(data, dict) else {"items": data}
