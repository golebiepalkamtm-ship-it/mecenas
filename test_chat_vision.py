import asyncio
import httpx
import base64

async def test_chat_vision():
    print("Test Chat endpoint z obrazkiem...")
    
    # Prosty obrazek testowy
    red_pixel = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x0cIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
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
