-- Re-record-all + setup-check (job #838, Tom 2026-10-07; ruling r-2026-10-07-every-voice-artist-submits-a-10).
--
-- ADDITIVE ONLY. Nothing here deletes or rewrites a take.
--   ROLLBACK:  DROP TABLE recordist_take_resets, recordist_setup_checks;
--
-- 1. recordist_take_resets — one row per "Re-record all". The manifest names every
--    clip that was archived and every slot that was emptied, so the reset can be
--    undone exactly. The archived course_audio rows and their S3 bytes stay.
CREATE TABLE IF NOT EXISTS recordist_take_resets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id     text NOT NULL,
  language     text NOT NULL,
  archive_tag  text NOT NULL,        -- prefix put on voice_id of the archived rows
  reason       text,
  created_by   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  manifest     jsonb NOT NULL,       -- {clips:[{id, voice_id}], slots:[{table, id, column, was}]}
  restored_at  timestamptz,
  restored_by  text
);
CREATE INDEX IF NOT EXISTS recordist_take_resets_voice ON recordist_take_resets (voice_id, created_at DESC);

-- 2. recordist_setup_checks — one row per artist asked for a 10-phrase setup sample.
--    Row present and status <> 'approved' = the full script is locked for them.
CREATE TABLE IF NOT EXISTS recordist_setup_checks (
  voice_id     text PRIMARY KEY,
  language     text NOT NULL,
  phrases      jsonb NOT NULL,       -- [{id, text}] the ten lines, frozen at creation
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','submitted','approved','changes')),
  created_by   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  reviewed_by  text,
  reviewed_at  timestamptz,
  review_note  text,
  metrics      jsonb                 -- per-take level/noise/bass-treble, written at review
);

-- New tables arrive grant-open on this Supabase: close them. Only the service role reads these.
REVOKE ALL ON TABLE recordist_take_resets FROM anon, authenticated;
REVOKE ALL ON TABLE recordist_setup_checks FROM anon, authenticated;
ALTER TABLE recordist_take_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordist_setup_checks ENABLE ROW LEVEL SECURITY;
