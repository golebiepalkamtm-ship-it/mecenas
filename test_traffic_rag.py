import asyncio
from moa.retrieval import retrieve_legal_context

async def test_traffic_rag():
    print("Test RAG dla zapytań o ruch drogowy...")
    
    queries = [
        "przekroczenie prędkości",
        "prawo o ruchu drogowym",
        "kary za wykroczenia drogowe",
        "mandat prędkość",
        "kodeks drogowy"
    ]
    
    for query in queries:
        print(f"\n{'='*50}")
        print(f"Pytanie: {query}")
        print(f"{'='*50}")
        
        try:
            chunks, context = await retrieve_legal_context(query, match_threshold=0.05)
            print(f"Chunks: {len(chunks)}")
            print(f"Context length: {len(context)} chars")
            
            if chunks:
                print(f"Źródła:")
                sources = set()
                for chunk in chunks:
                    sources.add(chunk.source)
                for source in sources:
                    print(f"  - {source}")
                
                print(f"\nFragment kontekstu:")
                print(f"{context[:300]}...")
            else:
                print("Brak wyników")
                
        except Exception as e:
            print(f"Błąd: {e}")

if __name__ == "__main__":
    asyncio.run(test_traffic_rag())
