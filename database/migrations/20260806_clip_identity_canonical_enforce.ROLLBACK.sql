-- Rollback for 20260806_clip_identity_canonical_enforce.sql
-- Removes the write-time canonicaliser and the two shape guards. Touches no
-- data. Run this before the functions rollback.

BEGIN;

DROP TRIGGER IF EXISTS trg_course_audio_canonical_identity ON course_audio;
DROP FUNCTION IF EXISTS course_audio_canonical_identity();



COMMIT;
