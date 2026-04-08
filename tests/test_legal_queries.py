import requests
import json

# Test rzeczywistego zapytania prawnego
print("Test zapytania prawnego...")

legal_data = {
    "message": "Jakie jest Art. 61 kodeksu postepowania administracyjnego?",
    "history": [],
    "model": "qwen/qwen3.6-plus:free",
    "task": "general",
    "provider": "openrouter"
}

try:
    print("Wysy\u0142am zapytanie prawne...")
    response = requests.post("http://127.0.0.1:8003/chat", json=legal_data, timeout=90)
    print(f"Status odpowiedzi: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("SUCCESS: Zapytanie prawne zadzia\u0142a\u0142o")
        print(f"Odpowied\u017a: {result.get('content', 'Brak content')[:300]}...")
        print(f"RAG used: {result.get('rag_used', False)}")
        print(f"Model: {result.get('model', 'Unknown')}")
    else:
        print(f"B\u0142\u0105d zapytania prawnego: {response.status_code}")
        print(f"Tre\u015b\u0107: {response.text[:300]}")
except requests.exceptions.Timeout:
    print("TIMEOUT: Zapytanie prawne przekroczy\u0142o 90s")
except Exception as e:
    print(f"B\u0141\u0104D zapytania prawnego: {e}")

print("\n" + "="*50 + "\n")

# Test z histori\u0105 (ale kr\u00f3tk\u0105)
print("Test z kr\u00f3tk\u0105 histori\u0105...")

history_data = {
    "message": "A co z Art. 62?",
    "history": [
        {"role": "user", "content": "Jakie jest Art. 61 KPA?"},
        {"role": "assistant", "content": "Art. 61 KPA dotyczy dor\u0119czen\u015b pism."}
    ],
    "model": "qwen/qwen3.6-plus:free",
    "task": "general",
    "provider": "openrouter"
}

try:
    print("Wysy\u0142am zapytanie z histori\u0105...")
    response = requests.post("http://127.0.0.1:8003/chat", json=history_data, timeout=60)
    print(f"Status odpowiedzi: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("SUCCESS: Zapytanie z histori\u0105 zadzia\u0142a\u0142o")
        print(f"Odpowied\u017a: {result.get('content', 'Brak content')[:200]}...")
    else:
        print(f"B\u0142\u0105d z histori\u0105: {response.status_code}")
        print(f"Tre\u015b\u0107: {response.text[:300]}")
except Exception as e:
    print(f"B\u0141\u0104D z histori\u0105: {e}")

print("\n\u2705 Wszystkie testy zako\u0144czone!")
