-- Undo for weave-cym-same-pair-536.sql: restores is_new + last_edit_event_id exactly as
-- backup_cym_same_pair_536 holds them. Refuses if any row has drifted from the post-apply state
-- (is_new must still be false) so a later edit is not overwritten. Dry run unless -v finish=COMMIT.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
SET LOCAL statement_timeout = '20min';
DO $$ BEGIN
  IF to_regclass('backup_cym_same_pair_536') IS NULL THEN RAISE EXCEPTION 'backup missing'; END IF;
  IF EXISTS (SELECT 1 FROM backup_cym_same_pair_536 WHERE course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')) THEN RAISE EXCEPTION 'backup holds a foreign row'; END IF;
  IF EXISTS (SELECT 1 FROM backup_cym_same_pair_536 b JOIN course_legos l ON l.id=b.id WHERE l.is_new) THEN RAISE EXCEPTION 'drift: a LEGO is new again; refusing'; END IF;
END $$;
UPDATE course_legos l SET is_new=b.is_new, last_edit_event_id=b.last_edit_event_id
FROM backup_cym_same_pair_536 b WHERE l.id=b.id AND l.course_code=b.course_code;
DO $$ BEGIN
  IF (SELECT count(*) FROM course_legos l JOIN backup_cym_same_pair_536 b ON b.id=l.id
      WHERE l.is_new IS DISTINCT FROM b.is_new OR l.last_edit_event_id IS DISTINCT FROM b.last_edit_event_id)<>0 THEN RAISE EXCEPTION 'CHECK FAILED: not restored'; END IF;
  RAISE NOTICE 'undo checks passed (% rows)', (SELECT count(*) FROM backup_cym_same_pair_536);
END $$;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
