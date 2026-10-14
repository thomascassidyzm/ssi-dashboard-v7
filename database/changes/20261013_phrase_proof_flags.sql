-- Practice-phrase proof flags (job #562, Aran 2026-10-13): the phrase-level sibling of lego_proof_flags. Aran proofing the
-- Welsh relaunch ticks a practice phrase that has an issue, optionally with a short note. Read and written ONLY by the
-- Popty server (services/phrase-proof/), which runs as service_role; the browser never touches this table directly.
--
-- ADDITIVE ONLY: one new table. No existing table, view or row is touched. The flag is a note ABOUT a phrase, never a
-- change to it: no foreign key to course_practice_phrases on purpose, so a rebuild or a phrase move can never be blocked
-- or cascaded by a proofing note (phrase_id is course_practice_phrases.id, e.g. cym_nv2_for_eng:S0001L02B01).
--   ROLLBACK: database/changes/20261013_phrase_proof_flags.ROLLBACK.sql
BEGIN;

CREATE TABLE IF NOT EXISTS phrase_proof_flags (
  course_code text NOT NULL,
  phrase_id   text NOT NULL CHECK (phrase_id ~ '^[a-z0-9_]+:S[0-9]{4,}L[0-9]{2}[A-Z][0-9]{2,}$'),
  flagged     boolean NOT NULL DEFAULT true,
  note        text CHECK (note IS NULL OR length(note) <= 1000),
  flagged_by  text NOT NULL CHECK (btrim(flagged_by) <> ''),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_code, phrase_id)
);

COMMENT ON TABLE phrase_proof_flags IS
  'Proofing flags on practice phrases (job #562): one row per course + phrase id, upserted by the Popty phrase proof page. Service role only.';

-- Same posture as lego_proof_flags: new tables arrive grant-open on this Supabase, so close them. RLS on with NO
-- policies = anon and authenticated see nothing even if a grant reappears; only service_role reads and writes.
ALTER TABLE phrase_proof_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE phrase_proof_flags FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE phrase_proof_flags TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
