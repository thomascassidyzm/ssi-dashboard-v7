-- TEMPLATE: weave-cym-aran-written-504.cjs sql writes weave-cym-aran-written-504-undo.sql from this (no markers).
-- Undo of weave-cym-aran-written-504.sql (job #504): under the LEGOs it re-filed, deletes its rows and puts back exactly the
-- rows that stood there before (the #494 rows, byte for byte), then drops its backups, in one transaction. Refuses if any
-- #504 row was edited since. After this, weave-cym-aran-written-494-undo.sql applies again as before.
-- NB the deferred debut_keeps_practice trigger refuses a NEW LEGO left with no practice: the five LEGOs #494 left empty
-- (N S1496L04, S S1115L03, S1166L02, S1526L01, S1551L02) would be empty again, so a COMMIT fails loudly and changes nothing
-- unless they have other practice or are no longer new by then. Dry run unless -v finish=COMMIT.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
DO $$ BEGIN
  IF to_regclass('backup_cym_aran_written_504') IS NULL THEN RAISE EXCEPTION 'not applied (no backup_cym_aran_written_504)'; END IF;
END $$;
CREATE TEMP TABLE undo_ev AS SELECT id FROM content_edit_events WHERE detail->>'backup'='backup_cym_aran_written_504';
CREATE TEMP TABLE cur AS SELECT p.* FROM course_practice_phrases p JOIN backup_cym_aran_written_504_legos g USING (course_code, seed_number, lego_index);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cur WHERE last_edit_event_id IS NULL OR last_edit_event_id NOT IN (SELECT id FROM undo_ev)) THEN
    RAISE EXCEPTION 'a row under a re-filed LEGO is not an unedited #504 row: undo by hand'; END IF;
END $$;
DELETE FROM course_practice_phrases WHERE id IN (SELECT id FROM cur);
INSERT INTO course_practice_phrases SELECT * FROM backup_cym_aran_written_504;
DO $$ BEGIN
  IF (SELECT md5(string_agg(md5(p::text), '' ORDER BY p.id)) FROM course_practice_phrases p JOIN backup_cym_aran_written_504_legos g USING (course_code, seed_number, lego_index))
     IS DISTINCT FROM (SELECT md5(string_agg(md5(b::text), '' ORDER BY b.id)) FROM backup_cym_aran_written_504 b) THEN
    RAISE EXCEPTION 'CHECK FAILED: restored rows differ from the backup'; END IF;
  RAISE NOTICE 'RESTORED: % rows deleted, % #494 rows back', (SELECT count(*) FROM cur), (SELECT count(*) FROM backup_cym_aran_written_504);
END $$;
DROP TABLE backup_cym_aran_written_504, backup_cym_aran_written_504_legos;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
