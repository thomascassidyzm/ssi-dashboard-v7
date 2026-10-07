-- Undo for weave-cym-sv2-already-taught.sql (job #22): puts is_new and last_edit_event_id back on
-- the 168 LEGOs exactly as backup_cym_sv2_isnew_22b holds them. Nothing else is touched.
-- Dry run unless invoked with  -v finish=COMMIT .
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
DO $$ BEGIN
  IF to_regclass('backup_cym_sv2_isnew_22b') IS NULL THEN RAISE EXCEPTION 'backup missing'; END IF;
  IF (SELECT count(*) FROM backup_cym_sv2_isnew_22b) <> 168 THEN RAISE EXCEPTION 'backup is not 168 rows'; END IF;
END $$;
UPDATE course_legos l SET is_new = b.is_new, last_edit_event_id = b.last_edit_event_id
FROM backup_cym_sv2_isnew_22b b WHERE l.id = b.id AND l.course_code='cym_sv2_for_eng';
DO $$ BEGIN
  IF (SELECT count(*) FROM course_legos l JOIN backup_cym_sv2_isnew_22b b ON b.id=l.id WHERE l.is_new IS DISTINCT FROM b.is_new) <> 0 THEN
    RAISE EXCEPTION 'CHECK FAILED: not all restored'; END IF;
  RAISE NOTICE 'undo checks passed';
END $$;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
