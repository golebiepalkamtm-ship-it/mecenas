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


def _parse_eli(eli: str, default_pub: str = "DU", default_year: int = 2024, default_pos: int = 1):
    """Parsuje ciąg ELI np. 'DU/2018/1000' lub 'Dz.U. 2018 poz. 1000' na publisher, year, pos."""
    if not eli:
        return default_pub, default_year, default_pos
    m = re.search(r"(?:ELI/)?(DU|MP)/(\d{4})/(\d+)", eli, re.IGNORECASE)
    if m:
        return m.group(1).upper(), int(m.group(2)), int(m.group(3))
    m2 = re.search(r"(?:Dz\.?\s*U\.?|M\.?\s*P\.?)\s*(\d{4})\s*(?:poz\.?|nr)\s*(\d+)", eli, re.IGNORECASE)
    if m2:
        pub = "MP" if "m.p" in eli.lower() or "mp" in eli.lower() else "DU"
        return pub, int(m2.group(1)), int(m2.group(2))
    return default_pub, default_year, default_pos


async def isap_get_act_details(*, publisher: str = "DU", year: int = 2024, pos: int = 1, eli: str = "", **_) -> Dict[str, Any]:
    if eli:
        publisher, year, pos = _parse_eli(eli, publisher, year, pos)
    data = await _http_get(f"{SEJM_ELI_BASE}/acts/{publisher}/{year}/{pos}")
    return {"status": "ok", "eli": f"{publisher}/{year}/{pos}", "details": data}


async def isap_get_act_text(*, publisher: str = "DU", year: int = 2024, pos: int = 1, eli: str = "", search_text: str = "", **_) -> Dict[str, Any]:
    if eli:
        publisher, year, pos = _parse_eli(eli, publisher, year, pos)
    raw = await _http_get(
        f"{SEJM_ELI_BASE}/acts/{publisher}/{year}/{pos}/text.html",
        headers={"Accept": "text/html"},
    )
    clean = _strip_html(raw)
    
    # Jeśli podano search_text (np. 'Art. 118.'), znajdź i zwróć kontekst wokół trafienia
    if search_text:
        st_lower = search_text.lower()
        idx = clean.lower().find(st_lower)
        if idx != -1:
            start = max(0, idx - 200)
            end = min(len(clean), idx + 2500)
            clean = f"... {clean[start:end]} ..."

    return {"status": "ok", "eli": f"{publisher}/{year}/{pos}", "search_text": search_text, "text": clean[:25000]}



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


_STRONG_OVERRULE_PATTERNS = [
    (re.compile(r"odst(?:[ęe]puj[a-ząćęłńóśźż]*|[ąa]pi[a-ząćęłńóśźż]*)\s+od\s+(?:pogl[ąa]d[a-ząćęłńóśźż]*|stanowisk[a-ząćęłńóśźż]*|wyk[łl]adni|dotychczasow[a-ząćęłńóśźż]*|linii)", re.I), "odstapienie_od_pogladu"),
    (re.compile(r"nie\s+podziela(?:j[ąa]c[a-ząćęłńóśźż]*|[łl][a-ząćęłńóśźż]*|my)?\s+(?:pogl[ąa]d|stanowisk)[a-ząćęłńóśźż]*", re.I), "nie_podziela_pogladu"),
    (re.compile(r"utraci[a-ząćęłńóśźż]*\s+(?:na\s+)?aktualno[a-ząćęłńóśźż]*", re.I), "utrata_aktualnosci"),
    (re.compile(r"zdezaktualizowa", re.I), "zdezaktualizowanie"),
    (re.compile(r"traci\s+moc\s+uchwa[łl][a-ząćęłńóśźż]*", re.I), "utrata_mocy_uchwaly"),
    (re.compile(r"nie\s+zas[łl]uguje\s+na\s+aprobat[ęe]", re.I), "brak_aprobaty"),
    (re.compile(r"odmiennie\s+ni[żz]\s+w\s+(?:wyroku|uchwale|postanowieniu)", re.I), "rozbieznosc_orzecznicza"),
]

_CAUTION_OVERRULE_PATTERNS = [
    (re.compile(r"uchwa[łl][a-ząćęłńóśźż]*\s+sk[łl]adu\s+(?:siedmiu|7)\s+s[ęe]dzi[oó]w", re.I), "uchwala_7_sedziow"),
    (re.compile(r"uchwa[łl][a-ząćęłńóśźż]*\s+sk[łl]adu\s+powi[ęe]kszonego", re.I), "uchwala_skladu_powiekszonego"),
    (re.compile(r"rozbie[żz]no[sś][ćc]\s+w\s+orzecznictwie", re.I), "rozbieznosc_w_orzecznictwie"),
]


async def saos_cite_check(*, case_number: str, limit: int = 10, **_) -> Dict[str, Any]:
    """Citator Shepard's dla polskiego orzecznictwa (mcp-saos). Sprawdza czy orzeczenie jest nadal aktualne."""
    clean_case = case_number.strip()
    if not clean_case:
        return {"status": "error", "message": "Brak sygnatury do sprawdzenia (case_number)"}

    try:
        search_res = await saos_search_judgments(query=f'"{clean_case}"', page_size=limit)
        items = search_res.get("items", [])
    except Exception as e:
        return {"status": "error", "message": f"Błąd odpytania SAOS: {e}"}

    if not items:
        return {
            "status": "ok",
            "case_number": clean_case,
            "verdict": "brak_cytowan_w_saos",
            "verdict_pl": "Brak późniejszych cytowań w bazie SAOS (wymaga weryfikacji w SN/NSA)",
            "citing_count": 0,
            "hits": [],
            "disclaimer": "Brak trafień w SAOS nie oznacza automatycznie, że orzeczenie zachowuje moc.",
        }

    hits = []
    has_strong = False
    has_caution = False

    for it in items:
        judg_id = it.get("id")
        text_content = ""
        try:
            full_det = await saos_get_judgment_details(id=judg_id)
            data = full_det.get("data", {}).get("data", {})
            text_content = _strip_html(data.get("textContent", "") or data.get("reasoning", ""))
        except Exception:
            text_content = _strip_html(it.get("textContent", ""))

        if not text_content:
            continue

        for m in re.finditer(re.escape(clean_case), text_content, re.IGNORECASE):
            pos = m.start()
            window_start = max(0, pos - 400)
            window_end = min(len(text_content), pos + 400)
            window_text = text_content[window_start:window_end]

            for pat, label in _STRONG_OVERRULE_PATTERNS:
                if pat.search(window_text):
                    has_strong = True
                    hits.append({
                        "judgment_id": judg_id,
                        "court_type": it.get("courtType"),
                        "judgment_date": it.get("judgmentDate"),
                        "label": label,
                        "severity": "strong",
                        "snippet": f"...{window_text.strip()}...",
                    })
                    break

            for pat, label in _CAUTION_OVERRULE_PATTERNS:
                if pat.search(window_text):
                    has_caution = True
                    hits.append({
                        "judgment_id": judg_id,
                        "court_type": it.get("courtType"),
                        "judgment_date": it.get("judgmentDate"),
                        "label": label,
                        "severity": "caution",
                        "snippet": f"...{window_text.strip()}...",
                    })
                    break

    if has_strong:
        verdict = "przelamanie_wykryte"
        verdict_pl = "Wykryto potencjalne przełamanie linii orzeczniczej lub odstąpienie od poglądu!"
    elif has_caution:
        verdict = "uchwala_skladu_powiekszonego"
        verdict_pl = "Wykryto uchwałę składu powiększonego lub rozbieżność w orzecznictwie."
    else:
        verdict = "nadal_cytowany"
        verdict_pl = "Orzeczenie jest cytowane w SAOS bez wykrycia fraz przełamania linii."

    return {
        "status": "ok",
        "case_number": clean_case,
        "verdict": verdict,
        "verdict_pl": verdict_pl,
        "citing_count": len(items),
        "hits_count": len(hits),
        "hits": hits,
        "disclaimer": "Wynik oparty na analizie okien tekstowych SAOS. Zawsze weryfikuj stan orzeczenia z bazą SN/NSA.",
    }


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


async def cbosa_search_by_case(*, case_number: str, limit: int = 5, **_) -> Dict[str, Any]:
    """Wyszukuje orzeczenie sądu administracyjnego bezpośrednio po sygnaturze (mcp-nsa)."""
    return await cbosa_search_judgments(query=case_number, limit=limit)


async def cbosa_get_judgment(*, doc_id: str, **_) -> Dict[str, Any]:
    """Pobiera pełną treść orzeczenia sądu administracyjnego z bazy CBOSA po identyfikatorze dokumentu (mcp-nsa)."""
    clean_id = doc_id.strip().replace("/doc/", "")
    url = f"https://orzeczenia.nsa.gov.pl/doc/{clean_id}"
    try:
        raw_html = await _http_get(url, headers={"Referer": "https://orzeczenia.nsa.gov.pl/"})
        text = _strip_html(raw_html)
        return {"status": "ok", "doc_id": clean_id, "url": url, "text": text[:30000]}
    except Exception as e:
        return {"status": "error", "doc_id": clean_id, "message": str(e)}


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


_EU_COMPLIANCE_KNOWLEDGE = [
    {
        "act": "AI Act (Rozporządzenie 2024/1689)",
        "article": "Art. 12",
        "title": "Rejestrowanie zdarzeń (Record-keeping)",
        "content": "Systemy AI wysokiego ryzyka muszą technicznie umożliwiać automatyczną rejestrację zdarzeń (logów) przez cały cykl życia systemu, zapewniając identyfikowalność i rozliczalność.",
    },
    {
        "act": "AI Act (Rozporządzenie 2024/1689)",
        "article": "Art. 50",
        "title": "Obowiązki w zakresie przejrzystości",
        "content": "Dostawcy systemów AI wchodzących w interakcję z osobami fizycznymi zapewniają, by systemy te informowały użytkownika, że wchodzi w interakcję z systemem AI.",
    },
    {
        "act": "RODO (Rozporządzenie 2016/679)",
        "article": "Art. 5",
        "title": "Zasady dotyczące przetwarzania danych osobowych",
        "content": "Dane osobowe muszą być przetwarzane zgodnie z prawem, rzetelnie i w sposób przejrzysty; zbierane w konkretnych celach (ograniczenie celu) i ograniczone do tego, co niezbędne (minimalizacja).",
    },
    {
        "act": "RODO (Rozporządzenie 2016/679)",
        "article": "Art. 82",
        "title": "Prawo do odszkodowania i odpowiedzialność",
        "content": "Każda osoba, która poniosła szkodę majątkową lub niemajątkową w wyniku naruszenia niniejszego rozporządzenia, ma prawo uzyskać od administratora lub podmiotu przetwarzającego odszkodowanie.",
    },
    {
        "act": "DORA (Rozporządzenie 2022/2554)",
        "article": "Art. 5",
        "title": "Zarządzanie ryzykiem ICT",
        "content": "Podmioty finansowe muszą posiadać wewnętrzne ramy zarządzania ryzykiem technologii informacyjno-komunikacyjnych (ICT) i zapewnić cyfrową odporność operacyjną.",
    },
    {
        "act": "NIS 2 (Dyrektywa 2022/2555)",
        "article": "Art. 21",
        "title": "Środki zarządzania ryzykiem w cyberbezpieczeństwie",
        "content": "Podmioty kluczowe i ważne wdrażają odpowiednie i proporcjonalne środki techniczne, operacyjne i organizacyjne w celu zarządzania ryzykiem dla bezpieczeństwa sieci.",
    },
]


async def eureka_search_interpretations(*, query: str, limit: int = 5, **_) -> Dict[str, Any]:
    """Przeszukuje bazę interpretacji podatkowych Ministerstwa Finansów / KIS (Patron EUREKA connector)."""
    from services.retrieval.providers.duckduckgo_provider import duckduckgo_search
    try:
        search_query = f"site:eureka.mf.gov.pl {query}"
        res = await duckduckgo_search(search_query, max_results=limit)
        return {
            "status": "ok",
            "source": "EUREKA (KIS/MF)",
            "query": query,
            "count": len(res.get("items", [])),
            "items": res.get("items", []),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def eu_compliance_search(*, query: str = "", act: str = "", **_) -> Dict[str, Any]:
    """Przeszukuje korpus prawa zgodności UE (Patron EU-Compliance: RODO, AI Act, DORA, NIS 2)."""
    items = _EU_COMPLIANCE_KNOWLEDGE
    q = query.lower()
    filtered = []
    for item in items:
        if act and act.lower() not in item["act"].lower():
            continue
        if not q or q in item["act"].lower() or q in item["article"].lower() or q in item["title"].lower() or q in item["content"].lower():
            filtered.append(item)
    return {"status": "ok", "source": "Patron EU-Compliance Corpus", "count": len(filtered), "items": filtered}


async def patron_scan_document(*, text: str, file_name: Optional[str] = None, **_) -> Dict[str, Any]:
    """Skanuje dokument za pomocą silnika Patron Input Security (detekcja prompt injection, zero-width, obfuskacji)."""
    from services.patron_security import analyze_input_security
    res = analyze_input_security(text, file_name=file_name)
    return {
        "status": "ok",
        "action": res.action,
        "risk_score": res.risk_score,
        "threat_level": res.threat_level,
        "audit_hash": res.audit_hash,
        "findings_count": len(res.findings),
        "findings": [
            {
                "detector": f.detector,
                "technique": f.technique,
                "severity": f.severity,
                "snippet": f.snippet,
                "impact": f.impact,
            }
            for f in res.findings
        ],
    }


async def nalegalu_article_lookup(*, citation: str, fetch_judgments: bool = True, limit: int = 5, **_) -> Dict[str, Any]:
    """Wyszukuje treść przepisu oraz automatycznie powiązane orzecznictwo sądowe z SAOS w formacie NaLegalu Markdown."""
    from services.nalegalu_bridge import parse_legal_citation
    parsed = parse_legal_citation(citation)
    if not parsed:
        return {"status": "error", "message": f"Nie udało się sparsować sygnatury przepisu: {citation}"}

    result: Dict[str, Any] = {
        "status": "ok",
        "act_code": parsed.act_code,
        "act_name": parsed.act_name,
        "article": parsed.article,
        "paragraph": parsed.paragraph,
        "point": parsed.point,
        "markdown_header": parsed.markdown_header,
        "saos_search_query": parsed.saos_search_query,
        "judgments": [],
    }

    if fetch_judgments:
        try:
            saos_res = await saos_search_judgments(law_clause=parsed.saos_search_query, page_size=limit)
            result["judgments"] = saos_res.get("items", [])
        except Exception:
            pass

    return result


# ═══════════════════════════════════════════════════════════════════════════
#  MASTER DISPATCHER — call any of 35 tools by name
# ═══════════════════════════════════════════════════════════════════════════

TOOL_REGISTRY: Dict[str, Any] = {
    # ISAP (1-4)
    "isap_list_publishers": isap_list_publishers,
    "isap_search_acts": isap_search_acts,
    "isap_get_act_details": isap_get_act_details,
    "isap_get_act_text": isap_get_act_text,
    # SAOS (5-9)
    "saos_search_judgments": saos_search_judgments,
    "saos_get_judgment_details": saos_get_judgment_details,
    "saos_search_by_article": saos_search_by_article,
    "saos_list_courts": saos_list_courts,
    "saos_cite_check": saos_cite_check,
    # Sejm (10-16)
    "sejm_list_prints": sejm_list_prints,
    "sejm_get_print_details": sejm_get_print_details,
    "sejm_list_mps": sejm_list_mps,
    "sejm_search_interpellations": sejm_search_interpellations,
    "sejm_list_committees": sejm_list_committees,
    "sejm_list_votings": sejm_list_votings,
    "sejm_get_voting_details": sejm_get_voting_details,
    # KRS / CEIDG (17-18)
    "krs_get_company": krs_get_company,
    "ceidg_search_business": ceidg_search_business,
    # CBOSA (19-21)
    "cbosa_search_judgments": cbosa_search_judgments,
    "cbosa_search_by_case": cbosa_search_by_case,
    "cbosa_get_judgment": cbosa_get_judgment,
    # UODO (22)
    "uodo_search_decisions": uodo_search_decisions,
    # KIO (23)
    "kio_search_judgments": kio_search_judgments,
    # TSUE (24)
    "tsue_search_judgments": tsue_search_judgments,
    # Patron & NaLegalu Tools (25-28)
    "eureka_search_interpretations": eureka_search_interpretations,
    "eu_compliance_search": eu_compliance_search,
    "patron_scan_document": patron_scan_document,
    "nalegalu_article_lookup": nalegalu_article_lookup,
    # Python MCP (29-36)
    "search_legal_acts": search_legal_acts,
    "search_judgments": search_judgments,
    "search_supabase_rag": search_supabase_rag,
    "list_sessions": list_sessions,
    "get_session_messages": get_session_messages,
    "list_documents": list_documents,
    "get_document_info": get_document_info,
    "find_files": find_files,
    "search_code": search_code,
    # Inne (33)
    "internet_search": None,
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
