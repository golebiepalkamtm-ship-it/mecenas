# LexMind (moj prawnik) — Code Wiki

## 1) Project Summary

LexMind is a local-first LegalTech assistant (FastAPI + React) designed to answer Polish legal questions using:

- Multi-model LLM orchestration via OpenRouter (single model or multi-expert + “judge” synthesis).
- Retrieval-Augmented Generation (RAG) over legal/user knowledge bases stored in Supabase (pgvector + optional hybrid FTS).
- External legal sources: SAOS (judgments) and ELI/ISAP (acts), fetched at runtime.
- Document ingestion (PDF/DOCX/TXT + image OCR) with automatic indexing into the user knowledge base.

Primary dev mode is a localhost-only backend + Vite frontend:

- Frontend: http://localhost:3000
- Backend: http://127.0.0.1:8003

## 2) Repository Layout

Top-level structure (high signal folders):

- `api.py` — FastAPI app entrypoint (router wiring + startup init).
- `routes/` — HTTP endpoints (chat/documents/health/models/admin/etc.).
- `services/` — core pipeline (orchestrator, retrieval, OCR, rerank, investigation, timeline, etc.).
- `schemas/` — Pydantic contracts + legacy payload adapter.
- `prompts/` — prompt templates (`.txt`) + loader.
- `domain/prompts/` — structured message builder for OpenAI-style chat APIs.
- `moa/` — model orchestration + OpenRouter client utilities + role/task prompt presets.
- `frontend/` — React + Vite SPA.
- `supabase/` — migrations (SQL) + Edge Functions (Deno).
- `pdfs/` — local document storage (also contains OCR cache under `.ocr_cache/`).
- `scripts/` — Windows runners and deployment helpers (e.g. hybrid search RPC deploy).

## 3) High-Level Architecture

### 3.1 Runtime components

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

### 3.2 Primary request flow (Chat)

1. Frontend builds a `ChatPayloadV2`-compatible request and sends it to `POST /chat` as an SSE stream.
2. Backend normalizes the payload (`schemas/chat_legacy_adapter.py`) and calls `OrchestratorService.process_user_request_stream(...)`.
3. Orchestrator:
   - Extracts text from attachments (and/or uses explicit `document_text`).
   - Chooses a fast path or a multi-stage pipeline depending on request flags + feature toggles.
   - Executes parallel retrieval (RAG legal, RAG user, SAOS, ELI), reranks, packs context.
   - Calls one model (single) or multiple experts + judge synthesis (MOA-like).
   - Emits SSE chunks (`type=chunk`) plus metadata and final metadata.
4. Chat route saves the final exchange (best-effort) using `utils/helpers.py`.

## 4) Backend (FastAPI)

### 4.1 Entry point and app lifecycle

- Entry: `api.py`
  - Creates `FastAPI(title="LexMind LegalTech AI — V2 Orchestrator")`.
  - CORS is restricted to localhost origins.
  - Middleware blocks non-localhost requests (Localhost Only Guard).
  - Includes routers from `routes/*`.
  - On startup calls `database.init_db()` to initialize local SQLite.

Key reference:

- `api.py` — app creation, security middleware, router wiring, and startup initialization.

### 4.2 Routing layer (major endpoints)

Routers are defined under `routes/` and included from `api.py`.

Key routers:

- `routes/chat_v2.py`
  - `POST /chat` streams SSE; bridges API contract → orchestrator.
- `routes/documents.py`
  - Upload/extract text (PDF/DOCX/TXT/image OCR) and index into Supabase.
  - Exports drafts to `.docx`.
- `routes/health.py`
  - `GET /health/balance` — OpenRouter balance probe.
  - `GET /health/hybrid-search` — checks Supabase `hybrid_search_*` RPC availability.
- `routes/core.py`
  - `GET /prompts/presets` — exposes role/task prompt presets to frontend.
- `routes/models.py`, `routes/admin.py`, `routes/judgments.py`, `routes/analytics.py`, `routes/trial_room.py`
  - Additional UX features (model listing/health/admin/trial mode).

### 4.3 Chat contract normalization

The backend accepts a flexible payload (legacy flat fields + V2 structured fields).

- API request model: `ChatRequest` in `routes/chat_v2.py` (`extra="allow"`).
- Conversion/normalization:
  - `LegacyPayloadAdapter.from_pydantic_model(...)`
  - `LegacyPayloadAdapter.to_orchestrator_kwargs(...)`

Files:

- `routes/chat_v2.py`
- `schemas/chat_legacy_adapter.py`
- `schemas/chat_contract.py`

### 4.4 Orchestrator (core pipeline)

Core class:

- `OrchestratorService` in `services/orchestrator.py`

Core responsibilities:

- Prompt assembly (system guardrails + role + task + legal basis + case context).
- Attachment extraction and optional OCR/document processing integration.
- Retrieval fan-out + reranking + context packing.
- Single-model path and multi-model debate + judge synthesis.
- Citation guard, confidence scoring, timeline/deadline/inconsistency outputs (emitted via final metadata).

Key public entrypoint:

- `OrchestratorService.process_user_request_stream(...)` — async generator used by `POST /chat` to emit SSE events.

Important helper methods (selected):

- `_build_expert_prompt(...)` — builds expert prompt with master system prompt, guards, legal basis, and case context.
- `_resolve_expert_role_block(...)` — resolves per-model role prompt using:
  1) explicit expert prompt override,
  2) role catalog,
  3) preset role prompt,
  4) fallback role.

Primary dependencies:

- Prompt loader: `prompts/loader.py`
- Structured message builder: `domain/prompts/message_builder.py`
- LLM calling + fallback: `services/llm_client.py`
- Retrieval fan-out: `services/pipeline/rag_retrieval.py`
- Retrieval implementations: `services/retrieval_service.py`
- Reranking: `services/rerank_service.py`
- Citation checks: `services/citation_guard.py`
- Context packing: `services/context_packer.py`
- Feature toggles: `config.py` (LEXMIND_* settings)

### 4.5 LLM calling and fallbacks

- `LLMClientService` in `services/llm_client.py`

Responsibilities:

- Provides a single consistent interface for OpenAI-compatible chat completion calls.
- Adds:
  - retry policy (tenacity),
  - primary → fallback model chaining,
  - streaming fallback (`call_with_fallback_stream`).

Key methods:

- `call(...)`
- `call_with_fallback(...)`
- `call_with_fallback_stream(...)`

### 4.6 Retrieval (Supabase RAG + SAOS + ELI)

- `RetrievalService` in `services/retrieval_service.py`

Responsibilities:

- Supabase knowledge-base search:
  - legal KB (`knowledge_base_legal`)
  - user KB (`knowledge_base_user`)
  - hybrid mode using RPC (`hybrid_search_legal`, `hybrid_search_user`) when available.
- External sources:
  - SAOS judgments
  - ELI/ISAP acts
- Input hardening to avoid type errors from upstream data (e.g., boolean values where strings are expected).

Parallel fan-out stage:

- `parallel_rag_gather(...)` in `services/pipeline/rag_retrieval.py` uses `asyncio.gather` to fetch:
  - legal KB matches
  - user KB matches
  - SAOS results
  - ELI results

### 4.7 Document ingestion and indexing

API endpoints:

- `POST /documents/upload-document` — extracts text; indexes as user KB in background.
- `POST /documents/upload` and `POST /documents/index-document` — direct indexing endpoint (category-controlled).

Extraction logic:

- PDF: `pypdf` extraction page-by-page
- DOCX: `python-docx` conversion to markdown-ish text
- Images: vision OCR via OpenRouter (`services/vision_ocr.py`), with local cache (`services/ocr_cache.py`)

Indexing:

- `index_document_to_supabase(...)` in `services/document_service.py`
  - Splits to chunks (LangChain text splitter).
  - Computes embeddings (via `moa.retrieval.get_text_embeddings`).
  - Inserts chunks + a full-body record into Supabase table (`knowledge_base_user` or `knowledge_base_legal`).

### 4.8 Health probes

- `GET /health` (in `api.py`) — basic engine status.
- `GET /health/hybrid-search` (in `routes/health.py`) — verifies Supabase RPC deployments.
  - Implementation: `services/hybrid_search_health.py`

## 5) Frontend (React/Vite)

Entry points:

- `frontend/src/main.tsx` — React bootstrap.
- `frontend/src/App.tsx` — main shell with navigation and view switching.

Key UI modules:

- `frontend/src/components/Chat/` — main chat UI + SSE rendering.
- `frontend/src/components/Documents/` — document library and upload.
- `frontend/src/components/Drafter/` — drafting UX (doc generation + export).
- `frontend/src/components/Knowledge/` — knowledge base UX.
- `frontend/src/components/Judgments/` — SAOS-related UX.
- `frontend/src/components/ModelOrchestrator/` — model selection and presets UI.
- `frontend/src/components/TrialRoom/` — trial-room mode (if enabled).

### 5.1 Chat transport (SSE)

Core hook:

- `frontend/src/hooks/useChatMutation.ts`

Responsibilities:

- Builds the backend payload using `frontend/src/services/chatPayloadFactory.ts`.
- Sends `POST ${API_BASE}/chat` and consumes the response as SSE using:
  - `frontend/src/utils/consumeChatSSE.ts`
- Supports cancellation via `AbortController`.

### 5.2 Prompt presets integration

Frontend can fetch prompt presets from:

- `GET /prompts/presets` (`routes/core.py`)

Those presets come from `moa/prompt_builder.py` (defense/prosecution universes with roles/tasks).

## 6) Prompt System

### 6.1 Prompt templates

- Stored as `.txt` files under `prompts/`.
- Loaded via `prompts/loader.py`:
  - `load_prompt(name)` reads `prompts/{name}.txt` (cached).
  - `get_master_system_prompt()` returns `lexmind_master_system.txt`.

### 6.2 Role/task presets (“universes”)

- Implemented in `moa/prompt_builder.py`
  - Defines `DEFENSE_UNIVERSE` and `PROSECUTION_UNIVERSE`:
    - `identity` (architect prompt)
    - `judge` prompt
    - `roles` prompt catalog
    - `tasks` prompt catalog
  - Access helpers:
    - `get_role_prompt(role_id, side)`
    - `get_task_prompt(task_id, side)`
    - `merge_role_catalog(custom_roles, side)`

### 6.3 Structured message assembly

- `PromptMessageBuilder` in `domain/prompts/message_builder.py`
  - Builds `[{role, content}, ...]` arrays for OpenAI-style chat APIs.
  - Produces messages for expert calls, single calls, and judge calls.

## 7) Supabase (DB + Edge Functions)

### 7.1 Migrations

- Stored under `supabase/migrations/`.
- Key topic: hybrid search RPC deployment and fixes
  - `20260520_hybrid_search_deploy.sql`
  - `20260522_fts_simple_fallback.sql`
  - `20260529_fix_hybrid_act_terms_filter.sql`

Health check:

- Backend endpoint `GET /health/hybrid-search` calls the RPC and reports status.

### 7.2 Edge Functions

Edge functions live in `supabase/functions/`.

Important functions:

- `chat-ai-proxy/index.ts`
  - Authenticates Supabase user (`SUPABASE_SERVICE_ROLE_KEY`).
  - Builds embeddings via OpenRouter.
  - Fetches RAG context from Supabase RPC (`match_knowledge`).
  - Calls OpenRouter chat completions and stores messages in Supabase.
- `draft-document/index.ts`
  - Dedicated draft generation path (separate from FastAPI orchestrator).
- `import-knowledge/index.ts`
  - Bulk knowledge import support.

Note: The repository includes both the FastAPI “V2 orchestrator” path and Supabase Edge proxy paths; depending on deployment and UI feature, either may be used.

## 8) Dependency Relationships (Practical View)

### 8.1 Chat path (UI → API → pipeline)

- `frontend/src/hooks/useChatMutation.ts`
  → `POST /chat` (SSE)
  → `routes/chat_v2.py` (`ChatRequest`)
  → `schemas/chat_legacy_adapter.py` (normalize)
  → `services/orchestrator.py` (`process_user_request_stream`)
  → `services/llm_client.py` (OpenRouter)
  → `services/retrieval_service.py` + `services/pipeline/rag_retrieval.py` (Supabase/SAOS/ELI)

### 8.2 Document indexing path (UI → API → Supabase)

- `frontend` upload view
  → `POST /documents/upload-document`
  → `routes/documents.py` (extract text / OCR)
  → `services/document_service.py` (`index_document_to_supabase`)
  → Supabase REST insert into `knowledge_base_user`

## 9) Configuration

### 9.1 Required environment variables

From `.env.example`:

- `OPENROUTER_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Common optional variables:

- `COHERE_API_KEY` (only if rerank provider is `cohere`)
- `SUPABASE_DB_PASSWORD` (for helper scripts that deploy SQL via DB connection)

### 9.2 Feature flags

Most runtime switches are provided as `LEXMIND_*` variables and read via `config.py` (Pydantic `BaseSettings`).

Reference list:

- `docs/ENV_FLAGS.md`

## 10) How to Run (Local Development)

### 10.1 Prerequisites

- Python 3.10+
- Node.js 18+

### 10.2 Setup

1) Create `.env`:

```bat
copy .env.example .env
```

2) Install dependencies (recommended on Windows):

```bat
install.bat
```

Manual equivalent:

```bat
python -m venv .venv
call .venv\Scripts\activate.bat
pip install -r requirements.txt
cd frontend
npm install --legacy-peer-deps
```

### 10.3 Run

Recommended launcher:

```bat
uruchom.bat
```

Manual (two terminals):

Terminal 1 (backend):

```bat
call .venv\Scripts\activate.bat
python -m uvicorn api:app --host 127.0.0.1 --port 8003 --reload
```

Terminal 2 (frontend):

```bat
cd frontend
npm run dev
```

### 10.4 Quick health checks

- Backend: `GET http://127.0.0.1:8003/health`
- Hybrid search: `GET http://127.0.0.1:8003/health/hybrid-search`
- OpenRouter balance: `GET http://127.0.0.1:8003/health/balance`

## 11) Operational Notes

- The backend enforces a localhost-only guard in `api.py`. If you need remote access, change the middleware intentionally (do not remove it accidentally).
- Document OCR uses OpenRouter vision models configured by `LEXMIND_VISION_OCR_MODELS` (see `.env.example`).
- Supabase hybrid search requires running the SQL migrations; `GET /health/hybrid-search` provides a runtime signal if RPC functions are missing.

