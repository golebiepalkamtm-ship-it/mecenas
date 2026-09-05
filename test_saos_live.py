import asyncio
import httpx
import json
from services.retrieval.providers.saos_provider import fetch_saos_once

async def main():
    queries = [
        "art. 64 k.k. kara łączna",
        "art. 54 ustawy o przeciwdziałaniu narkomanii",
        "metamfetamina roztwór stężenie",
        "art. 62 ust. 3 ustawy o przeciwdziałaniu narkomanii"
    ]
    
    async with httpx.AsyncClient(verify=False) as client:
        for q in queries:
            print(f"\n==========================================")
            print(f"SZUKAM W SAOS: {q}")
            print(f"==========================================")
            try:
                results = await fetch_saos_once(client, q, limit=3)
                print(f"Liczba wyników: {len(results)}")
                for idx, r in enumerate(results, 1):
                    print(f"\n--- WYNIK {idx} ---")
                    print(f"Źródło: {r.source}")
                    print(f"Tytuł: {r.title}")
                    print(f"Treść:\n{r.content[:600]}...")
            except Exception as e:
                print(f"Błąd dla '{q}': {e}")

if __name__ == "__main__":
    asyncio.run(main())
