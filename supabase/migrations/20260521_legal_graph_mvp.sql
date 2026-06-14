-- MVP Legal Graph w Postgres (Supabase) — encje i krawędzie dla śledztwa
-- Uruchom w SQL Editor lub supabase db push

CREATE TABLE IF NOT EXISTS legal_entities (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    canonical_label TEXT NOT NULL,
    external_ref TEXT,
    source_session TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_entities_type ON legal_entities (entity_type);
CREATE INDEX IF NOT EXISTS idx_legal_entities_label ON legal_entities (canonical_label);

CREATE TABLE IF NOT EXISTS legal_edges (
    id BIGSERIAL PRIMARY KEY,
    from_entity_id BIGINT REFERENCES legal_entities(id) ON DELETE CASCADE,
    to_entity_id BIGINT REFERENCES legal_entities(id) ON DELETE CASCADE,
    rel_type TEXT NOT NULL,
    source_evidence_id TEXT,
    confidence REAL DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_edges_from ON legal_edges (from_entity_id);
CREATE INDEX IF NOT EXISTS idx_legal_edges_to ON legal_edges (to_entity_id);

ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_edges ENABLE ROW LEVEL SECURITY;

-- Service role pełny dostęp z backendu; anon/authenticated bez polityk = brak publicznego odczytu
-- (dostosuj polityki jeśli klient ma czytać graf)

GRANT SELECT, INSERT, UPDATE, DELETE ON legal_entities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON legal_edges TO service_role;
GRANT USAGE, SELECT ON SEQUENCE legal_entities_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE legal_edges_id_seq TO service_role;
