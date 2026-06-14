-- =============================================================================
-- MIGRACJA: Naprawa embedding mismatch (1536 -> 1024) + Full-Text Search
-- =============================================================================
-- UWAGA: Ta migracja wyzeruje istniejące embeddingi!
-- Po uruchomieniu trzeba będzie przeindeksować dokumenty.
-- =============================================================================

-- 1. Aktualizacja: najpierw ustawiamy stare powiększone wektory na NULL, aby uniknąć bledu 22000
UPDATE knowledge_base SET embedding = NULL;

-- 2. Zmiana wymiaru kolumny embedding po jej wyczyszczeniu z 1536 na 1024
--    (bo Mixedbread mxbai-embed-large-v1 generuje NATYWNIE 1024 wymiarów)
ALTER TABLE knowledge_base 
ALTER COLUMN embedding TYPE vector(1024);

-- 2. Dodanie kolumny tsvector do Full-Text Search (zamiast ilike)
ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS content_tsv tsvector;

-- 3. Wypełnienie kolumny tsvector dla istniejących danych
UPDATE knowledge_base 
SET content_tsv = to_tsvector('simple', coalesce(content, ''));

-- 4. Indeks GIN na tsvector (bardzo szybkie wyszukiwanie)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tsv 
ON knowledge_base USING GIN (content_tsv);

-- 5. Trigger do automatycznej aktualizacji tsvector przy INSERT/UPDATE
CREATE OR REPLACE FUNCTION knowledge_base_tsv_trigger() 
RETURNS trigger AS $$
BEGIN
    NEW.content_tsv := to_tsvector('simple', coalesce(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_knowledge_base_tsv ON knowledge_base;
CREATE TRIGGER trg_knowledge_base_tsv
BEFORE INSERT OR UPDATE OF content ON knowledge_base
FOR EACH ROW EXECUTE FUNCTION knowledge_base_tsv_trigger();

-- 6. Aktualizacja funkcji match_knowledge (RPC) na nowy wymiar
DROP FUNCTION IF EXISTS match_knowledge(vector, float, int);

CREATE OR REPLACE FUNCTION match_knowledge(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id bigint,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.content,
        kb.metadata,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_base kb
    WHERE 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 7. Nowa funkcja RPC: Full-Text Search (zamiast ilike)
CREATE OR REPLACE FUNCTION search_knowledge_fts(
    search_query text,
    result_limit int DEFAULT 5
)
RETURNS TABLE (
    id bigint,
    content text,
    metadata jsonb,
    rank real
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.content,
        kb.metadata,
        ts_rank(kb.content_tsv, plainto_tsquery('simple', search_query)) AS rank
    FROM knowledge_base kb
    WHERE kb.content_tsv @@ plainto_tsquery('simple', search_query)
    ORDER BY rank DESC
    LIMIT result_limit;
END;
$$;

-- =============================================================================
-- PO MIGRACJI:
-- 1. Wyczyść cache embeddingów (usuń plik cache/query_embeddings.json)
-- 2. Przeindeksuj dokumenty (embeddingi trzeba wygenerować na nowo w 1024 dim)
-- =============================================================================
