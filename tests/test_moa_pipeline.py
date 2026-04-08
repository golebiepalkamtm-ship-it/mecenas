import asyncio
import httpx

async def test_moa_pipeline():
    print("Test MOA Pipeline...")
    
    async with httpx.AsyncClient(timeout=60) as client:
        # Test MOA consensus endpoint
        payload = {
            "message": "analizuj to pytanie",
            "sessionId": "test-moa-session",
            "model": "anthropic/claude-3.5-sonnet",
            "selected_models": ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
            "aggregator_model": "anthropic/claude-3.5-sonnet"
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
                print(f"Response preview: {result.get('content', '')[:300]}...")
                if 'expert_analyses' in result:
                    print(f"Expert analyses: {len(result['expert_analyses'])}")
            else:
                print(f"Error: {response.text[:500]}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_moa_pipeline())
