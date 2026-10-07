-- Rollback for 20261007_course_seed_weave.sql (job #949).
-- Run AFTER course_round_index is back on its original definition
-- (database/changes/20261007_course_round_index_follows_weave.ROLLBACK.sql), because the new
-- definition reads course_running_order. Refuses while any course still has a weave row, so it
-- can never silently re-order a course: undo the data first
-- (tools/course-optimization/weave-cym-nv2-remove.sql).
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM course_seed_weave) OR EXISTS (SELECT 1 FROM course_seed_weave_drops) THEN
    RAISE EXCEPTION 'course_seed_weave still has rows; run weave-cym-nv2-remove.sql first';
  END IF;
END $$;
DROP VIEW IF EXISTS course_running_order;
DROP TABLE IF EXISTS course_seed_weave_drops;
DROP TABLE IF EXISTS course_seed_weave;
COMMIT;
NOTIFY pgrst, 'reload schema';
