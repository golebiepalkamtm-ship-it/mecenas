# 📋 Dokumentacja Projektu LexMind AI — Analiza Plików

> **Wersja:** 1.0 | **Data:** 2026-04-02  
> **Cel:** Analiza każdego pliku, status projektu, możliwe udoskonalenia

---

## 🗂️ SPIS TREŚCI

1. [Analiza plików backendu](#1-backend)
2. [Analiza modułu MOA](#2-moa)
3. [Analiza plików frontendu](#3-frontend)
4. [Pliki konfiguracyjne i pomocnicze](#4-konfiguracja)
5. [Status projektu — co zostało do ukończenia](#5-status)
6. [Możliwe udoskonalenia](#6-udoskonalenia)

---

## 1. BACKEND

### 1.1 `api.py` — Główny serwer FastAPI (710 linii)

**Rola:** Unified Backend API — jedyny punkt wejścia dla całego frontendu.

**Endpointy:**

| Endpoint | Metoda | Status | Opis |
|----------|--------|--------|------|
| `/models/all` | GET | ✅ | Pobiera modele z OpenRouter (z fallbackiem do config) |
| `/models/presets` | GET | ✅ | Zwraca predefiniowane zespoły modeli |
| `/models/admin` | GET | ✅ | Modele dla panelu admina |
| `/sessions` | GET | ✅ | Lista sesji z SQLite |
| `/sessions/{id}/messages` | GET | ✅ | Wiadomości sesji |
| `/sessions/{id}` | DELETE | ✅ | Usuwanie sesji |
| `/chat` | POST | ✅ | Single Model Chat z RAG i wizją |
| `/chat-consensus` | POST | ✅ | MOA Consensus Chat |
| `/draft-document` | POST | ✅ | Generator pism procesowych |
| `/upload-document` | POST | ✅ | Upload pliku + ekstrakcja tekstu |
| `/upload-base64-document` | POST | ✅ | Upload base64 (z frontendu) |
| `/analyze-document` | POST | ✅ | Analiza dokumentu z RAG |

**Zalety:**
- Czysta architektura — oddzielone modele Pydantic, helpery, endpointy
- Intent classification przed RAG (oszczędność kosztów)
- Hierarchiczne budowanie promptów (Architect → Role → Task → Analyst)
- Obsługa załączników (obrazy Vision + pliki tekstowe)
- CORS skonfigurowany dla localhost:3000, 5173, 8003
- Pre-loading modeli Surya w lifespan

**Problemy / Uwagi:**
- ⚠️ `get_async_client()` jest zdefiniowany podwójnie (także w `moa/config.py`) — redundancja
- ⚠️ Brak rate limiting na endpointach
- ⚠️ Brak walidacji długości `message` (można wysłać bardzo długi tekst)
- ⚠️ Endpoint `/draft-document` nie zapisuje odpowiedzi do bazy danych
- ⚠️ Brak endpointu do zarządzania ustawieniami (get/set system_prompt)

---

### 1.2 `database.py` — Lokalna baza SQLite (146 linii)

**Rola:** CRUD dla sesji, wiadomości i ustawień.

**Schemat:**
```sql
sessions (id, title, updated_at)
messages (id, session_id, role, content, sources, timestamp) -- FK → sessions
settings (key, value)
```

**Zalety:**
- Context manager z `PRAGMA foreign_keys = ON`
- Auto-tworzenie sesji przy zapisie wiadomości
- Automatyczne generowanie tytułu z treści pierwszej wiadomości
- Kaskadowe usuwanie (DELETE session → DELETE messages)

**Problemy / Uwagi:**
- ⚠️ SQLite nie obsługuje równoległych zapisów (możliwe locki przy dużym ruchu)
- ⚠️ Brak indeksów na `messages.session_id` i `messages.timestamp`
- ⚠️ Brak migracji schematu (ALTER TABLE) — zmiana struktury wymaga ręcznej ingerencji
- ⚠️ `sources` przechowywane jako CSV string — lepiej jako JSON lub osobna tabela
- ⚠️ Brak funkcji do eksportu/importu sesji

---

### 1.3 `document_processor.py` — Ekstrakcja tekstu (259 linii)

**Rola:** Przetwarzanie PDF, DOCX, TXT, obrazów z OCR (Surya + EasyOCR).

**Funkcje:**
- `extract_text_from_pdf()` — PyPDF2 + auto-OCR dla skanów (PyMuPDF → Surya/EasyOCR)
- `extract_text_from_docx()` — python-docx
- `extract_text_from_txt()` — UTF-8 z fallbackiem na Latin-1
- `extract_text_from_pil_image()` — Surya (preferowane) → EasyOCR (fallback)
- `process_document()` — router formatów
- `process_base64_document()` — dekodowanie base64 + process_document

**Zalety:**
- Dwustopniowy OCR: Surya (lepszy) → EasyOCR (fallback)
- Auto-detekcja skanów PDF (brak warstwy tekstowej → OCR)
- Lazy loading modeli Surya (singleton)
- 2x zoom dla lepszego OCR w PDF

**Problemy / Uwagi:**
- ⚠️ Brak obsługi `.doc` (Word 97-2003) — celowe, ale użytkownik powinien wiedzieć
- ⚠️ Brak obsługi XLSX, ODT, RTF
- ⚠️ Brak limitu rozmiaru pliku — możliwy DoS przez bardzo duży upload
- ⚠️ EasyOCR reader tworzony globalnie (singleton) — może zużywać pamięć
- ⚠️ Brak obsługi skanów wielostronicowych z różnymi orientacjami

---

## 2. MOA (Mixture of Agents)

### 2.1 `moa/__init__.py` (13 linii)

**Rola:** Eksport publicznego API modułu MOA.

**Zawartość:** Eksportuje `run_moa_pipeline`, `MOAResult`, `MOARequest`.

**Uwagi:** ✅ Czysty, minimalistyczny — brak uwag.

---

### 2.2 `moa/config.py` — Konfiguracja centralna (194 linie)

**Rola:** Wszystkie stałe i konfiguracja w jednym miejscu.

**Kluczowe parametry:**

| Parametr | Wartość | Opis |
|----------|---------|------|
| `LLM_TEMPERATURE` | 0.1 | Niska = mniej halucynacji |
| `LLM_TIMEOUT` | 120s | Timeout pojedynczego LLM |
| `GLOBAL_MOA_TIMEOUT` | 135s | Twardy limit całego MOA |
| `MAX_RETRIES` | 3 | Retry na błędy |
| `DEFAULT_MATCH_THRESHOLD` | 0.05 | Próg podobieństwa wektorowego |
| `DEFAULT_MATCH_COUNT` | 12 | Fragmentów do pobrania |
| `MAX_CONTEXT_CHARS` | 48 000 | Limit kontekstu (~12k tokenów) |

**Zalety:**
- Centralizacja konfiguracji — single source of truth
- Sanity check na klucze API przy starcie
- Dynamiczne ładowanie modeli z `models_config.json`
- Factory `get_async_client()` dla OpenAI/OpenRouter

**Problemy / Uwagi:**
- ⚠️ `get_async_client()` zdefiniowany podwójnie (także w `api.py`) — **NAPRAWIONO: usunięto z api.py, teraz importuje z config**
- ⚠️ `OPENROUTER_API_KEY` ładowany z `.env` ale sprawdzany tylko jako string — brak walidacji formatu
- ⚠️ `EMBEDDING_MODEL = "text-embedding-3-small"` — może nie działać przez OpenRouter (tylko OpenAI direct)

---

### 2.3 `moa/intent.py` — Klasyfikator intencji (154 linie)

**Rola:** Dwustopniowa klasyfikacja zapytań: reguły → LLM fallback.

**Strategia:**
1. **Reguły (zero koszt):** Regex na powitania i small-talk
2. **LLM (tani model):** `gpt-4o-mini` dla niejednoznacznych przypadków

**Typy intencji:**
- `GREETING` — powitania, pożegnania
- `SMALL_TALK` — luźna rozmowa, test
- `LEGAL_QUERY` — zapytania prawne (trigger RAG + MOA)

**Zalety:**
- Oszczędność kosztów — unika RAG/MOA dla powitań
- Szybki fallback do LLM (~200ms)
- Bezpieczny domyślny wynik: `LEGAL_QUERY` (w razie błędu — lepiej za dużo niż za mało)

**Problemy / Uwagi:**
- ⚠️ Regex `^.{0,5}$` łapie WSZYSTKIE krótkie wiadomości — np. "Art. 5" zostanie potraktowane jako small-talk
- ⚠️ Brak klasyfikacji dokumentów (upload → nie jest to small-talk)
- ⚠️ LLM klasyfikator tworzy nowego klienta za każdym razem — brak connection pooling

---

### 2.4 `moa/retrieval.py` — Hybrydowy RAG (242 linie)

**Rola:** 3-źródłowy retrieval: Keywords + Vector (Supabase) + SAOS.

**Pipeline:**
1. **SAOS** (równolegle) — orzeczenia sądowe
2. **Keyword Extraction** — regex "Art. XXX" + skróty kodeksów
3. **Vector Search** — OpenAI embeddings → Supabase RPC `match_knowledge`
4. **Deduplikacja** — hash pierwszych 200 znaków
5. **Kontrola długości** — max 48k znaków

**Zalety:**
- Hybrydowe wyszukiwanie = lepsza precyzja + recall
- Równoległe wykonywanie SAOS z Vector Search
- Keyword extraction z priorytetem 0.95 (najwyższy)
- Deduplikacja zapobiega powtórzeniom

**Problemy / Uwagi:**
- ⚠️ `OPENROUTER_EMBEDDINGS_URL` — OpenRouter może nie wspierać embeddingów (tylko OpenAI direct)
- ⚠️ Brak cache'owania embeddingów — każde zapytanie generuje nowy wektor
- ⚠️ Keyword extraction łapie tylko "Art. XXX" — brak "§", "ust.", "pkt"
- ⚠️ SAOS zwraca stałą similarity=0.9 — brak rzeczywistego scoringu
- ⚠️ Brak re-rankingu wyników (np. cross-encoder)

---

### 2.5 `moa/llm_agents.py` — Równoległa analiza (338 linii)

**Rola:** Wywołanie N modeli RÓWNOLEGLE z retry i timeout.

**Funkcjonalność:**
- `run_parallel_analysis()` — asyncio.gather() z globalnym timeoutem
- `_call_with_retry()` — exponential backoff z jitter
- `_analyze_single()` — wrapper na pojedynczy model
- Connection pooling (jeden klient HTTP dla wszystkich modeli)

**Zalety:**
- Partial results — jeśli 1 model nie odpowie, kontynuuj z pozostałymi
- Globalny timeout (135s) — nie czekaj w nieskończoność
- Exponential backoff z jitter — unika thundering herd
- Hierarchiczne budowanie promptów

**Problemy / Uwagi:**
- ⚠️ `ANALYST_SYSTEM_PROMPT` jest zduplikowany w `api.py` (jako import) — OK, ale warto udokumentować
- ⚠️ Brak metryk (ile retry, jaki czas odpowiedzi per model)
- ⚠️ Brak circuit breakera — jeśli model zawsze failuje, nadal próbujemy

---

### 2.6 `moa/synthesizer.py` — Sędzia-agregator (145 linii)

**Rola:** Krytyczna synteza analiz od wielu ekspertów.

**Funkcjonalność:**
- Re-ranking wyników ekspertów
- Audyt cytowań (anti-hallucynacja)
- Rozstrzyganie sprzeczności między ekspertami
- Minimalizacja ryzyka (bezpieczna ścieżka)

**Zalety:**
- JUDGE_SYSTEM_PROMPT jest bardzo szczegółowy i rygorystyczny
- Filtrowanie nieudanych analiz przed syntezą
- Struktura odpowiedzi: Triage → Analiza → Audyt → Rekomendacja

**Problemy / Uwagi:**
- ⚠️ Sędzia korzysta z tego samego modelu co analityk A (Claude 3.5 Sonnet) — brak różnorodności
- ⚠️ Brak walidacji, czy sędzia rzeczywiście zweryfikował źródła (trust-based)
- ⚠️ Brak mechanizmu odwoławczego (jeśli sędzia się myli)

---

### 2.7 `moa/saos.py` — Integracja SAOS (75 linii)

**Rola:** Wyszukiwanie orzeczeń sądowych z publicznego API SAOS.

**Zalety:**
- Prosty, czytelny kod
- Mapowanie na `RetrievedChunk` (kompatybilność z RAG)
- Timeout 15s na zapytanie

**Problemy / Uwagi:**
- ⚠️ SAOS zwraca stałą similarity=0.9 — nie odzwierciedla rzeczywistej relevancji
- ⚠️ Brak cache'owania wyników (to samo zapytanie → nowe HTTP request)
- ⚠️ Brak obsługi błędów SAOS (API może być niedostępne)
- ⚠️ `textContent` może być w HTML — brak czyszczenia tagów

---

### 2.8 `moa/prompts.py` — Hierarchia promptów (93 linie)

**Rola:** Definicja MASTER_PROMPT, SYSTEM_ROLES, TASK_PROMPTS.

**Struktura:**
- **MASTER_PROMPT** — nadrzędna logika (Data Sovereignty, Persona Adaptation, Verification Layer, Safety Buffer)
- **SYSTEM_ROLES** — 5 osobowości (Navigator, Inquisitor, Draftsman, Oracle, Grandmaster)
- **TASK_PROMPTS** — 5 metodologii (General, Analysis, Drafting, Research, Strategy)

**Zalety:**
- Czysta separacja warstw promptów
- Każda rola ma unikalną osobowość i specjalizację
- TASK_PROMPTS mają konkretne kroki metodologiczne

**Problemy / Uwagi:**
- ⚠️ Brak możliwości definiowania customowych ról zadań przez użytkownika (tylko z poziomu kodu)
- ⚠️ Prompty są statyczne — brak dynamicznego dostosowania do kontekstu

---

### 2.9 `moa/models.py` — Typy danych (76 linii)

**Rola:** Dataclass-y dla wejścia/wyjścia pipeline'u MOA.

**Klasy:**
- `MOARequest` — żądanie do pipeline'u
- `RetrievedChunk` — fragment z bazy wiedzy
- `AnalystResult` — odpowiedź jednego analityka
- `MOAResult` — końcowy wynik pipeline'u

**Uwagi:** ✅ Czyste dataclassy — brak uwag.

---

### 2.10 `moa/models_config.json` — Konfiguracja modeli (93 linie)

**Rola:** Centralna konfiguracja dostępnych modeli i presetów.

**Modele:** 7 modeli (Claude 3.5 Sonnet, GPT-4o, Gemini 2.0 Flash, Gemini Flash Thinking, Llama 3.1 405B, DeepSeek v3, GPT-4o Mini)

**Presety:**
- **Precyzja** — Claude + GPT-4o + Gemini Flash (judge: Claude)
- **Ekonomiczny** — GPT-4o Mini + Gemini Flash + Llama 70B (judge: GPT-4o Mini)
- **Maksymalny** — 5 modeli (judge: Claude)

**Uwagi:** ✅ Dobrze zbalansowane presety — brak uwag.

---

## 3. FRONTEND

### 3.1 `frontend/src/App.tsx` — Główny komponent (718 linii)

**Rola:** Shell aplikacji — sidebar, routing, auth guard.

**Widoki:**
- `chat` — Konsultacja AI
- `knowledge` — Baza Wiedzy
- `drafter` — Kreator Pism
- `documents` — Dokumenty
- `settings` — Profil
- `admin` — Panel Admina (tylko dla roli admin)

**Zalety:**
- Piękny UI z Framer Motion (animacje, glassmorphism)
- Sidebar z collapsible navigation
- Auth guard z Supabase
- Role-based access (admin panel)

**Problemy / Uwagi:**
- ⚠️ Bardzo duży plik (718 linii) — warto wydzielić `Sidebar`, `TopBar`, `NavItem` do osobnych komponentów
- ⚠️ `useOrchestratorSync()` — nieczytelne, co robi
- ⚠️ Brak lazy loading widoków (wszystkie ładowane na start)

---

### 3.2 `frontend/src/hooks/useChatMutation.ts` — API mutation (89 linii)

**Rola:** React Query mutation do `/chat` i `/chat-consensus`.

**Zalety:**
- Automatyczne przełączanie endpointu na podstawie trybu
- Przekazywanie wszystkich parametrów (task, models, architect_prompt, system_role)
- Error handling z detail message

**Problemy / Uwagi:**
- ⚠️ Brak retry logic (tylko React Query default)
- ⚠️ Brak timeout handling (backend ma 120s, ale frontend nie ma timeoutu)
- ⚠️ Hardcoded `API_BASE` — powinno być z config

---

### 3.3 `frontend/src/config.ts` — Konfiguracja (3 linie)

**Rola:** Bazowe zmienne konfiguracyjne.

**Zalety:** ✅ Minimalistyczny — `API_BASE`, `OPENROUTER_REFERER`, `APP_TITLE`.

**Uwagi:** ⚠️ Brak innych zmiennych (np. timeout, retry count).

---

### 3.4 `frontend/src/context/ChatContext.tsx` (12 linii)

**Rola:** Provider kontekstu czatu.

**Uwagi:** ✅ Czysty wrapper — brak uwag.

---

## 4. KONFIGURACJA

### 4.1 `requirements.txt` — Zależności Python (45 linii)

**Kluczowe zależności:**
- **LangChain v1** — langchain, langchain-core, langchain-community, langchain-text-splitters, langgraph
- **MCP** — langchain-mcp-adapters, mcp, fastmcp
- **Vector** — faiss-cpu, sentence-transformers
- **OCR** — pymupdf, surya-ocr, easyocr
- **Web** — fastapi, uvicorn, pydantic, python-multipart
- **Desktop** — pyinstaller, pywebview, pywin32

**Uwagi:**
- ⚠️ LangChain jest wymagany ale **nieużywany** w kodzie — projekt używa bezpośrednio OpenAI API i Supabase RPC
- ⚠️ `surya-ocr>=0.5.0` — wymaga PyTorch (duża zależność)
- ⚠️ Brak `openai` w requirements — jest importowany ale nie zadeklarowany
- ⚠️ Brak `python-docx` — jest importowany w document_processor.py
- ⚠️ Brak `PyPDF2` — jest importowany w document_processor.py

---

## 5. STATUS PROJEKTU — CO ZOSTAŁO DO UKOŃCZENIA

### 5.1 Krytyczne (Must-Have)

| # | Element | Status | Opis |
|---|---------|--------|------|
| 1 | Brakujące zależności w requirements.txt | ❌ | `openai`, `python-docx`, `PyPDF2`, `Pillow`, `python-dotenv` |
| 2 | Dedyplikacja `get_async_client()` | ✅ | Naprawiono — import z moa/config.py |
| 3 | Walidacja inputów | ❌ | Brak limitu długości message, rozmiaru pliku |
| 4 | Rate limiting | ❌ | Brak ochrony przed spamem API |
| 5 | Health check endpoint | ❌ | Brak `/health` do monitorowania |

### 5.2 Ważne (Should-Have)

| # | Element | Status | Opis |
|---|---------|--------|------|
| 6 | Indeksy SQLite | ❌ | Brak indeksów na `messages.session_id` |
| 7 | Cache embeddingów | ❌ | Każdy request generuje nowy wektor |
| 8 | Circuit breaker | ❌ | Jeśli model zawsze failuje, nadal próbujemy |
| 9 | Metryki / Logging | ❌ | Tylko print() — brak structured logging |
| 10 | E2E tests | ❌ | Brak testów integracyjnych |

### 5.3 Mile widziane (Nice-to-Have)

| # | Element | Status | Opis |
|---|---------|--------|------|
| 11 | WebSocket streaming | ❌ | Odpowiedzi strumieniowane w czasie rzeczywistym |
| 12 | User authentication | ❌ | Tylko Supabase auth — brak własnego systemu |
| 13 | Export sesji | ❌ | Brak eksportu do PDF/JSON |
| 14 | Wyszukiwanie w historii | ❌ | Brak full-text search w wiadomościach |
| 15 | Custom models by user | ❌ | Użytkownik nie może dodać własnego modelu |

---

## 6. MOŻLIWE UDOSKONALENIA

### 6.1 Architektura

1. **Podział api.py na routery** — FastAPI APIRouter dla `/models`, `/sessions`, `/chat`, `/documents`
2. **Async SQLite** — przejście na `aiosqlite` dla lepszej równoległości
3. **Message Queue** — Redis/RabbitMQ dla długich zadań MOA (async processing)
4. **Microservices** — osobny serwis dla OCR, osobny dla RAG, osobny dla LLM

### 6.2 Wydajność

1. **Cache embeddingów** — Redis/Memcache dla powtarzalnych zapytań
2. **Streaming responses** — Server-Sent Events lub WebSocket
3. **Lazy loading frontendu** — React.lazy() dla widoków
4. **Connection pooling** — httpx.AsyncClient z limitami połączeń
5. **Batch embeddings** — generowanie wielu wektorów jednocześnie

### 6.3 Bezpieczeństwo

1. **Rate limiting** — `slowapi` lub własne limity per IP/user
2. **Input validation** — Pydantic validators na długość i format
3. **API key rotation** — wsparcie dla wielu kluczy OpenRouter
4. **Audit log** — logowanie wszystkich zapytań z IP, user_id, timestamp
5. **CORS tightening** — tylko produkcja origin

### 6.4 UX / Frontend

1. **Streaming chat** — odpowiedzi pojawiają się w trakcie generowania
2. **Dark/Light mode** — toggle motywu
3. **Mobile responsive** — lepszy layout na małych ekranach
4. **Voice input** — rozpoznawanie mowy (Web Speech API)
5. **Document comparison** — porównywanie dwóch dokumentów
6. **Collaborative editing** — edycja pism w czasie rzeczywistym

### 6.5 AI / ML

1. **Re-ranking** — cross-encoder dla lepszego dopasowania fragmentów
2. **Fine-tuning** — dostosowanie modeli do polskiego prawa
3. **Knowledge graph** — Neo4j dla relacji między przepisami
4. **Citation verification** — automatyczna weryfikacja cytowań w odpowiedziach
5. **Confidence scoring** — ocena pewności każdej odpowiedzi

### 6.6 DevOps

1. **Docker** — konteneryzacja backendu i frontendu
2. **CI/CD** — GitHub Actions dla testów i deploymentu
3. **Monitoring** — Prometheus + Grafana dla metryk
4. **Error tracking** — Sentry dla błędów produkcyjnych
5. **Backup** — automatyczne backupy SQLite i Supabase

---

## 📊 PODSUMOWANIE

| Kategoria | Plików | Linii kodu | Status |
|-----------|--------|-----------|--------|
| Backend (Python) | 3 | ~1,115 | ✅ Funkcjonalny |
| MOA Engine | 9 | ~1,250 | ✅ Funkcjonalny |
| Frontend (React) | ~30 | ~5,000+ | ✅ Funkcjonalny |
| Konfiguracja | 5 | ~150 | ⚠️ Wymaga aktualizacji |
| **RAZEM** | **~47** | **~7,500+** | **MVP Gotowy** |

**Ocena ogólna:** Projekt jest w stanie **MVP (Minimum Viable Product)** — wszystkie kluczowe funkcje działają, ale wymaga dopracowania pod kątem wydajności, bezpieczeństwa i UX przed wdrożeniem produkcyjnym.

---

*Dokumentacja wygenerowana na podstawie analizy kodu źródłowego projektu LexMind AI.*