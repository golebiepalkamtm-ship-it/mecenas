import asyncio
from moa.retrieval import retrieve_legal_context

async def test_rag_low_threshold():
    print("Test RAG z niskim threshold (0.0)...")
    
    try:
        chunks, context = await retrieve_legal_context("jakie są konsekwencje przekroczenia prędkości", match_count=5, match_threshold=0.0)
        print(f"Chunks: {len(chunks)}")
        print(f"Context length: {len(context)} chars")
        if context:
            print(f"Context preview: {context[:200]}...")
        else:
            print("Brak kontekstu")
            
        if chunks:
            print(f"First chunk: {chunks[0].content[:200]}...")
            print(f"Source: {chunks[0].source}")
            print(f"Similarity: {chunks[0].similarity}")
    except Exception as e:
        print(f"Błąd RAG: {e}")

if __name__ == "__main__":
    asyncio.run(test_rag_low_threshold())
