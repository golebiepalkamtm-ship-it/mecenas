import asyncio
import re
from typing import Any, Optional
from urllib.parse import quote

import httpx

from moa.models import RetrievedChunk


SAOS_API_SEARCH_JUDGMENTS_URL = "https://www.saos.org.pl/api/search/judgments"
SAOS_API_JUDGMENT_DETAILS_URL = "https://www.saos.org.pl/api/judgments"

SAOS_ADDITIONAL_COMMON_COURTS_URL = "https://www.saos.org.pl/cc/courts/list"
SAOS_ADDITIONAL_COMMON_COURT_DIVISIONS_URL = (
    "https://www.saos.org.pl/cc/courts/{court_id}/courtDivisions/list"
)
SAOS_ADDITIONAL_SC_CHAMBERS_URL = "https://www.saos.org.pl/sc/chambers/list"
SAOS_ADDITIONAL_SC_CHAMBER_DIVISIONS_URL = (
    "https://www.saos.org.pl/sc/chambers/{chamber_id}/chamberDivisions/list"
)
SAOS_ADDITIONAL_SC_JUDGMENT_FORMS_URL = "https://www.saos.org.pl/sc/judgmentForms/list"
SAOS_ADDITIONAL_LAW_JOURNAL_ENTRIES_URL = (
    "https://www.saos.org.pl/search/lawJournalEntries"
)
SAOS_ADDITIONAL_COMMON_KEYWORDS_URL = (
    "https://www.saos.org.pl/keywords/COMMON/{keyword_start}"
)

SAOS_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}


def _strip_html(text: str) -> str:
    """Usuwa tagi HTML z treści orzeczeń SAOS."""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:3000]


def _normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    stripped = value.strip()
    return stripped if stripped else None


def _normalize_int(value: Optional[int]) -> Optional[int]:
    if value is None:
        return None
    return value if value >= 0 else None


def _extract_case_number(item: dict[str, Any]) -> str:
    court_cases = item.get("courtCases")
    if isinstance(court_cases, list) and court_cases:
        first_case = court_cases[0]
        if isinstance(first_case, dict):
            case_number = _normalize_text(first_case.get("caseNumber"))
            if case_number:
                return case_number
    return "N/A"


def _extract_court_name(item: dict[str, Any]) -> str:
    division = item.get("division")
    if isinstance(division, dict):
        court = division.get("court")
        if isinstance(court, dict):
            court_name = _normalize_text(court.get("name"))
            if court_name:
                return court_name

    chambers = item.get("chambers")
    if isinstance(chambers, list) and chambers:
        first_chamber = chambers[0]
        if isinstance(first_chamber, dict):
            chamber_name = _normalize_text(first_chamber.get("name"))
            if chamber_name:
                return chamber_name

    return "N/A"


def _build_source_label(item: dict[str, Any]) -> str:
    judgment_id = item.get("id", "N/A")
    court_name = _extract_court_name(item)
    case_number = _extract_case_number(item)
    return f"ORZECZENIE SAOS ID: {judgment_id} ({court_name}, {case_number})"


def _empty_search_payload() -> dict[str, Any]:
    return {
        "links": [],
        "items": [],
        "queryTemplate": {},
        "info": {"totalResults": 0},
    }


def _empty_law_journal_payload() -> dict[str, Any]:
    return {
        "links": [],
        "items": [],
        "queryTemplate": {},
        "info": {"totalResults": 0},
    }


def _build_saos_search_params(
    *,
    query: str,
    page_size: int,
    page_number: int,
    sorting_field: str,
    sorting_direction: str,
    legal_base: Optional[str],
    referenced_regulation: Optional[str],
    law_journal_entry_code: Optional[str],
    judge_name: Optional[str],
    case_number: Optional[str],
    court_type: Optional[str],
    cc_court_id: Optional[int],
    cc_court_code: Optional[str],
    cc_court_name: Optional[str],
    cc_division_id: Optional[int],
    cc_division_code: Optional[str],
    cc_division_name: Optional[str],
    cc_include_dependent_court_judgments: bool,
    sc_personnel_type: Optional[str],
    sc_judgment_form: Optional[str],
    sc_chamber_id: Optional[int],
    sc_chamber_name: Optional[str],
    sc_division_id: Optional[int],
    sc_division_name: Optional[str],
    judgment_types: Optional[list[str]],
    keywords: Optional[list[str]],
    judgment_date_from: Optional[str],
    judgment_date_to: Optional[str],
) -> list[tuple[str, str | int]]:
    params: list[tuple[str, str | int]] = [
        ("pageSize", max(10, min(page_size, 100))),
        ("pageNumber", max(0, page_number)),
        ("sortingField", sorting_field),
        ("sortingDirection", sorting_direction),
    ]

    normalized_query = _normalize_text(query)
    if normalized_query:
        params.append(("all", normalized_query))

    text_filters: dict[str, Optional[str]] = {
        "legalBase": legal_base,
        "referencedRegulation": referenced_regulation,
        "lawJournalEntryCode": law_journal_entry_code,
        "judgeName": judge_name,
        "caseNumber": case_number,
        "courtType": court_type,
        "ccCourtCode": cc_court_code,
        "ccCourtName": cc_court_name,
        "ccDivisionCode": cc_division_code,
        "ccDivisionName": cc_division_name,
        "scPersonnelType": sc_personnel_type,
        "scJudgmentForm": sc_judgment_form,
        "scChamberName": sc_chamber_name,
        "scDivisionName": sc_division_name,
        "judgmentDateFrom": judgment_date_from,
        "judgmentDateTo": judgment_date_to,
    }
    for key, value in text_filters.items():
        normalized = _normalize_text(value)
        if normalized:
            params.append((key, normalized))

    int_filters: dict[str, Optional[int]] = {
        "ccCourtId": _normalize_int(cc_court_id),
        "ccDivisionId": _normalize_int(cc_division_id),
        "scChamberId": _normalize_int(sc_chamber_id),
        "scDivisionId": _normalize_int(sc_division_id),
    }
    for key, value in int_filters.items():
        if value is not None:
            params.append((key, value))

    if cc_court_id is not None:
        params.append(
            (
                "ccIncludeDependentCourtJudgments",
                "true" if cc_include_dependent_court_judgments else "false",
            )
        )

    for judgment_type in judgment_types or []:
        normalized_type = _normalize_text(judgment_type)
        if normalized_type:
            params.append(("judgmentTypes", normalized_type))

    for keyword in keywords or []:
        normalized_keyword = _normalize_text(keyword)
        if normalized_keyword:
            params.append(("keywords", normalized_keyword))

    return params


async def search_saos_judgments_raw(
    query: str = "",
    *,
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
) -> dict[str, Any]:
    """
    Pobiera surowe wyniki z API SAOS dla orzeczeń (items, links, info).
    Obsługuje pełny zestaw filtrów dostępnych w API przeszukiwania SAOS.
    """
    params = _build_saos_search_params(
        query=query,
        page_size=page_size,
        page_number=page_number,
        sorting_field=sorting_field,
        sorting_direction=sorting_direction,
        legal_base=legal_base,
        referenced_regulation=referenced_regulation,
        law_journal_entry_code=law_journal_entry_code,
        judge_name=judge_name,
        case_number=case_number,
        court_type=court_type,
        cc_court_id=cc_court_id,
        cc_court_code=cc_court_code,
        cc_court_name=cc_court_name,
        cc_division_id=cc_division_id,
        cc_division_code=cc_division_code,
        cc_division_name=cc_division_name,
        cc_include_dependent_court_judgments=cc_include_dependent_court_judgments,
        sc_personnel_type=sc_personnel_type,
        sc_judgment_form=sc_judgment_form,
        sc_chamber_id=sc_chamber_id,
        sc_chamber_name=sc_chamber_name,
        sc_division_id=sc_division_id,
        sc_division_name=sc_division_name,
        judgment_types=judgment_types,
        keywords=keywords,
        judgment_date_from=judgment_date_from,
        judgment_date_to=judgment_date_to,
    )

    debug_query = _normalize_text(query) or "[brak frazy all - filtrowanie parametrami]"
    print(f"   [SAOS] Przeszukiwanie dla: '{debug_query[:80]}'")

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.get(
                SAOS_API_SEARCH_JUDGMENTS_URL,
                params=params,
                headers=SAOS_HEADERS,
            )

        if response.status_code != 200:
            print(f"   [SAOS][ERR] HTTP {response.status_code}: {response.text[:200]}")
            return _empty_search_payload()

        try:
            data = response.json()
        except Exception:
            print(
                "   [SAOS][ERR] Błąd formatu "
                f"(Otrzymano uszkodzony JSON lub HTML): {response.text[:100]}"
            )
            return _empty_search_payload()

        if not isinstance(data, dict):
            print("   [SAOS][ERR] Nieoczekiwany format odpowiedzi (nie-dict)")
            return _empty_search_payload()

        if not isinstance(data.get("items"), list):
            data["items"] = []
        if not isinstance(data.get("links"), list):
            data["links"] = []
        if not isinstance(data.get("info"), dict):
            data["info"] = {"totalResults": 0}
        if not isinstance(data.get("queryTemplate"), dict):
            data["queryTemplate"] = {}

        print(f"   [SAOS][OK] Znaleziono {len(data['items'])} orzeczeń")
        return data

    except Exception as e:
        print(f"   [SAOS][ERR] Błąd połączenia: {e}")
        return _empty_search_payload()


async def search_saos_judgments(query: str, page_size: int = 5) -> list[RetrievedChunk]:
    """
    Przeszukuje bazę SAOS pod kątem wyroków i zwraca listę obiektów RetrievedChunk.
    Ta funkcja jest używana przez pipeline RAG i pozostaje kompatybilna wstecz.
    """
    raw = await search_saos_judgments_raw(
        query=query,
        page_size=page_size,
        page_number=0,
        sorting_field="JUDGMENT_DATE",
        sorting_direction="DESC",
    )
    items = raw.get("items", [])

    chunks: list[RetrievedChunk] = []
    for item in items:
        if not isinstance(item, dict):
            continue

        date = item.get("judgmentDate", "N/A")
        case_number = _extract_case_number(item)
        court_name = _extract_court_name(item)

        raw_content = item.get("textContent", "")
        if isinstance(raw_content, str) and raw_content.strip():
            content = _strip_html(raw_content)
        else:
            content = f"Wyrok z dnia {date}, sygn. {case_number}, sąd: {court_name}."

        chunks.append(
            RetrievedChunk(
                content=content,
                source=_build_source_label(item),
                similarity=0.9,
            )
        )

    return chunks


async def get_saos_judgment_details(judgment_id: int) -> Optional[dict[str, Any]]:
    """Pobiera szczegóły pojedynczego orzeczenia z API przeglądania SAOS."""
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.get(
                f"{SAOS_API_JUDGMENT_DETAILS_URL}/{judgment_id}",
                headers=SAOS_HEADERS,
            )

        if response.status_code != 200:
            print(
                f"   [SAOS][DETAILS][ERR] HTTP {response.status_code}: {response.text[:200]}"
            )
            return None

        payload = response.json()
        if isinstance(payload, dict):
            data = payload.get("data")
            if isinstance(data, dict):
                return data
        return None
    except Exception as e:
        print(f"   [SAOS][DETAILS][ERR] Błąd połączenia: {e}")
        return None


async def _fetch_json_list(url: str) -> list[dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.get(url, headers=SAOS_HEADERS)

        if response.status_code != 200:
            return []

        payload = response.json()
        if isinstance(payload, list):
            return [x for x in payload if isinstance(x, dict)]
        return []
    except Exception:
        return []


async def get_saos_common_courts_list() -> list[dict[str, Any]]:
    return await _fetch_json_list(SAOS_ADDITIONAL_COMMON_COURTS_URL)


async def get_saos_common_court_divisions_list(court_id: int) -> list[dict[str, Any]]:
    return await _fetch_json_list(
        SAOS_ADDITIONAL_COMMON_COURT_DIVISIONS_URL.format(court_id=court_id)
    )


async def get_saos_sc_chambers_list() -> list[dict[str, Any]]:
    return await _fetch_json_list(SAOS_ADDITIONAL_SC_CHAMBERS_URL)


async def get_saos_sc_chamber_divisions_list(chamber_id: int) -> list[dict[str, Any]]:
    return await _fetch_json_list(
        SAOS_ADDITIONAL_SC_CHAMBER_DIVISIONS_URL.format(chamber_id=chamber_id)
    )


async def get_saos_sc_judgment_forms_list() -> list[dict[str, Any]]:
    return await _fetch_json_list(SAOS_ADDITIONAL_SC_JUDGMENT_FORMS_URL)


async def get_saos_common_keywords(keyword_start: str) -> list[dict[str, Any]]:
    normalized = _normalize_text(keyword_start)
    if not normalized:
        return []

    url = SAOS_ADDITIONAL_COMMON_KEYWORDS_URL.format(
        keyword_start=quote(normalized, safe="")
    )
    return await _fetch_json_list(url)


async def search_saos_law_journal_entries(
    *,
    year: Optional[int] = None,
    journal_no: Optional[int] = None,
    entry: Optional[int] = None,
    text: Optional[str] = None,
    page_size: int = 20,
    page_number: int = 0,
) -> dict[str, Any]:
    params: dict[str, str | int] = {
        "pageSize": max(10, min(page_size, 100)),
        "pageNumber": max(0, page_number),
    }

    if year is not None and year > 0:
        params["year"] = year
    if journal_no is not None and journal_no >= 0:
        params["journalNo"] = journal_no
    if entry is not None and entry > 0:
        params["entry"] = entry

    normalized_text = _normalize_text(text)
    if normalized_text:
        params["text"] = normalized_text

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.get(
                SAOS_ADDITIONAL_LAW_JOURNAL_ENTRIES_URL,
                params=params,
                headers=SAOS_HEADERS,
            )

        if response.status_code != 200:
            return _empty_law_journal_payload()

        payload = response.json()
        if isinstance(payload, dict):
            if not isinstance(payload.get("items"), list):
                payload["items"] = []
            if not isinstance(payload.get("links"), list):
                payload["links"] = []
            if not isinstance(payload.get("queryTemplate"), dict):
                payload["queryTemplate"] = {}
            if not isinstance(payload.get("info"), dict):
                payload["info"] = {"totalResults": len(payload.get("items", []))}
            return payload

        if isinstance(payload, list):
            items = [x for x in payload if isinstance(x, dict)]
            return {
                "links": [],
                "items": items,
                "queryTemplate": {},
                "info": {"totalResults": len(items)},
            }

        return _empty_law_journal_payload()
    except Exception:
        return _empty_law_journal_payload()


if __name__ == "__main__":

    async def test() -> None:
        res = await search_saos_judgments("hulajnoga")
        for chunk in res:
            print(f"Source: {chunk.source}")
            print(f"Content: {chunk.content[:100]}...")
            print("-" * 20)

    asyncio.run(test())
