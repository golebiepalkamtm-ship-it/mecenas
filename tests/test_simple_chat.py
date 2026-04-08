import requests
import json

# Test prostszego endpointu /chat
print("Test prostego endpointu /chat...")

test_data = {
    "message": "Czym jest Art. 61 kodeksu postepowania administracyjnego?",
    "history": [],
    "model": "qwen/qwen3.6-plus:free"
}

try:
    print("Wysy\u0142am zapytanie do /chat...")
    response = requests.post("http://127.0.0.1:8003/chat", json=test_data, timeout=60)
    print(f"Status odpowiedzi: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("SUCCESS: /chat odpowiada poprawnie")
        print(f"Odpowied\u017a: {result.get('content', 'Brak content')[:200]}...")
    else:
        print(f"B\u0142\u0105d /chat: {response.status_code}")
        print(f"Tre\u015b\u0107: {response.text[:300]}")
except requests.exceptions.Timeout:
    print("TIMEOUT: /chat nie odpowiedzia\u0142 w 60s")
except Exception as e:
    print(f"B\u0141\u0104D: {e}")

print("\n" + "="*50 + "\n")

# Test z bardzo prostym zapytaniem
print("Test z bardzo prostym zapytaniem...")

simple_data = {
    "message": "Cze\u015b\u0107",
    "history": [],
    "model": "qwen/qwen3.6-plus:free"
}

try:
    print("Wysy\u0142am proste zapytanie...")
    response = requests.post("http://127.0.0.1:8003/chat", json=simple_data, timeout=30)
    print(f"Status odpowiedzi: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("SUCCESS: Proste zapytanie zadzia\u0142a\u0142o")
        print(f"Odpowied\u017a: {result.get('content', 'Brak content')[:100]}...")
    else:
        print(f"B\u0142\u0105d prostego: {response.status_code}")
        print(f"Tre\u015b\u0107: {response.text[:300]}")
except Exception as e:
    print(f"B\u0141\u0104D prostego: {e}")
