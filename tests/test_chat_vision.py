import asyncio
import httpx
import base64

async def test_chat_vision():
    print("Test Chat endpoint z obrazkiem...")
    
    import os
    test_image_path = os.path.join(os.path.dirname(__file__), 'test_image.png')
    if os.path.exists(test_image_path):
        with open(test_image_path, 'rb') as f:
            red_pixel = f.read()
    else:
        # Mały bezpieczny obraz
        red_pixel = base64.b64decode(b'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    red_pixel_b64 = base64.b64encode(red_pixel).decode()
    
    async with httpx.AsyncClient(timeout=60) as client:
        payload = {
            "message": "co to za obrazek?",
            "sessionId": "test-chat-vision",
            "model": "anthropic/claude-3.5-sonnet",
            "attachments": [
                {
                    "name": "test.png",
                    "type": "image/png",
                    "content": red_pixel_b64
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
                print(f"Response length: {len(result.get('content', ''))}")
                print(f"Response preview: {result.get('content', '')[:500]}...")
            else:
                print(f"Error: {response.text[:500]}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_chat_vision())
