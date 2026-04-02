# LexMind AI — Radca Prawny

![Version](https://img.shields.io/badge/version-4.1-blue)
![Status](https://img.shields.io/badge/status-online-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Web%20%7C%20Android-lightgrey)

**LexMind AI** to inteligentny asystent prawny oparty na sztucznej inteligencji, stworzony dla **Kancelarii Pałka & Kaźmierczak**. System wykorzystuje najnowsze modele językowe (LLM) oraz techniki RAG (Retrieval-Augmented Generation) do analizy i odpowiadania na pytania prawne na podstawie polskiego prawodawstwa.

> ⚠️ **Disclaimer**: Serwis ma charakter wyłącznie informacyjny. Wygenerowane treści nie stanowią porady prawnej.

---

## 📋 Spis Treści

1. [Funkcjonalności](#funkcjonalności)
2. [Architektura Systemu](#architektura-systemu)
3. [Wymagania](#wymagania)
4. [Instalacja i Uruchomienie](#instalacja-i-uruchomienie)
5. [Struktura Projektu](#struktura-projektu)
6. [API Endpoints](#api-endpoints)
7. [Konfiguracja](#konfiguracja)
8. [System RAG i Indeksowanie](#system-rag-i-indeksowanie)
9. [Modele AI](#modele-ai)
10. [Technologie](#technologie)
11. [Licencja](#licencja)

---

## ✨ Funkcjonalności

### 🎯 Główne Funkcje

- **Czaty z AI**: Rozmowa z wieloma modelami AI jednocześnie (Gemini, GPT-4o, Claude, Llama)
- **Konsensus Modeli**: Synteza odpowiedzi z wielu modeli AI dla najlepszej jakości
- **Wyszukiwanie Prawne**: System RAG do przeszukiwania bazy dokumentów prawnych
- **Kreator Pism**: Generowanie pism procesowych
- **Zarządzanie Sesjami**: Historia czatów z możliwością archiwizacji
- **Biblioteka Dokumentów**: Zarządzanie bazą wiedzy prawnej (PDF)
- **System Promptów**: Konfigurowalne prompty systemowe dla agenta AI

### 🛠️ Narzędzia AI (MCP)

- **Kalkulator**: Wykonywanie obliczeń matematycznych
- **Pogoda**: Sprawdzanie warunków pogodowych
- **Wyszukiwanie Kontekstowe**: Przeszukiwanie bazy dokumentów prawnych

---

## 🏗️ Architektura Systemu

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Chat UI   │  │  Knowledge  │  │  Prompts   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         └────────────────┼────────────────┘                    │
│                          │                                       │
│                    ┌─────▼─────┐                                │
│                    │ Supabase  │ (Authentication)              │
│                    └─────┬─────┘                                │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP/WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│                         BACKEND (FastAPI)                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    LangChain v1 Agents                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │    Gemini    │  │  GPT-4o Mini │  │   Claude    │ ...  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │  MCP Adapters    │  │   Vector Store   │                   │
│  │  (Tools)         │  │   (FAISS)       │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │    SQLite DB    │  │   PDF Storage   │                   │
│  │  (Messages)     │  │   (pdfs/)       │                   │
│  └──────────────────┘  └──────────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │  OpenRouter    │  │ Google AI      │  │  Supabase     │    │
│  │  (AI Models)   │  │ (Gemini)       │  │  (Auth/DB)    │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📦 Wymagania

### Wymagania Systemowe

- **Python**: 3.10+
- **Node.js**: 18+ (dla frontendu)
- **System Operacyjny**: Windows 10/11, Linux, macOS
- **Pamięć RAM**: Minimum 8GB (zalecane 16GB)
- **Dysk**: Minimum 5GB wolnego miejsca

### Klucze API (Wymagane)

- `OPENROUTER_API_KEY` — Dostęp do modeli AI (obowiązkowy)
- `GOOGLE_API_KEY` — Dostęp do Google Gemini (opcjonalny)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — Autentykacja użytkowników

---

## 🚀 Instalacja i Uruchomienie

### 1. Klonowanie Repozytorium

```bash
git clone https://github.com/golebiepalkamtm-ship-it/mecenas.git
cd mecenas
```

### 2. Konfiguracja Środowiska

Skopiuj plik `.env.example` do `.env` i uzupełnij klucze API:

```bash
copy .env.example .env
```

Przykładowa zawartość `.env`:

```env
# API Keys
OPENROUTER_API_KEY=your_openrouter_key_here
GOOGLE_API_KEY=your_google_key_here

# Supabase (Opcjonalnie - dla autentykacji)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_key

# Konfiguracja Systemu
SYSTEM_PROMPT=Jesteś polskim prawnikiem (Radcą AI) w Kancelarii Pałka & Kaźmierczak...
```

### 3. Instalacja Zależności Backend

```bash
# Tworzenie wirtualnego środowiska (opcjonalne)
python -m venv venv
venv\Scripts\activate  # Windows
# lub
source venv/bin/activate  # Linux/Mac

# Instalacja pakietów
pip install -r requirements.txt
```

### 4. Instalacja Zależności Frontend

```bash
cd frontend
npm install
```

### 5. Uruchomienie Aplikacji

#### Opcja A: Uruchomienie Pełnej Aplikacji

```bash
# W głównym katalogu
start.bat
```

#### Opcja B: Uruchomienie Backend (API) Oddzielnie

```bash
# Terminal 1 - Backend
python api.py
# lub
uvicorn api:app --host 0.0.0.0 --port 8001 --reload
```

#### Opcja C: Uruchomienie Frontend Oddzielnie

```bash
# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 6. Budowanie Indeksu Dokumentów

Przed pierwszym użyciem systemu RAG należy zbudować indeks dokumentów:

```bash
python build_index.py
```

---

## 📂 Struktura Projektu

```
moj prawnik/
├── api.py                     # Główny plik API (FastAPI)
├── main.py                    # Punkt wejścia aplikacji
├── database.py                # Moduł bazy danych SQLite
├── build_index.py             # Budowanie indeksu FAISS
├── seed_knowledge.py          # Seed bazy wiedzy
├── math_server.py            # Serwer MCP - Kalkulator
├── weather_server.py         # Serwer MCP - Pogoda
├── requirements.txt           # Zależności Python
├── .env.example              # Przykładowa konfiguracja
├── cache/                    # Cache i indeksy (wygenerowane)
├── pdfs/                     # Dokumenty prawne PDF
├── frontend/                  # Aplikacja React
│   ├── src/
│   │   ├── components/       # Komponenty React
│   │   │   ├── Chat/         # Komponent czatu
│   │   │   ├── Knowledge/   # Komponent biblioteki
│   │   │   ├── Prompts/     # Konfiguracja promptów
│   │   │   ├── Settings/    # Ustawienia
│   │   │   ├── Admin/       # Panel admina
│   │   │   ├── Auth/        # Autentykacja
│   │   │   ├── Drafter/     # Kreator pism
│   │   │   └── UI/          # Komponenty UI
│   │   ├── context/         # React Context
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Narzędzia
│   │   ├── App.tsx          # Główna aplikacja
│   │   └── main.tsx         # Punkt wejścia
│   ├── package.json         # Zależności npm
│   └── vite.config.ts       # Konfiguracja Vite
├── mobile_apps/             # Aplikacje mobilne
├── scripts/                 # Skrypty pomocnicze
└── sql_parts/               # Części SQL
```

---

## 🌐 API Endpoints

### Health & Status

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/health` | Status serwera i aktywni agenci |
| GET | `/models` | Lista dostępnych modeli AI |

### Chat

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/chat` | Wysłanie wiadomości do AI |
| POST | `/chat/compare` | Porównanie odpowiedzi wielu modeli |

### Dokumenty

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/documents` | Lista dokumentów PDF |
| POST | `/upload` | Przesłanie nowego dokumentu |
| DELETE | `/documents/{name}` | Usunięcie dokumentu |

### Sesje i Wiadomości

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/sessions` | Lista sesji czatu |
| DELETE | `/sessions/{id}` | Usunięcie sesji |
| GET | `/messages` | Pobranie wiadomości |
| DELETE | `/messages` | Wyczyszczenie wiadomości |

### Ustawienia

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/settings` | Pobranie kluczy API |
| POST | `/settings/api-key` | Aktualizacja klucza API |
| GET | `/settings/prompt` | Pobranie promptu systemowego |
| POST | `/settings/prompt` | Aktualizacja promptu systemowego |

---

## ⚙️ Konfiguracja

### Zmienne Środowiskowe

| Zmienna | Opis | Wymagane |
|---------|------|----------|
| `OPENROUTER_API_KEY` | Klucz OpenRouter | Tak |
| `GOOGLE_API_KEY` | Klucz Google AI | Nie |
| `SYSTEM_PROMPT` | Prompt systemowy AI | Nie |
| `SUPABASE_URL` | URL Supabase | Nie |
| `SUPABASE_ANON_KEY` | Klucz anon Supabase | Nie |

### Konfiguracja Modeli AI

Modele są zdefiniowane w słowniku `AVAILABLE_MODELS` w pliku `api.py`:

```python
AVAILABLE_MODELS = {
    "google/gemini-2.5-flash": {...},
    "openai/gpt-4o-mini": {...},
    "openai/gpt-4o": {...},
    "anthropic/claude-3.5-sonnet": {...},
    "meta-llama/llama-3.1-70b-instruct": {...},
}
```

### Konfiguracja MCP

Narzędzia MCP są konfigurowane w funkcji `_load_mcp_tools()`:

```python
mcp_config = {
    "math": {...},      # Kalkulator
    "weather": {...},   # Pogoda
    "docs-langchain": {...},
}
```

---

## 🔍 System RAG i Indeksowanie

### Proces Indeksowania

1. **Ekstrakcja tekstu** z plików PDF (`extract_chunks_from_pdfs()`)
2. **Dzielenie tekstu** na fragmenty (chunki) o rozmiarze 1500 znaków
3. **Generowanie embeddings** za pomocą modelu `sentence-transformers/all-MiniLM-L6-v2`
4. **Zapisanie do FAISS** w katalogu `cache/`

### Wyszukiwanie Kontekstowe

Funkcja `legal_research()`:
1. Generuje embedding dla zapytania użytkownika
2. Wysyła zapytanie do Supabase (zdalna baza) lub lokalnego FAISS
3. Zwraca najbardziej pasujące fragmenty dokumentów

### Katalogi

```python
PDF_DIR = Path("pdfs")           # Źródłowe dokumenty PDF
CACHE_DIR = Path("cache")       # Pliki cache
CHUNKS_PATH = CACHE_DIR / "all_chunks.pkl"  # Zagregowane fragmenty
FAISS_INDEX_PATH = CACHE_DIR / "faiss_index_store"  # Indeks wektorowy
```

---

## 🤖 Modele AI

### Domyślne Modele

| Model | Dostawca | Wielomodalny | Opis |
|-------|----------|--------------|------|
| Gemini 2.5 Flash | OpenRouter | ✅ | Szybki model Google |
| GPT-4o Mini | OpenRouter | ✅ | Kompaktowy OpenAI |
| GPT-4o | OpenRouter | ✅ | Najnowszy OpenAI |
| Claude 3.5 Sonnet | OpenRouter | ✅ | Anthropic |
| Llama 3.1 70B | OpenRouter | ❌ | Meta Open Source |

### Tryb Konsensusu

System może uruchomić wszystkie aktywne modele równolegle i syntetyzować ich odpowiedzi w jedną, najlepszą odpowiedź.

---

## 🛠️ Technologie

### Backend

| Technologia | Wersja | Opis |
|-------------|--------|------|
| FastAPI | ≥0.115.0 | Framework webowy |
| LangChain | ≥1.2.0 | Framework AI |
| LangGraph | ≥1.1.0 | Agent framework |
| FAISS | ≥1.9.0 | Wektorowa baza danych |
| Sentence-Transformers | ≥2.7.0 | Embeddings |
| PyMuPDF | ≥1.25.0 | Przetwarzanie PDF |
| SQLite3 | — | Lokalna baza danych |

### Frontend

| Technologia | Wersja | Opis |
|-------------|--------|------|
| React | 19.x | Biblioteka UI |
| TypeScript | 5.9.x | Typowanie |
| Vite | 8.x | Bundler |
| TailwindCSS | 4.x | Style |
| Framer Motion | 12.x | Animacje |
| Supabase | 2.x | Auth & Baza |

### Narzędzia Deweloperskie

| Narzędzie | Opis |
|-----------|------|
| PyInstaller | Build .exe |
| PyWebView | Desktop UI |
| Capacitor | Mobile apps |
| ESLint/Prettier | Linting |

---

## 📄 Licencja

Copyright © 2024-2026 Kancelaria Pałka & Kaźmierczak. Wszelkie prawa zastrzeżone.

---

## �️ Windows Desktop (Tauri) - szybkie uruchomienie

W katalogu głównym repozytorium dodano 2 skrypty:

- `desktop_build_run_windows.bat` - otwiera dwa okna: backend (FastAPI) + frontend desktop (Tauri dev)
- `desktop_compile_windows.bat` - buduje aplikację do instalatora Windows (nsis preset z `LexMaind AI`)

Przykład uruchomienia:

```bat
cd "C:\Users\Marcin_Palka\moj prawnik"
desktop_build_run_windows.bat
```

Aby zbudować instalator:

```bat
cd "C:\Users\Marcin_Palka\moj prawnik"
desktop_compile_windows.bat
```

> Upewnij się, że masz zainstalowane: Node.js, Rust, Visual Studio Build Tools oraz zależności Python (`.venv` + `requirements.txt`).

## �🔧 Rozwiązywanie Problemów

### Błąd: "Brak OPENROUTER_API_KEY"

Upewnij się, że klucz API jest ustawiony w pliku `.env`:

```bash
OPENROUTER_API_KEY=your_actual_key_here
```

### Błąd: "No chunks found"

Upewnij się, że katalog `pdfs/` zawiera pliki PDF:

```bash
dir pdfs
```

### Błąd: "Baza danych zablokowana"

Zamknij wszystkie inne instancje aplikacji lub usuń plik `cache/prawnik.db`.

### Resetowanie Aplikacji

```bash
# Usuń cache
rm -rf cache/

# Odbuduj indeks
python build_index.py
```

---

## 📞 Kontakt

**Kancelaria Pałka & Kaźmierczak**
- Email: biuro@kancelaria.pl
- WWW: https://kancelaria.pl

**LexMind AI** — Inteligentny System Prawny v4.1
