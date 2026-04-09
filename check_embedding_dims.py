import asyncio
import httpx
from moa.config import EMBEDDING_MODEL, OLLAMA_BASE_URL

async def check_ollama_dimensions():
    print(f"--- Weryfikacja wymiarów Ollama ---")
    print(f"Model: {EMBEDDING_MODEL}")
    
    payload = {
        "model": EMBEDDING_MODEL,
        "input": ["test ping"]
    }
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(
                f"{OLLAMA_BASE_URL.rstrip('/')}/api/embed",
                json=payload
            )
            if res.status_code == 200:
                data = res.json()
                if "embeddings" in data:
                    dim = len(data["embeddings"][0])
                    print(f"✅ SUKCES: Model zwraca wektory o wielkości: {dim}")
                    if dim == 1536:
                        print("✨ To jest IDEALNY wymiar dla Twojej nowej bazy danych.")
                    else:
                        print(f"⚠️ UWAGA: Wymiar {dim} różni się od zakładanego 1536!")
                else:
                    print(f"❌ Błąd formatu odpowiedzi: {data}")
            else:
                print(f"❌ Błąd Ollama (Status {res.status_code}): {res.text}")
    except Exception as e:
        print(f"❌ Nie udało się połączyć z Ollama: {e}")
        print("Upewnij się, że Ollama działa lokalnie na porcie 11434.")

if __name__ == "__main__":
    asyncio.run(check_ollama_dimensions())
