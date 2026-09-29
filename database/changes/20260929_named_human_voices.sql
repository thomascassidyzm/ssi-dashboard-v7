-- Named human voices (job #703, Tom 2026-09-29 00:49Z).
--
-- "human recordings are tracked as named voices (voice artist, language/dialect,
-- gender, text) and enter the SAME library."
--
-- ADDITIVE ONLY. Nothing here rewrites course_audio, and every object below can
-- be dropped without touching a learner-facing row:
--   ROLLBACK:  DROP TABLE human_speaker_group_members, human_speaker_groups, human_clip_attribution, clip_spoken_text;
--              ALTER TABLE voices DROP COLUMN clip_language, DROP COLUMN dialect;
--              DELETE FROM clip_index WHERE indexed_by LIKE 'reconcile-703%';
--
-- 1. voices gains the two things a human artist has that a TTS voice does not:
--    the estate's clip-language key ('cym_n' — region is a different language,
--    Tom 2026-09-26) and a display dialect ('north'). Gender already exists and
--    keeps its rule: NULL means genuinely unknown, never "probably".
ALTER TABLE voices ADD COLUMN IF NOT EXISTS clip_language text;
ALTER TABLE voices ADD COLUMN IF NOT EXISTS dialect text;
COMMENT ON COLUMN voices.clip_language IS 'The estate''s language key for this artist''s clips (cym_n, cym_s, deu_at, fin) — the part of the course code before _for_. Human artists only.';
COMMENT ON COLUMN voices.dialect IS 'Display dialect of a human artist (north, south, at). The routing key is clip_language, never this.';

-- 2. WHO SPOKE A LEGACY CLIP. course_audio.voice_id stays exactly as written
--    ('legacy_import' says "a person, unnamed"); the attribution lives beside it,
--    with the evidence that justified it, so it can be audited and undone row by
--    row. clip_index reads it; nothing else has to.
CREATE TABLE IF NOT EXISTS human_clip_attribution (
  audio_id      uuid PRIMARY KEY REFERENCES course_audio(id) ON DELETE CASCADE,
  voice_id      text NOT NULL,
  basis         text NOT NULL,      -- policy-alias | named-by-ear | acoustic-anchor
  group_id      text,               -- human_speaker_groups.group_id when the basis is a group
  attributed_by text NOT NULL,
  attributed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS human_clip_attribution_voice ON human_clip_attribution (voice_id);

-- 3. A LIKELY-SPEAKER GROUP awaiting a name by ear. Members are clips; the group
--    is what Tom listens to. voice_id stays NULL until a human names it — a group
--    is never named by a guess.
CREATE TABLE IF NOT EXISTS human_speaker_groups (
  group_id       text PRIMARY KEY,           -- e.g. cym_s.target1.g2
  course_code    text NOT NULL,
  role           text NOT NULL,
  language       text NOT NULL,
  est_gender     text,                       -- from pitch: f | m — evidence, not a name
  f0_median_hz   numeric,
  clip_count     integer NOT NULL,
  sample_audio_ids uuid[] NOT NULL DEFAULT '{}',
  voice_id       text,                       -- NULL = not yet named
  named_by       text,
  named_at       timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS human_speaker_group_members (
  audio_id  uuid PRIMARY KEY REFERENCES course_audio(id) ON DELETE CASCADE,
  group_id  text NOT NULL REFERENCES human_speaker_groups(group_id) ON DELETE CASCADE,
  basis     text NOT NULL                     -- seed-block | acoustic-nearest
);
CREATE INDEX IF NOT EXISTS human_speaker_group_members_group ON human_speaker_group_members (group_id);

-- 4. THE WORDS A CLIP ACTUALLY SAYS, where they differ from course_audio.text
--    (gender-expanded target takes are stored under their unexpanded label; a
--    clip rendered after its expansion existed says the expansion). basis names
--    the evidence: the S3 object was written at/after the expansion row.
CREATE TABLE IF NOT EXISTS clip_spoken_text (
  audio_id     uuid PRIMARY KEY REFERENCES course_audio(id) ON DELETE CASCADE,
  spoken_text  text NOT NULL,          -- equal to course_audio.text when the check found the clip says its label
  basis        text NOT NULL,
  audio_revision integer NOT NULL,     -- the clip revision that was checked; a later revision is unchecked again
  checked_at   timestamptz NOT NULL DEFAULT now()
);

-- New Supabase tables arrive grant-open to anon; these are internal.
ALTER TABLE human_clip_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_speaker_groups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_spoken_text       ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_speaker_group_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON human_clip_attribution, human_speaker_groups, human_speaker_group_members, clip_spoken_text FROM anon, authenticated;
