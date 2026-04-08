import asyncio
import httpx
import base64

async def test_document_upload():
    print("Test endpointu do przesyłania dokumentów...")
    
    # Stwórz prosty plik tekstowy jako test
    test_content = b"To jest testowy dokument prawny.\nZawiera informacje o umowie kupna-sprzedazy.\nArt. 535 KC - Umowa zobowiazujaca do przeniesienia wlasnosci rzeczy."
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Test jako base64
        content_b64 = base64.b64encode(test_content).decode()
        
        payload = {
            "filename": "test_dokument.txt",
            "content_type": "text/plain",
            "content": content_b64
        }
        
        try:
            response = await client.post(
                "http://localhost:8003/upload-base64-document",
                data=payload,
                timeout=30
            )
            
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Sukces: {result['success']}")
                print(f"Plik: {result['filename']}")
                print(f"Długość tekstu: {result['text_length']}")
                print(f"Błąd: {result.get('error')}")
                print(f"Ekstraktowany tekst: {result['extracted_text'][:200]}...")
            else:
                print(f"Błąd: {response.text[:500]}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_document_upload())
