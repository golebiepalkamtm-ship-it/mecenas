# Konfiguracja Środowiska - LexMind AI

**Status:** Etap 7 - Konfiguracja i Środowisko  
**Aktualizacja:** 2026-06-17

## Spis Treści

1. [Ogólnie](#ogólnie)
2. [Profile Instalacji](#profile-instalacji)
3. [Zmienne Środowiskowe](#zmienne-środowiskowe)
4. [Setup Instrukcje](#setup-instrukcje)
5. [Troubleshooting](#troubleshooting)
6. [Bezpieczeństwo](#bezpieczeństwo)

---

## Ogólnie

LexMind AI korzysta z **trzech typów zmiennych konfiguracyjnych**:

- **`LEXMIND_*`** → Konfiguracja aplikacji (Feature Flags, limity, preferencje)
- **`SUPABASE_*`** → Integracja z bazą danych
- **`OPENROUTER_*`** → Integracja z API modeli LLM
- **Inne** → Klucze dla integracji (Google, Cohere, itp.)

Backend ładuje zmienne z pliku `.env` (automatycznie przez `python-dotenv`).  
Frontend ładuje zmienne z pliku `.env` zaczynające się od `VITE_` (automatycznie przez Vite).

### Klasyfikacja

```
Backend (.env):
  LEXMIND_*           <- konfiguracja aplikacji
  SUPABASE_*          <- baza danych
  OPENROUTER_API_KEY  <- LLM API
  GOOGLE_API_KEY      <- integracja Google
  COHERE_API_KEY      <- integracja Cohere
  PYTEST_DEBUG        <- dev tools

Frontend (.env):
  VITE_API_URL                <- endpoint backendu
  VITE_SUPABASE_URL           <- URL Supabase
  VITE_SUPABASE_ANON_KEY      <- klucz publiczny
```

---

## Profile Instalacji

LexMind wspiera **trzy profile** zależności:

### 1. **CORE** (Minimalny setup)

Wymagany dla każdego deploymentu. Zawiera:

- LangChain + LangGraph (orkiestracja)
- FastAPI + Uvicorn (web framework)
- Pydantic (walidacja)
- FAISS + Sentence Transformers (embeddings)
- Dokumenty (PyPDF, Python-DOCX, Docling)
- HTTP klients (requests, httpx, aiohttp)

**Instalacja:**

```bash
pip install -r requirements-core.txt
```

**Zmienne wymagane (CORE):**

- `OPENROUTER_API_KEY` ← Klucz API OpenRouter

**Zmienne opcjonalne (CORE):**

- `SUPABASE_URL` ← URL Supabase
- `SUPABASE_ANON_KEY` ← Klucz publiczny
- `SUPABASE_SERVICE_ROLE_KEY` ← Klucz serwisowy (uwaga: bezpieczeństwo!)
- `GOOGLE_API_KEY` ← Google Gemini API
- `COHERE_API_KEY` ← Jeśli używasz Cohere do reranking
- Wiele `LEXMIND_*` feature flags

### 2. **OCR** (Core + Vision & Document Processing)

Dla deploymentów wymagających OCR i przetwarzania obrazów. Zawiera:

- Wszystko z CORE
- PyTorch (CPU by default)
- PaddleOCR (OCR silnik)
- Transformers (vision models)

**Instalacja:**

```bash
pip install -r requirements-core.txt -r requirements-ocr.txt
```

Jeśli masz GPU (CUDA):

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements-core.txt -r requirements-ocr.txt
```

### 3. **DEV** (OCR + Development & Testing)

Dla development i contributing. Zawiera:

- Wszystko z OCR
- pytest + pytest-asyncio
- Code quality tools (black, ruff, mypy, pylint)
- Debugging tools (ipdb, IPython, rich)
- Dokumentacja (Sphinx)

**Instalacja:**

```bash
pip install -r requirements-core.txt -r requirements-ocr.txt -r requirements-dev.txt
```

---

## Zmienne Środowiskowe

### Backend Variables

#### Konfiguracja Aplikacji (LEXMIND_*)

| Zmienna | Typ | Wymagana | Domyślna | Opis |
|---------|-----|----------|----------|------|
| `LEXMIND_DEFAULT_MODELS` | JSON list | ✗ | `["google/gemini-2.5-flash", "openai/gpt-4o-mini"]` | Lista domyślnych modeli |
| `LEXMIND_FEATURE_INVESTIGATION_V2` | bool | ✗ | `false` | Włącz Advanced Legal Investigation |
| `LEXMIND_FEATURE_INVESTIGATION_V2_AUTO` | bool | ✗ | `true` | Auto-trigger dla długich spraw |
| `LEXMIND_RERANK_PROVIDER` | str | ✗ | `heuristic` | `heuristic` lub `cohere` |
| `LEXMIND_FEATURE_CONTEXT_PACKER` | bool | ✗ | `true` | Kompresja kontekstu dla długich docs |
| `LEXMIND_DOCUMENT_CONTEXT_CHARS` | int | ✗ | `200000` | Max znaków kontekstu dokumentu |
| `LEXMIND_LLM_TIMEOUT_PRIMARY` | float | ✗ | `60.0` | Timeout głównych LLM (sek) |
| `LEXMIND_LLM_TIMEOUT_FALLBACK` | float | ✗ | `90.0` | Timeout fallback LLM (sek) |
| `LEXMIND_FEATURE_PIPELINE_TIMING` | bool | ✗ | `true` | Logowanie czasów etapów |

#### Integracja Bazy Danych (SUPABASE_*)

| Zmienna | Typ | Wymagana | Opis |
|---------|-----|----------|------|
| `SUPABASE_URL` | URL | ✗ | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | str | ✗ | Klucz publiczny (auth, queries) |
| `SUPABASE_SERVICE_ROLE_KEY` | str | ✗ | Klucz serwisowy (admin operations) |

**Bez Supabase:** Aplikacja działa w trybie lokalnym (SQLite).

#### Integracja OpenRouter

| Zmienna | Typ | Wymagana | Opis |
|---------|-----|----------|------|
| `OPENROUTER_API_KEY` | str | ✓ | Klucz API z https://openrouter.ai |

#### Integracje Trzecich Stron

| Zmienna | Typ | Wymagana | Opis |
|---------|-----|----------|------|
| `GOOGLE_API_KEY` | str | ✗ | Google Gemini API key |
| `COHERE_API_KEY` | str | ✗ | Wymagana jeśli `LEXMIND_RERANK_PROVIDER=cohere` |

#### Development

| Zmienna | Typ | Wymagana | Opis |
|---------|-----|----------|------|
| `PYTEST_DEBUG` | bool | ✗ | Włącz debug w testach |
| `PADDLEOCR_ENABLED` | bool | ✗ | Włącz PaddleOCR |

### Frontend Variables

Frontend ładuje zmienne z `.env` z prefixem `VITE_`:

| Zmienna | Domyślna | Opis |
|---------|----------|------|
| `VITE_API_URL` | `http://127.0.0.1:8003` | Endpoint backendu |
| `VITE_SUPABASE_URL` | — | URL Supabase (dla auth na kliencie) |
| `VITE_SUPABASE_ANON_KEY` | — | Klucz publiczny Supabase |

---

## Setup Instrukcje

### 1. Inicjalizacja Projektu

```bash
# Klonuj repo
git clone <repo-url>
cd "moj prawnik"

# Stwórz Python venv
python -m venv .venv

# Aktywuj venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate
```

### 2. Kopia `.env`

```bash
# Przywołaj .env.example
cp .env.example .env

# Edytuj .env — dodaj wymagane klucze
# Minimalna konfiguracja:
# OPENROUTER_API_KEY=sk-...
```

### 3. Backend Setup — CORE

```bash
# Zainstaluj zależności
pip install -r requirements-core.txt

# Waliduj konfigurację (opcjonalnie)
python -c "from services.config_validator import ConfigValidator; ConfigValidator.print_quick_reference()"

# Startuj API
python api.py
# Lub:
uvicorn api:app --host 127.0.0.1 --port 8003
```

Przy starcie backend automatycznie waliduje `.env` i wyświetla błędy/ostrzeżenia.

### 4. Backend Setup — OCR

```bash
# Zainstaluj core + OCR
pip install -r requirements-core.txt -r requirements-ocr.txt

# Startuj API (jak wyżej)
python api.py
```

### 5. Backend Setup — DEV

```bash
# Zainstaluj wszystko
pip install -r requirements-core.txt -r requirements-ocr.txt -r requirements-dev.txt

# Uruchom testy
pytest tests/ -v

# Uruchom API z debug
python api.py
```

### 6. Frontend Setup

```bash
cd frontend

# Zainstaluj zależności
npm install

# Stwórz .env (copy .env.example)
cp .env.example .env
# Edytuj .env jeśli trzeba zmienić API_URL

# Dev server
npm run dev

# Build
npm run build
```

---

## Troubleshooting

### Problem: `MISSING REQUIRED: OPENROUTER_API_KEY`

**Powód:** Nie ustawisz klucza API OpenRouter.

**Rozwiązanie:**

1. Przejdź na https://openrouter.ai/keys
2. Skopiuj klucz API
3. W `.env`:
   ```
   OPENROUTER_API_KEY=sk-or-...
   ```

### Problem: `NO CLOUD DATABASE: Supabase not fully configured`

**Powód:** Brak zmiennych Supabase. To jest **ostrzeżenie, nie błąd** — aplikacja działa lokalnie.

**Jeśli chcesz włączyć Supabase:**

1. Przejdź na https://supabase.com/dashboard
2. Stwórz projekt
3. Przejdź do Settings → API
4. Skopiuj URL i public anon key
5. W `.env`:
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   ```

### Problem: `MISSING DEPENDENCY: COHERE_API_KEY`

**Powód:** Ustawiłeś `LEXMIND_RERANK_PROVIDER=cohere` ale brakuje klucza.

**Rozwiązanie:**

- **Opcja A:** Dodaj `COHERE_API_KEY` w `.env`
- **Opcja B:** Zmień na domyślny: `LEXMIND_RERANK_PROVIDER=heuristic`

### Problem: `ImportError: No module named 'paddleocr'`

**Powód:** Nie zainstalowałeś profilu OCR.

**Rozwiązanie:**

```bash
pip install -r requirements-ocr.txt
```

### Problem: `SECURITY WARNING: SUPABASE_SERVICE_ROLE_KEY in .env`

**Powód:** Ustawiłeś SERVICE_ROLE_KEY w `.env`. To niebezpieczne!

**Rozwiązanie:**

- Nigdy nie commituj `.env` do git (sprawdź `.gitignore`)
- Dla production: użyj secret managera (GitHub Secrets, AWS Secrets Manager, itp.)
- Dla local dev: OK, ale pilnuj `.gitignore`

---

## Bezpieczeństwo

### Best Practices

1. **Nigdy nie commituj `.env`** — sprawdzaj `.gitignore`:

   ```
   .env
   .env.local
   .env.*.local
   ```

2. **Separate klucze publiczne/prywatne:**

   - `SUPABASE_ANON_KEY` (publiczny, można commitować)
   - `SUPABASE_SERVICE_ROLE_KEY` (prywatny, NIGDY nie commituj)
   - `OPENROUTER_API_KEY` (prywatny, NIGDY nie commituj)

3. **Dla production:**

   - Używaj secret managera (GitHub Actions, Docker secrets, etc.)
   - Nigdy nie hardcoduj kluczy w kodzie
   - Rotuj klucze regularnie
   - Monitoruj użycie API

4. **Dla local dev:**

   - Załaduj `.env` z `.env.example`
   - Dodaj swoje klucze lokalnie
   - Czasami `git check-ignore .env` aby potwierdzić, że .env jest ignored

### Walidacja przy Starcie

Backend automatycznie waliduje `.env` przy starcie:

```
================================================
CONFIG VALIDATION REPORT (profile: core)
================================================

✓ All configuration valid!

================================================
```

Jeśli są błędy, aplikacja **nie startuje**:

```
❌ ERRORS (1):

1. MISSING REQUIRED: OPENROUTER_API_KEY
  Description: Klucz API OpenRouter (https://openrouter.ai)
  Profile: core

================================================
```

---

## Zaawansowane

### Walidacja Konfiguracji (Python)

```python
from services.config_validator import ConfigValidator, validate_on_startup

# Waliduj przy starcie (blokuje jeśli błędy)
validate_on_startup(profile="core", exit_on_error=True)

# Lub ręczna walidacja
validator = ConfigValidator(profile="core")
is_valid, errors, warnings = validator.validate_all()
validator.print_report(verbose=True)
```

### Dodawanie Nowych Zmiennych

Edytuj `services/config_validator.py` w sekcji `ENVIRONMENT_SCHEMA`:

```python
ENVIRONMENT_SCHEMA = {
    "MOJA_NOWA_ZMIENNA": {
        "profile": "core",          # lub "ocr", "dev"
        "type": "str",              # lub "int", "bool", "float", "url", "json_list"
        "required": False,
        "default": "wartość",
        "description": "Opis...",
        "allowed_values": ["a", "b"],  # opcjonalnie
    },
    ...
}
```

Następnie dodaj zmienną w `.env` lub `.env.example`.

### Monitorowanie w Production

```python
# Loguj stany konfiguracji
from services.config_validator import ConfigValidator

validator = ConfigValidator(profile="core")
is_valid, errors, warnings = validator.validate_all()

if warnings:
    logger.warning(f"Config warnings: {warnings}")
    
if not is_valid:
    logger.error(f"Config errors: {errors}")
    raise SystemExit(1)
```

---

## Referencja

- `.env.example` — Przykładowa konfiguracja
- `config.py` — Główna konfiguracja aplikacji (LEXMIND_*)
- `moa/config.py` — Konfiguracja OpenRouter
- `frontend/.env.example` — Frontend config
- `requirements-*.txt` — Profile zależności

---

## FAQ

### P: Czy mogę uruchomić LexMind bez Supabase?

**O:** Tak! Aplikacja będzie używać lokalnego SQLite. Braknie będzie synchronizacji cloud, ale dla local dev wystarczy.

### P: Jak zmienić timeout LLM?

**O:** Edytuj `.env`:

```
LEXMIND_LLM_TIMEOUT_PRIMARY=120.0
LEXMIND_LLM_TIMEOUT_FALLBACK=180.0
```

### P: Jak włączyć Advanced Investigation?

**O:**

```
LEXMIND_FEATURE_INVESTIGATION_V2=true
OPENROUTER_API_KEY=sk-or-...  # Wymagane!
```

### P: Gdzie zmienić domyślne modele?

**O:** Edytuj `.env`:

```
LEXMIND_DEFAULT_MODELS=["openai/gpt-4o", "deepseek/deepseek-r1"]
```

---

**Pytania? Sprawdzaj:** `services/config_validator.py` lub otwórz issue na GitHub.
