import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY") or "AIzaSyBDoyzZGlAZUjOgSpT5rACq35CAVI5H3FM"

url = f"https://generativelanguage.googleapis.com/v1/models?key={api_key}"
res = requests.get(url)
models = res.json().get("models", [])
for m in models:
    if "embedContent" in m.get("supportedGenerationMethods", []):
        print(f"{m.get('name')}")
