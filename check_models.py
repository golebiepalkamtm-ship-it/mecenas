import requests
import os

api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    print("❌ Brak OPENROUTER_API_KEY")
    exit(1)

try:
    response = requests.get(
        "https://openrouter.ai/api/v1/models",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    data = response.json()
    models = data.get("data", [])
    print(f"✅ Dostępnych modeli w OpenRouter: {len(models)}")

    # Pokaż pierwsze 10 modeli
    print("\nPierwsze 10 modeli:")
    for i, model in enumerate(models[:10]):
        print(f"  {i + 1}. {model.get('id')} - {model.get('name', 'N/A')}")

except Exception as e:
    print(f"❌ Błąd: {e}")
