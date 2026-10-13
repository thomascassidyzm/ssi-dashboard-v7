-- TEMPLATE: weave-cym-aran-written-530.cjs sql writes weave-cym-aran-written-530-undo.sql from this (the markers are filled but unused).
-- Undo of weave-cym-aran-written-530.sql (job #530): deletes exactly the 3 rows it added, checks the rows left under the 3 LEGOs
-- are byte-for-byte the backup, drops its backups, in one transaction. Refuses if a #530 row was edited since. Dry run unless -v finish=COMMIT.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
DO $$ BEGIN
  IF to_regclass('backup_cym_aran_written_530') IS NULL THEN RAISE EXCEPTION 'not applied (no backup_cym_aran_written_530)'; END IF;
END $$;
CREATE TEMP TABLE undo_ev AS SELECT id FROM content_edit_events WHERE detail->>'backup'='backup_cym_aran_written_530';
CREATE TEMP TABLE cur AS SELECT p.* FROM course_practice_phrases p JOIN backup_cym_aran_written_530_legos g USING (course_code, seed_number, lego_index)
  WHERE p.id NOT IN (SELECT id FROM backup_cym_aran_written_530);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cur WHERE last_edit_event_id IS NULL OR last_edit_event_id NOT IN (SELECT id FROM undo_ev)) THEN
    RAISE EXCEPTION 'a row added under a LEGO is not an unedited #530 row: undo by hand'; END IF;
END $$;
DELETE FROM course_practice_phrases WHERE id IN (SELECT id FROM cur);
DO $$ BEGIN
  IF (SELECT md5(string_agg(md5(p::text), '' ORDER BY p.id)) FROM course_practice_phrases p JOIN backup_cym_aran_written_530_legos g USING (course_code, seed_number, lego_index))
     IS DISTINCT FROM (SELECT md5(string_agg(md5(b::text), '' ORDER BY b.id)) FROM backup_cym_aran_written_530 b) THEN
    RAISE EXCEPTION 'CHECK FAILED: rows after undo differ from the backup'; END IF;
  RAISE NOTICE 'RESTORED: % #530 rows deleted, % earlier rows untouched', (SELECT count(*) FROM cur), (SELECT count(*) FROM backup_cym_aran_written_530);
END $$;
DROP TABLE backup_cym_aran_written_530, backup_cym_aran_written_530_legos;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
