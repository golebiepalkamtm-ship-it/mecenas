import asyncio
import re
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, validator

from moa.retrieval import _extract_search_plans
from moa.saos import (
    get_saos_common_court_divisions_list,
    get_saos_common_courts_list,
    get_saos_common_keywords,
    get_saos_judgment_details,
    get_saos_sc_chamber_divisions_list,
    get_saos_sc_chambers_list,
    get_saos_sc_judgment_forms_list,
    search_saos_judgments_raw,
    search_saos_law_journal_entries,
)

router = APIRouter()

ALLOWED_SORTING_FIELDS = {
    "DATABASE_ID",
    "JUDGMENT_DATE",
    "REFERENCING_JUDGMENTS_COUNT",
    "MAXIMUM_MONEY_AMOUNT",
    "CC_COURT_TYPE",
    "CC_COURT_ID",
    "CC_COURT_CODE",
    "CC_COURT_NAME",
    "CC_COURT_DIVISION_ID",
    "CC_COURT_DIVISION_CODE",
    "CC_COURT_DIVISION_NAME",
    "SC_JUDGMENT_FORM_ID",
    "SC_PERSONNEL_TYPE",
    "SC_COURT_DIVISION_ID",
    "SC_COURT_DIVISION_NAME",
    "SC_COURT_DIVISIONS_CHAMBER_ID",
    "SC_COURT_DIVISIONS_CHAMBER_NAME",
}
ALLOWED_SORTING_DIRECTIONS = {"ASC", "DESC"}
ALLOWED_CC_COURT_TYPES = {"APPEAL", "REGIONAL", "DISTRICT"}
ALLOWED_SC_PERSONNEL_TYPES = {
    "ONE_PERSON",
    "THREE_PERSON",
    "FIVE_PERSON",
    "SEVEN_PERSON",
    "ALL_COURT",
    "ALL_CHAMBER",
    "JOINED_CHAMBERS",
}
ALLOWED_JUDGMENT_TYPES = {
    "DECISION",
    "RESOLUTION",
    "SENTENCE",
    "REGULATION",
    "REASONS",
}


def _strip_html_preview(text: str) -> str:
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def _extract_case_number(item: dict[str, Any]) -> str:
    court_cases = item.get("courtCases")
    if isinstance(court_cases, list) and court_cases:
        first_case = court_cases[0]
        if isinstance(first_case, dict):
            value = first_case.get("caseNumber")
            if isinstance(value, str) and value.strip():
                return value.strip()
    return "N/A"


def _extract_court_name(item: dict[str, Any]) -> str:
    division = item.get("division")
    if isinstance(division, dict):
        court = division.get("court")
        if isinstance(court, dict):
            court_name = court.get("name")
            if isinstance(court_name, str) and court_name.strip():
                return court_name.strip()

    chambers = item.get("chambers")
    if isinstance(chambers, list) and chambers:
        first_chamber = chambers[0]
        if isinstance(first_chamber, dict):
            chamber_name = first_chamber.get("name")
            if isinstance(chamber_name, str) and chamber_name.strip():
                return chamber_name.strip()

    return "N/A"


def _build_source_label(item: dict[str, Any]) -> str:
    judgment_id = item.get("id", "N/A")
    court_name = _extract_court_name(item)
    case_number = _extract_case_number(item)
    return f"ORZECZENIE SAOS ID: {judgment_id} ({court_name}, {case_number})"


class JudgmentSearchRequest(BaseModel):
    query: str = ""
    pageSize: int = Field(default=20, ge=10, le=100)
    pageNumber: int = Field(default=0, ge=0)
    use_ai: bool = True

    sortingField: str = "JUDGMENT_DATE"
    sortingDirection: str = "DESC"

    legalBase: Optional[str] = None
    referencedRegulation: Optional[str] = None
    lawJournalEntryCode: Optional[str] = None
    judgeName: Optional[str] = None
    caseNumber: Optional[str] = None

    courtType: Optional[str] = None
    ccCourtId: Optional[int] = Field(default=None, ge=0)
    ccCourtCode: Optional[str] = None
    ccCourtName: Optional[str] = None
    ccDivisionId: Optional[int] = Field(default=None, ge=0)
    ccDivisionCode: Optional[str] = None
    ccDivisionName: Optional[str] = None
    ccIncludeDependentCourtJudgments: bool = False

    scPersonnelType: Optional[str] = None
    scJudgmentForm: Optional[str] = None
    scChamberId: Optional[int] = Field(default=None, ge=0)
    scChamberName: Optional[str] = None
    scDivisionId: Optional[int] = Field(default=None, ge=0)
    scDivisionName: Optional[str] = None

    judgmentTypes: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    judgmentDateFrom: Optional[str] = None
    judgmentDateTo: Optional[str] = None

    @validator("sortingField")
    def validate_sorting_field(cls, value: str) -> str:
        if value not in ALLOWED_SORTING_FIELDS:
            raise ValueError("Nieobsługiwane pole sortowania")
        return value

    @validator("sortingDirection")
    def validate_sorting_direction(cls, value: str) -> str:
        direction = value.upper()
        if direction not in ALLOWED_SORTING_DIRECTIONS:
            raise ValueError("Dozwolone kierunki sortowania: ASC, DESC")
        return direction

    @validator("courtType")
    def validate_court_type(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        val = value.strip().upper()
        if val not in ALLOWED_CC_COURT_TYPES:
            raise ValueError("Dozwolone courtType: APPEAL, REGIONAL, DISTRICT")
        return val

    @validator("scPersonnelType")
    def validate_sc_personnel_type(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        val = value.strip().upper()
        if val not in ALLOWED_SC_PERSONNEL_TYPES:
            raise ValueError("Nieobsługiwany typ składu Sądu Najwyższego")
        return val

    @validator("judgmentTypes")
    def validate_judgment_types(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        for judgment_type in value:
            item = judgment_type.strip().upper()
            if item not in ALLOWED_JUDGMENT_TYPES:
                raise ValueError(f"Nieobsługiwany typ orzeczenia: {judgment_type}")
            normalized.append(item)
        return normalized

    @validator("judgmentDateFrom", "judgmentDateTo")
    def validate_date_format(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except ValueError as err:
            raise ValueError("Data musi mieć format yyyy-MM-dd") from err
        return value

    @validator("lawJournalEntryCode")
    def validate_law_journal_code(cls, value: Optional[str]) -> Optional[str]:
        if value is None or not value.strip():
            return value
        if not re.match(r"^\d{4}/\d+$", value.strip()):
            raise ValueError(
                "Kod Dziennika Ustaw musi mieć format rok/pozycja, np. 2008/141"
            )
        return value.strip()


@router.get("/search/facets")
async def get_search_facets() -> dict[str, Any]:
    try:
        common_courts, sc_chambers, sc_judgment_forms = await asyncio.gather(
            get_saos_common_courts_list(),
            get_saos_sc_chambers_list(),
            get_saos_sc_judgment_forms_list(),
        )

        return {
            "sortingFields": sorted(list(ALLOWED_SORTING_FIELDS)),
            "sortingDirections": sorted(list(ALLOWED_SORTING_DIRECTIONS)),
            "ccCourtTypes": sorted(list(ALLOWED_CC_COURT_TYPES)),
            "scPersonnelTypes": sorted(list(ALLOWED_SC_PERSONNEL_TYPES)),
            "judgmentTypes": sorted(list(ALLOWED_JUDGMENT_TYPES)),
            "commonCourts": common_courts,
            "scChambers": sc_chambers,
            "scJudgmentForms": sc_judgment_forms,
        }
    except Exception as e:
        print(f"   [SEARCH FACETS ERR] {e}")
        raise HTTPException(
            status_code=500, detail="Nie udało się pobrać słowników wyszukiwania"
        )


@router.get("/search/common-courts/{court_id}/divisions")
async def get_common_court_divisions(court_id: int) -> dict[str, Any]:
    try:
        return {"items": await get_saos_common_court_divisions_list(court_id)}
    except Exception as e:
        print(f"   [SEARCH CC DIV ERR] {e}")
        raise HTTPException(
            status_code=500, detail="Nie udało się pobrać wydziałów sądu powszechnego"
        )


@router.get("/search/sc-chambers/{chamber_id}/divisions")
async def get_sc_chamber_divisions(chamber_id: int) -> dict[str, Any]:
    try:
        return {"items": await get_saos_sc_chamber_divisions_list(chamber_id)}
    except Exception as e:
        print(f"   [SEARCH SC DIV ERR] {e}")
        raise HTTPException(
            status_code=500, detail="Nie udało się pobrać wydziałów izby SN"
        )


@router.get("/search/law-journal-entries")
async def get_law_journal_entries(
    year: Optional[int] = Query(default=None),
    journalNo: Optional[int] = Query(default=None),
    entry: Optional[int] = Query(default=None),
    text: Optional[str] = Query(default=None),
    pageSize: int = Query(default=20, ge=10, le=100),
    pageNumber: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    try:
        return await search_saos_law_journal_entries(
            year=year,
            journal_no=journalNo,
            entry=entry,
            text=text,
            page_size=pageSize,
            page_number=pageNumber,
        )
    except Exception as e:
        print(f"   [SEARCH LAW JOURNAL ERR] {e}")
        raise HTTPException(
            status_code=500, detail="Nie udało się pobrać pozycji dziennika ustaw"
        )


@router.get("/search/keywords")
async def get_keywords(
    prefix: str = Query(..., min_length=1, max_length=120),
) -> dict[str, Any]:
    try:
        return {"items": await get_saos_common_keywords(prefix)}
    except Exception as e:
        print(f"   [SEARCH KEYWORDS ERR] {e}")
        raise HTTPException(
            status_code=500, detail="Nie udało się pobrać słów kluczowych"
        )


@router.post("/search")
async def search_judgments(request: JudgmentSearchRequest) -> dict[str, Any]:
    try:
        original_query = request.query.strip()
        search_query = original_query

        if request.use_ai and len(original_query) > 10:
            print(f"   [AI SEARCH] Optymalizacja zapytania: '{original_query[:50]}...'")
            _, saos_ai_query, _ = await _extract_search_plans(original_query)
            if saos_ai_query and saos_ai_query.strip():
                search_query = saos_ai_query.strip()
                print(f"   [AI SEARCH] Nowa fraza: '{search_query}'")

        search_payload = {
            "query": search_query,
            "page_size": request.pageSize,
            "page_number": request.pageNumber,
            "sorting_field": request.sortingField,
            "sorting_direction": request.sortingDirection,
            "legal_base": request.legalBase,
            "referenced_regulation": request.referencedRegulation,
            "law_journal_entry_code": request.lawJournalEntryCode,
            "judge_name": request.judgeName,
            "case_number": request.caseNumber,
            "court_type": request.courtType,
            "cc_court_id": request.ccCourtId,
            "cc_court_code": request.ccCourtCode,
            "cc_court_name": request.ccCourtName,
            "cc_division_id": request.ccDivisionId,
            "cc_division_code": request.ccDivisionCode,
            "cc_division_name": request.ccDivisionName,
            "cc_include_dependent_court_judgments": request.ccIncludeDependentCourtJudgments,
            "sc_personnel_type": request.scPersonnelType,
            "sc_judgment_form": request.scJudgmentForm,
            "sc_chamber_id": request.scChamberId,
            "sc_chamber_name": request.scChamberName,
            "sc_division_id": request.scDivisionId,
            "sc_division_name": request.scDivisionName,
            "judgment_types": request.judgmentTypes,
            "keywords": request.keywords,
            "judgment_date_from": request.judgmentDateFrom,
            "judgment_date_to": request.judgmentDateTo,
        }

        raw = await search_saos_judgments_raw(**search_payload)

        if not raw.get("items") and search_query != original_query and original_query:
            raw = await search_saos_judgments_raw(
                **{**search_payload, "query": original_query}
            )

        items = raw.get("items", [])
        mapped_items: list[dict[str, Any]] = []
        for item in items:
            if not isinstance(item, dict):
                continue

            text_content = item.get("textContent")
            snippet = ""
            if isinstance(text_content, str):
                snippet = _strip_html_preview(text_content)

            if not snippet:
                judgment_date = item.get("judgmentDate", "N/A")
                case_number = _extract_case_number(item)
                court_name = _extract_court_name(item)
                snippet = f"Orzeczenie z dnia {judgment_date}, sygn. {case_number}, sąd: {court_name}."

            mapped_items.append(
                {
                    "id": item.get("id"),
                    "href": item.get("href"),
                    "content": snippet,
                    "source": _build_source_label(item),
                    "similarity": 0.9,
                    "optimized_query": (
                        search_query if search_query != original_query else None
                    ),
                    "courtType": item.get("courtType"),
                    "judgmentType": item.get("judgmentType"),
                    "judgmentDate": item.get("judgmentDate"),
                    "caseNumber": _extract_case_number(item),
                    "courtName": _extract_court_name(item),
                    "keywords": item.get("keywords")
                    if isinstance(item.get("keywords"), list)
                    else [],
                    "division": item.get("division"),
                }
            )

        return {
            "items": mapped_items,
            "links": raw.get("links", []),
            "queryTemplate": raw.get("queryTemplate", {}),
            "info": raw.get("info", {"totalResults": len(mapped_items)}),
            "optimizedQuery": search_query if search_query != original_query else None,
        }
    except Exception as e:
        print(f"   [SEARCH ERR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{judgment_id}")
async def judgment_details(judgment_id: int) -> dict[str, Any]:
    try:
        if judgment_id <= 0:
            raise HTTPException(
                status_code=400, detail="Nieprawidłowy identyfikator orzeczenia"
            )

        details = await get_saos_judgment_details(judgment_id)
        if not details:
            raise HTTPException(
                status_code=404, detail="Nie znaleziono szczegółów orzeczenia"
            )

        return {"data": details}
    except HTTPException:
        raise
    except Exception as e:
        print(f"   [DETAILS ERR] {e}")
        raise HTTPException(status_code=500, detail=str(e))
