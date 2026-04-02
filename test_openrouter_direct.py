import asyncio
import httpx
from moa.config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL

async def test_openrouter_direct():
    print("Test OpenRouter API bezpośrednio...")
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://127.0.0.1:8003",
        "X-Title": "LexMind AI",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": "anthropic/claude-3.5-sonnet",
        "messages": [
            {"role": "user", "content": "Witaj"}
        ],
        "temperature": 0.1
    }
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                json=payload,
                headers=headers
            )
            
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                print(f"Response: {content[:200]}...")
            else:
                print(f"Error: {response.text[:500]}")
                
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_openrouter_direct())
