-- Case memory JSONB (Faza 3) — stan sprawy między sesjami
CREATE TABLE IF NOT EXISTS case_memory (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    case_id TEXT,
    state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS case_memory_session_idx ON case_memory (session_id);
CREATE UNIQUE INDEX IF NOT EXISTS case_memory_session_unique ON case_memory (session_id);

-- Opcjonalny indeks orzeczeń SAOS (Faza 5 pre-index placeholder)
CREATE TABLE IF NOT EXISTS knowledge_base_judgments (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_base_judgments_hnsw_idx
ON knowledge_base_judgments USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;
