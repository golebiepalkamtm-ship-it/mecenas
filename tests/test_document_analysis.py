import asyncio
import httpx

async def test_document_analysis():
    print("Test analizy dokumentu z RAG...")
    
    async with httpx.AsyncClient(timeout=60) as client:
        payload = {
            "document_text": "To jest umowa kupna-sprzedazy nieruchomosci z dnia 15.01.2025. Strony zgodzily sie na cene 500000 PLN. Nieruchomosc jest obciazona służebnoscą przechodu.",
            "question": "Czy ta umowa jest zgodna z przepisami kodeksu cywilnego?",
            "model": "anthropic/claude-3.5-sonnet",
            "use_rag": True
        }
        
        try:
            response = await client.post(
                "http://localhost:8003/analyze-document",
                json=payload,
                timeout=60
            )
            
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Sukces: {result['success']}")
                print(f"RAG użyty: {result['rag_used']}")
                print(f"Długość dokumentu: {result['document_length']}")
                print(f"Długość kontekstu: {result['context_length']}")
                print(f"Źródła: {result['sources']}")
                print(f"Odpowiedź: {result['answer'][:500]}...")
            else:
                print(f"Błąd: {response.text[:500]}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_document_analysis())
