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
    
    print("ALL OpenRouter models with 'embed' in ID or name:")
    found = False
    for m in models:
        mid = m.get("id", "")
        name = m.get("name", "")
        if "embed" in mid.lower() or "embed" in name.lower():
            print(f"- {mid} ({name})")
            found = True
    if not found:
        print("None found. Checking for 'openai/' specifically which usually support it.")
        for m in models:
            if m.get("id", "").startswith("openai/") and "text-embedding" in m.get("id", ""):
                 print(f"- {m.get('id')}")
                 found = True
