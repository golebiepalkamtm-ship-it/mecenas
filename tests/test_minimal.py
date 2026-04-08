import requests
import json

# Test z minimalnymi danymi
print("Test z minimalnymi danymi...")

# Test bez historii i bez skomplikowanych pól
minimal_data = {
    "message": "Cze\u015b\u0107",
    "history": [],
    "model": "qwen/qwen3.6-plus:free",
    "task": "general",
    "provider": "openrouter"
}

try:
    print("Wysy\u0142am minimalne zapytanie...")
    response = requests.post("http://127.0.0.1:8003/chat", json=minimal_data, timeout=30)
    print(f"Status odpowiedzi: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("SUCCESS: Minimalne zapytanie zadzia\u0142a\u0142o")
        print(f"Odpowied\u017a: {result.get('content', 'Brak content')[:100]}...")
    else:
        print(f"B\u0142\u0105d minimalnego: {response.status_code}")
        print(f"Tre\u015b\u0107: {response.text}")
        
        # Spr\u00f3buj zdiagnozowa\u0107 problem
        try:
            error_data = response.json()
            print(f"Szczeg\u00f3\u0142y b\u0142\u0119du: {error_data}")
        except:
            pass
            
except Exception as e:
    print(f"B\u0141\u0104D minimalnego: {e}")

print("\n" + "="*50 + "\n")

# Test endpointu /models/sync
print("Test endpointu /models/sync...")

try:
    response = requests.get("http://127.0.0.1:8003/models/sync", timeout=10)
    print(f"Status /models/sync: {response.status_code}")
    if response.status_code == 200:
        print("Models sync endpoint dzia\u0142a")
    else:
        print(f"B\u0142\u0105d models/sync: {response.text[:200]}")
except Exception as e:
    print(f"B\u0141\u0104D models/sync: {e}")
