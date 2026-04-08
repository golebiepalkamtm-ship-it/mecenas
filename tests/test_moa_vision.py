import asyncio
import httpx
import base64

async def test_moa_vision():
    print("Test MOA Pipeline z obrazkiem...")
    
    # Prosty obrazek testowy (1x1 piksel czerwony)
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
            "message": "analizuj ten obrazek",
            "sessionId": "test-vision-session",
            "model": "anthropic/claude-3.5-sonnet",
            "selected_models": ["anthropic/claude-3.5-sonnet"],
            "aggregator_model": "anthropic/claude-3.5-sonnet",
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
                "http://localhost:8003/chat-consensus",
                json=payload,
                timeout=60
            )
            
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Response length: {len(result.get('content', ''))}")
                print(f"Response preview: {result.get('content', '')[:500]}...")
                if 'expert_analyses' in result:
                    print(f"Expert analyses: {len(result['expert_analyses'])}")
                    for analysis in result['expert_analyses']:
                        print(f"  - {analysis['model']}: {'SUCCESS' if analysis['success'] else 'FAILED'}")
            else:
                print(f"Error: {response.text[:500]}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_moa_vision())
