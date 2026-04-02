import asyncio
from moa.retrieval import retrieve_legal_context

async def test_kpa_retrieval():
    print("=== TEST RETRIEVAL KPA ===")
    query = "Art. 61 § 4 KPA wszczęcie postępowania"
    
    chunks, context = await retrieve_legal_context(query, match_count=10, match_threshold=0.1)
    
    print(f"\nLiczba pobranych fragmentów: {len(chunks)}")
    
    kpa_chunks = [c for c in chunks if "administracyjnego" in c.source.lower()]
    print(f"Liczba fragmentów z KPA: {len(kpa_chunks)}")
    
    for i, chunk in enumerate(kpa_chunks[:3]):
        print(f"\n--- Chunk {i+1} ({chunk.source}) ---")
        print(chunk.content[:500])
        print("-" * 20)
    
    if not kpa_chunks:
        print("\n[!] BRAK WYNIKÓW Z KPA!")

if __name__ == "__main__":
    asyncio.run(test_kpa_retrieval())
