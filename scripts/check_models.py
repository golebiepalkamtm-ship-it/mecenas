"""Check available OpenRouter models matching our targets."""
import requests, os
from dotenv import load_dotenv
load_dotenv()

key = os.getenv("OPENROUTER_API_KEY")
r = requests.get("https://openrouter.ai/api/v1/models", headers={"Authorization": f"Bearer {key}"}, timeout=15)
models = r.json().get("data", [])

targets = ["deepseek", "glm", "grok", "qwen3", "gpt-5"]
print(f"Total models: {len(models)}")
print("=" * 60)
for m in sorted(models, key=lambda x: x["id"]):
    mid = m["id"].lower()
    if any(t in mid for t in targets):
        pricing = m.get("pricing", {})
        prompt_price = pricing.get("prompt", "?")
        print(f"  {m['id']}")
