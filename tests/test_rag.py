import asyncio
from moa.retrieval import retrieve_legal_context

async def test_rag():
    print("Test RAG z prostym przywitaniem...")
    
    try:
        chunks, context = await retrieve_legal_context("witaj")
        print(f"Chunks: {len(chunks)}")
        print(f"Context length: {len(context)} chars")
        if context:
            print(f"Context preview: {context[:200]}...")
        else:
            print("Brak kontekstu - to może być OK dla prostego przywitania")
    except Exception as e:
        print(f"Błąd RAG: {e}")
    
    print("\nTest RAG z pytaniem prawnym...")
    try:
        chunks, context = await retrieve_legal_context("jakie są konsekwencje przekroczenia prędkości")
        print(f"Chunks: {len(chunks)}")
        print(f"Context length: {len(context)} chars")
        if context:
            print(f"Context preview: {context[:200]}...")
        else:
            print("Brak kontekstu - to może być problem!")
    except Exception as e:
        print(f"Błąd RAG: {e}")

if __name__ == "__main__":
    asyncio.run(test_rag())
