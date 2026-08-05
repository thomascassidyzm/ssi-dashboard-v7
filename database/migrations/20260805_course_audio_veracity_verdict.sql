-- 20260805_course_audio_veracity_verdict.sql
--
-- Per-clip veracity verdicts, recorded at render time.
--
-- WHY: until now the audio-preview page could only INFER whether a clip had
-- been quality-checked, from its created_at against the date the gate shipped.
-- docs/gate-bypass-audit-2026-08-05.md showed that inference was false for
-- 100% of the 1,413 rows it selected. A date can only ever say "this clip was
-- rendered at a time when the gate existed" — it cannot distinguish
-- checked-and-passed from published-unchecked, and services/audio-veracity.cjs
-- carries an explicit `unchecked` state precisely because those two are not
-- the same thing.
--
-- These columns turn the page's claim into a measurement.
--
-- READ THE THREE-STATE RULE BEFORE USING THEM:
--   veracity_checked_at IS NULL            -> NEVER went through a veracity
--                                             check. Every row written before
--                                             this migration, and every row
--                                             written by a path that still
--                                             bypasses the gate. Honest label:
--                                             "unchecked". NOT a pass.
--   checked_at set, veracity_pass = true   -> checked and PASSED.
--   checked_at set, veracity_pass = false  -> checked and FAILED, yet the row
--                                             exists. On the gated path this
--                                             cannot happen (a failing clip is
--                                             never uploaded or inserted), so
--                                             a row in this state is a bug
--                                             worth seeing, not a shrug.
--   checked_at set, veracity_pass IS NULL  -> the gate RAN and could not check
--                                             (missing whisper, decode error,
--                                             gate switched off). veracity_reason
--                                             names which. Also NOT a pass.
--
-- All nullable with no default, so PostgreSQL adds them as catalogue-only
-- changes: no table rewrite on 2.5M rows.
--
-- Applied to production 2026-08-05.

ALTER TABLE course_audio
  ADD COLUMN IF NOT EXISTS veracity_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS veracity_pass       boolean,
  ADD COLUMN IF NOT EXISTS veracity_reason     text,
  ADD COLUMN IF NOT EXISTS veracity_cer        real,
  ADD COLUMN IF NOT EXISTS veracity_attempts   smallint,
  ADD COLUMN IF NOT EXISTS veracity_checker    text;

COMMENT ON COLUMN course_audio.veracity_checked_at IS
  'When a veracity check was ATTEMPTED on this clip at render time. NULL means no check ever ran — never read a NULL here as a pass.';
COMMENT ON COLUMN course_audio.veracity_pass IS
  'TRUE = checked and passed. FALSE = checked and failed (should be impossible on the gated path). NULL with veracity_checked_at set = the gate ran but could not check; see veracity_reason.';
COMMENT ON COLUMN course_audio.veracity_reason IS
  'Verdict code from services/audio-veracity.cjs: ok | non_speech_decode | cer_above_threshold | cer_above_unvalidated_language_threshold | unchecked_no_whisper | unchecked_disabled | unchecked_decode_error | unchecked_no_text.';
COMMENT ON COLUMN course_audio.veracity_cer IS
  'Character error rate of the unprimed whisper round-trip, when one was measured.';
COMMENT ON COLUMN course_audio.veracity_attempts IS
  'How many render attempts it took to pass. >1 means the first render was defective and was never published.';
COMMENT ON COLUMN course_audio.veracity_checker IS
  'Which code path recorded the verdict (phase8-generate, phase8-regenerate-role, phase8-generate-components, repair-silent-clips). course_audio otherwise records no writer, which the 2026-08-05 gate audit had to reconstruct from timestamp clusters.';

-- The audio-preview page asks one question per course: "of this course's clips,
-- which carry a verdict?" Partial, so it indexes only rows that have one — a
-- few thousand today against 2.5M rows, and it never grows to cover the
-- unchecked backlog.
CREATE INDEX IF NOT EXISTS idx_course_audio_veracity_checked
  ON course_audio (course_code, veracity_checked_at DESC)
  WHERE veracity_checked_at IS NOT NULL;
