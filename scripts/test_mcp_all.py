"""
Kompleksowy skrypt testowo-diagnostyczny dla WSZYSTKICH narzedzi MCP w projekcie LexMind AI.
Wywoluje kazde z narzedzi i sprawdza status, typ odpowiedzi oraz czas reakcji.
"""
import asyncio
import json
import time
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent.resolve()
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from services import mcp_tool_bridge

import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

async def run_all_tests():
    tests = [
        # ISAP / ELI
        ("isap_list_publishers", {}, "ISAP Lista Wydawcow"),
        ("isap_search_acts", {"publisher": "DU", "year": 2024, "query": "karny", "limit": 2}, "ISAP Szukaj Ustaw"),
        ("isap_get_act_details", {"publisher": "DU", "year": 2024, "pos": 1}, "ISAP Szczegoly Aktu"),
        ("isap_get_act_text", {"publisher": "DU", "year": 2024, "pos": 1, "search_text": "Art"}, "ISAP Tresc Aktu"),
        
        # SAOS
        ("saos_list_courts", {}, "SAOS Wykaz Sadow"),
        ("saos_search_judgments", {"query": "art. 286", "page_size": 2}, "SAOS Szukaj Orzeczen"),
        ("saos_search_by_article", {"law_clause": "art. 62", "limit": 2}, "SAOS Szukaj wg Artykulu"),
        ("saos_cite_check", {"case_number": "II AKa 120/23", "limit": 2}, "SAOS Shepard's Citator"),
        
        # SEJM RP
        ("sejm_list_mps", {"term": 10}, "SEJM Wykaz Poslow"),
        ("sejm_list_prints", {"term": 10, "limit": 2}, "SEJM Druki Ustaw"),
        ("sejm_search_interpellations", {"term": 10, "limit": 2}, "SEJM Interpelacje"),
        ("sejm_list_committees", {"term": 10}, "SEJM Komisje"),
        ("sejm_list_votings", {"term": 10, "limit": 2}, "SEJM Glosowania"),
        
        # Rejestry Gospodarcze i Podatkowe
        ("krs_get_company", {"krs": "0000000001"}, "KRS Pobierz Spolke"),
        ("ceidg_search_business", {"query": "5260250995"}, "CEIDG Dzialalnosc"),
        ("wl_search_vat", {"nip": "5260250995"}, "Biala Lista VAT NIP"),
        ("wl_check_vat_account", {"nip": "5260250995", "bank_account": "12102010260000100202020202"}, "Biala Lista Rachunek"),
        
        # Sadownictwo Administracyjne & Specjalne
        ("cbosa_search_judgments", {"query": "podatek", "limit": 2}, "CBOSA Orzeczenia NSA/WSA"),
        ("cbosa_search_by_case", {"case_number": "I FSK 1/20"}, "CBOSA wg Sygnatury"),
        ("uodo_search_decisions", {"query": "kara"}, "UODO Decyzje RODO"),
        ("kio_search_judgments", {"query": "odrzucenie"}, "KIO Zamowienia Publiczne"),
        ("tsue_search_judgments", {"query": "konsument"}, "TSUE Orzecznictwo"),
        
        # Patron & NaLegalu
        ("eureka_search_interpretations", {"query": "stawka VAT", "limit": 2}, "EUREKA Interpretacje MF"),
        ("eu_compliance_search", {"query": "AI Act"}, "Patron EU Compliance"),
        ("patron_scan_document", {"text": "Weryfikacja umowy klienta bez zagrozen."}, "Patron Security Scan"),
        ("nalegalu_article_lookup", {"code": "KK", "article": "62"}, "NaLegalu Artykul i Orzecznictwo"),
        
        # Narzedzia Pomocnicze & RAG
        ("calculate_expression", {"expression": "1500 * 1.23 + 450"}, "Kalkulator Prawny"),
        ("list_sessions", {}, "Historia Sesji"),
        ("list_documents", {}, "Lista Dokumentow"),
        ("find_files", {"pattern": "*.py"}, "Wyszukiwanie Plikow"),
        ("search_code", {"keyword": "FastMCP"}, "Przeszukiwanie Kodu"),
        ("internet_search", {"query": "Sad Najwyzszy"}, "Wyszukiwarka Internetowa"),
        ("search_legal_acts", {"query": "kodeks cywilny", "limit": 2}, "Szukaj Aktow RAG"),
        ("search_judgments", {"query": "odszkodowanie", "limit": 2}, "Szukaj Wyrokow RAG"),
    ]

    print("=" * 80)
    print(f"   LEXMIND AI — RAPORT SPRAWNOSCI NARZEDZI MCP (Lacznie: {len(tests)})")
    print("=" * 80)
    print(f"{'Lp.':<4} | {'Narzedzie MCP':<30} | {'Status':<8} | {'Czas':<8} | {'Podsumowanie wyniku'}")
    print("-" * 80)

    passed = 0
    warnings = 0
    errors = 0

    for i, (tool_name, params, desc) in enumerate(tests, 1):
        t0 = time.perf_counter()
        try:
            res = await mcp_tool_bridge.call_mcp_tool(tool_name, **params)
            elapsed_ms = (time.perf_counter() - t0) * 1000
            
            st = res.get("status", "ok") if isinstance(res, dict) else "ok"
            if st == "ok":
                status_str = "[OK]"
                passed += 1
            else:
                status_str = "[WARN]"
                warnings += 1
                
            summary = str(res)[:45].replace("\n", " ") + "..."
            print(f"{i:<4} | {tool_name:<30} | {status_str:<8} | {elapsed_ms:>6.1f}ms | {summary}")
        except Exception as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            errors += 1
            print(f"{i:<4} | {tool_name:<30} | [ERR]    | {elapsed_ms:>6.1f}ms | Wyjatek: {str(e)[:40]}")

    print("=" * 80)
    print(f"PODSUMOWANIE: [OK]: {passed} | [WARN]: {warnings} | [ERR]: {errors} | Lacznie: {len(tests)}")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(run_all_tests())
