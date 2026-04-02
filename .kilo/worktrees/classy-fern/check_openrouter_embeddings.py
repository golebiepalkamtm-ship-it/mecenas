import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")

if not api_key:
    print("No OPENROUTER_API_KEY found in .env")
else:
    url = "https://openrouter.ai/api/v1/models"
    res = requests.get(url)
    models = res.json().get("data", [])
    
    print("OpenRouter models that support embeddings (likely):")
    for m in models:
        # OpenRouter doesn't always flag embeddings clearly in list, 
        # but we can look for 'embedding' in ID or known names
        model_id = m.get("id", "")
        if "embedding" in model_id.lower():
            print(f"- {model_id} ({m.get('name')})")
