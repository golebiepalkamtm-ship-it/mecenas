import asyncio
import httpx
from moa.config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL

async def test_openrouter_embedding():
    print("Test OpenRouter embedding API...")
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://127.0.0.1:8003",
        "X-Title": "LexMind AI",
        "Content-Type": "application/json",
    }
    
    # Spróbuj różnych modeli
    models_to_try = [
        "openai/text-embedding-3-small",
        "openai/text-embedding-3-large", 
        "openai/text-embedding-ada-002",
        "cohere/embed-english-v3.0",
        "nvidia/embed-qa-4"
    ]
    
    async with httpx.AsyncClient(timeout=20) as client:
        for model in models_to_try:
            print(f"\nTestowanie modelu: {model}")
            
            payload = {
                "model": model,
                "input": ["test query"],
            }
            
            try:
                response = await client.post(
                    f"{OPENROUTER_BASE_URL}/embeddings",
                    json=payload,
                    headers=headers,
                )
                
                print(f"  Status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    if "data" in data and data["data"]:
                        embedding = data["data"][0]["embedding"]
                        print(f"  SUKCES! Wymiar: {len(embedding)}")
                        return model, len(embedding)
                    else:
                        print(f"  Błąd formatu: {data}")
                else:
                    print(f"  Błąd: {response.text[:200]}")
            except Exception as e:
                print(f"  Exception: {e}")
    
    print("\nŻaden model nie zadziałał!")
    return None, None

if __name__ == "__main__":
    asyncio.run(test_openrouter_embedding())
