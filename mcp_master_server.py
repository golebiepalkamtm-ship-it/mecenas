"""
LexMind AI Master MCP Server — Ultimate Edition (40 MCP Tools)
Uniwersalny, rozbudowany serwer MCP integrujący WSZYSTKIE 40 narzędzi prawnych i systemowych w jednym module.

Obsługiwane kategorie narzędzi:
  1. ISAP / ELI (Akty Prawne, Dzienniki Ustaw, teksty ustaw) — 4 narzędzia
  2. SAOS (Sądy Powszechne: apelacyjne, okręgowe, rejonowe) — 4 narzędzia
  3. SEJM RP (Prace legislacyjne, druki, posłowie, interpelacje, komisje, głosowania) — 7 narzędzi
  4. REGESTRY GOSPODARCZE (KRS spółki, CEIDG jednoosobowe firmy, Biała Lista VAT) — 4 narzędzia
  5. NSA / WSA (CBOSA Sądownictwo Administracyjne) — 3 narzędzia
  6. UODO (Ochrona danych osobowych / RODO / kary) — 1 narzędzie
  7. KIO (Zamówienia publiczne / przetargi) — 1 narzędzie
  8. TSUE (Orzecznictwo Unii Europejskiej / sprawy frankowe) — 1 narzędzie
  9. PRAWMi AI & ANTI-HALLUCINATION (Weryfikacja orzeczeń, artykułów, audyt cytowań, treść aktów) — 8 narzędzi
  10. INTERNET SEARCH (Wyszukiwanie informacji na żywo via DuckDuckGo) — 1 narzędzie
  11. LEXMIND RAG & KNOWLEDGE (Supabase hybrid vector search, baza aktów) — 3 narzędzia
  12. CHAT HISTORY (Baza SQLite z historią konwersacji) — 2 narzędzia
  13. FILE & CODE NAVIGATOR (Zarządzanie PDF, plikami i kodem) — 4 narzędzia
  14. CALCULATOR (Bezpieczny kalkulator opłat, terminów i odsetek) — 1 narzędzie

Wspiera dwa tryby transportu:
  - stdio (domyślny dla Claude Desktop, Cursor, Antigravity, Windsurf, Continue)
  - sse (dla zdalnych modeli LLM, agentów webowych, ChatGPT)

Uruchomienie:
  python mcp_master_server.py                           # Stdio mode
  python mcp_master_server.py --transport sse --port 8005 # HTTP/SSE mode
"""

import sys
import os
import json
import argparse
import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastmcp import FastMCP

# Ensure root dir is in sys.path
ROOT_DIR = Path(__file__).parent.resolve()
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

mcp = FastMCP("LexMind Master MCP (40 Tools)")

# Helper for formatted JSON response
def _json_resp(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, default=str)


# ==============================================================================
#  1. ISAP / ELI — SEJM RZECZYPOSPOLITEJ POLSKIEJ (AKTY PRAWNE)
# ==============================================================================

@mcp.tool()
async def isap_list_publishers() -> str:
    """Zwraca listę wydawców Dzienników Ustaw (DU) oraz Monitorów Polskich (MP) z polskiego systemu ELI/ISAP."""
    try:
        from services.mcp_tool_bridge import isap_list_publishers as _func
        res = await _func()
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def isap_search_acts(publisher: str = "DU", year: int = 2024, query: str = "", type: str = "", status: str = "", limit: int = 20) -> str:
    """Przeszukuje bazę aktów prawnych ISAP/ELI według wydawcy (DU/MP), roku, typu aktu lub słowa kluczowego w tytule.
    
    Args:
        publisher: 'DU' (Dziennik Ustaw) lub 'MP' (Monitor Polski)
        year: Rok ogłoszenia (np. 2024, 2023)
        query: Słowo kluczowe w tytule (np. 'karny', 'podatku', 'drogowym')
        type: Typ aktu (np. 'ustawa', 'rozporządzenie')
        status: Status aktu (np. 'obowiązujący')
        limit: Maksymalna liczba wyników
    """
    try:
        from services.mcp_tool_bridge import isap_search_acts as _func
        res = await _func(publisher=publisher, year=year, query=query, type=type, status=status, limit=limit)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def isap_get_act_details(publisher: str = "DU", year: int = 2024, pos: int = 1, eli: str = "") -> str:
    """Pobiera pełne metadane, daty wejścia w życie, ogłoszenia oraz status aktu prawnego po numerze pozycji lub identyfikatorze ELI (mcp-isap).
    
    Args:
        publisher: 'DU' lub 'MP'
        year: Rok (np. 2024)
        pos: Pozycja w dzienniku (np. 1, 1085, 1200)
        eli: Identyfikator ELI aktu (np. 'DU/2018/1000' lub 'Dz.U. 2018 poz. 1000')
    """
    try:
        from services.mcp_tool_bridge import isap_get_act_details as _func
        res = await _func(publisher=publisher, year=year, pos=pos, eli=eli)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def isap_get_act_text(publisher: str = "DU", year: int = 2024, pos: int = 1, eli: str = "", search_text: str = "") -> str:
    """Pobiera treść aktu prawnego z systemu Sejm ELI lub wyszukuje fragment wokół wskazanego artykułu (mcp-isap).
    
    Args:
        publisher: 'DU' lub 'MP'
        year: Rok
        pos: Pozycja aktu
        eli: Identyfikator ELI aktu (np. 'DU/2018/1000')
        search_text: Opcjonalna fraza do wyszukania w tekście aktu (np. 'Art. 118.')
    """
    try:
        from services.mcp_tool_bridge import isap_get_act_text as _func
        res = await _func(publisher=publisher, year=year, pos=pos, eli=eli, search_text=search_text)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  2. SAOS — SĄDY POWSZECHNE (WYROKI I ORZECZENIA)
# ==============================================================================

@mcp.tool()
async def saos_search_judgments(query: str = "", case_number: str = "", judge_name: str = "", law_clause: str = "", court_type: str = "", date_from: str = "", date_to: str = "", page_size: int = 10) -> str:
    """Zaawansowane wyszukiwanie orzeczeń w Systemie Analizy Orzeczeń Sądowych (SAOS).
    
    Args:
        query: Słowa kluczowe w treści/uzasadnieniu wyroku
        case_number: Sygnatura sprawy (np. 'II AKa 120/23')
        judge_name: Nazwisko sędziego
        law_clause: Przepis prawny (np. 'art. 286 k.k.', 'art. 415 k.c.')
        court_type: Typ sądu ('COMMON', 'SUPREME_COURT')
        date_from: Data wyroku od (YYYY-MM-DD)
        date_to: Data wyroku do (YYYY-MM-DD)
        page_size: Liczba wyników
    """
    try:
        from services.mcp_tool_bridge import saos_search_judgments as _func
        res = await _func(query=query, case_number=case_number, judge_name=judge_name, law_clause=law_clause, court_type=court_type, date_from=date_from, date_to=date_to, page_size=page_size)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def saos_get_judgment_details(id: int) -> str:
    """Pobiera pełne uzasadnienie i treść wyroku z SAOS na podstawie identyfikatora ID.
    
    Args:
        id: Identyfikator wyroku w bazie SAOS
    """
    try:
        from services.mcp_tool_bridge import saos_get_judgment_details as _func
        res = await _func(id=id)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def saos_search_by_article(law_clause: str, limit: int = 10) -> str:
    """Wyszukuje wyroki w sądach powszechnych powołujące się na konkretny przepis/artykuł.
    
    Args:
        law_clause: Powołany artykuł (np. 'art. 148', 'art. 286 Kodeksu karnego')
        limit: Liczba wyroków
    """
    try:
        from services.mcp_tool_bridge import saos_search_by_article as _func
        res = await _func(law_clause=law_clause, limit=limit)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def saos_list_courts() -> str:
    """Pobiera pełny wykaz sądów powszechnych (apelacyjnych, okręgowych i rejonowych) w Polsce."""
    try:
        from services.mcp_tool_bridge import saos_list_courts as _func
        res = await _func()
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def saos_cite_check(case_number: str, limit: int = 10) -> str:
    """Weryfikuje aktualność orzeczenia (Shepard's Citator dla prawa polskiego) poprzez analizę późniejszych wyroków cytujących sygnaturę pod kątem odstąpienia od poglądu (mcp-saos).
    
    Args:
        case_number: Sygnatura akt orzeczenia do zbadania (np. 'III CZP 25/22', 'II CSK 412/17')
        limit: Liczba cytujących orzeczeń do przeanalizowania
    """
    try:
        from services.mcp_tool_bridge import saos_cite_check as _func
        res = await _func(case_number=case_number, limit=limit)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  3. SEJM RP — PRACE LEGISLACYJNE, DRUKI, POSŁOWIE, GŁOSOWANIA
# ==============================================================================

@mcp.tool()
async def sejm_list_prints(term: int = 10, query: str = "", limit: int = 20) -> str:
    """Przeszukuje druki sejmowe (projekty ustaw, sprawozdania komisji) w Sejmie RP.
    
    Args:
        term: Kadencja Sejmu (domyślnie 10 dla obecnej kadencji)
        query: Fraza w tytule druku
        limit: Liczba druków
    """
    try:
        from services.mcp_tool_bridge import sejm_list_prints as _func
        res = await _func(term=term, query=query, limit=limit)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def sejm_get_print_details(number: str, term: int = 10) -> str:
    """Pobiera szczegółowe metadane druku sejmowego oraz przebieg prac legislacyjnych.
    
    Args:
        number: Numer druku (np. '123', '45')
        term: Kadencja Sejmu
    """
    try:
        from services.mcp_tool_bridge import sejm_get_print_details as _func
        res = await _func(number=number, term=term)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def sejm_list_mps(term: int = 10) -> str:
    """Pobiera wykaz posłów na Sejm RP danej kadencji wraz z ich przynależnością klubową."""
    try:
        from services.mcp_tool_bridge import sejm_list_mps as _func
        res = await _func(term=term)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def sejm_search_interpellations(term: int = 10, query: str = "", limit: int = 20) -> str:
    """Przeszukuje interpelacje i zapytania poselskie złożone w Sejmie RP.
    
    Args:
        term: Kadencja Sejmu
        query: Słowo kluczowe w tytule interpelacji
        limit: Liczba wyników
    """
    try:
        from services.mcp_tool_bridge import sejm_search_interpellations as _func
        res = await _func(term=term, query=query, limit=limit)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def sejm_list_committees(term: int = 10) -> str:
    """Pobiera wykaz stałych i nadzwyczajnych komisji sejmowych."""
    try:
        from services.mcp_tool_bridge import sejm_list_committees as _func
        res = await _func(term=term)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def sejm_list_votings(term: int = 10) -> str:
    """Pobiera listę głosowań przeprowadzonych na posiedzeniach Sejmu RP."""
    try:
        from services.mcp_tool_bridge import sejm_list_votings as _func
        res = await _func(term=term)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def sejm_get_voting_details(sitting: int, voting_number: int, term: int = 10) -> str:
    """Pobiera wyniki i rozkład głosów posłów w konkretnym głosowaniu sejmowym.
    
    Args:
        sitting: Numer posiedzenia Sejmu
        voting_number: Numer głosowania
        term: Kadencja
    """
    try:
        from services.mcp_tool_bridge import sejm_get_voting_details as _func
        res = await _func(sitting=sitting, voting_number=voting_number, term=term)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  4. REJESTRY GOSPODARCZE — KRS & CEIDG
# ==============================================================================

@mcp.tool()
async def krs_get_company(krs: str) -> str:
    """Pobiera aktualne dane rejestrowe i odpis spółki z Krajowego Rejestru Sądowego (KRS) na podstawie numeru KRS.
    
    Args:
        krs: Numer KRS spółki (np. '0000012345')
    """
    try:
        from services.mcp_tool_bridge import krs_get_company as _func
        res = await _func(krs=krs)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def ceidg_search_business(query: str) -> str:
    """Weryfikuje i pobiera dane jednoosobowej działalności gospodarczej w rejestrze CEIDG według NIP.
    
    Args:
        query: Numer NIP firmy
    """
    try:
        from services.mcp_tool_bridge import ceidg_search_business as _func
        res = await _func(query=query)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  5. NSA / WSA — CBOSA (SĄDOWNICTWO ADMINISTRACYJNE)
# ==============================================================================

@mcp.tool()
async def cbosa_search_judgments(query: str = "", symbol: str = "", limit: int = 10) -> str:
    """Przeszukuje bazę ponad 2,39 mln orzeczeń Naczelnego Sądu Administracyjnego (NSA) oraz Wojewódzkich Sądów Administracyjnych (WSA) — CBOSA.
    
    Args:
        query: Słowa kluczowe (np. 'decyzja odmowna starosta', 'warunki zabudowy')
        symbol: Symbol sprawy
        limit: Liczba orzeczeń
    """
    try:
        from services.mcp_tool_bridge import cbosa_search_judgments as _func
        res = await _func(query=query, symbol=symbol, limit=limit)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def cbosa_search_by_case(case_number: str, limit: int = 5) -> str:
    """Wyszukuje orzeczenie sądu administracyjnego bezpośrednio po sygnaturze akt w CBOSA (mcp-nsa).
    
    Args:
        case_number: Sygnatura akt (np. 'III OSK 1377/23', 'I SA/Gl 659/22', 'II FSK 114/21')
        limit: Liczba orzeczeń
    """
    try:
        from services.mcp_tool_bridge import cbosa_search_by_case as _func
        res = await _func(case_number=case_number, limit=limit)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def cbosa_get_judgment(doc_id: str) -> str:
    """Pobiera pełną treść orzeczenia NSA/WSA z bazy CBOSA po identyfikatorze dokumentu (mcp-nsa).
    
    Args:
        doc_id: 10-znakowy identyfikator dokumentu CBOSA (np. '7E50984BB7' lub ścieżka '/doc/7E50984BB7')
    """
    try:
        from services.mcp_tool_bridge import cbosa_get_judgment as _func
        res = await _func(doc_id=doc_id)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  6. UODO — OCHRONA DANYCH OSOBOWYCH / RODO
# ==============================================================================

@mcp.tool()
async def uodo_search_decisions(query: str = "") -> str:
    """Przeszukuje bazę decyzji i kar finansowych nałożonych przez Prezesa Urzędu Ochrony Danych Osobowych (UODO/RODO).
    
    Args:
        query: Słowo kluczowe lub przepis (np. 'art. 33 RODO', 'wyciek danych')
    """
    try:
        from services.mcp_tool_bridge import uodo_search_decisions as _func
        res = await _func(query=query)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  7. KIO — KRAJOWA IZBA ODWOŁAWCZA (ZAMÓWIENIA PUBLICZNE)
# ==============================================================================

@mcp.tool()
async def kio_search_judgments(query: str = "") -> str:
    """Przeszukuje wyroki Krajowej Izby Odwoławczej (KIO) dotyczące sporaów o zamówienia publiczne i przetargi.
    
    Args:
        query: Słowo kluczowe (np. 'rażąco niska cena', 'odrzucenie oferty', 'KIO 2201/23')
    """
    try:
        from services.mcp_tool_bridge import kio_search_judgments as _func
        res = await _func(query=query)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  8. TSUE — TRYBUNAŁ SPRAWIEDLIWOŚCI UNII EUROPEJSKIEJ
# ==============================================================================

@mcp.tool()
async def tsue_search_judgments(query: str = "") -> str:
    """Przeszukuje kluczowe wyroki i orzecznictwo Trybunału Sprawiedliwości UE (TSUE) — m.in. sprawy frankowe (C-520/21) oraz ochronę konsumentów.
    
    Args:
        query: Fraza kluczowa (np. 'C-520/21', 'frankowe', 'dyrektywa 93/13')
    """
    try:
        from services.mcp_tool_bridge import tsue_search_judgments as _func
        res = await _func(query=query)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  9. PATRON LEGAL TECH CONNECTORS (EUREKA, EU COMPLIANCE, PATRON SECURITY)
# ==============================================================================

@mcp.tool()
async def eureka_search_interpretations(query: str, limit: int = 5) -> str:
    """Przeszukuje bazę interpretacji podatkowych Ministerstwa Finansów i Krajowej Informacji Skarbowej (EUREKA / Patron MCP).
    
    Args:
        query: Słowo kluczowe (np. 'ryczałt programista', 'CIT estoński', 'stawka VAT 8%')
        limit: Liczba wyników
    """
    try:
        from services.mcp_tool_bridge import eureka_search_interpretations as _func
        res = await _func(query=query, limit=limit)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def eu_compliance_search(query: str = "", act: str = "") -> str:
    """Przeszukuje bazę prawa zgodności i cyberbezpieczeństwa UE (Patron EU-Compliance: RODO, AI Act, DORA, NIS 2).
    
    Args:
        query: Zagadnienie lub artykuł (np. 'Art. 12', 'record-keeping', 'minimalizacja')
        act: Nazwa aktu (np. 'AI Act', 'RODO', 'DORA', 'NIS 2')
    """
    try:
        from services.mcp_tool_bridge import eu_compliance_search as _func
        res = await _func(query=query, act=act)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def patron_scan_document(text: str, file_name: str = "") -> str:
    """Skanuje dokument wejściowy pod kątem prompt injection, ukrytych znaków zero-width i obfuskacji (Patron Input Security).
    
    Args:
        text: Treść dokumentu do przeskanowania
        file_name: Nazwa pliku źródłowego
    """
    try:
        from services.mcp_tool_bridge import patron_scan_document as _func
        res = await _func(text=text, file_name=file_name if file_name else None)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def nalegalu_article_lookup(citation: str, fetch_judgments: bool = True, limit: int = 5) -> str:
    """Wyszukuje treść konkretnego artykułu/paragrafu polskiego prawa i automatycznie wiąże go z orzecznictwem SAOS w formacie NaLegalu Markdown.
    
    Args:
        citation: Sygnatura przepisu (np. 'art. 118 kc', 'art. 145 ppsa', 'art. 7 kpa', 'art. 5 RODO')
        fetch_judgments: Czy pobrać powiązane orzeczenia SAOS
        limit: Liczba powiązanych orzeczeń
    """
    try:
        from services.mcp_tool_bridge import nalegalu_article_lookup as _func
        res = await _func(citation=citation, fetch_judgments=fetch_judgments, limit=limit)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  9. PRAWMi AI & ANTI-HALLUCINATION TOOLS (PRAWMi.PL)
# ==============================================================================

@mcp.tool()
async def prawmi_search_rulings(query: str = "", case_number: str = "", court_filter: str = "", limit: int = 5) -> str:
    """Wyszukuje orzeczenia sądów polskich (SN, SA, SO, NSA, WSA) w PrawMi semantycznie lub po sygnaturze.
    
    Args:
        query: Opis problemu prawnego w języku naturalnym
        case_number: Sygnatura orzeczenia (np. 'III CZP 8/22')
        court_filter: Opcjonalny filtr sądu ('SN', 'SA', 'SO', 'NSA', 'WSA')
        limit: Maksymalna liczba orzeczeń (1-20, domyślnie 5)
    """
    try:
        from services.prawmi_client import prawmi_client
        res = await prawmi_client.search_rulings(
            query=query or None,
            case_number=case_number or None,
            court_filter=court_filter or None,
            limit=limit,
        )
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


@mcp.tool()
async def prawmi_verify_ruling(case_number: str, skip_external: bool = False) -> str:
    """Weryfikuje autentyczność sygnatury orzeczenia w bazie PrawMi oraz publicznych źródłach (SAOS, NSA, SN).
    
    Args:
        case_number: Sygnatura orzeczenia do weryfikacji (np. 'III CZP 8/22')
        skip_external: Jeśli True, sprawdza tylko lokalną bazę PrawMi bez zewnętrznych zapytań
    """
    try:
        from services.prawmi_client import prawmi_client
        res = await prawmi_client.verify_ruling(case_number=case_number, skip_external=skip_external)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


@mcp.tool()
async def prawmi_get_article(act_shortname: str, article_number: str, include_regulations: bool = False) -> str:
    """Pobiera autorytatywny tekst artykułu z ustawy/kodeksu (np. KK, KC, KPC, KSH, KPA, KRO) z pełną strukturą ustępów.
    
    Args:
        act_shortname: Skrót ustawy (KK, KC, KPC, KSH, KPA...) lub pełny tytuł
        article_number: Numer artykułu (np. '148', '415', '286')
        include_regulations: Czy dołączyć powiązane rozporządzenia wykonawcze
    """
    try:
        from services.prawmi_client import prawmi_client
        res = await prawmi_client.get_article(
            act_shortname=act_shortname,
            article_number=article_number,
            include_regulations=include_regulations,
        )
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


@mcp.tool()
async def prawmi_get_ruling_text(ruling_link: str) -> str:
    """Pobiera pełny tekst orzeczenia sądowego na podstawie linku/ID z prawmi_search_rulings.
    
    Args:
        ruling_link: Link lub identyfikator orzeczenia zwrócony w search_rulings
    """
    try:
        from services.prawmi_client import prawmi_client
        res = await prawmi_client.get_ruling_text(ruling_link=ruling_link)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


@mcp.tool()
async def prawmi_search_acts(query: str, limit: int = 5) -> str:
    """Wyszukuje ustawy i kodeksy według tematu w PrawMi (zapobiega halucynowaniu błędnych nazw ustaw).
    
    Args:
        query: Temat / zagadnienie prawne
        limit: Maksymalna liczba aktów (domyślnie 5)
    """
    try:
        from services.prawmi_client import prawmi_client
        res = await prawmi_client.search_acts(query=query, limit=limit)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


@mcp.tool()
async def prawmi_search_rulings_by_article(act_shortname: str, article_number: str, court_filter: str = "", limit: int = 5) -> str:
    """Wyszukuje orzeczenia sądowe cytujące dany artykuł ustawy (potwierdzenie linii orzeczniczej).
    
    Args:
        act_shortname: Skrót ustawy (np. 'KC', 'KK', 'KPC')
        article_number: Numer artykułu (np. '415')
        court_filter: Opcjonalny filtr sądu ('SN', 'SA', 'SO', 'NSA', 'WSA')
        limit: Maksymalna liczba wyników
    """
    try:
        from services.prawmi_client import prawmi_client
        res = await prawmi_client.search_rulings_by_article(
            act_shortname=act_shortname,
            article_number=article_number,
            court_filter=court_filter or None,
            limit=limit,
        )
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


@mcp.tool()
async def prawmi_search_act_articles(topic: str, act_unified: str = "", act_title: str = "", limit: int = 5) -> str:
    """Wyszukuje konkretne artykuły w ramach ustawy powiązane z danym zagadnieniem.
    
    Args:
        topic: Temat / zagadnienie w ramach ustawy
        act_unified: Opcjonalny URL ISAP aktu prawnego (szybka ścieżka)
        act_title: Tytuł lub skrót ustawy (np. 'KC', 'Kodeks karny')
        limit: Maksymalna liczba artykułów
    """
    try:
        from services.prawmi_client import prawmi_client
        res = await prawmi_client.search_act_articles(
            topic=topic,
            act_unified=act_unified or None,
            act_title=act_title or None,
            limit=limit,
        )
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


@mcp.tool()
async def prawmi_verify_article_reference(fragment: str) -> str:
    """Audytuje fragment tekstu prawnego pod kątem nieistniejących lub zmyślonych artykułów i sygnatur wyroków (Anti-Hallucination Scan).
    
    Args:
        fragment: Tekst prawny do weryfikacji i audytu
    """
    try:
        from services.prawmi_client import prawmi_client
        res = await prawmi_client.verify_article_reference(fragment=fragment)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  10. INTERNET SEARCH — WYSZUKIWANIE NA ŻYWO (DUCKDUCKGO)
# ==============================================================================

@mcp.tool()
async def internet_search(query: str, limit: int = 5) -> str:
    """Wyszukuje w czasie rzeczywistym aktualne informacje prawne, prasowe i urzędowe w internecie via DuckDuckGo.
    
    Args:
        query: Zapytanie wyszukiwania
        limit: Liczba wyników
    """
    try:
        from services.retrieval.providers.duckduckgo_provider import duckduckgo_search
        res = await duckduckgo_search(query=query, max_results=limit)
        return _json_resp(res)
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  10. LEXMIND RAG & KNOWLEDGE BASE
# ==============================================================================

@mcp.tool()
async def search_legal_acts(keywords: str, limit: int = 5) -> str:
    """Wyszukuje w bazie aktów prawnych LexMind (ELI / ustawy / kodyfikacje).
    
    Args:
        keywords: Słowa kluczowe (np. 'kodeks karny art 286')
        limit: Liczba wyników
    """
    try:
        from services.retrieval_service import retrieval_service
        results = await retrieval_service.search_eli(keywords=keywords, limit=limit)
        return _json_resp({"status": "ok", "query": keywords, "count": len(results), "results": results})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def search_judgments(keywords: str, limit: int = 5) -> str:
    """Wyszukuje wyroki w bazie powszechnej LexMind.
    
    Args:
        keywords: Słowa kluczowe
        limit: Liczba wyników
    """
    try:
        from services.retrieval_service import retrieval_service
        results = await retrieval_service.search_saos(keywords=keywords, limit=limit)
        return _json_resp({"status": "ok", "query": keywords, "count": len(results), "results": results})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
async def search_supabase_rag(query: str, table_name: str = "knowledge_base_legal", limit: int = 5) -> str:
    """Wykonywanie hybrydowego wyszukiwania semantycznego RAG w bazie wiedzy Supabase.
    
    Args:
        query: Zapytanie tekstowe/przepis/zagadnienie
        table_name: Nazwa tabeli w Supabase
        limit: Maksymalna liczba wyników
    """
    try:
        from services.retrieval_service import retrieval_service
        results = await retrieval_service.search_supabase(query=query, table_name=table_name, match_count=limit, hybrid=True)
        return _json_resp({"status": "ok", "query": query, "count": len(results), "results": results})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  11. CHAT HISTORY & SESSIONS (SQLITE)
# ==============================================================================

@mcp.tool()
def list_sessions(limit: int = 10) -> str:
    """Pobiera listę ostatnich sesji czatu z bazy danych LexMind.
    
    Args:
        limit: Maksymalna liczba sesji
    """
    try:
        from database import get_db
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC LIMIT ?", (limit,))
            rows = cur.fetchall()
            sessions = [{"id": r[0], "title": r[1], "created_at": r[2], "updated_at": r[3]} for r in rows]
        return _json_resp({"status": "ok", "count": len(sessions), "sessions": sessions})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


@mcp.tool()
def get_session_messages(session_id: str) -> str:
    """Pobiera historię wiadomości z danej sesji czatu.
    
    Args:
        session_id: ID sesji czatu
    """
    try:
        from database import get_messages
        messages = get_messages(session_id=session_id)
        return _json_resp({"status": "ok", "session_id": session_id, "messages": messages})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  12. FILE & CODE NAVIGATOR
# ==============================================================================

@mcp.tool()
def list_documents(folder: str = "lexmind_acts") -> str:
    """Przegląda pliki i dokumenty w podanym katalogu projektu (np. PDF-y z aktami).
    
    Args:
        folder: Katalog w projekcie
    """
    try:
        target_path = ROOT_DIR / folder
        if not target_path.exists():
            return _json_resp({"status": "error", "message": f"Katalog '{folder}' nie istnieje."})
        
        docs = [
            {"name": f.name, "relative_path": str(f.relative_to(ROOT_DIR)), "size": f.stat().st_size, "type": f.suffix}
            for f in target_path.glob("**/*") if f.is_file()
        ]
        return _json_resp({"status": "ok", "folder": folder, "count": len(docs), "documents": docs[:50]})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
def get_document_info(filepath: str) -> str:
    """Zwraca metadane i parametry konkretnego pliku/dokumentu w projekcie.
    
    Args:
        filepath: Ścieżka do pliku
    """
    try:
        path = Path(filepath)
        if not path.is_absolute():
            path = ROOT_DIR / filepath
        if not path.exists():
            return _json_resp({"status": "error", "message": f"Plik '{filepath}' nie został odnaleziony."})
        
        stat = path.stat()
        return _json_resp({
            "status": "ok",
            "filepath": str(path.relative_to(ROOT_DIR) if path.is_relative_to(ROOT_DIR) else path),
            "size_bytes": stat.st_size,
            "modified_time": stat.st_mtime,
            "extension": path.suffix
        })
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
def find_files(pattern: str = "*.py") -> str:
    """Wyszukuje pliki w strukturze projektu według podanego wzorca glob.
    
    Args:
        pattern: Maska glob (np. '*.py', 'services/*.py')
    """
    try:
        files = list(ROOT_DIR.glob(pattern))
        rel_files = [str(f.relative_to(ROOT_DIR)) for f in files if f.is_file()]
        return _json_resp({"status": "ok", "pattern": pattern, "count": len(rel_files), "files": rel_files[:50]})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})

@mcp.tool()
def search_code(keyword: str, file_pattern: str = "**/*.py") -> str:
    """Przeszukuje kod źródłowy projektu pod kątem podanej frazy/definicji.
    
    Args:
        keyword: Szukane słowo kluczowe
        file_pattern: Maska plików
    """
    try:
        results = []
        for fpath in ROOT_DIR.glob(file_pattern):
            if not fpath.is_file() or ".venv" in fpath.parts or "node_modules" in fpath.parts:
                continue
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    for i, line in enumerate(f, 1):
                        if keyword.lower() in line.lower():
                            results.append({
                                "file": str(fpath.relative_to(ROOT_DIR)),
                                "line": i,
                                "text": line.strip()
                            })
                            if len(results) >= 20:
                                break
            except Exception:
                pass
            if len(results) >= 20:
                break
        return _json_resp({"status": "ok", "keyword": keyword, "count": len(results), "results": results})
    except Exception as e:
        return _json_resp({"status": "error", "message": str(e)})


# ==============================================================================
#  14. MATH & CALCULATIONS
# ==============================================================================

@mcp.tool()
def calculate_expression(expression: str) -> str:
    """Wykonuje bezpieczne obliczenia matematyczne/prawnicze (np. opłaty sądowe, odsetki).
    
    Args:
        expression: Wyrażenie matematyczne (np. '1500 * 0.08 + 200', '(5000 - 1200) / 12')
    """
    try:
        import ast
        import operator as op

        bin_ops: Dict[Any, Any] = {
            ast.Add: op.add,
            ast.Sub: op.sub,
            ast.Mult: op.mul,
            ast.Div: op.truediv,
            ast.Pow: op.pow,
        }
        un_ops: Dict[Any, Any] = {
            ast.USub: op.neg,
            ast.UAdd: op.pos,
        }

        def eval_node(node: ast.AST) -> Any:
            if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
                return node.value
            elif isinstance(node, ast.BinOp):
                left = eval_node(node.left)
                right = eval_node(node.right)
                op_cls = type(node.op)
                if op_cls in bin_ops:
                    return bin_ops[op_cls](left, right)
                raise ValueError(f"Niedozwolony operator: {op_cls}")
            elif isinstance(node, ast.UnaryOp):
                operand = eval_node(node.operand)
                op_cls = type(node.op)
                if op_cls in un_ops:
                    return un_ops[op_cls](operand)
                raise ValueError(f"Niedozwolony operator jednoargumentowy: {op_cls}")
            else:
                raise ValueError("Niedozwolony element w wyrażeniu")

        parsed_ast = ast.parse(expression.strip(), mode='eval').body
        res = eval_node(parsed_ast)
        return _json_resp({"status": "ok", "expression": expression, "result": res})
    except Exception as e:
        return _json_resp({"status": "error", "message": f"Błąd kalkulatora: {str(e)}"})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LexMind Master MCP Server — 40 Tools")
    parser.add_argument("--transport", choices=["stdio", "sse"], default="stdio", help="Transport mode (stdio or sse)")
    parser.add_argument("--host", default="0.0.0.0", help="Host for SSE transport")
    default_port = int(os.environ.get("PORT", 8005))
    parser.add_argument("--port", type=int, default=default_port, help="Port for SSE transport")
    args = parser.parse_args()

    if args.transport == "sse":
        print(f"[LEXMIND MCP] Starting Ultimate SSE HTTP server on {args.host}:{args.port} with 40 tools...")
        mcp.run(transport="sse", host=args.host, port=args.port)
    else:
        mcp.run(transport="stdio")
