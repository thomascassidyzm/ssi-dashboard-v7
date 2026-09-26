-- Rollback of 20260926_clip_index.sql. The index is derived data (rebuilt by
-- tools/clip-index-backfill.cjs); dropping it loses nothing in course_audio.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS public.clip_index;
COMMIT;
NOTIFY pgrst, 'reload schema';
