-- =========================================================================
-- MIGRACJA SUPABASE: POLISH HYBRID SEARCH (pgvector + FTS + RRF)
-- =========================================================================
-- Cel: Lematyzacja języka polskiego dla RAG, odporność na znaki specjalne,
--      oraz fuzja Reciprocal Rank Fusion (RRF).
-- Uruchom ten kod w SQL Editorze w panelu Supabase.

-- 1. Upewnij się, że rozszerzenie vector jest włączone
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Utworzenie indeksu GIN dla wyszukiwania pełnotekstowego z konfiguracją 'polish'
-- Używamy indeksu na wyrażeniu to_tsvector('polish', content) dla maksymalnej wydajności
CREATE INDEX IF NOT EXISTS knowledge_base_legal_fts_polish_idx 
ON knowledge_base_legal USING gin (to_tsvector('polish', content));

CREATE INDEX IF NOT EXISTS knowledge_base_user_fts_polish_idx 
ON knowledge_base_user USING gin (to_tsvector('polish', content));

-- 3. Utworzenie indeksu HNSW dla szybkiego wyszukiwania wektorowego (odległość cosinusowa)
CREATE INDEX IF NOT EXISTS knowledge_base_legal_hnsw_idx 
ON knowledge_base_legal USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS knowledge_base_user_hnsw_idx 
ON knowledge_base_user USING hnsw (embedding vector_cosine_ops);


-- 4. Funkcja wyszukiwania hybrydowego dla BAZY WIEDZY PRAWNEJ
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
BEGIN
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
                ORDER BY ts_rank(to_tsvector('polish', kb.content), websearch_to_tsquery('polish', query_text)) DESC
            ) as keyword_rank
        FROM knowledge_base_legal kb
        WHERE to_tsvector('polish', kb.content) @@ websearch_to_tsquery('polish', query_text)
          AND (
              act_terms IS NULL
              OR EXISTS (
                  SELECT 1 
                  FROM unnest(act_terms) AS term
                  WHERE kb.metadata->>'filename' ILIKE '%' || term || '%'
              )
          )
        ORDER BY ts_rank(to_tsvector('polish', kb.content), websearch_to_tsquery('polish', query_text)) DESC
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


-- 5. Funkcja wyszukiwania hybrydowego dla PLIKÓW UŻYTKOWNIKA
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
BEGIN
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
                ORDER BY ts_rank(to_tsvector('polish', kb.content), websearch_to_tsquery('polish', query_text)) DESC
            ) as keyword_rank
        FROM knowledge_base_user kb
        WHERE to_tsvector('polish', kb.content) @@ websearch_to_tsquery('polish', query_text)
          AND (
              act_terms IS NULL
              OR EXISTS (
                  SELECT 1 
                  FROM unnest(act_terms) AS term
                  WHERE kb.metadata->>'filename' ILIKE '%' || term || '%'
              )
          )
        ORDER BY ts_rank(to_tsvector('polish', kb.content), websearch_to_tsquery('polish', query_text)) DESC
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
