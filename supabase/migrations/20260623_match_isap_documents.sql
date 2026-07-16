-- =========================================================================
-- MIGRACJA SUPABASE: ISAP VECTORS TABLE & RPC SEARCH FUNCTION
-- =========================================================================
-- Cel: Przechowywanie zindeksowanych aktów prawnych z Sejmu (ISAP/ELI) 
--      oraz funkcja wyszukiwania podobieństwa wektorowego (pgvector).
-- Uruchom ten kod w SQL Editorze w panelu Supabase.

-- 1. Upewnij się, że rozszerzenie vector jest włączone
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Utworzenie tabeli dla wektorów aktów prawnych ISAP
CREATE TABLE IF NOT EXISTS isap_vectors (
    id text PRIMARY KEY,
    eli text,
    title text,
    content text,
    embedding vector(1536)
);

-- 3. Utworzenie indeksu HNSW dla szybkiego wyszukiwania wektorowego (odległość cosinusowa)
CREATE INDEX IF NOT EXISTS isap_vectors_hnsw_idx 
ON isap_vectors USING hnsw (embedding vector_cosine_ops);

-- 4. Funkcja wyszukiwania podobieństwa wektorowego dla ISAP
CREATE OR REPLACE FUNCTION match_isap_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.1,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id text,
    eli text,
    title text,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        iv.id,
        iv.eli,
        iv.title,
        iv.content,
        (1 - (iv.embedding <=> query_embedding))::float AS similarity
    FROM isap_vectors iv
    WHERE 1 - (iv.embedding <=> query_embedding) > match_threshold
    ORDER BY iv.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
