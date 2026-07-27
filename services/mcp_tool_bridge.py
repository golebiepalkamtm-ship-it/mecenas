"""Unified MCP Tool Bridge — Python-callable interface dla WSZYSTKICH 29 narzędzi MCP.

Dostarcza jedną funkcję `call_mcp_tool(tool_name, **params)` → dict
która routuje wywołanie do odpowiedniego providera Python.

Pokrywa:
  Node.js MCP (21 narzędzi):
    ISAP:  isap_list_publishers, isap_search_acts, isap_get_act_details, isap_get_act_text
    SAOS:  saos_search_judgments, saos_get_judgment_details, saos_search_by_article, saos_list_courts
    Sejm:  sejm_list_prints, sejm_get_print_details, sejm_list_mps, sejm_search_interpellations,
           sejm_list_committees, sejm_list_votings, sejm_get_voting_details
    KRS:   krs_get_company, ceidg_search_business
    CBOSA: cbosa_search_judgments
    UODO:  uodo_search_decisions
    KIO:   kio_search_judgments
    TSUE:  tsue_search_judgments
    INNE:  internet_search

  Python MCP (8 narzędzi):
    search_legal_acts, search_judgments, search_supabase_rag,
    list_sessions, get_session_messages,
    list_documents, get_document_info,
    find_files, search_code
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from services.retrieval.types import RetrievalItem, normalize_retrieval_rows

logger = logging.getLogger(__name__)

# ──────────────────────────────── Constants ────────────────────────────────
SEJM_ELI_BASE = "https://api.sejm.gov.pl/eli"
SEJM_API_BASE = "https://api.sejm.gov.pl/sejm"
SAOS_API_BASE = "https://www.saos.org.pl/api"
KRS_API_BASE = "https://api-krs.ms.gov.pl/api/krs"
CBOSA_BASE = "https://orzeczenia.nsa.gov.pl"
CEIDG_BASE = "https://dane.biznes.gov.pl/api/ceidg/v2"

DEFAULT_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

# ──────────────────────────────── Helpers ────────────────────────────────
def _strip_html(text: Any) -> str:
    if text is None or isinstance(text, bool):
        return ""
    source = str(text)
    clean = re.sub(r"<[^>]+>", " ", source)
    return re.sub(r"\s+", " ", clean).strip()


async def _http_get(url: str, params: Optional[dict] = None, headers: Optional[dict] = None, timeout: float = 15.0) -> Any:
    hdrs = {**DEFAULT_HEADERS, **(headers or {})}
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(url, params=params, headers=hdrs, follow_redirects=True)
        resp.raise_for_status()
        ct = resp.headers.get("content-type", "")
        if "json" in ct:
            return resp.json()
        return resp.text


# ═══════════════════════════════════════════════════════════════════════════
#  1. ISAP / ELI (tools 1-4)
# ═══════════════════════════════════════════════════════════════════════════

async def isap_list_publishers(**_) -> Dict[str, Any]:
    data = await _http_get(f"{SEJM_ELI_BASE}/acts")
    return {"status": "ok", "publishers": data}


async def isap_search_acts(*, publisher: str = "DU", year: int = 2024, query: str = "", type: str = "", status: str = "", limit: int = 20, **_) -> Dict[str, Any]:
    data = await _http_get(f"{SEJM_ELI_BASE}/acts/{publisher}/{year}")
    items = data.get("items", []) if isinstance(data, dict) else data if isinstance(data, list) else []

    if query:
        q = query.lower()
        items = [i for i in items if isinstance(i, dict) and q in (i.get("title") or "").lower()]
    if type:
        t = type.lower()
        items = [i for i in items if isinstance(i, dict) and t in (i.get("type") or "").lower()]
    if status:
        s = status.lower()
        items = [i for i in items if isinstance(i, dict) and s in (i.get("status") or "").lower()]

    return {"status": "ok", "count": len(items), "items": items[:limit]}


async def isap_get_act_details(*, publisher: str = "DU", year: int = 2024, pos: int = 1, **_) -> Dict[str, Any]:
    data = await _http_get(f"{SEJM_ELI_BASE}/acts/{publisher}/{year}/{pos}")
    return {"status": "ok", "details": data}


async def isap_get_act_text(*, publisher: str = "DU", year: int = 2024, pos: int = 1, **_) -> Dict[str, Any]:
    raw = await _http_get(
        f"{SEJM_ELI_BASE}/acts/{publisher}/{year}/{pos}/text.html",
        headers={"Accept": "text/html"},
    )
    clean = _strip_html(raw)
    return {"status": "ok", "text": clean[:20000]}


# ═══════════════════════════════════════════════════════════════════════════
#  2. SAOS (tools 5-8)
# ═══════════════════════════════════════════════════════════════════════════

async def saos_search_judgments(*, query: str = "", case_number: str = "", judge_name: str = "",
                                law_clause: str = "", court_type: str = "", date_from: str = "",
                                date_to: str = "", page_size: int = 10, page_number: int = 0, **_) -> Dict[str, Any]:
    params: dict = {"pageSize": page_size, "pageNumber": page_number}
    if query: params["all"] = query
    if case_number: params["caseNumber"] = case_number
    if judge_name: params["judgeName"] = judge_name
    if law_clause: params["referencedRegulation"] = law_clause
    if court_type: params["courtType"] = court_type
    if date_from: params["judgmentDateFrom"] = date_from
    if date_to: params["judgmentDateTo"] = date_to

    data = await _http_get(f"{SAOS_API_BASE}/search/judgments", params=params, headers={**DEFAULT_HEADERS, "Referer": "https://www.saos.org.pl/"})
    items = data.get("items", []) if isinstance(data, dict) else []
    total = (data.get("info") or {}).get("totalResults", len(items)) if isinstance(data, dict) else 0
    return {"status": "ok", "total": total, "items": items}


async def saos_get_judgment_details(*, id: int, **_) -> Dict[str, Any]:
    data = await _http_get(f"{SAOS_API_BASE}/judgments/{id}", headers={**DEFAULT_HEADERS, "Referer": "https://www.saos.org.pl/"})
    return {"status": "ok", "data": data}


async def saos_search_by_article(*, law_clause: str, limit: int = 10, **_) -> Dict[str, Any]:
    return await saos_search_judgments(law_clause=law_clause, page_size=limit)


async def saos_list_courts(**_) -> Dict[str, Any]:
    data = await _http_get(f"{SAOS_API_BASE}/commonCourts", headers={**DEFAULT_HEADERS, "Referer": "https://www.saos.org.pl/"})
    items = data.get("items", data) if isinstance(data, dict) else data if isinstance(data, list) else []
    return {"status": "ok", "courts": items}


# ═══════════════════════════════════════════════════════════════════════════
#  3. SEJM (tools 9-15)
# ═══════════════════════════════════════════════════════════════════════════

async def sejm_list_prints(*, term: int = 10, query: str = "", limit: int = 20, **_) -> Dict[str, Any]:
    data = await _http_get(f"{SEJM_API_BASE}/term{term}/prints")
    items = data if isinstance(data, list) else []
    if query:
        q = query.lower()
        items = [p for p in items if isinstance(p, dict) and q in (p.get("title") or "").lower()]
    return {"status": "ok", "count": len(items), "prints": items[:limit]}


async def sejm_get_print_details(*, number: str, term: int = 10, **_) -> Dict[str, Any]:
    data = await _http_get(f"{SEJM_API_BASE}/term{term}/prints/{number}")
    return {"status": "ok", "print": data}


async def sejm_list_mps(*, term: int = 10, **_) -> Dict[str, Any]:
    data = await _http_get(f"{SEJM_API_BASE}/term{term}/MP")
    return {"status": "ok", "mps": data if isinstance(data, list) else []}


async def sejm_search_interpellations(*, term: int = 10, query: str = "", limit: int = 20, **_) -> Dict[str, Any]:
    data = await _http_get(f"{SEJM_API_BASE}/term{term}/interpellations")
    items = data if isinstance(data, list) else []
    if query:
        q = query.lower()
        items = [i for i in items if isinstance(i, dict) and q in (i.get("title") or "").lower()]
    return {"status": "ok", "count": len(items), "interpellations": items[:limit]}


async def sejm_list_committees(*, term: int = 10, **_) -> Dict[str, Any]:
    data = await _http_get(f"{SEJM_API_BASE}/term{term}/committees")
    return {"status": "ok", "committees": data if isinstance(data, list) else []}


async def sejm_list_votings(*, term: int = 10, **_) -> Dict[str, Any]:
    data = await _http_get(f"{SEJM_API_BASE}/term{term}/votings")
    return {"status": "ok", "votings": data if isinstance(data, list) else []}


async def sejm_get_voting_details(*, sitting: int, voting_number: int, term: int = 10, **_) -> Dict[str, Any]:
    data = await _http_get(f"{SEJM_API_BASE}/term{term}/votings/{sitting}/{voting_number}")
    return {"status": "ok", "voting": data}


# ═══════════════════════════════════════════════════════════════════════════
#  4. KRS / CEIDG (tools 16-17)
# ═══════════════════════════════════════════════════════════════════════════

async def krs_get_company(*, krs: str, **_) -> Dict[str, Any]:
    clean_krs = krs.strip().zfill(10)
    data = await _http_get(f"{KRS_API_BASE}/OdpisAktualny/{clean_krs}?rejestr=P&format=json")
    return {"status": "ok", "krs": clean_krs, "company": data}


async def ceidg_search_business(*, query: str, **_) -> Dict[str, Any]:
    try:
        data = await _http_get(f"{CEIDG_BASE}/firmy", params={"nip": query})
        return {"status": "ok", "query": query, "data": data}
    except Exception:
        return {"status": "ok", "query": query, "data": {"firmy": []}, "message": f"Weryfikacja CEIDG dla {query}"}


# ═══════════════════════════════════════════════════════════════════════════
#  5. CBOSA (tool 18)
# ═══════════════════════════════════════════════════════════════════════════

async def cbosa_search_judgments(*, query: str = "", symbol: str = "", limit: int = 10, **_) -> Dict[str, Any]:
    from services.retrieval.providers.cbosa_provider import fetch_cbosa_once
    async with httpx.AsyncClient(timeout=15.0) as client:
        results = await fetch_cbosa_once(client, query or symbol, limit)
    return {"status": "ok", "count": len(results), "items": results}


# ═══════════════════════════════════════════════════════════════════════════
#  6. UODO (tool 19)  — RODO / dane osobowe
# ═══════════════════════════════════════════════════════════════════════════

# Baza decyzji UODO — statyczne dane referencyjne (jak w kliencie TypeScript)
_UODO_DECISIONS = [
    {
        "id": "UODO-DKN-512-23", "sygnatura": "DKN.512.1.2023", "dataDecyzji": "2023-10-12",
        "podmiot": "Spółka z o.o. z sektora E-commerce", "karaFinansowa": "450 000 PLN",
        "opis": "Naruszenie zasady poufności i integralności (art. 5 ust. 1 lit. f RODO) w związku z brakiem odpowiednich środków technicznych i organizacyjnych zabezpieczających bazy danych klientów przed nieuprawnionym dostępem.",
        "powolanePrzepisy": ["art. 5 ust. 1 lit. f RODO", "art. 32 RODO", "art. 83 ust. 4 RODO"],
    },
    {
        "id": "UODO-ZSPR-440-24", "sygnatura": "ZSPR.440.3.2024", "dataDecyzji": "2024-02-20",
        "podmiot": "Bank komercyjny", "karaFinansowa": "1 200 000 PLN",
        "opis": "Niezgłoszenie naruszenia ochrony danych osobowych organowi nadzorczemu bez nieuzasadnionej zwłoki (art. 33 ust. 1 RODO) po wycieku danych z formularza rejestracyjnego.",
        "powolanePrzepisy": ["art. 33 ust. 1 RODO", "art. 34 RODO"],
    },
]


async def uodo_search_decisions(*, query: Any = "", **_) -> Dict[str, Any]:
    items = _UODO_DECISIONS
    if query:
        search_str = " ".join(query) if isinstance(query, list) else str(query)
        q = search_str.lower()
        filtered = []
        for d in items:
            opis_val = d.get("opis", "")
            sygnatura_val = d.get("sygnatura", "")
            opis = opis_val.lower() if isinstance(opis_val, str) else ""
            sygnatura = sygnatura_val.lower() if isinstance(sygnatura_val, str) else ""
            raw_przepisy = d.get("powolanePrzepisy", [])
            przepisy = [p.lower() for p in raw_przepisy if isinstance(p, str)] if isinstance(raw_przepisy, list) else []
            if q in opis or q in sygnatura or any(q in p for p in przepisy):
                filtered.append(d)
        if filtered:
            items = filtered
    return {"status": "ok", "count": len(items), "decisions": items}


# ═══════════════════════════════════════════════════════════════════════════
#  7. KIO (tool 20)  — zamówienia publiczne
# ═══════════════════════════════════════════════════════════════════════════

_KIO_JUDGMENTS = [
    {
        "id": "KIO-2201-23", "sygnatura": "KIO 2201/23", "dataWyroku": "2023-09-28",
        "zamawiajacy": "Centrum Informatyki Resortowej", "odwolujacy": "Tech-Systems Sp. z o.o.",
        "przedmiotZamowienia": "Wdrożenie systemu klasy ERP oraz świadczenie usług asysty technicznej",
        "rozstrzygniecie": "Uwzględnia odwołanie i nakazuje Zamawiającemu unieważnienie czynności odrzucenia oferty Odwołującego.",
        "uzasadnienie": "Krajowa Izba Odwoławcza ustaliła, że wykazane przez Odwołującego doświadczenie spełnia warunki udziału w postępowaniu, a zarzut rażąco niskiej ceny nie został należycie wykazany przez Zamawiającego.",
    },
    {
        "id": "KIO-540-24", "sygnatura": "KIO 540/24", "dataWyroku": "2024-03-14",
        "zamawiajacy": "Zarząd Dróg i Transportu", "odwolujacy": "Bud-Pro S.A.",
        "przedmiotZamowienia": "Rozbudowa infrastruktury drogowej wraz z systemem zarządzania ruchem",
        "rozstrzygniecie": "Oddala odwołanie.",
        "uzasadnienie": "Izba uznała, że Zamawiający prawidłowo dokonał odrzucenia oferty na podstawie art. 226 ust. 1 pkt 8 ustawy Pzp z uwagi na zaoferowanie ceny rażąco niskiej.",
    },
]


async def kio_search_judgments(*, query: Any = "", **_) -> Dict[str, Any]:
    items = _KIO_JUDGMENTS
    if query:
        search_str = " ".join(query) if isinstance(query, list) else str(query)
        q = search_str.lower()
        filtered = []
        for i in items:
            sygnatura_val = i.get("sygnatura", "")
            przedmiot_val = i.get("przedmiotZamowienia", "")
            uzasadnienie_val = i.get("uzasadnienie", "")
            sygnatura = sygnatura_val.lower() if isinstance(sygnatura_val, str) else ""
            przedmiot = przedmiot_val.lower() if isinstance(przedmiot_val, str) else ""
            uzasadnienie = uzasadnienie_val.lower() if isinstance(uzasadnienie_val, str) else ""
            if q in sygnatura or q in przedmiot or q in uzasadnienie:
                filtered.append(i)
        if filtered:
            items = filtered
    return {"status": "ok", "count": len(items), "items": items}


# ═══════════════════════════════════════════════════════════════════════════
#  8. TSUE (tool 21)  — Trybunał Sprawiedliwości UE
# ═══════════════════════════════════════════════════════════════════════════

_TSUE_JUDGMENTS = [
    {
        "id": "C-520-21", "sygnatura": "C-520/21", "dataWyroku": "2023-06-15",
        "sprawa": "Bank M. S.A. przeciwko Arkadiusz Szcześniak (Sprawy frankowe)",
        "tezaWyroku": "W przypadku uznania umowy kredytu hipotecznego za nieważną z powodu nieuczciwych warunków, prawo Unii (Dyrektywa 93/13) stoi na przeszkodzie temu, aby bank domagał się od konsumenta rekompensaty wykraczającej poza zwrot kapitału oraz odsetek ustawowych za opóźnienie.",
        "url": "https://curia.europa.eu/juris/liste.jsf?num=C-520/21",
    },
    {
        "id": "C-140-22", "sygnatura": "C-140/22", "dataWyroku": "2023-12-07",
        "sprawa": "Ochrona konsumenta przed nieuczciwymi klauzulami (Przedawnienie roszczeń banku)",
        "tezaWyroku": "Bieg terminu przedawnienia roszczeń banku o zwrot kwót wypłaconych na podstawie nieważnej umowy kredytu nie może rozpocząć się z dniem złożenia przez konsumenta oświadczenia o braku zgody na utrzymanie w mocy abuzywnej klauzuli.",
        "url": "https://curia.europa.eu/juris/liste.jsf?num=C-140/22",
    },
]


async def tsue_search_judgments(*, query: Any = "", **_) -> Dict[str, Any]:
    items = _TSUE_JUDGMENTS
    if query:
        search_str = " ".join(query) if isinstance(query, list) else str(query)
        q = search_str.lower()
        filtered = []
        for i in items:
            sygnatura_val = i.get("sygnatura", "")
            sprawa_val = i.get("sprawa", "")
            teza_val = i.get("tezaWyroku", "")
            sygnatura = sygnatura_val.lower() if isinstance(sygnatura_val, str) else ""
            sprawa = sprawa_val.lower() if isinstance(sprawa_val, str) else ""
            teza = teza_val.lower() if isinstance(teza_val, str) else ""
            if q in sygnatura or q in sprawa or q in teza:
                filtered.append(i)
        if filtered:
            items = filtered
    return {"status": "ok", "count": len(items), "items": items}


# ═══════════════════════════════════════════════════════════════════════════
#  9. Python MCP tools (tools 22-29) — wrappers na istniejące serwisy
# ═══════════════════════════════════════════════════════════════════════════

async def search_legal_acts(*, keywords: str, limit: int = 5, **_) -> Dict[str, Any]:
    from services.retrieval_service import retrieval_service
    results = await retrieval_service.search_eli(keywords=keywords, limit=limit)
    return {"status": "ok", "count": len(results), "results": results}


async def search_judgments(*, keywords: str, limit: int = 5, **_) -> Dict[str, Any]:
    from services.retrieval_service import retrieval_service
    results = await retrieval_service.search_saos(keywords=keywords, limit=limit)
    return {"status": "ok", "count": len(results), "results": results}


async def search_supabase_rag(*, query: str, table_name: str = "knowledge_base_legal", limit: int = 5, **_) -> Dict[str, Any]:
    from services.retrieval_service import retrieval_service
    results = await retrieval_service.search_supabase(query=query, table_name=table_name, match_count=limit, hybrid=True)
    return {"status": "ok", "count": len(results), "results": results}


async def list_sessions(**_) -> Dict[str, Any]:
    from database import get_sessions as get_recent_sessions
    sessions = get_recent_sessions(limit=10)
    return {"status": "ok", "sessions": sessions}


async def get_session_messages(*, session_id: str, **_) -> Dict[str, Any]:
    from database import get_messages as _get
    messages = _get(session_id)
    return {"status": "ok", "session_id": session_id, "messages": messages}


async def list_documents(*, folder: str = "lexmind_acts", **_) -> Dict[str, Any]:
    path = Path(folder)
    if not path.exists():
        return {"status": "ok", "count": 0, "documents": []}
    docs = [{"name": f.name, "size": f.stat().st_size, "type": f.suffix} for f in path.glob("**/*") if f.is_file()]
    return {"status": "ok", "count": len(docs), "documents": docs}


async def get_document_info(*, filepath: str, **_) -> Dict[str, Any]:
    path = Path(filepath)
    if not path.exists():
        return {"status": "error", "message": "File not found"}
    stat = path.stat()
    return {"status": "ok", "filepath": filepath, "size": stat.st_size, "modified": stat.st_mtime, "type": path.suffix}


async def find_files(*, pattern: str = "*.py", **_) -> Dict[str, Any]:
    files = list(Path(".").glob(pattern))
    return {"status": "ok", "count": len(files), "files": [str(f) for f in files[:20]]}


async def search_code(*, keyword: str, file_pattern: str = "**/*.py", **_) -> Dict[str, Any]:
    results = []
    for fpath in Path(".").glob(file_pattern):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                for i, line in enumerate(f, 1):
                    if keyword.lower() in line.lower():
                        results.append({"file": str(fpath), "line": i, "text": line.strip()})
                        if len(results) >= 10:
                            break
        except Exception:
            pass
        if len(results) >= 10:
            break
    return {"status": "ok", "count": len(results), "results": results}


# ═══════════════════════════════════════════════════════════════════════════
#  MASTER DISPATCHER — call any of 29 tools by name
# ═══════════════════════════════════════════════════════════════════════════

TOOL_REGISTRY: Dict[str, Any] = {
    # ISAP (1-4)
    "isap_list_publishers": isap_list_publishers,
    "isap_search_acts": isap_search_acts,
    "isap_get_act_details": isap_get_act_details,
    "isap_get_act_text": isap_get_act_text,
    # SAOS (5-8)
    "saos_search_judgments": saos_search_judgments,
    "saos_get_judgment_details": saos_get_judgment_details,
    "saos_search_by_article": saos_search_by_article,
    "saos_list_courts": saos_list_courts,
    # Sejm (9-15)
    "sejm_list_prints": sejm_list_prints,
    "sejm_get_print_details": sejm_get_print_details,
    "sejm_list_mps": sejm_list_mps,
    "sejm_search_interpellations": sejm_search_interpellations,
    "sejm_list_committees": sejm_list_committees,
    "sejm_list_votings": sejm_list_votings,
    "sejm_get_voting_details": sejm_get_voting_details,
    # KRS / CEIDG (16-17)
    "krs_get_company": krs_get_company,
    "ceidg_search_business": ceidg_search_business,
    # CBOSA (18)
    "cbosa_search_judgments": cbosa_search_judgments,
    # UODO (19)
    "uodo_search_decisions": uodo_search_decisions,
    # KIO (20)
    "kio_search_judgments": kio_search_judgments,
    # TSUE (21)
    "tsue_search_judgments": tsue_search_judgments,
    # Python MCP (22-29)
    "search_legal_acts": search_legal_acts,
    "search_judgments": search_judgments,
    "search_supabase_rag": search_supabase_rag,
    "list_sessions": list_sessions,
    "get_session_messages": get_session_messages,
    "list_documents": list_documents,
    "get_document_info": get_document_info,
    "find_files": find_files,
    "search_code": search_code,
    # Inne (30)
    "internet_search": None, # Zostanie obsłużone specjalnym importem wewnątrz call_mcp_tool lub dodane wyżej
}

# Listy narzędzi pogrupowane tematycznie — do użycia w context_builder/debate_engine
LEGAL_SEARCH_TOOLS = ["isap_search_acts", "isap_get_act_details", "isap_get_act_text", "search_legal_acts", "search_supabase_rag"]
JUDGMENT_TOOLS = ["saos_search_judgments", "saos_search_by_article", "cbosa_search_judgments", "search_judgments"]
SPECIALIZED_TOOLS = {
    "eu": ["tsue_search_judgments"],
    "gdpr": ["uodo_search_decisions"],
    "tax": ["cbosa_search_judgments"],
    "public_procurement": ["kio_search_judgments"],
    "corporate": ["krs_get_company", "ceidg_search_business"],
    "administrative": ["cbosa_search_judgments"],
    "criminal": ["saos_search_judgments"],
    "civil": ["saos_search_judgments"],
    "labor": ["saos_search_judgments"],
    "legislative": ["sejm_list_prints", "sejm_search_interpellations", "sejm_list_committees"],
    "sejm_voting": ["sejm_list_votings", "sejm_list_mps"],
    "internet_search": ["internet_search"],
}


async def call_mcp_tool(tool_name: str, **params) -> Dict[str, Any]:
    """Wywołuje dowolne z 29 narzędzi MCP po nazwie. Zwraca dict z wynikiem."""
    if tool_name == "internet_search":
        from services.retrieval.providers.duckduckgo_provider import duckduckgo_search
        try:
            result = await duckduckgo_search(params.get("query", ""), max_results=params.get("limit", 5))
            logger.info(f"[MCPBridge] Tool '{tool_name}' → OK")
            return result
        except Exception as e:
            logger.warning(f"[MCPBridge] Tool '{tool_name}' → ERROR: {e}")
            return {"status": "error", "tool": tool_name, "message": str(e)}

    func = TOOL_REGISTRY.get(tool_name)
    if func is None:
        return {"status": "error", "message": f"Unknown MCP tool: {tool_name}"}

    try:
        result = await func(**params)
        logger.info(f"[MCPBridge] Tool '{tool_name}' → OK")
        return result
    except Exception as e:
        logger.warning(f"[MCPBridge] Tool '{tool_name}' → ERROR: {e}")
        return {"status": "error", "tool": tool_name, "message": str(e)}


def get_tools_for_tags(tags: List[str]) -> List[str]:
    """Na podstawie wykrytych tagów (z agent_router) zwraca listę narzędzi MCP do wywołania."""
    tools: List[str] = []
    for tag in tags:
        extras = SPECIALIZED_TOOLS.get(tag, [])
        for t in extras:
            if t not in tools:
                tools.append(t)
    return tools


def format_tool_results_as_context(tool_results: Dict[str, Any]) -> str:
    """Formatuje wyniki narzędzi MCP jako blok kontekstowy do promptu LLM."""
    parts: List[str] = []
    for tool_name, result in tool_results.items():
        if not isinstance(result, dict) or result.get("status") == "error":
            continue
        label = tool_name.upper().replace("_", " ")
        content = json.dumps(result, ensure_ascii=False, default=str)[:3000]
        parts.append(f"=== {label} ===\n{content}\n{'=' * 40}")
    return "\n\n".join(parts)
