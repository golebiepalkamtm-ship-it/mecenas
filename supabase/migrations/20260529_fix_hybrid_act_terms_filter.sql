-- Naprawa filtra act_terms w hybrid_search_* (skróty KPA nie pasowały do filename).
-- Dopasowanie: filename, treść fragmentu, opcjonalnie metadata.act_terms (jsonb).
-- hybrid_search_user: ignoruje act_terms (akta klienta to skany/OCR, nie ustawy).

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
                     OR kb.content ILIKE '%' || term || '%'
                     OR (
                         kb.metadata ? 'act_terms'
                         AND kb.metadata->'act_terms' @> to_jsonb(term)
                     )
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
                     OR kb.content ILIKE '%' || term || '%'
                     OR (
                         kb.metadata ? 'act_terms'
                         AND kb.metadata->'act_terms' @> to_jsonb(term)
                     )
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
  -- act_terms ignorowane: dokumenty użytkownika nie są indeksowane per ustawa
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

GRANT EXECUTE ON FUNCTION public.hybrid_search_legal(text, vector(1536), integer, double precision, integer, text[])
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.hybrid_search_user(text, vector(1536), integer, double precision, integer, text[])
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
