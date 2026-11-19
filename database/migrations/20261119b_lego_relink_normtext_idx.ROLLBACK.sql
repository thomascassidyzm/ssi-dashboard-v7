-- cs #950 rollback: no function was changed, so dropping the index restores the exact previous state.
-- The live function definitions as they were before are in 20261119b_lego_relink_live_defs_before.sql.
SET lock_timeout = '10s';
SET statement_timeout = '10min';
DROP INDEX CONCURRENTLY IF EXISTS public.idx_course_audio_course_role_normtext;
