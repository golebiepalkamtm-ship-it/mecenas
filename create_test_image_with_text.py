import asyncio
import httpx
import base64
from PIL import Image, ImageDraw, ImageFont
import io

def create_test_image_with_text():
    """Tworzy obraz z tekstem 'TEST OCR'."""
    # Stwórz obraz 400x200 z białym tłem
    img = Image.new('RGB', (400, 200), color='white')
    draw = ImageDraw.Draw(img)
    
    # Spróbuj użyć domyślnej czcionki
    try:
        # Spróbuj większą czcionkę
        font_size = 48
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        # Użyj domyślnej czcionki
        font = None
    
    # Dodaj tekst
    text = "TEST OCR - POLSKI"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Wycentruj tekst
    x = (400 - text_width) // 2
    y = (200 - text_height) // 2
    
    draw.text((x, y), text, fill='black', font=font)
    
    # Zapisz do bytes
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return buffer.getvalue()

async def test_easyocr():
    print("Test EasyOCR z obrazem z tekstem...")
    
    # Stwórz obraz z tekstem
    image_content = create_test_image_with_text()
    image_b64 = base64.b64encode(image_content).decode()
    
    async with httpx.AsyncClient(timeout=60) as client:
        payload = {
            "filename": "test_with_text.png",
            "content_type": "image/png",
            "content": image_b64
        }
        
        try:
            response = await client.post(
                "http://localhost:8003/upload-base64-document",
                data=payload,
                timeout=60
            )
            
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Sukces: {result['success']}")
                print(f"Plik: {result['filename']}")
                print(f"Długość tekstu: {result['text_length']}")
                print(f"Błąd: {result.get('error')}")
                print(f"Ekstraktowany tekst: '{result['extracted_text']}'")
                
                # Jeśli sukces, testuj analizę
                if result['success'] and result['extracted_text']:
                    print("\nTest analizy obrazu...")
                    analysis_payload = {
                        "document_text": result['extracted_text'],
                        "question": "Co napisano na tym obrazie?",
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
    asyncio.run(test_easyocr())
