import asyncio
import httpx

async def test_backend_simple():
    print("Test backend API z prostym request...")
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Test chat endpoint z prostym pytaniem
        payload = {
            "message": "witaj",
            "sessionId": "test-session",
            "model": "anthropic/claude-3.5-sonnet"
        }
        
        try:
            response = await client.post(
                "http://localhost:8003/chat",
                json=payload,
                timeout=30
            )
            
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Response length: {len(result.get('content', ''))}")
                print(f"Response preview: {result.get('content', '')[:200]}...")
            else:
                print(f"Error: {response.text[:500]}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_backend_simple())
