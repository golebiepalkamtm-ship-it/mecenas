import asyncio
import sys
from pathlib import Path
import json

ROOT_DIR = Path(r"e:\moj prawnik")
sys.path.insert(0, str(ROOT_DIR))

async def test_connection(name, coro, timeout=15):
    print(f"Testowanie [{name}]...", end=" ")
    try:
        result = await asyncio.wait_for(coro, timeout=timeout)
        if isinstance(result, dict) and result.get("status") == "error":
            print(f"BŁĄD API: {result.get('error', result.get('message', 'Nieznany błąd'))}")
        elif isinstance(result, str):
            try:
                parsed = json.loads(result)
                if parsed.get("status") == "error":
                    print(f"BŁĄD API: {parsed.get('message', parsed.get('error', 'Nieznany błąd'))}")
                elif "note" in parsed and "niedostępne" in parsed["note"].lower():
                    print(f"BŁĄD: {parsed['note']}")
                else:
                    print("OK")
            except:
                print("OK")
        else:
            print("OK")
    except asyncio.TimeoutError:
        print(f"TIMEOUT ({timeout}s)")
    except Exception as e:
        print(f"WYJĄTEK: {str(e)}")

async def main():
    print("Rozpoczynam testowanie połączeń z zewnętrznymi API...\n")
    
    try:
        from services.mcp_tool_bridge import (
            isap_list_publishers,
            saos_list_courts,
            sejm_list_mps,
            cbosa_search_judgments,
            krs_get_company,
        )
        from services.prawmi_client import prawmi_client
        from services.retrieval.providers.duckduckgo_provider import duckduckgo_search
        
        await test_connection("ISAP (Akty Prawne)", isap_list_publishers())
        await test_connection("SAOS (Orzeczenia)", saos_list_courts())
        await test_connection("SEJM RP", sejm_list_mps(term=10))
        await test_connection("CBOSA (NSA/WSA)", cbosa_search_judgments(query="podatek", limit=1))
        # PrawMi search acts is lightweight
        await test_connection("PrawMi (Anty-Halucynacje)", prawmi_client.search_acts(query="kodeks", limit=1))
        await test_connection("DuckDuckGo (Internet)", duckduckgo_search(query="test", max_results=1))
        
    except ImportError as e:
        print(f"Błąd importu: {e}")
        
    print("\nZakończono testy.")

if __name__ == "__main__":
    asyncio.run(main())
