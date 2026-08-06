-- Clip-identity canonical shape guard — NOT APPLIED YET. See the header.
--
-- WHY
-- The content-addressed design keys a clip on (language, text_normalized,
-- voice_id). On 2026-08-06 the estate spelt both fields many ways for the same
-- thing: 137 language values for ~60 languages (eng / en / en-GB / 'auto') and
-- ~100 voices carrying 2-3 voice_id spellings (azure_en-GB-SoniaNeural vs
-- en-GB-SoniaNeural, xai_leo vs comp:leo vs leo). 21,477 clip identities are
-- currently split across 154,571 rows purely by spelling. Canonical forms and
-- the reasoning: services/shared/clip-identity.cjs.
--
-- WHAT THIS DOES
-- Two CHECK constraints on the SHAPE of the two identity columns:
--   language  three lowercase letters, no region, no 'auto'
--   voice_id  '<provider>_<provider voice id>' from a closed provider set
-- Shape only. Whether 'eng' is the RIGHT code for a row is semantics, and
-- semantics stays in one place — canonicalLanguage()/canonicalVoiceId() in
-- services/shared/clip-identity.cjs. Duplicating the 92-code language table
-- into SQL would give two maps to keep in step, which is the bug this whole
-- exercise exists to remove. The shape check nonetheless rejects every drift
-- class actually observed: 'en', 'en-GB', 'auto', 'en-GB-SoniaNeural',
-- 'comp:leo', 'legacy_import'.
--
-- NOT VALID means existing rows are left exactly as they are — this migration
-- changes no data. Only new and updated rows are checked.
--
-- ⚠️ DO NOT APPLY UNTIL BOTH OF THESE ARE TRUE:
--   1. Every writer of course_audio.language / .voice_id composes its value
--      through services/shared/clip-identity.cjs. Apply this first and any
--      un-converted writer starts failing its inserts — that is a live audio
--      pipeline breaking, not a lint warning.
--   2. The reconciliation of the 158,153 existing non-canonical rows has been
--      approved and run (docs/audio-clip-identity-canonicalisation-2026-08-06.md),
--      or is knowingly deferred. Constraint and back-fill are separable, but
--      leaving old rows drifted means reads must still ask both spellings.
--
-- Rollback: 20260806_clip_identity_canonical_shape.ROLLBACK.sql

BEGIN;

ALTER TABLE course_audio
  ADD CONSTRAINT course_audio_language_canonical_shape
  CHECK (language ~ '^[a-z]{3}$')
  NOT VALID;

ALTER TABLE course_audio
  ADD CONSTRAINT course_audio_voice_id_canonical_shape
  CHECK (voice_id ~ '^(azure|xai|elevenlabs|google|narakeet|human)_.+')
  NOT VALID;

COMMENT ON CONSTRAINT course_audio_language_canonical_shape ON course_audio IS
  'Identity key: region-free three-letter database_code. canonicalLanguage() in services/shared/clip-identity.cjs.';
COMMENT ON CONSTRAINT course_audio_voice_id_canonical_shape ON course_audio IS
  'Identity key: <provider>_<provider voice id>. canonicalVoiceId() in services/shared/clip-identity.cjs.';

COMMIT;

-- Once the back-fill has run, promote each constraint with:
--   ALTER TABLE course_audio VALIDATE CONSTRAINT course_audio_language_canonical_shape;
--   ALTER TABLE course_audio VALIDATE CONSTRAINT course_audio_voice_id_canonical_shape;
-- VALIDATE takes only a SHARE UPDATE EXCLUSIVE lock, so it does not block
-- reads or writes on a 2.5M-row table.
