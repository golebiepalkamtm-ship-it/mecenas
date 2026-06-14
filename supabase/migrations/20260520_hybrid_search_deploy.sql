-- =========================================================================
-- Wdrożenie hybrid_search_* na Supabase + uprawnienia PostgREST
-- =========================================================================
-- Uruchom w Supabase: Dashboard → SQL → New query → wklej całość → Run.
-- Lokalnie (CLI): z katalogu projektu z plikiem supabase/config.toml:
--   supabase link --project-ref <ref>
--   supabase db push
--
-- Po wdrożeniu sprawdź w SQL Editor:
--   select proname from pg_proc join pg_namespace n on n.oid = pronamespace
--   where n.nspname = 'public' and proname like 'hybrid_search_%';
--
-- Powód HTTP 404 przy /rest/v1/rpc/hybrid_search_legal: funkcja nie istnieje
-- w tej bazie LUB brak GRANT EXECUTE dla roli anon (klucz używany przez backend).
--
-- BŁĄD 42704 „konfiguracja polish nie istnieje”: Supabase nie ma wbudowanego FTS polish.
-- Poniższy blok tworzy konfigurację `polish` (kopia simple + unaccent) przed indeksami.

CREATE EXTENSION IF NOT EXISTS vector;

-- unaccent — lepsze dopasowanie polskich znaków przy FTS opartym na simple
CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_ts_config WHERE cfgname = 'polish'
  ) THEN
    CREATE TEXT SEARCH CONFIGURATION polish ( COPY = simple );
    -- Mapowanie z unaccent (gdy rozszerzenie dostępne)
    BEGIN
      ALTER TEXT SEARCH CONFIGURATION polish
        ALTER MAPPING FOR word, asciiword WITH unaccent, simple;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    RAISE NOTICE 'Utworzono konfigurację FTS: polish (COPY simple + unaccent).';
  END IF;
END
$$;

-- Indeksy GIN — wymagają istniejącej konfiguracji polish (utworzonej powyżej)
DROP INDEX IF EXISTS knowledge_base_legal_fts_polish_idx;
CREATE INDEX knowledge_base_legal_fts_polish_idx
ON knowledge_base_legal USING gin (to_tsvector('polish', content));

DROP INDEX IF EXISTS knowledge_base_user_fts_polish_idx;
CREATE INDEX knowledge_base_user_fts_polish_idx
ON knowledge_base_user USING gin (to_tsvector('polish', content));

CREATE INDEX IF NOT EXISTS knowledge_base_legal_hnsw_idx
ON knowledge_base_legal USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS knowledge_base_user_hnsw_idx
ON knowledge_base_user USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION hybrid_search_legal(
    query_text text,
    query_embedding vector(1536),
    match_count int DEFAULT 10,
    vector_weight float DEFAULT 0.5,
    k_rrf int DEFAULT 60,
    act_terms text[] DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    content text,
    metadata jsonb,
    rrf_score float
)
LANGUAGE plpgsql
AS $$
DECLARE
    fts_q tsquery;
BEGIN
    BEGIN
        fts_q := websearch_to_tsquery('polish', query_text);
    EXCEPTION WHEN OTHERS THEN
        fts_q := plainto_tsquery('polish', coalesce(query_text, ''));
    END;
    IF fts_q IS NULL OR fts_q = ''::tsquery THEN
        fts_q := plainto_tsquery('polish', coalesce(query_text, ''));
    END IF;

    RETURN QUERY
    WITH vector_search AS (
        SELECT
            kb.id, kb.content, kb.metadata,
            ROW_NUMBER() OVER (ORDER BY kb.embedding <=> query_embedding) as vector_rank
        FROM knowledge_base_legal kb
        WHERE kb.embedding IS NOT NULL
          AND (
              act_terms IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM unnest(act_terms) AS term
                  WHERE kb.metadata->>'filename' ILIKE '%' || term || '%'
              )
          )
        ORDER BY kb.embedding <=> query_embedding
        LIMIT match_count * 3
    ),
    keyword_search AS (
        SELECT
            kb.id, kb.content, kb.metadata,
            ROW_NUMBER() OVER (
                ORDER BY ts_rank(to_tsvector('polish', kb.content), fts_q) DESC
            ) as keyword_rank
        FROM knowledge_base_legal kb
        WHERE to_tsvector('polish', kb.content) @@ fts_q
          AND (
              act_terms IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM unnest(act_terms) AS term
                  WHERE kb.metadata->>'filename' ILIKE '%' || term || '%'
              )
          )
        ORDER BY ts_rank(to_tsvector('polish', kb.content), fts_q) DESC
        LIMIT match_count * 3
    )
    SELECT
        COALESCE(v.id, k.id) as id,
        COALESCE(v.content, k.content) as content,
        COALESCE(v.metadata, k.metadata) as metadata,
        ((COALESCE(1.0 / (k_rrf + v.vector_rank), 0.0) * vector_weight) +
         (COALESCE(1.0 / (k_rrf + k.keyword_rank), 0.0) * (1.0 - vector_weight)))::float as rrf_score
    FROM vector_search v
    FULL OUTER JOIN keyword_search k ON v.id = k.id
    ORDER BY rrf_score DESC
    LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION hybrid_search_user(
    query_text text,
    query_embedding vector(1536),
    match_count int DEFAULT 10,
    vector_weight float DEFAULT 0.5,
    k_rrf int DEFAULT 60,
    act_terms text[] DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    content text,
    metadata jsonb,
    rrf_score float
)
LANGUAGE plpgsql
AS $$
DECLARE
    fts_q tsquery;
BEGIN
    BEGIN
        fts_q := websearch_to_tsquery('polish', query_text);
    EXCEPTION WHEN OTHERS THEN
        fts_q := plainto_tsquery('polish', coalesce(query_text, ''));
    END;
    IF fts_q IS NULL OR fts_q = ''::tsquery THEN
        fts_q := plainto_tsquery('polish', coalesce(query_text, ''));
    END IF;

    RETURN QUERY
    WITH vector_search AS (
        SELECT
            kb.id, kb.content, kb.metadata,
            ROW_NUMBER() OVER (ORDER BY kb.embedding <=> query_embedding) as vector_rank
        FROM knowledge_base_user kb
        WHERE kb.embedding IS NOT NULL
          AND (
              act_terms IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM unnest(act_terms) AS term
                  WHERE kb.metadata->>'filename' ILIKE '%' || term || '%'
              )
          )
        ORDER BY kb.embedding <=> query_embedding
        LIMIT match_count * 3
    ),
    keyword_search AS (
        SELECT
            kb.id, kb.content, kb.metadata,
            ROW_NUMBER() OVER (
                ORDER BY ts_rank(to_tsvector('polish', kb.content), fts_q) DESC
            ) as keyword_rank
        FROM knowledge_base_user kb
        WHERE to_tsvector('polish', kb.content) @@ fts_q
          AND (
              act_terms IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM unnest(act_terms) AS term
                  WHERE kb.metadata->>'filename' ILIKE '%' || term || '%'
              )
          )
        ORDER BY ts_rank(to_tsvector('polish', kb.content), fts_q) DESC
        LIMIT match_count * 3
    )
    SELECT
        COALESCE(v.id, k.id) as id,
        COALESCE(v.content, k.content) as content,
        COALESCE(v.metadata, k.metadata) as metadata,
        ((COALESCE(1.0 / (k_rrf + v.vector_rank), 0.0) * vector_weight) +
         (COALESCE(1.0 / (k_rrf + k.keyword_rank), 0.0) * (1.0 - vector_weight)))::float as rrf_score
    FROM vector_search v
    FULL OUTER JOIN keyword_search k ON v.id = k.id
    ORDER BY rrf_score DESC
    LIMIT match_count;
END;
$$;

-- PostgREST wywołuje RPC jako rola anon / authenticated — potrzebny EXECUTE:
GRANT EXECUTE ON FUNCTION public.hybrid_search_legal(text, vector(1536), integer, double precision, integer, text[])
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.hybrid_search_user(text, vector(1536), integer, double precision, integer, text[])
  TO anon, authenticated, service_role;

-- Odśwież cache schematu PostgREST po CREATE FUNCTION
NOTIFY pgrst, 'reload schema';
