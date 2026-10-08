-- Undo for weave-cym-samewelsh-mark.sql (job #429): puts is_new and last_edit_event_id back on every LEGO
-- exactly as backup_cym_samewelsh_isnew_429 holds them. Only the two sandboxes are touched; the two
-- 'weave-samewelsh-mark' audit events stay in content_edit_events as the record. Dry run unless invoked
-- with  -v finish=COMMIT .
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
DO $$ BEGIN
  IF to_regclass('backup_cym_samewelsh_isnew_429') IS NULL THEN RAISE EXCEPTION 'backup missing'; END IF;
  IF EXISTS (SELECT 1 FROM backup_cym_samewelsh_isnew_429 WHERE course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')) THEN
    RAISE EXCEPTION 'backup holds a row outside the two sandboxes'; END IF;
END $$;
UPDATE course_legos l SET is_new = b.is_new, last_edit_event_id = b.last_edit_event_id
FROM backup_cym_samewelsh_isnew_429 b WHERE l.id = b.id AND l.course_code = b.course_code;
DO $$ BEGIN
  IF (SELECT count(*) FROM course_legos l JOIN backup_cym_samewelsh_isnew_429 b ON b.id=l.id
      WHERE l.is_new IS DISTINCT FROM b.is_new OR l.last_edit_event_id IS DISTINCT FROM b.last_edit_event_id) <> 0 THEN
    RAISE EXCEPTION 'CHECK FAILED: not all restored'; END IF;
  RAISE NOTICE 'undo checks passed';
END $$;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
