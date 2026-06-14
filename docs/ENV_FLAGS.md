# LexMind — zmienne środowiskowe (`LEXMIND_*`)

Wszystkie flagi mają prefix `LEXMIND_` w pliku `.env`.

## RAG i retrieval

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `LEXMIND_USE_RAG_USER_IN_CHAT` | `true` | Hybrid search w `knowledge_base_user` podczas czatu |
| `LEXMIND_RAG_USER_TOP_K` | `4` | Max fragmentów user KB po reranku |
| `LEXMIND_RERANK_PROVIDER` | `heuristic` | `heuristic` lub `cohere` |
| `LEXMIND_RERANK_TOP_K` | `8` | Top fragmentów legal+user |
| `LEXMIND_EXTERNAL_RERANK_TOP_K` | `6` | Top SAOS+ELI łącznie po reranku |
| `LEXMIND_RAG_CACHE_TTL_SECONDS` | `300` | TTL cache RAG (0 = wyłącz) |

## Cytowania i tryby odpowiedzi

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `LEXMIND_HALLUCINATION_BLOCK_MIN_CITES` | `99` | Fallback globalny |
| `LEXMIND_HALLUCINATION_BLOCK_MIN_CITES_DRAFT` | `1` | Blokada syntezy w trybie draft |
| `LEXMIND_HALLUCINATION_BLOCK_MIN_CITES_STRATEGIC` | `1` | Blokada w trybie strategic |
| `LEXMIND_HALLUCINATION_BLOCK_MIN_CITES_ADVISOR` | `99` | Tryb doradcy |
| `LEXMIND_HALLUCINATION_BLOCK_MIN_CITES_CITIZEN` | `99` | Tryb citizen |

## Investigation v2

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `LEXMIND_FEATURE_INVESTIGATION_V2` | `false` | Wymusza pełne śledztwo na każdym requeście |
| `LEXMIND_FEATURE_INVESTIGATION_V2_AUTO` | `true` | Auto ON dla strategic lub dokumentu >15k znaków |
| `LEXMIND_INVESTIGATION_AUTO_MIN_CHARS` | `15000` | Próg długości dokumentu |
| `LEXMIND_INVESTIGATION_MAX_LLM_CALLS` | `24` | Budżet LLM na request |
| `LEXMIND_INVESTIGATION_MAX_RETRIEVAL_CALLS` | `20` | Budżet retrieval |

## Procedural / timeline

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `LEXMIND_FEATURE_PROCEDURAL_ALWAYS_ON` | `true` | Skan proceduralny (deterministic + opcjonalnie LLM) |
| `LEXMIND_FEATURE_TIMELINE` | `true` | Etap 5 — oś czasu z dokumentów |
| `LEXMIND_FEATURE_DEADLINE_ALERTS` | `true` | Etap 3 — alerty terminów |

## Query planner

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `LEXMIND_FEATURE_QUERY_PLANNER` | `true` | JSON planner zamiast routera 40 tok (gdy nie fast path) |

## Long context

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `LEXMIND_FEATURE_LONG_CONTEXT_PATH` | `true` | Single-pass dla dokumentów <120k znaków |
| `LEXMIND_LONG_CONTEXT_MAX_CHARS` | `120000` | Próg przełączenia |

## Zewnętrzne API

| Zmienna | Wymagane | Opis |
|---------|----------|------|
| `OPENROUTER_API_KEY` | tak | LLM + embeddings |
| `SUPABASE_URL` | tak | pgvector + hybrid RPC |
| `SUPABASE_ANON_KEY` | tak | REST / RPC |
| `COHERE_API_KEY` | nie | Rerank Cohere |

## Wdrożenie hybrid search (Supabase)

1. Otwórz Supabase Dashboard → SQL Editor.
2. Wklej całość [`supabase/migrations/20260520_hybrid_search_deploy.sql`](../supabase/migrations/20260520_hybrid_search_deploy.sql) i uruchom.
3. Jeśli błąd **42704: konfiguracja „polish” nie istnieje** — plik został zaktualizowany: na początku tworzy `polish` z `simple`. Uruchom migrację **od nowa** (cały plik).
4. Gdy nadal błąd uprawnień do `CREATE TEXT SEARCH CONFIGURATION` — uruchom awaryjnie [`20260522_fts_simple_fallback.sql`](../supabase/migrations/20260522_fts_simple_fallback.sql) (FTS na `simple`).
5. Sprawdź: `GET /health/hybrid-search` (lokalnie) — oba RPC `"ok": true`.

Weryfikacja w SQL Editor:

```sql
SELECT cfgname FROM pg_catalog.pg_ts_config WHERE cfgname IN ('polish', 'simple');
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'hybrid_search_%';
```
