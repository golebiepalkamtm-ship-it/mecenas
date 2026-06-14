-- RLS: umożliw odczyt bazy wiedzy prawniczej zalogowanym użytkownikom
ALTER TABLE knowledge_base_legal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_base_legal_select_authenticated" ON knowledge_base_legal;
CREATE POLICY "knowledge_base_legal_select_authenticated"
  ON knowledge_base_legal
  FOR SELECT
  TO authenticated
  USING (true);

-- Opcjonalnie: odczyt anon dla publicznych aktów (jeśli JWT nie jest dostępny)
DROP POLICY IF EXISTS "knowledge_base_legal_select_anon" ON knowledge_base_legal;
CREATE POLICY "knowledge_base_legal_select_anon"
  ON knowledge_base_legal
  FOR SELECT
  TO anon
  USING (true);

ALTER TABLE knowledge_base_user ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_base_user_select_authenticated" ON knowledge_base_user;
CREATE POLICY "knowledge_base_user_select_authenticated"
  ON knowledge_base_user
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = metadata->>'user_id' OR metadata->>'user_id' IS NULL);
