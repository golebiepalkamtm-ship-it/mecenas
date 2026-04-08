import os
import requests
import sys
from dotenv import load_dotenv

# Force UTF-8 for Windows console redirection
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())


# Wczytaj env
load_dotenv()

key = os.getenv("OPENROUTER_API_KEY")
url = "https://openrouter.ai/api/v1/models"

def fetch_models():
    if not key:
        print("❌ Brakuje OPENROUTER_API_KEY w .env")
        return
        
    headers = {
        "Authorization": f"Bearer {key}",
        "HTTP-Referer": "http://localhost:8003",
        "X-Title": "LexMind AI",
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        models = data.get("data", [])
        
        print(f"✅ Znaleziono {len(models)} modeli w OpenRouter:\n")
        
        # Sortowanie po providerze (pierwszy człon ID)
        models.sort(key=lambda x: x["id"])
        
        for m in models:
            mid = m["id"]
            name = m.get("name", mid)
            context = m.get("context_length", "N/A")
            price_in = m.get("pricing", {}).get("prompt", 0.0)
            price_out = m.get("pricing", {}).get("completion", 0.0)
            
            print(f"- {mid:50} | {name:40} | Context: {context:8} | Price(In/Out): {price_in}/{price_out}")
            
    except Exception as e:
        print(f"❌ Błąd podczas pobierania modeli: {e}")

if __name__ == "__main__":
    fetch_models()
