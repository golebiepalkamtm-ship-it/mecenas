import asyncio
import httpx
from moa.config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL

async def test_listing():
    print("Testing OpenRouter model search for Claude 3.5 Sonnet...")
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.get(
                f"{OPENROUTER_BASE_URL}/models",
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                models = data.get("data", [])
                claude_models = [m for m in models if "claude-3.5-sonnet" in m.get('id', '').lower()]
                for m in claude_models:
                    print(f"- {m.get('id')}: {m.get('name')}")
            else:
                print(f"Error: {response.text}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_listing())
