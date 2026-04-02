import asyncio
import httpx
import base64

async def test_image_upload():
    print("Test przesyłania obrazu...")
    
    # Stwórz prosty obrazek (1x1 piksel czerwony w PNG)
    red_pixel_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x0cIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Test jako base64
        content_b64 = base64.b64encode(red_pixel_png).decode()
        
        payload = {
            "filename": "test_image.png",
            "content_type": "image/png",
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
                
                # Jeśli sukces, testuj analizę
                if result['success'] and result['extracted_text']:
                    print("\nTest analizy obrazu...")
                    analysis_payload = {
                        "document_text": result['extracted_text'],
                        "question": "Co widać na tym obrazku?",
                        "use_rag": False
                    }
                    
                    analysis_response = await client.post(
                        "http://localhost:8003/analyze-document",
                        json=analysis_payload,
                        timeout=30
                    )
                    
                    if analysis_response.status_code == 200:
                        analysis_result = analysis_response.json()
                        print(f"Analiza sukces: {analysis_result['success']}")
                        print(f"Odpowiedź: {analysis_result['answer'][:300]}...")
                    else:
                        print(f"Błąd analizy: {analysis_response.text[:200]}")
            else:
                print(f"Błąd: {response.text[:500]}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_image_upload())
