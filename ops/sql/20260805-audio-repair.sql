-- Non-destructive audio repair — schema (applied to the live DB 2026-08-05).
--
-- database/migrations is archived ("no new files go in this directory"); the
-- canonical record of DB state is ssi-learning-app/supabase/schema.sql. This
-- file is kept as the readable DDL behind the change, not as a migration to
-- be replayed.
--
-- WHY (2026-08-05). Tom found the live deu_for_eng course clipping badly and
-- ruled that repair must be preview / accept / replace, with the replacement
-- swapped IN PLACE AT THE SAME course_audio.id so client caches heal
-- themselves. The old repair tools all minted a NEW id, which for
-- role='presentation' means deleting a course_audio row — and
-- lego_introductions.presentation_audio_id is ON DELETE CASCADE, so the delete
-- takes the authored intro script with it. Same-id swap removes that whole
-- class of risk: no row is created, no row is deleted, no FK moves.
--
-- Same-id swap has one cost, and audio_revision is the payment. The learning
-- app serves audio as `Cache-Control: public, max-age=31536000, immutable`
-- (ssi-learning-app/api/audio/[audioId].ts) and player-vue caches blobs in
-- IndexedDB keyed by audio id. Fresh bytes under an unchanged URL would never
-- reach a device that already played the damaged clip. So the revision is
-- bumped on every accepted replacement and travels in the served URL as
-- `/api/audio/<id>?v=<rev>` — the URL changes, the id does not, immutable
-- caching survives intact.
--
-- Note what is NOT needed here: the unique index
-- `unique_course_audio_per_voice (course_code, text_normalized, language,
-- role, voice_id)` forced the old tools to tombstone text_normalized on the
-- outgoing row so the incoming one could exist. Under a same-id swap no
-- second row is ever created, so nothing collides and no tombstone is written.

-- ── 1. The revision that busts the immutable cache ──────────────────────────
ALTER TABLE course_audio
  ADD COLUMN IF NOT EXISTS audio_revision integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN course_audio.audio_revision IS
  'Bumped on every accepted in-place byte replacement. Travels in the learner-side URL as /api/audio/<id>?v=<rev> so the immutable cache header cannot serve superseded bytes. The id never changes.';

-- ── 2. Candidates: proposed, verified, not yet live ─────────────────────────
-- A candidate is a rendered-or-uploaded replacement that has already been
-- proved alive, correct-voiced and word-bearing, sitting in S3 under its own
-- key, referenced by nothing on the learner path. Proposing costs nothing but
-- money-for-TTS; it cannot damage anything.
CREATE TABLE IF NOT EXISTS audio_repair_candidates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id          uuid NOT NULL REFERENCES course_audio(id) ON DELETE CASCADE,
  course_code       text NOT NULL,
  source            text NOT NULL CHECK (source IN ('tts', 'upload')),
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'rejected', 'superseded')),
  s3_key            text NOT NULL,
  text              text NOT NULL,
  voice_id          text NOT NULL,
  duration_ms       integer,
  file_size_bytes   integer,
  veracity_checked  boolean,
  veracity_pass     boolean,
  veracity_reason   text,
  veracity_cer      real,
  mean_db           real,
  peak_db           real,
  proposed_by       text NOT NULL DEFAULT 'unknown',
  proposed_at       timestamptz NOT NULL DEFAULT now(),
  decided_by        text,
  decided_at        timestamptz,
  decision_reason   text,
  notes             jsonb
);

CREATE INDEX IF NOT EXISTS idx_audio_repair_candidates_audio
  ON audio_repair_candidates (audio_id, status);
CREATE INDEX IF NOT EXISTS idx_audio_repair_candidates_course
  ON audio_repair_candidates (course_code, proposed_at DESC);

COMMENT ON TABLE audio_repair_candidates IS
  'Verified replacement clips awaiting a HUMAN accept. Machines may flag audio; only humans may pass it. A pending candidate is referenced by nothing on the learner path.';

-- ── 3. History: what was superseded, by whom, when, and why ─────────────────
-- Nothing in the repair flow deletes a generated asset. The outgoing S3 object
-- stays exactly where it was; this table is what remembers it.
CREATE TABLE IF NOT EXISTS course_audio_revisions (
  id                    bigserial PRIMARY KEY,
  audio_id              uuid NOT NULL REFERENCES course_audio(id) ON DELETE CASCADE,
  course_code           text NOT NULL,
  revision              integer NOT NULL,
  previous_revision     integer NOT NULL,
  previous_s3_key       text NOT NULL,
  new_s3_key            text NOT NULL,
  previous_duration_ms  integer,
  new_duration_ms       integer,
  candidate_id          uuid REFERENCES audio_repair_candidates(id) ON DELETE SET NULL,
  source                text,
  accepted_by           text NOT NULL,
  reason                text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audio_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_course_audio_revisions_course
  ON course_audio_revisions (course_code, created_at DESC);

COMMENT ON TABLE course_audio_revisions IS
  'Supersession log for in-place audio replacement. previous_s3_key is retained, never deleted — the old object stays in the bucket and this row is how it is found again.';

-- ── 4. RLS. Producer-side tables: no anon/authenticated read. ───────────────
ALTER TABLE audio_repair_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_audio_revisions  ENABLE ROW LEVEL SECURITY;
