-- Private booth links (job #380, Aran 2026-10-14): one row per recording voice holding the HASH of its booth-link
-- key. The Popty server (services/voice-engine/booth-link-keys.cjs), running as service_role, is the only reader
-- and writer; the browser never touches this table directly.
--
-- key_hash = sha256(token), hex. nonce = the random 128-bit input the server's secret derives the token from, so
-- the server can re-show a link; the token itself is never stored, and this table alone opens no booth.
--
-- ADDITIVE ONLY: one new table. No existing table, view or row is touched.
--   ROLLBACK: database/changes/20261014_booth_link_keys.ROLLBACK.sql
BEGIN;

CREATE TABLE IF NOT EXISTS booth_link_keys (
  voice_id    text PRIMARY KEY CHECK (btrim(voice_id) <> ''),
  key_hash    text NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  nonce       text,
  created_by  text NOT NULL CHECK (btrim(created_by) <> ''),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE booth_link_keys IS
  'Private recording-booth link keys (job #380): sha256 of each voice''s link key. Service role only.';

-- Explicit posture: new tables arrive grant-open on this Supabase, so close them. RLS on with NO policies = anon and
-- authenticated see nothing even if a grant ever reappears; only service_role (which bypasses RLS) reads and writes.
ALTER TABLE booth_link_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE booth_link_keys FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE booth_link_keys TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
