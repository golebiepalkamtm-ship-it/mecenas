# Changelog

## [Unreleased] — Repo cleanup (web-only)

### Added
- Kontrakt API czatu (`schemas/chat_contract.py`, `schemas/chat_legacy_adapter.py`) z polem `side` i zagnieżdżonymi `prompt_overrides` / `moa_options`.
- `domain/prompts/message_builder.py` — eksperci LLM dostają wiadomości `system` + `user` zamiast jednego bloku tekstu.
- `frontend/src/services/chatPayloadFactory.ts` — jedna fabryka payloadu dla czatu.
- Minimalne testy: `tests/test_chat_contract.py`, `tests/test_message_builder.py`.

### Changed
- `/chat`: adapter legacy → v2; MOA nie przekazuje `system_role_prompt` do sędzia (tylko tryb single).
- Orchestrator: `process_side` zamiast `.find("prosecutor")` w treści promptu.

### Removed
- **Skills Hub**: `extensions/antigravity-skills-hub/`, `routes/skills.py`, `frontend/src/components/Skills/`, instalatory `instaluj-skills-hub.*`
- **Lokalne LLM**: monitoring Ollama/LM Studio z admin debug panelu i `/admin/debug`
- **Testy i diagnostyka**: cały katalog `tests/`, `frontend/src/tests/`, `pytest.ini`, CI workflow
- **Skrypty ops/debug**: większość `scripts/` — zostały tylko `ULTIMATE_START.bat`, `run_prawnik_ui.bat`, `deploy_hybrid_search_rpc.py`, `sync_prompts.py`
- `@capacitor/*`, shim `useOrchestratorStore`, root `migrations/` (→ `docs/sql_legacy/`)

### Changed
- Web-first: jedyna ścieżka UI to `frontend/` + `api.py` (OpenRouter, Supabase)
- `ModelOrchestrator` → `useChatSettingsStore`
- README zaktualizowany pod Supabase migrations

## [4.1.0] — 2026-05-25

### Added
- Root `.gitignore`, mount `/analytics`
- `document_processor.py` shim, pipeline stages

### Changed
- Port API ujednolicony na **8003** (`api.py`, README)
- Store modeli: `useChatSettingsStore` jako jedyne źródło prawdy

### Fixed
- React hooks w `MessageBubble`, `DocumentUpload`, `LibrarySelectionModal`
- Martwy kod frontend (uiStore, UI/, landing legacy)

### Removed
- `useOrchestratorSync`, martwe komponenty Settings/Admin/Landing
