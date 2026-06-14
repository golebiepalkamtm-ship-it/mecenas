DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'legal_source_type') THEN
    CREATE TYPE legal_source_type AS ENUM (
      'constitution',
      'statute',
      'regulation',
      'case_law',
      'user_doc'
    );
  END IF;
END
$$;

ALTER TABLE public.knowledge_base_legal
  ADD COLUMN IF NOT EXISTS source_type legal_source_type NOT NULL DEFAULT 'statute',
  ADD COLUMN IF NOT EXISTS act_terms text[];

ALTER TABLE public.knowledge_base_user
  ADD COLUMN IF NOT EXISTS source_type legal_source_type NOT NULL DEFAULT 'user_doc';

UPDATE public.knowledge_base_legal
SET source_type = 'constitution'
WHERE (metadata->>'filename' ILIKE '%konstytuc%')
   OR (metadata->>'title' ILIKE '%konstytuc%');

UPDATE public.knowledge_base_legal
SET source_type = 'regulation'
WHERE (metadata->>'filename' ILIKE '%rozporzadzen%')
   OR (metadata->>'filename' ILIKE '%rozporządzen%')
   OR (metadata->>'title' ILIKE '%rozporzadzen%')
   OR (metadata->>'title' ILIKE '%rozporządzen%');

UPDATE public.knowledge_base_user
SET source_type = 'user_doc'
WHERE source_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_kb_legal_source_type
  ON public.knowledge_base_legal(source_type);

CREATE INDEX IF NOT EXISTS idx_kb_user_source_type
  ON public.knowledge_base_user(source_type);

CREATE INDEX IF NOT EXISTS idx_kb_legal_act_terms
  ON public.knowledge_base_legal USING gin (act_terms);

CREATE OR REPLACE FUNCTION public.hybrid_search_legal_v2(
  query_text text,
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  vector_weight float DEFAULT 0.5,
  k_rrf int DEFAULT 60,
  act_terms text[] DEFAULT NULL,
  allowed_source_types legal_source_type[] DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  source_type legal_source_type,
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
      kb.id,
      kb.content,
      kb.metadata,
      kb.source_type,
      ROW_NUMBER() OVER (ORDER BY kb.embedding <=> query_embedding) AS vector_rank
    FROM public.knowledge_base_legal kb
    WHERE kb.embedding IS NOT NULL
      AND (
        allowed_source_types IS NULL
        OR kb.source_type = ANY(allowed_source_types)
      )
      AND (
        act_terms IS NULL
        OR (
          (kb.act_terms IS NOT NULL AND kb.act_terms && act_terms)
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
      )
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  keyword_search AS (
    SELECT
      kb.id,
      kb.content,
      kb.metadata,
      kb.source_type,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank(to_tsvector('polish', kb.content), fts_q) DESC
      ) AS keyword_rank
    FROM public.knowledge_base_legal kb
    WHERE to_tsvector('polish', kb.content) @@ fts_q
      AND (
        allowed_source_types IS NULL
        OR kb.source_type = ANY(allowed_source_types)
      )
      AND (
        act_terms IS NULL
        OR (
          (kb.act_terms IS NOT NULL AND kb.act_terms && act_terms)
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
      )
    ORDER BY ts_rank(to_tsvector('polish', kb.content), fts_q) DESC
    LIMIT match_count * 3
  )
  SELECT
    COALESCE(v.id, k.id) AS id,
    COALESCE(v.content, k.content) AS content,
    COALESCE(v.metadata, k.metadata) AS metadata,
    COALESCE(v.source_type, k.source_type) AS source_type,
    (
      (COALESCE(1.0 / (k_rrf + v.vector_rank), 0.0) * vector_weight) +
      (COALESCE(1.0 / (k_rrf + k.keyword_rank), 0.0) * (1.0 - vector_weight))
    )::float AS rrf_score
  FROM vector_search v
  FULL OUTER JOIN keyword_search k ON v.id = k.id
  ORDER BY rrf_score DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.hybrid_search_user_v2(
  query_text text,
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  vector_weight float DEFAULT 0.5,
  k_rrf int DEFAULT 60,
  allowed_source_types legal_source_type[] DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  source_type legal_source_type,
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
      kb.id,
      kb.content,
      kb.metadata,
      kb.source_type,
      ROW_NUMBER() OVER (ORDER BY kb.embedding <=> query_embedding) AS vector_rank
    FROM public.knowledge_base_user kb
    WHERE kb.embedding IS NOT NULL
      AND (
        allowed_source_types IS NULL
        OR kb.source_type = ANY(allowed_source_types)
      )
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  keyword_search AS (
    SELECT
      kb.id,
      kb.content,
      kb.metadata,
      kb.source_type,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank(to_tsvector('polish', kb.content), fts_q) DESC
      ) AS keyword_rank
    FROM public.knowledge_base_user kb
    WHERE to_tsvector('polish', kb.content) @@ fts_q
      AND (
        allowed_source_types IS NULL
        OR kb.source_type = ANY(allowed_source_types)
      )
    ORDER BY ts_rank(to_tsvector('polish', kb.content), fts_q) DESC
    LIMIT match_count * 3
  )
  SELECT
    COALESCE(v.id, k.id) AS id,
    COALESCE(v.content, k.content) AS content,
    COALESCE(v.metadata, k.metadata) AS metadata,
    COALESCE(v.source_type, k.source_type) AS source_type,
    (
      (COALESCE(1.0 / (k_rrf + v.vector_rank), 0.0) * vector_weight) +
      (COALESCE(1.0 / (k_rrf + k.keyword_rank), 0.0) * (1.0 - vector_weight))
    )::float AS rrf_score
  FROM vector_search v
  FULL OUTER JOIN keyword_search k ON v.id = k.id
  ORDER BY rrf_score DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hybrid_search_legal_v2(
  text,
  vector(1536),
  integer,
  double precision,
  integer,
  text[],
  public.legal_source_type[]
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.hybrid_search_user_v2(
  text,
  vector(1536),
  integer,
  double precision,
  integer,
  public.legal_source_type[]
) TO anon, authenticated, service_role;

