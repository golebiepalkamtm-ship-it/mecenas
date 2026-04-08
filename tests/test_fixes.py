import requests
import json

# Test FIX 1 & 2: Tylko user messages w historii
print("🧪 TEST 1: Prompt stacking prevention")
test_data = {
    "message": "Nowe pytanie po wielu odpowiedziach AI",
    "history": [
        {"role": "user", "content": "Pytanie 1"},
        {"role": "assistant", "content": "Odpowiedź 1 z halucynacjami"},
        {"role": "user", "content": "Pytanie 2"},
        {"role": "assistant", "content": "Odpowiedź 2 z błędami"},
        {"role": "user", "content": "Pytanie 3"},
        {"role": "assistant", "content": "Odpowiedź 3 z powtórzeniami"},
        {"role": "user", "content": "Pytanie 4"},
        {"role": "assistant", "content": "Odpowiedź 4 z semantycznym dryfem"},
        {"role": "user", "content": "Pytanie 5"},
        {"role": "assistant", "content": "Odpowiedź 5 z autoreferencją"}
    ],
    "model": "qwen/qwen3.6-plus:free"
}

try:
    print("Wysyłam zapytanie do API...")
    response = requests.post("http://127.0.0.1:8003/chat-consensus", json=test_data, timeout=120)
    print(f"Status odpowiedzi: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("API odpowiada poprawnie")
        print(f"Odpowiedź modelu: {result['content'][:100]}...")
        
        # Sprawdź czy odpowiedź nie zawiera odniesień do poprzednich odpowiedzi AI
        if "Odpowiedź 1" in result['content'] or "Odpowiedź 2" in result['content']:
            print("BŁĄD: Model odwołuje się do poprzednich odpowiedzi AI!")
        else:
            print("FIX 1 & 2: Model nie odwołuje się do poprzednich odpowiedzi AI")
    else:
        print(f"Błąd API: {response.status_code}")
        print(f"Treść błędu: {response.text[:500]}")
except requests.exceptions.Timeout:
    print("BŁĄD: Timeout - API nie odpowiedziało w wyznaczonym czasie (120s)")
except requests.exceptions.ConnectionError:
    print("BŁĄD: Błąd połączenia z API")
except Exception as e:
    print(f"BŁĄD: {e}")

print("\n" + "="*50 + "\n")

# Test FIX 3, 4, 5: Anti-loop protocol
print("🧪 TEST 2: Anti-loop protocol")
test_data_2 = {
    "message": "Podsumuj naszą rozmowę",
    "history": [
        {"role": "user", "content": "Czym jest prompt stacking?"},
        {"role": "assistant", "content": "Prompt stacking to zjawisko gdzie odpowiedzi AI kumulują się w kontekście."},
        {"role": "user", "content": "Jak go zapobiec?"},
        {"role": "assistant", "content": "Można go zapobiec przez filtrację historii i anti-loop protocols."}
    ],
    "model": "qwen/qwen3.6-plus:free"
}

try:
    print("Wysyłam zapytanie do API (test 2)...")
    response = requests.post("http://127.0.0.1:8003/chat-consensus", json=test_data_2, timeout=120)
    print(f"Status odpowiedzi: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("API odpowiada poprawnie")
        print(f"Odpowiedź modelu: {result['content'][:100]}...")
        
        # Sprawdź czy model podąża anti-loop protocol
        if "nie podsumowuję" in result['content'].lower() or "nie analizuję" in result['content'].lower():
            print("FIX 3, 4, 5: Model stosuje anti-loop protocol")
        else:
            print("FIX 3, 4, 5: Model może nie stosować anti-loop protocol")
    else:
        print(f"Błąd API: {response.status_code}")
        print(f"Treść błędu: {response.text[:500]}")
except requests.exceptions.Timeout:
    print("BŁĄD: Timeout - API nie odpowiedziało w wyznaczonym czasie (120s)")
except requests.exceptions.ConnectionError:
    print("BŁĄD: Błąd połączenia z API")
except Exception as e:
    print(f"BŁĄD: {e}")

print("\n🎯 Wszystkie testy zakończone!")
