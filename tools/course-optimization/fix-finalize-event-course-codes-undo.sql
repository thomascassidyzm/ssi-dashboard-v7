-- Undo for fix-finalize-event-course-codes-2026-10-07.sql (job #22): puts course_code back to
-- 'unknown' on exactly the backed-up events. Dry run unless invoked with  -v finish=COMMIT .
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
UPDATE content_edit_events e SET course_code = b.course_code FROM backup_finalize_event_codes_22 b WHERE e.id = b.id;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM content_edit_events e JOIN backup_finalize_event_codes_22 b ON b.id=e.id WHERE e.course_code <> b.course_code) THEN
    RAISE EXCEPTION 'CHECK FAILED'; END IF;
  RAISE NOTICE 'undo checks passed';
END $$;
SELECT 'finishing with' k, :'finish' v;
:finish;
