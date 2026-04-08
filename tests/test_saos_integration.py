import asyncio
from moa.retrieval import retrieve_legal_context

async def test_integrated_retrieval():
    print("=== TEST ZINTEGROWANEGO RAG (Supabase + SAOS) ===")
    query = "odszkodowanie za wypadek hulajnogą"
    
    chunks, context = await retrieve_legal_context(query)
    
    print(f"\nLiczba pobranych fragmentów: {len(chunks)}")
    print(f"Długość kontekstu: {len(context)} znaków")
    
    saos_chunks = [c for c in chunks if "SAOS" in c.source]
    print(f"Liczba fragmentów z SAOS: {len(saos_chunks)}")
    
    if saos_chunks:
        print("\nPrzykład fragmentu z SAOS:")
        print(f"Źródło: {saos_chunks[0].source}")
        print(f"Treść: {saos_chunks[0].content[:200]}...")
    else:
        print("\n[!] Nie znaleziono fragmentów z SAOS. Sprawdź połączenie lub zapytanie.")

    print("\n=== KONIEC TESTU ===")

if __name__ == "__main__":
    asyncio.run(test_integrated_retrieval())
