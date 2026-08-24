-- Rollback for 20260806_clip_identity_canonical_functions.sql
-- Drops the canonicalisers and their lookup table. Touches no course_audio row
-- (the forward migration did not write any either). Will fail if the enforce
-- migration is still applied — drop that first, which is the correct order.

BEGIN;

DROP FUNCTION IF EXISTS try_canonical_voice_id(text);
DROP FUNCTION IF EXISTS try_canonical_language(text);
DROP FUNCTION IF EXISTS canonical_voice_id(text);
DROP FUNCTION IF EXISTS canonical_language(text);
DROP TABLE IF EXISTS language_canonical;

COMMIT;
