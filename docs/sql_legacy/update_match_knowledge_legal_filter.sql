-- Aktualizacja funkcji RPC `match_knowledge_legal` o możliwość filtrowania wektorowego po nazwie aktu
-- Jeśli `act_terms` nie jest NULL, filtruje pliki, których metadata->>'filename' pasuje do któregokolwiek z terminów (ILIKE).

DROP FUNCTION IF EXISTS match_knowledge_legal(vector(1536), float, int);

CREATE OR REPLACE FUNCTION match_knowledge_legal(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    act_terms text[] DEFAULT NULL
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
    FROM knowledge_base_legal kb
    WHERE 1 - (kb.embedding <=> query_embedding) > match_threshold
      AND (
          act_terms IS NULL
          OR EXISTS (
              SELECT 1 
              FROM unnest(act_terms) AS term
              WHERE kb.metadata->>'filename' ILIKE '%' || term || '%'
          )
      )
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;