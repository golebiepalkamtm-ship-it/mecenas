import asyncio
import httpx
import base64
from PIL import Image, ImageDraw
import io

def create_simple_test_image():
    """Tworzy prosty obraz testowy z tekstem."""
    img = Image.new('RGB', (300, 150), color='lightblue')
    draw = ImageDraw.Draw(img)
    
    # Dodaj tekst
    text = "TEST CHAT IMAGE"
    draw.text((50, 50), text, fill='black')
    
    # Zapisz do bytes
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return buffer.getvalue()

async def test_chat_with_image():
    print("Test wysyłania obrazu w czacie...")
    
    # Stwórz obraz testowy
    image_content = create_simple_test_image()
    image_b64 = base64.b64encode(image_content).decode()
    
    async with httpx.AsyncClient(timeout=60) as client:
        # Wyślij wiadomość z załącznikiem
        payload = {
            "message": "To jest test wiadomości ze zdjęciem",
            "attachments": [
                {
                    "name": "test_chat_image.png",
                    "type": "image/png",
                    "content": image_b64
                }
            ]
        }
        
        try:
            response = await client.post(
                "http://localhost:8003/chat",
                json=payload,
                timeout=60
            )
            
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Sukces: {result.get('success', False)}")
                print(f"ID: {result.get('id')}")
                print(f"Treść: {result.get('content', '')[:200]}...")
                print(f"Źródła: {result.get('sources', [])}")
            else:
                print(f"Błąd: {response.text[:500]}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_chat_with_image())
