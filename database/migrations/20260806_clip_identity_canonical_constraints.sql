-- Clip identity, canonical forms — the shape constraints.
--
-- Part 3 of 3. Requires parts 1 and 2, AND requires the back-fill to have run.
--
-- ⚠️ ORDER MATTERS, AND NOT FOR THE OBVIOUS REASON. `NOT VALID` is usually read
-- as "existing rows are exempt". It is not: it exempts them from the one-off
-- validation scan, but the constraint is still evaluated on every UPDATE of an
-- existing row — including an update that does not touch the checked column.
-- Measured against the live schema on 2026-08-06: with these constraints on and
-- a drifted row still present, `UPDATE course_audio SET duration_ms = …` on that
-- row fails with course_audio_language_canonical_shape.
--
-- So applying this before the back-fill would make 158,153 rows un-updatable —
-- every veracity write, duration fix and relink against them would start
-- failing. Apply it after the back-fill, when there is nothing left to break.
--
-- Rollback: 20260806_clip_identity_canonical_constraints.ROLLBACK.sql

BEGIN;

ALTER TABLE course_audio
  ADD CONSTRAINT course_audio_language_canonical_shape
  CHECK (language ~ '^[a-z]{3}$')
  NOT VALID;

ALTER TABLE course_audio
  ADD CONSTRAINT course_audio_voice_id_canonical_shape
  CHECK (voice_id ~ '^(azure|xai|elevenlabs|google|narakeet|human)_.' OR voice_id ~ '^comp:')
  NOT VALID;

COMMENT ON CONSTRAINT course_audio_language_canonical_shape ON course_audio IS
  'Identity key: region-free three-letter database_code. canonical_language().';
COMMENT ON CONSTRAINT course_audio_voice_id_canonical_shape ON course_audio IS
  'Identity key: <provider>_<provider voice id>, or a comp: composite. canonical_voice_id().';

COMMIT;

-- Then promote both, once `node tools/audio-identity-lint.cjs` is clean:
--   ALTER TABLE course_audio VALIDATE CONSTRAINT course_audio_language_canonical_shape;
--   ALTER TABLE course_audio VALIDATE CONSTRAINT course_audio_voice_id_canonical_shape;
-- VALIDATE takes only SHARE UPDATE EXCLUSIVE, so it blocks neither reads nor
-- writes on a 2.5M-row table.
