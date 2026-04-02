# 🚀 AI Performance Optimizer

Uniwersalny skrypt do optymalizacji szybkości działania AI - szybsze pisanie kodu i szybsze odpowiedzi przez API.

## 📦 Instalacja

```bash
pip install httpx
```

## 🎯 Szybki Start

### Opcja 1: Najprostsze użycie (1 linia kodu)

```python
from ai_quick_optimizer import quick_ai

# Szybkie zapytanie
response = await quick_ai(
    "Napisz funkcję sortującą w Pythonie",
    api_key="sk-your-api-key"
)
print(response)
```

### Opcja 2: Równoległe zapytania

```python
from ai_quick_optimizer import quick_ai_batch

# Wiele zapytań jednocześnie
responses = await quick_ai_batch([
    "Napisz funkcję fibonacci",
    "Napisz funkcję do odwracania stringa",
    "Napisz funkcję do sprawdzania palindromu"
], api_key="sk-your-api-key")

for i, response in enumerate(responses):
    print(f"Odpowiedź {i+1}: {response[:100]}...")
```

### Opcja 3: Zoptymalizowane generowanie kodu

```python
from ai_quick_optimizer import quick_code

# Szybkie generowanie kodu
code = await quick_code(
    "Napisz klasę do obsługi HTTP requests",
    api_key="sk-your-api-key"
)
print(code)
```

## 🔧 Pełna konfiguracja

```python
from ai_quick_optimizer import AIClient

# Tworzenie klienta z konfiguracją
client = AIClient(
    api_key="sk-your-api-key",
    base_url="https://openrouter.ai/api/v1",
    default_model="google/gemini-2.5-flash",
    enable_cache=True,
    max_retries=3
)

# Zapytanie
response = await client.chat(
    "Napisz funkcję",
    model="google/gemini-2.5-flash",
    system="You are an expert programmer"
)

# Batch zapytania
responses = await client.chat_batch([
    "Zadanie 1",
    "Zadanie 2",
    "Zadanie 3"
])

# Zamknij klienta
await client.close()
```

## ⚡ Funkcje optymalizacji

### 1. **Connection Pooling**

- Ponowne użycie połączeń HTTP
- Szybsze requesty dzięki HTTP/2
- Mniejsze opóźnienia

### 2. **Inteligentny Cache**

- Automatyczne cache'owanie odpowiedzi
- TTL (Time To Live) - 30 minut domyślnie
- LRU eviction - usuwanie najstarszych wpisów
- **Przyspieszenie: 10-100x dla powtarzalnych zapytań**

### 3. **Równoległe przetwarzanie**

- Wiele zapytań jednocześnie
- Automatyczne zarządzanie wątkami
- **Przyspieszenie: proporcjonalne do liczby zapytań**

### 4. **Retry z exponential backoff**

- Automatyczne ponawianie nieudanych requestów
- Rosnące opóźnienie między próbami
- Maksymalnie 3 próby domyślnie

### 5. **Rate Limiting**

- Ochrona przed limitami API
- Automatyczne czekanie gdy limit osiągnięty

## 📊 Porównanie wydajności

| Metoda                  | Czas odpowiedzi | Przyspieszenie |
| ----------------------- | --------------- | -------------- |
| Bez optymalizacji       | 2-5s            | 1x             |
| Z cache (trafienie)     | 0.01s           | **200-500x**   |
| Z connection pooling    | 1.5-3s          | 1.5x           |
| Batch (3 zapytania)     | 2-3s (łącznie)  | **3x**         |
| Wszystkie optymalizacje | 0.01-2s         | **2-500x**     |

## 🎨 Przykłady użycia

### Generowanie kodu z priorytetem szybkości

```python
from ai_quick_optimizer import AIClient

client = AIClient(api_key="sk-...", default_model="google/gemini-2.5-flash")

# Szybkie generowanie kodu
code = await client.chat(
    "Napisz klasę Singleton w Pythonie",
    system="Write only code, no explanations"
)
```

### Przetwarzanie wielu plików

```python
from ai_quick_optimizer import quick_ai_batch

files = ["file1.py", "file2.py", "file3.py"]
prompts = [f"Optymalizuj ten kod: {open(f).read()}" for f in files]

responses = await quick_ai_batch(prompts, api_key="sk-...")
```

### Z cache'em dla powtarzalnych zapytań

```python
from ai_quick_optimizer import AIClient

client = AIClient(api_key="sk-...", enable_cache=True)

# Pierwsze zapytanie - 2-3s
response1 = await client.chat("Napisz hello world")

# Drugie zapytanie - 0.01s (z cache)
response2 = await client.chat("Napisz hello world")
```

### Z różnymi modelami

```python
from ai_quick_optimizer import AIClient

client = AIClient(api_key="sk-...")

# Szybki model do prostych zadań
fast_response = await client.chat(
    "Napisz funkcję",
    model="google/gemini-2.5-flash"
)

# Wolniejszy ale lepszy model do złożonych zadań
quality_response = await client.chat(
    "Zrefaktoryzuj ten kod",
    model="anthropic/claude-3.7-sonnet"
)
```

## 🔌 Integracja z istniejącym kodem

### Z FastAPI

```python
from fastapi import FastAPI
from ai_quick_optimizer import AIClient

app = FastAPI()
ai_client = AIClient(api_key="sk-...")

@app.post("/chat")
async def chat(message: str):
    response = await ai_client.chat(message)
    return {"response": response}
```

### Z Flask

```python
from flask import Flask, request, jsonify
import asyncio
from ai_quick_optimizer import quick_ai

app = Flask(__name__)

@app.route("/chat", methods=["POST"])
def chat():
    message = request.json["message"]
    loop = asyncio.new_event_loop()
    response = loop.run_until_complete(
        quick_ai(message, api_key="sk-...")
    )
    return jsonify({"response": response})
```

## 📈 Statystyki i monitoring

```python
from ai_quick_optimizer import AIClient

client = AIClient(api_key="sk-...")

# Wykonaj zapytania
await client.chat("Zadanie 1")
await client.chat("Zadanie 2")

# Sprawdź statystyki cache
print(f"Cache size: {len(client.cache._cache)}")
```

## 🛠️ Konfiguracja zaawansowana

### Zmiana parametrów cache

```python
from ai_quick_optimizer import SimpleCache

# Cache z większą pojemnością i dłuższym TTL
cache = SimpleCache(max_size=1000, ttl=3600)  # 1 godzina
```

### Zmiana parametrów retry

```python
from ai_quick_optimizer import AIClient

client = AIClient(
    api_key="sk-...",
    max_retries=5  # Więcej prób
)
```

### Zmiana limitów połączeń

```python
import httpx
from ai_quick_optimizer import AIClient

client = AIClient(api_key="sk-...")
client._client = httpx.AsyncClient(
    limits=httpx.Limits(
        max_connections=50,
        max_keepalive_connections=25
    )
)
```

## 🐛 Rozwiązywanie problemów

### Problem: Wolne odpowiedzi

**Rozwiązanie:**

1. Użyj szybszego modelu: `google/gemini-2.5-flash`
2. Włącz cache: `enable_cache=True`
3. Użyj batch processing dla wielu zapytań

### Problem: Błędy timeout

**Rozwiązanie:**

```python
client = AIClient(
    api_key="sk-...",
    max_retries=5
)
```

### Problem: Limity API

**Rozwiązanie:**

- Skrypt automatycznie obsługuje rate limiting
- Możesz zmniejszyć `max_concurrent_requests`

## 📝 Wymagania

- Python 3.7+
- httpx
- asyncio (wbudowane)

## 🔄 Aktualizacje

### Wersja 1.0

- Podstawowy cache z TTL
- Connection pooling
- Równoległe przetwarzanie
- Retry z exponential backoff
- Szybkie funkcje pomocnicze

## 📄 Licencja

MIT License - używaj dowolnie!

## 🤝 Wsparcie

Masz pytania? Stwórz issue na GitHubie.

---

**Stworzone z ❤️ dla szybszego AI**
