-- TEMPLATE: weave-cym-rehome-555.cjs sql writes weave-cym-rehome-555-undo.sql from this (the markers are filled but unused).
-- Undo of weave-cym-rehome-555.sql (job #555): deletes the moved rows at their homes and re-inserts the backup rows verbatim
-- at their old ids, then checks every row under the touched LEGOs is byte-for-byte the backup and drops the backups, in one
-- transaction. Refuses if a moved row was edited since, or anything else under a touched LEGO changed. Dry run unless -v finish=COMMIT.
-- ONE EXCEPTION, forced by the debut_keeps_practice guard: a home that is a debut (is_new) LEGO and had NO practice before #555
-- (S S0098L01 "dw i’n hapus") cannot be left bare again, so its moved row is KEPT there as well as restored at its old id
-- (the old id sits under a taught LEGO, which never plays, so nothing plays twice). Named in the RESTORED notice.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
DO $$ BEGIN
  IF to_regclass('backup_cym_rehome_555') IS NULL THEN RAISE EXCEPTION 'not applied (no backup_cym_rehome_555)'; END IF;
END $$;
SELECT count(*) AS locked_rows FROM (SELECT 1 FROM course_practice_phrases p JOIN backup_cym_rehome_555_legos t USING (course_code, seed_number, lego_index) FOR UPDATE OF p) x;
CREATE TEMP TABLE keep AS SELECT p.id FROM course_practice_phrases p JOIN backup_cym_rehome_555_moves m ON m.new_id = p.id
  JOIN course_legos l USING (course_code, seed_number, lego_index)
  WHERE l.is_new AND NOT EXISTS (SELECT 1 FROM backup_cym_rehome_555 b WHERE (b.course_code, b.seed_number, b.lego_index) = (p.course_code, p.seed_number, p.lego_index));
CREATE TEMP TABLE undo_ev AS SELECT id FROM content_edit_events WHERE detail->>'backup'='backup_cym_rehome_555';
DO $$ BEGIN
  IF (SELECT count(*) FROM course_practice_phrases p JOIN backup_cym_rehome_555_moves m ON m.new_id = p.id WHERE p.last_edit_event_id IN (SELECT id FROM undo_ev))
     <> (SELECT count(*) FROM backup_cym_rehome_555_moves) THEN RAISE EXCEPTION 'a moved row is gone or was edited since #555: undo by hand'; END IF;
  IF EXISTS (SELECT p.id, md5(p::text) FROM course_practice_phrases p JOIN backup_cym_rehome_555_legos t USING (course_code, seed_number, lego_index)
             WHERE p.id NOT IN (SELECT new_id FROM backup_cym_rehome_555_moves)
             EXCEPT SELECT b.id, md5(b::text) FROM backup_cym_rehome_555 b) THEN RAISE EXCEPTION 'a row under a touched LEGO changed since #555: undo by hand'; END IF;
END $$;
DELETE FROM course_practice_phrases WHERE id IN (SELECT new_id FROM backup_cym_rehome_555_moves) AND id NOT IN (SELECT id FROM keep);
INSERT INTO course_practice_phrases SELECT b.* FROM backup_cym_rehome_555 b JOIN backup_cym_rehome_555_moves m ON m.old_id = b.id;
DO $$ BEGIN
  IF (SELECT md5(string_agg(md5(p::text), '' ORDER BY p.id)) FROM course_practice_phrases p JOIN backup_cym_rehome_555_legos g USING (course_code, seed_number, lego_index)
      WHERE p.id NOT IN (SELECT id FROM keep))
     IS DISTINCT FROM (SELECT md5(string_agg(md5(b::text), '' ORDER BY b.id)) FROM backup_cym_rehome_555 b) THEN
    RAISE EXCEPTION 'CHECK FAILED: rows after undo differ from the backup'; END IF;
  RAISE NOTICE 'RESTORED: % rows back at their old ids, % rows under the touched LEGOs byte-identical to the backup; kept at a debut home that had no other practice: %',
    (SELECT count(*) FROM backup_cym_rehome_555_moves), (SELECT count(*) FROM backup_cym_rehome_555), (SELECT coalesce(string_agg(id, ', '), 'none') FROM keep);
END $$;
DROP TABLE backup_cym_rehome_555, backup_cym_rehome_555_legos, backup_cym_rehome_555_moves;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
