import asyncio
import httpx
from moa.config import OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_HEADERS

async def check_embedding_models():
    print("Sprawdzanie dostępnych modeli embedding...")
    
    async with httpx.AsyncClient(timeout=30) as client:
        # Sprawdź dostępne modele
        response = await client.get(
            f"{OPENROUTER_BASE_URL}/models",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"}
        )
        
        if response.status_code == 200:
            models = response.json().get("data", [])
            embedding_models = []
            
            for model in models:
                model_id = model.get("id", "")
                if "embedding" in model_id.lower() or "text-embedding" in model_id.lower():
                    embedding_models.append({
                        "id": model_id,
                        "name": model.get("name", model_id),
                        "pricing": model.get("pricing", {})
                    })
            
            print(f"Znaleziono {len(embedding_models)} modeli embedding:")
            for model in embedding_models:
                print(f"  - {model['id']}: {model['name']}")
        else:
            print(f"Błąd: {response.status_code} - {response.text}")

if __name__ == "__main__":
    asyncio.run(check_embedding_models())
