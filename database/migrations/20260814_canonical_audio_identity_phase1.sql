-- ============================================================================
-- Canonical audio identity — phase 1 (additive, reversible, make-before-break)
--
-- Tom's ruling, 2026-08-14: every English pod line is THE SAME line and should
-- be rendered once and shared. The audit (docs/english-pod-audio-duplication-
-- audit-2026-08-14.md, commit adc6fb23) located the fault in one column of one
-- constraint:
--
--   unique_course_audio_per_voice UNIQUE (course_code, text_normalized,
--                                         language, role, voice_id)
--
-- `course_code` sits INSIDE clip identity, so a canonical clip has no legal
-- home and every course is obliged to render its own copy. 58,170 English pod
-- clips exist where 17,545 would do; estate-wide, 2,564,255 course_audio rows
-- carry only 2,144,871 distinct clips.
--
-- This migration moves identity to `(canonical text, language, role, voice)`
-- in a new table with NO course_code column at all — the violation becomes
-- unrepresentable — and turns course_audio into a membership join that keeps
-- every existing FK holder (course_legos ×3, course_practice_phrases ×4,
-- course_seeds ×3, listening_pod_sentences ×2, lego_introductions,
-- audio_clip_flags, audio_clip_signoffs, audio_repair_candidates,
-- course_audio_envelope, course_audio_revisions) pointing at a course_audio id.
--
-- MAKE-BEFORE-BREAK. Nothing is dropped here. course_audio keeps every payload
-- column it has today, so every existing reader keeps working unchanged while
-- the canonical store is built alongside and reads are repointed one at a time.
-- No S3 object is deleted; no clip row is deleted. Rollback = the DOWN block
-- at the foot of this file.
--
-- Phase 2 (separate, separately approved) drops the payload columns from
-- course_audio and deletes the ~40,600 orphaned S3 objects.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Canonicalisation helpers — TOLERANT WRAPPERS, not a second convention.
--
-- The estate ALREADY has a clip-identity convention, enforced on every write by
-- BEFORE trigger `trg_course_audio_canonical_identity`:
--
--   canonical_language(code) — locale-stripped, resolved through the
--       `language_canonical` table (184 rows). Folds `en`→`eng`, `es-MX`→`spa`.
--   canonical_voice_id(v)    — provider-PREFIXED form: `eve` → `xai_eve`,
--       `en-GB-SoniaNeural` → `azure_en-GB-SoniaNeural`. (`eve` and `xai_eve`
--       are ONE voice — Tom's ruling, 2026-08-07.)
--   normalize_text(t)        — rtrim(lower(trim(t)), '.?!¿¡。？！').
--
-- These wrappers reuse those functions rather than inventing a rival mapping,
-- so a canonical clip key and a course_audio row agree by construction. The
-- only thing added is TOLERANCE: both estate functions RAISE on legacy
-- placeholder values, which is correct for a new write and fatal for a backfill
-- over rows that predate the rule —
--   language 'auto'  : 7,847 rows
--   voice 'legacy_import' / 'human' / 'human_recording' : 41,855 rows
-- Those keep their own literal value as their own identity: never merged with
-- anything, never able to abort the backfill. A placeholder is not a voice, so
-- refusing to guess which one it is is the honest behaviour.
--
-- audio_canon_text() adds one thing to normalize_text(): internal whitespace is
-- collapsed. text_normalized also holds TWO historical conventions — rows before
-- ~March 2026 keep a trailing '?', every row since has it stripped by the
-- trigger (154,257 stripped vs 5,305 kept; see services/shared/text-normalize.cjs
-- and the 2026-08-06 forensics). Re-applying normalize_text folds both.
--
-- STABLE, not IMMUTABLE: canonical_language() reads a table. That is fine here —
-- nothing indexes on these functions. audio_clips stores the computed key as
-- ordinary columns and the unique constraint is over those stored columns.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION audio_canon_text(t text) RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE AS $fn$
  SELECT normalize_text(regexp_replace(lower(trim(coalesce(t, ''))), '\s+', ' ', 'g'))
$fn$;

-- PARALLEL UNSAFE, not merely restricted: a plpgsql EXCEPTION block opens a
-- subtransaction, which a parallel worker cannot do — it fails with "cannot
-- start commands during a parallel operation". Declared PARALLEL SAFE, that
-- error hit the (then WHEN OTHERS) handler and the function returned the raw
-- value for codes it maps perfectly well, so one input yielded two keys inside
-- a single query. Both halves of that bug are fixed here: narrow handler, and
-- the honest parallel-safety label.
CREATE OR REPLACE FUNCTION audio_canon_voice(v text) RETURNS text
LANGUAGE plpgsql STABLE PARALLEL UNSAFE AS $fn$
BEGIN
  RETURN canonical_voice_id(v);
EXCEPTION WHEN check_violation THEN
  -- Legacy placeholder ('legacy_import', 'human', …) or an id with no inferable
  -- provider — canonical_voice_id raises check_violation for exactly those.
  -- Keep it verbatim as its own identity rather than guessing.
  --
  -- ONLY check_violation is caught. A WHEN OTHERS here swallowed a transient
  -- error during the first backfill attempt and returned the raw value for a
  -- code that maps perfectly well, so the same input produced two different
  -- keys in one query. A canonicalisation function that is not deterministic
  -- is worse than none.
  RETURN lower(btrim(coalesce(v, '')));
END
$fn$;

CREATE OR REPLACE FUNCTION audio_canon_lang(l text) RETURNS text
LANGUAGE plpgsql STABLE PARALLEL UNSAFE AS $fn$
BEGIN
  RETURN canonical_language(l);
EXCEPTION WHEN check_violation THEN
  -- 'auto' and friends: a placeholder, not a language. Its own identity.
  -- Narrow on purpose — see audio_canon_voice above for why WHEN OTHERS is a bug.
  RETURN lower(btrim(coalesce(l, '')));
END
$fn$;

COMMENT ON FUNCTION audio_canon_text(text)  IS 'Canonical clip text key: normalize_text() over whitespace-collapsed text, folding both historical text_normalized conventions.';
COMMENT ON FUNCTION audio_canon_voice(text) IS 'Canonical clip voice key: canonical_voice_id(), falling back to the literal value for legacy placeholders instead of raising.';
COMMENT ON FUNCTION audio_canon_lang(text)  IS 'Canonical clip language key: canonical_language(), falling back to the literal value for placeholders like ''auto'' instead of raising.';

-- ----------------------------------------------------------------------------
-- 2. The canonical clip store
--
-- The whole point of this table is the column it does NOT have. There is no
-- course_code here and there must never be one: that is what makes "this clip
-- belongs to one course" impossible to say.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audio_clips (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- identity
  text_key            text NOT NULL,
  language            text NOT NULL,
  role                text NOT NULL,
  voice_id            text NOT NULL,

  -- representative surface form, for humans and for TTS re-render
  text                text NOT NULL,

  -- payload
  s3_key              text NOT NULL,
  duration_ms         integer,
  file_size_bytes     integer,
  word_boundaries     jsonb,
  origin              text NOT NULL,

  -- quality
  veracity_checked_at timestamptz,
  veracity_pass       boolean,
  veracity_reason     text,
  veracity_cer        real,
  veracity_attempts   smallint,
  veracity_checker    text,

  audio_revision      integer NOT NULL DEFAULT 1,

  -- provenance: the course_audio row this canon was taken from. Deliberately
  -- NOT a foreign key — the canon must survive that row's course being dropped.
  source_audio_id     uuid,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT audio_clips_origin_check CHECK (origin IN ('tts', 'human')),
  CONSTRAINT audio_clips_role_check CHECK (role IN (
    'known','target1','target2','presentation','welcome','encouragement','instruction',
    'bookend_listen_intro','bookend_listen_outro','pod_explainer','pod_fine_known','pod_take_g')),
  -- a placeholder can never be canon: canon means "these bytes exist"
  CONSTRAINT audio_clips_not_pending CHECK (s3_key NOT LIKE 'pending/%'),
  CONSTRAINT audio_clips_identity UNIQUE (text_key, language, role, voice_id)
);

COMMENT ON TABLE audio_clips IS
  'Canonical audio clips. Identity is (text_key, language, role, voice_id) and NOTHING ELSE. There is deliberately no course_code column: course membership is expressed by course_audio rows pointing here, so one line rendered once is the only representable state. Tom''s ruling 2026-08-14; audit docs/english-pod-audio-duplication-audit-2026-08-14.md.';
COMMENT ON COLUMN audio_clips.source_audio_id IS 'course_audio row this canon was selected from. Not an FK on purpose — canon outlives any one course.';

CREATE INDEX IF NOT EXISTS idx_audio_clips_lookup ON audio_clips (text_key, language, role, voice_id);
CREATE INDEX IF NOT EXISTS idx_audio_clips_s3     ON audio_clips (s3_key);
CREATE INDEX IF NOT EXISTS idx_audio_clips_voice  ON audio_clips (voice_id, language);
CREATE INDEX IF NOT EXISTS idx_audio_clips_origin ON audio_clips (origin) WHERE origin = 'human';

-- ----------------------------------------------------------------------------
-- 3. Membership: course_audio gains a pointer, loses nothing.
--
-- ON DELETE RESTRICT: a canonical clip may not be deleted while any course
-- still uses it. Deleting shared audio is precisely the failure the 2026-08-03
-- fra_for_eng purge caused, and this constraint makes it a database error.
-- ----------------------------------------------------------------------------

ALTER TABLE course_audio
  ADD COLUMN IF NOT EXISTS clip_id uuid REFERENCES audio_clips(id) ON DELETE RESTRICT;

COMMENT ON COLUMN course_audio.clip_id IS
  'The canonical clip this course_audio row is a membership of. course_audio is becoming a thin join (course_code, clip_id, lego_id, sequence); the payload columns beside this one are a make-before-break mirror kept alive until every reader is repointed.';

CREATE INDEX IF NOT EXISTS idx_course_audio_clip ON course_audio (clip_id) WHERE clip_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. Promotion log
--
-- A canonical clip can be UPGRADED in place — a human recording arriving for a
-- line the estate had only as TTS replaces it as canon for every course at
-- once. That is the intended behaviour of one-line-one-take, and it is also an
-- estate-wide audible change made by a single upload, so every one is logged
-- with the old s3_key: the log is what makes it reversible.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audio_clip_promotions (
  id             bigserial PRIMARY KEY,
  clip_id        uuid NOT NULL REFERENCES audio_clips(id) ON DELETE CASCADE,
  old_s3_key     text NOT NULL,
  new_s3_key     text NOT NULL,
  old_origin     text,
  new_origin     text,
  old_revision   integer,
  new_revision   integer,
  reason         text NOT NULL,
  source_audio_id uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audio_clip_promotions_clip ON audio_clip_promotions (clip_id, created_at DESC);

COMMENT ON TABLE audio_clip_promotions IS
  'Every in-place upgrade of a canonical clip, with the superseded s3_key. Reversal evidence for an estate-wide audible change.';

COMMIT;

-- ============================================================================
-- DOWN (rollback). Additive only, so the rollback is a clean drop.
--
--   BEGIN;
--   DROP TRIGGER IF EXISTS trg_course_audio_canonicalise ON course_audio;
--   DROP FUNCTION IF EXISTS course_audio_canonicalise();
--   ALTER TABLE course_audio DROP COLUMN IF EXISTS clip_id;
--   DROP TABLE IF EXISTS audio_clip_promotions;
--   DROP TABLE IF EXISTS audio_clips;
--   DROP FUNCTION IF EXISTS audio_canon_text(text);
--   DROP FUNCTION IF EXISTS audio_canon_voice(text);
--   DROP FUNCTION IF EXISTS audio_canon_lang(text);
--   COMMIT;
--
-- Nothing above this line modifies an existing column or row, so the rollback
-- restores the pre-migration state exactly.
-- ============================================================================
