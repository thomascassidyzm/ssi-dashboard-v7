-- Job #22 (cross-check of the North run): v2 finalize events for the two Welsh sandboxes were logged
-- with course_code 'unknown', because the content-edit gate's COURSE_CODE_RE
-- (services/shared/content-write-surfaces.cjs) is /^[a-z]{2,4}_for_[a-z]{2,4}$/ and cannot match a
-- code with a digit or a dialect segment (cym_nv2_for_eng, cym_sv2_for_eng — and 29 others, live
-- cym_n/cym_s included). This puts the real code on exactly those events whose LEGO/seed rows prove
-- which course they wrote: an 'unknown' decomposition-finalize event is relabelled to the one course
-- whose course_legos/course_seeds carry its id, and refused if that is not exactly one course.
-- Only content_edit_events.course_code changes. Backup: backup_finalize_event_codes_22.
-- Dry run unless invoked with  -v finish=COMMIT .  Undo: fix-finalize-event-course-codes-undo.sql
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
CREATE TEMP TABLE fix AS
SELECT e.id, e.course_code AS old_code,
       (SELECT string_agg(DISTINCT c, ',') FROM (
          SELECT course_code c FROM course_legos WHERE last_edit_event_id = e.id
          UNION SELECT course_code FROM course_seeds WHERE last_edit_event_id = e.id) x) AS new_code
FROM content_edit_events e
WHERE e.course_code = 'unknown' AND e.operation = 'decomposition-finalize'
  AND e.actor_id IN ('claude-job-997-hc-legos', 'claude-job-22-south-hc-legos');
SELECT new_code, count(*) FROM fix GROUP BY 1 ORDER BY 1;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM fix WHERE new_code IS NULL OR new_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')) THEN
    RAISE EXCEPTION 'an event does not resolve to exactly one sandbox'; END IF;
  IF (SELECT count(*) FROM fix WHERE new_code='cym_nv2_for_eng') <> 24 OR (SELECT count(*) FROM fix WHERE new_code='cym_sv2_for_eng') <> 2 THEN
    RAISE EXCEPTION 'expected 24 North + 2 South events'; END IF;
  IF to_regclass('backup_finalize_event_codes_22') IS NOT NULL THEN RAISE EXCEPTION 'already applied'; END IF;
END $$;
CREATE TABLE backup_finalize_event_codes_22 AS SELECT id, old_code AS course_code, new_code FROM fix;
REVOKE ALL ON backup_finalize_event_codes_22 FROM anon, authenticated;
UPDATE content_edit_events e SET course_code = f.new_code FROM fix f WHERE e.id = f.id;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM content_edit_events e JOIN fix f ON f.id=e.id WHERE e.course_code <> f.new_code) THEN
    RAISE EXCEPTION 'CHECK FAILED'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT 'finishing with' k, :'finish' v;
:finish;
