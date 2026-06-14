CREATE OR REPLACE VIEW public.unique_legal_documents_view AS
SELECT
    MIN(id) AS representative_chunk_id,
    COALESCE(NULLIF(metadata->>'filename', ''), 'Dokument bez nazwy') AS name,
    COUNT(*) AS chunks,
    MIN(created_at) AS first_seen_at
FROM public.knowledge_base_legal
GROUP BY COALESCE(NULLIF(metadata->>'filename', ''), 'Dokument bez nazwy');

CREATE OR REPLACE VIEW public.unique_user_documents_view AS
SELECT
    MIN(id) AS representative_chunk_id,
    COALESCE(NULLIF(metadata->>'filename', ''), 'Dokument bez nazwy') AS name,
    COUNT(*) AS chunks,
    MIN(created_at) AS first_seen_at
FROM public.knowledge_base_user
GROUP BY COALESCE(NULLIF(metadata->>'filename', ''), 'Dokument bez nazwy');

GRANT SELECT ON public.unique_legal_documents_view TO anon, authenticated, service_role;
GRANT SELECT ON public.unique_user_documents_view TO anon, authenticated, service_role;
