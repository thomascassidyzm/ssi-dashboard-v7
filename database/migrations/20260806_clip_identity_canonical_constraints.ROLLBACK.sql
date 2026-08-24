-- Rollback for 20260806_clip_identity_canonical_constraints.sql
-- Drops the two shape guards. Touches no data.

BEGIN;

ALTER TABLE course_audio DROP CONSTRAINT IF EXISTS course_audio_language_canonical_shape;
ALTER TABLE course_audio DROP CONSTRAINT IF EXISTS course_audio_voice_id_canonical_shape;

COMMIT;
