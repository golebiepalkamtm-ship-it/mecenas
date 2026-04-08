import asyncio
import sys
import os

# Dodaj bieżący katalog do sys.path, aby móc importować moa
sys.path.append(os.getcwd())

from moa.eli import search_eli_acts
from moa.retrieval import retrieve_legal_context

async def test_eli_direct():
    print("=== TEST BEZPOŚREDNI ELI API ===")
    query = "o prawie autorskim"
    results = await search_eli_acts(query, limit=2)
    
    print(f"Znaleziono: {len(results)} wyników")
    for r in results:
        print(f"\n--- {r.source} ---")
        print(f"Treść (fragment): {r.content[:500]}...")
    print("\n")

async def test_integrated_eli():
    print("=== TEST ZINTEGROWANY RAG + ELI ===")
    # Pytanie, które powinno wyzwolić ELI
    query = "Jakie są kary za brak maseczki w rozporządzeniu covidowym?"
    
    chunks, context = await retrieve_legal_context(query)
    
    eli_chunks = [c for c in chunks if "ELI" in c.source]
    print(f"Liczba fragmentów z ELI w RAG: {len(eli_chunks)}")
    
    if eli_chunks:
        print(f"Przykład źródła ELI: {eli_chunks[0].source}")
        # Sprawdzamy czy jest treść aktu
        if "TREŚĆ AKTU" in eli_chunks[0].content:
            print("✅ Sukces: Pobrano treść aktu z ELI!")
        else:
            print("❌ Błąd: Brak treści aktu (tylko metadane?)")
    else:
        print("⚠️ Brak wyników z ELI dla tego zapytania (może brak pasujących aktów w tyule/keywords)")

    print("\n=== KONIEC TESTÓW ===")

if __name__ == "__main__":
    asyncio.run(test_eli_direct())
    asyncio.run(test_integrated_eli())
