-- =========================================================================
-- AWARYJNA migracja FTS — gdy 20260520 nie może utworzyć konfiguracji `polish`
-- (błąd 42704 lub brak uprawnień do CREATE TEXT SEARCH CONFIGURATION)
-- =========================================================================
-- Uruchom TYLKO jeśli główna migracja nadal pada na `polish`.
-- Używa konfiguracji `simple` (dostępna w każdym Postgresie).

CREATE EXTENSION IF NOT EXISTS vector;

DROP INDEX IF EXISTS knowledge_base_legal_fts_polish_idx;
CREATE INDEX knowledge_base_legal_fts_simple_idx
ON knowledge_base_legal USING gin (to_tsvector('simple', content));

DROP INDEX IF EXISTS knowledge_base_user_fts_polish_idx;
CREATE INDEX knowledge_base_user_fts_simple_idx
ON knowledge_base_user USING gin (to_tsvector('simple', content));

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
        fts_q := websearch_to_tsquery('simple', query_text);
    EXCEPTION WHEN OTHERS THEN
        fts_q := plainto_tsquery('simple', coalesce(query_text, ''));
    END;
    IF fts_q IS NULL OR fts_q = ''::tsquery THEN
        fts_q := plainto_tsquery('simple', coalesce(query_text, ''));
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
                ORDER BY ts_rank(to_tsvector('simple', kb.content), fts_q) DESC
            ) as keyword_rank
        FROM knowledge_base_legal kb
        WHERE to_tsvector('simple', kb.content) @@ fts_q
          AND (
              act_terms IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM unnest(act_terms) AS term
                  WHERE kb.metadata->>'filename' ILIKE '%' || term || '%'
              )
          )
        ORDER BY ts_rank(to_tsvector('simple', kb.content), fts_q) DESC
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
        fts_q := websearch_to_tsquery('simple', query_text);
    EXCEPTION WHEN OTHERS THEN
        fts_q := plainto_tsquery('simple', coalesce(query_text, ''));
    END;
    IF fts_q IS NULL OR fts_q = ''::tsquery THEN
        fts_q := plainto_tsquery('simple', coalesce(query_text, ''));
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
                ORDER BY ts_rank(to_tsvector('simple', kb.content), fts_q) DESC
            ) as keyword_rank
        FROM knowledge_base_user kb
        WHERE to_tsvector('simple', kb.content) @@ fts_q
          AND (
              act_terms IS NULL
              OR EXISTS (
                  SELECT 1
                  FROM unnest(act_terms) AS term
                  WHERE kb.metadata->>'filename' ILIKE '%' || term || '%'
              )
          )
        ORDER BY ts_rank(to_tsvector('simple', kb.content), fts_q) DESC
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

GRANT EXECUTE ON FUNCTION public.hybrid_search_legal(text, vector(1536), integer, double precision, integer, text[])
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.hybrid_search_user(text, vector(1536), integer, double precision, integer, text[])
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
