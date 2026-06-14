# LexMind (moj prawnik) — Wiki kodu

## 1) Podsumowanie projektu

LexMind to lokalny asystent prawny (FastAPI + React) do pracy z prawem polskim, który łączy:

- Orkiestrację wielu modeli LLM przez OpenRouter (tryb single lub debata ekspertów + synteza „sędziego”).
- RAG (Retrieval-Augmented Generation) nad bazą wiedzy w Supabase (pgvector + opcjonalny hybrydowy FTS).
- Zewnętrzne źródła: SAOS (orzecznictwo) oraz ELI/ISAP (akty prawne) pobierane w trakcie odpowiedzi.
- Ingest dokumentów (PDF/DOCX/TXT + obrazy z OCR) i automatyczne indeksowanie do bazy wiedzy użytkownika.

Domyślny tryb developerski działa lokalnie:

- Frontend: http://localhost:3000
- Backend: http://127.0.0.1:8003

## 2) Struktura repozytorium

Najważniejsze katalogi/pliki:

- `api.py` — punkt wejścia FastAPI (routery + startup).
- `routes/` — endpointy HTTP (chat/dokumenty/health/modele/admin itd.).
- `services/` — logika biznesowa i potok (orchestrator, retrieval, OCR, rerank, investigation, timeline, itd.).
- `schemas/` — kontrakty (Pydantic) + adapter „legacy payload” → V2.
- `prompts/` — prompty (`.txt`) + loader.
- `domain/prompts/` — builder wiadomości w formacie zgodnym z OpenAI Chat API.
- `moa/` — narzędzia orkiestracji modeli + presety ról/zadań + klient OpenRouter.
- `frontend/` — SPA React (Vite).
- `supabase/` — migracje SQL + Edge Functions (Deno).
- `pdfs/` — lokalny magazyn plików (z cache OCR w `.ocr_cache/`).
- `scripts/` — skrypty (uruchamianie Windows, deploy RPC hybrydowego wyszukiwania).

## 3) Architektura (wysoki poziom)

### 3.1 Komponenty runtime

```mermaid
flowchart LR
  UI[React SPA<br/>frontend/] -->|POST /chat (SSE)| API[FastAPI<br/>api.py]
  API --> ORCH[OrchestratorService<br/>services/orchestrator.py]

  ORCH --> LLM[LLMClientService<br/>services/llm_client.py]
  LLM -->|OpenAI-compatible| OR[OpenRouter]

  ORCH --> RET[RetrievalService<br/>services/retrieval_service.py]
  RET -->|RPC / REST| SB[(Supabase Postgres<br/>knowledge_base_legal/user)]
  RET --> SAOS[SAOS API]
  RET --> ELI[ELI/ISAP API]

  UI -->|Supabase auth/profile| SBAuth[Supabase Auth]
  ORCH --> SQLite[(SQLite<br/>database.py)]
```

### 3.2 Główny przepływ (Chat)

1. Frontend buduje payload zgodny z `ChatPayloadV2` i wysyła do `POST /chat` jako SSE.
2. Backend normalizuje payload (`schemas/chat_legacy_adapter.py`) i wywołuje `OrchestratorService.process_user_request_stream(...)`.
3. Orchestrator:
   - Ekstrahuje tekst z załączników (lub używa `document_text` jeśli podany).
   - Wybiera szybką ścieżkę albo pełny potok wieloetapowy w zależności od flag i feature toggli.
   - Wykonuje równoległy retrieval (RAG legal, RAG user, SAOS, ELI), rerank i pakuje kontekst.
   - Wywołuje jeden model (single) lub wielu ekspertów + syntezę sędziego.
   - Emituje zdarzenia SSE (`type=chunk`, `type=metadata`, `type=final_metadata`).
4. Router czatu zapisuje rozmowę best-effort przez `utils/helpers.py`.

## 4) Backend (FastAPI)

### 4.1 Punkt wejścia i lifecycle aplikacji

- `api.py`
  - Tworzy `FastAPI(title="LexMind LegalTech AI — V2 Orchestrator")`.
  - Ogranicza CORS do localhost.
  - Blokuje ruch spoza localhost („Localhost Only Guard”).
  - Rejestruje routery z `routes/*`.
  - W startup uruchamia `database.init_db()` (SQLite).

### 4.2 Warstwa routingu (najważniejsze endpointy)

Routery są w `routes/` i są podpinane w `api.py`.

Najważniejsze:

- `routes/chat_v2.py`
  - `POST /chat` — SSE, most między API → orchestrator.
- `routes/documents.py`
  - Upload + ekstrakcja tekstu/OCR + indeksowanie do Supabase.
  - Eksport `.docx` dla draftów.
- `routes/health.py`
  - `GET /health/balance` — stan konta OpenRouter.
  - `GET /health/hybrid-search` — weryfikacja wdrożenia RPC `hybrid_search_*` w Supabase.
- `routes/core.py`
  - `GET /prompts/presets` — presety promptów (role/task) do frontendu.
- `routes/models.py`, `routes/admin.py`, `routes/judgments.py`, `routes/analytics.py`, `routes/trial_room.py`
  - Moduły wspierające UX (modele, admin, orzecznictwo, analityka, „sala rozpraw”).

### 4.3 Normalizacja kontraktu czatu (legacy → V2)

Backend dopuszcza payload mieszany (pola legacy + pola V2).

- Model requestu: `ChatRequest` w `routes/chat_v2.py` (`extra="allow"`).
- Normalizacja:
  - `LegacyPayloadAdapter.from_pydantic_model(...)`
  - `LegacyPayloadAdapter.to_orchestrator_kwargs(...)`

Pliki:

- `routes/chat_v2.py`
- `schemas/chat_legacy_adapter.py`
- `schemas/chat_contract.py`

### 4.4 Orchestrator (rdzeń potoku)

Główna klasa:

- `OrchestratorService` w `services/orchestrator.py`

Odpowiedzialności:

- Składanie promptów (master system + guardy + rola + task + podstawa prawna + kontekst sprawy).
- Ekstrakcja załączników i integracja z przetwarzaniem dokumentów/OCR.
- Retrieval, rerank, pakowanie kontekstu (RAG/SAOS/ELI + akta).
- Tryb single i tryb multi-model (eksperci + sędzia).
- Guard cytowań, scoring pewności, timeline/terminy/niespójności (zwrot w `final_metadata`).

Główne wejście (używane przez `POST /chat`):

- `OrchestratorService.process_user_request_stream(...)` — async generator dla SSE.

Wybrane kluczowe metody:

- `_build_expert_prompt(...)` — buduje prompt eksperta z guardami i podstawą prawną.
- `_resolve_expert_role_block(...)` — rozstrzyga prompt roli per model:
  1) override promptu roli,
  2) role_catalog,
  3) preset roli,
  4) fallback.

Główne zależności orchestratora:

- Loader promptów: `prompts/loader.py`
- Budowa wiadomości: `domain/prompts/message_builder.py`
- Wywołania modeli: `services/llm_client.py`
- Równoległy retrieval: `services/pipeline/rag_retrieval.py`
- Implementacja retrieval: `services/retrieval_service.py`
- Rerank: `services/rerank_service.py`
- Cytowania: `services/citation_guard.py`
- Pakowanie kontekstu: `services/context_packer.py`
- Feature flagi: `config.py` (ustawienia `LEXMIND_*`)

### 4.5 Wywołania LLM i fallback

- `LLMClientService` w `services/llm_client.py`

Odpowiedzialności:

- Jednolity interfejs dla Chat Completions (klient OpenAI-compatible).
- Retry (tenacity) i degradacja na modele zapasowe.
- Streaming ze zmianą modelu przy awarii (`call_with_fallback_stream`).

Najważniejsze metody:

- `call(...)`
- `call_with_fallback(...)`
- `call_with_fallback_stream(...)`

### 4.6 Retrieval (Supabase RAG + SAOS + ELI)

- `RetrievalService` w `services/retrieval_service.py`

Zakres:

- Supabase:
  - `knowledge_base_legal`
  - `knowledge_base_user`
  - tryb hybrydowy (RPC `hybrid_search_legal`, `hybrid_search_user`) jeśli wdrożony.
- Zewnętrzne źródła:
  - SAOS
  - ELI/ISAP
- Twarde rzutowania i sanitizacja danych, by unikać problemów typów (np. `bool` w polach tekstowych).

Równoległy etap retrieval:

- `parallel_rag_gather(...)` w `services/pipeline/rag_retrieval.py` (`asyncio.gather`) zwraca:
  - wyniki legal KB
  - wyniki user KB
  - SAOS
  - ELI

### 4.7 Ingest dokumentów i indeksowanie

Endpointy:

- `POST /documents/upload-document` — ekstrakcja tekstu; indeksowanie do user KB w tle.
- `POST /documents/upload` / `POST /documents/index-document` — indeksowanie kontrolowane polem `category`.

Ekstrakcja:

- PDF: `pypdf` (strona po stronie, bez skracania).
- DOCX: `python-docx` → tekst w stylu markdown.
- Obrazy: OCR wizyjny przez OpenRouter (`services/vision_ocr.py`) + cache (`services/ocr_cache.py`).

Indeksowanie do Supabase:

- `index_document_to_supabase(...)` w `services/document_service.py`
  - Chunking przez `RecursiveCharacterTextSplitter`.
  - Embedding przez `moa.retrieval.get_text_embeddings`.
  - Insert do Supabase (chunki + rekord „full body”) w `knowledge_base_user` albo `knowledge_base_legal`.

### 4.8 Health checki

- `GET /health` (w `api.py`) — prosty status.
- `GET /health/hybrid-search` (w `routes/health.py`) — status RPC hybrydowego wyszukiwania.
  - Implementacja: `services/hybrid_search_health.py`

## 5) Frontend (React/Vite)

Punkty wejścia:

- `frontend/src/main.tsx` — bootstrap React.
- `frontend/src/App.tsx` — shell aplikacji, nawigacja, przełączanie widoków.

Najważniejsze moduły UI:

- `frontend/src/components/Chat/` — czat + render SSE.
- `frontend/src/components/Documents/` — upload i biblioteka dokumentów.
- `frontend/src/components/Drafter/` — kreator pism + eksport.
- `frontend/src/components/Knowledge/` — UI bazy wiedzy.
- `frontend/src/components/Judgments/` — integracje SAOS.
- `frontend/src/components/ModelOrchestrator/` — wybór modeli i presetów.
- `frontend/src/components/TrialRoom/` — „sala rozpraw” (jeśli włączona).

### 5.1 Transport czatu (SSE)

Główny hook:

- `frontend/src/hooks/useChatMutation.ts`

Odpowiedzialności:

- Budowa payload: `frontend/src/services/chatPayloadFactory.ts`.
- Wysyłka `POST ${API_BASE}/chat` i konsumowanie SSE:
  - `frontend/src/utils/consumeChatSSE.ts`
- Anulowanie przez `AbortController`.

### 5.2 Presety promptów

Frontend może pobierać presety:

- `GET /prompts/presets` (w `routes/core.py`)

Źródło presetów:

- `moa/prompt_builder.py` (uniwersum „defense” i „prosecution”: identity/judge/roles/tasks).

## 6) System promptów

### 6.1 Szablony promptów

- Pliki `.txt` w `prompts/`.
- Loader: `prompts/loader.py`
  - `load_prompt(name)` czyta `prompts/{name}.txt` (cache).
  - `get_master_system_prompt()` zwraca `lexmind_master_system.txt`.

### 6.2 Presety ról i zadań („uniwersa”)

- `moa/prompt_builder.py`
  - `DEFENSE_UNIVERSE` i `PROSECUTION_UNIVERSE`:
    - `identity` (architect prompt)
    - `judge` prompt
    - `roles` (katalog ról)
    - `tasks` (katalog zadań)
  - API:
    - `get_role_prompt(role_id, side)`
    - `get_task_prompt(task_id, side)`
    - `merge_role_catalog(custom_roles, side)`

### 6.3 Składanie wiadomości (OpenAI-style)

- `PromptMessageBuilder` w `domain/prompts/message_builder.py`
  - Buduje listę `[{role, content}, ...]` dla eksperta, single i sędziego.

## 7) Supabase (DB + Edge Functions)

### 7.1 Migracje

- `supabase/migrations/`
- Kluczowe pliki dla hybrydowego wyszukiwania:
  - `20260520_hybrid_search_deploy.sql`
  - `20260522_fts_simple_fallback.sql`
  - `20260529_fix_hybrid_act_terms_filter.sql`

Sygnał runtime:

- `GET /health/hybrid-search` sprawdza, czy RPC są dostępne.

### 7.2 Edge Functions

Katalog:

- `supabase/functions/`

Najważniejsze:

- `chat-ai-proxy/index.ts`
  - Waliduje użytkownika Supabase (`SUPABASE_SERVICE_ROLE_KEY`).
  - Pobiera embedding z OpenRouter.
  - Pobiera kontekst z RPC `match_knowledge`.
  - Wywołuje OpenRouter chat completions i zapisuje wiadomości do Supabase.
- `draft-document/index.ts`
  - Dedykowana ścieżka generacji pism (nie przez FastAPI orchestrator).
- `import-knowledge/index.ts`
  - Wsparcie importu bazy wiedzy.

## 8) Zależności modułów (widok praktyczny)

### 8.1 Ścieżka czatu (UI → API → potok)

- `frontend/src/hooks/useChatMutation.ts`
  → `POST /chat` (SSE)
  → `routes/chat_v2.py` (`ChatRequest`)
  → `schemas/chat_legacy_adapter.py` (normalizacja)
  → `services/orchestrator.py` (`process_user_request_stream`)
  → `services/llm_client.py` (OpenRouter)
  → `services/pipeline/rag_retrieval.py` + `services/retrieval_service.py` (Supabase/SAOS/ELI)

### 8.2 Ścieżka indeksowania dokumentów (UI → API → Supabase)

- UI upload
  → `POST /documents/upload-document`
  → `routes/documents.py` (ekstrakcja/OCR)
  → `services/document_service.py` (`index_document_to_supabase`)
  → Supabase REST insert do `knowledge_base_user`

## 9) Konfiguracja

### 9.1 Wymagane zmienne środowiskowe

Z `.env.example`:

- `OPENROUTER_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Typowe opcjonalne:

- `COHERE_API_KEY` (gdy `LEXMIND_RERANK_PROVIDER=cohere`)
- `SUPABASE_DB_PASSWORD` (dla skryptów deployujących SQL)

### 9.2 Feature flagi (LEXMIND_*)

Większość przełączników runtime jest wczytywana z `.env` przez `config.py` (Pydantic `BaseSettings`).

Lista i opisy:

- `docs/ENV_FLAGS.md`

## 10) Jak uruchomić (lokalnie)

### 10.1 Wymagania

- Python 3.10+
- Node.js 18+

### 10.2 Setup

1) Utwórz `.env`:

```bat
copy .env.example .env
```

2) Zainstaluj zależności (Windows):

```bat
install.bat
```

Manualnie:

```bat
python -m venv .venv
call .venv\Scripts\activate.bat
pip install -r requirements.txt
cd frontend
npm install --legacy-peer-deps
```

### 10.3 Start

Rekomendowane:

```bat
uruchom.bat
```

Ręcznie (2 terminale):

Backend:

```bat
call .venv\Scripts\activate.bat
python -m uvicorn api:app --host 127.0.0.1 --port 8003 --reload
```

Frontend:

```bat
cd frontend
npm run dev
```

### 10.4 Szybkie testy zdrowia

- Backend: `GET http://127.0.0.1:8003/health`
- Hybrydowe wyszukiwanie: `GET http://127.0.0.1:8003/health/hybrid-search`
- OpenRouter balance: `GET http://127.0.0.1:8003/health/balance`

## 11) Notatki operacyjne

- Backend ma ochronę „localhost only” w `api.py`. Jeśli potrzebujesz dostępu zdalnego, zmień to świadomie.
- OCR wizyjny korzysta z modeli ustawianych przez `LEXMIND_VISION_OCR_MODELS` (patrz `.env.example`).
- Hybrydowy retrieval w Supabase wymaga migracji SQL; `GET /health/hybrid-search` sygnalizuje brakujące RPC.

