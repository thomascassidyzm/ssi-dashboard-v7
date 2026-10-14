-- LEGO proof flags (job #496, Aran 2026-10-13): Aran proofing the Welsh relaunch ticks a LEGO that has an issue,
-- optionally with a short note. Read and written ONLY by the Popty server (services/lego-proof/), which runs as
-- service_role; the browser never touches this table directly.
--
-- ADDITIVE ONLY: one new table. No existing table, view or row is touched. The flag is a note ABOUT a LEGO, never a
-- change to it: no foreign key to course_legos on purpose, so a rebuild of the LEGOs can never be blocked or cascaded
-- by a proofing note (lego_id is the generated S####L## id, stable for a course's seed + lego index).
--   ROLLBACK: database/changes/20261013_lego_proof_flags.ROLLBACK.sql
BEGIN;

CREATE TABLE IF NOT EXISTS lego_proof_flags (
  course_code text NOT NULL,
  lego_id     text NOT NULL CHECK (lego_id ~ '^S[0-9]{4,}L[0-9]{2}$'),
  flagged     boolean NOT NULL DEFAULT true,
  note        text CHECK (note IS NULL OR length(note) <= 1000),
  flagged_by  text NOT NULL CHECK (btrim(flagged_by) <> ''),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_code, lego_id)
);

COMMENT ON TABLE lego_proof_flags IS
  'Proofing flags on LEGOs (job #496): one row per course + lego_id, upserted by the Popty LEGO proof page. Service role only.';

-- Explicit posture: new tables arrive grant-open on this Supabase, so close them. RLS on with NO policies = anon and
-- authenticated see nothing even if a grant ever reappears; only service_role (which bypasses RLS) reads and writes.
ALTER TABLE lego_proof_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE lego_proof_flags FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE lego_proof_flags TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
