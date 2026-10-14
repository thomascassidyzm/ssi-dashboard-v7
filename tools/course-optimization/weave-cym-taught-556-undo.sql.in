-- TEMPLATE: weave-cym-taught-556.cjs sql writes weave-cym-taught-556-undo.sql from this (the markers are filled but unused).
-- Undo of weave-cym-taught-556.sql (job #556): moves the phrases back to their old ids (byte-for-byte the backup), sets the
-- seven LEGOs and the linked seeds back to their backup rows, checks everything matches the backups and drops them, in one
-- transaction. Refuses if anything it wrote was edited since. Dry run unless -v finish=COMMIT.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
DO $$ BEGIN
  IF to_regclass('backup_cym_taught_556') IS NULL THEN RAISE EXCEPTION 'not applied (no backup_cym_taught_556)'; END IF;
END $$;
SELECT count(*) AS locked_rows FROM (SELECT 1 FROM course_practice_phrases p JOIN backup_cym_taught_556_legos t USING (course_code, seed_number, lego_index) FOR UPDATE OF p) x;
SELECT count(*) AS locked_legos FROM (SELECT 1 FROM course_legos l JOIN backup_cym_taught_556_flips b ON b.id = l.id FOR UPDATE OF l) x;
SELECT count(*) AS locked_seeds FROM (SELECT 1 FROM course_seeds s JOIN backup_cym_taught_556_seeds b ON b.id = s.id FOR UPDATE OF s) x;
CREATE TEMP TABLE undo_ev AS SELECT id FROM content_edit_events WHERE detail->>'backup'='backup_cym_taught_556';
DO $$ BEGIN
  IF (SELECT count(*) FROM course_practice_phrases p JOIN backup_cym_taught_556_moves m ON m.new_id = p.id WHERE p.last_edit_event_id IN (SELECT id FROM undo_ev))
     <> (SELECT count(*) FROM backup_cym_taught_556_moves) THEN RAISE EXCEPTION 'a moved row is gone or was edited since #556: undo by hand'; END IF;
  IF EXISTS (SELECT p.id, md5(p::text) FROM course_practice_phrases p JOIN backup_cym_taught_556_legos t USING (course_code, seed_number, lego_index)
             WHERE p.id NOT IN (SELECT new_id FROM backup_cym_taught_556_moves)
             EXCEPT SELECT b.id, md5(b::text) FROM backup_cym_taught_556 b) THEN RAISE EXCEPTION 'a row under a touched LEGO changed since #556: undo by hand'; END IF;
  IF (SELECT count(*) FROM course_legos l JOIN backup_cym_taught_556_flips b ON b.id = l.id WHERE NOT l.is_new AND l.last_edit_event_id IN (SELECT id FROM undo_ev))
     <> (SELECT count(*) FROM backup_cym_taught_556_flips) THEN RAISE EXCEPTION 'a flipped LEGO was edited since #556: undo by hand'; END IF;
  IF (SELECT count(*) FROM course_seeds s JOIN backup_cym_taught_556_seeds b ON b.id = s.id WHERE s.last_edit_event_id IN (SELECT id FROM undo_ev))
     <> (SELECT count(*) FROM backup_cym_taught_556_seeds) THEN RAISE EXCEPTION 'a linked seed was edited since #556: undo by hand'; END IF;
END $$;
DELETE FROM course_practice_phrases WHERE id IN (SELECT new_id FROM backup_cym_taught_556_moves);
INSERT INTO course_practice_phrases SELECT b.* FROM backup_cym_taught_556 b JOIN backup_cym_taught_556_moves m ON m.old_id = b.id;
UPDATE course_legos l SET is_new = b.is_new, last_edit_event_id = b.last_edit_event_id FROM backup_cym_taught_556_flips b WHERE l.id = b.id;
UPDATE course_seeds s SET known_audio_id = b.known_audio_id, last_edit_event_id = b.last_edit_event_id FROM backup_cym_taught_556_seeds b WHERE s.id = b.id;
DO $$ BEGIN
  IF (SELECT md5(string_agg(md5(p::text), '' ORDER BY p.id)) FROM course_practice_phrases p JOIN backup_cym_taught_556_legos g USING (course_code, seed_number, lego_index))
     IS DISTINCT FROM (SELECT md5(string_agg(md5(b::text), '' ORDER BY b.id)) FROM backup_cym_taught_556 b) THEN
    RAISE EXCEPTION 'CHECK FAILED: phrases after undo differ from the backup'; END IF;
  -- version and updated_at are bumped by the increment_version trigger on every update and cannot be put back.
  IF EXISTS (SELECT 1 FROM course_legos l JOIN backup_cym_taught_556_flips b ON b.id = l.id WHERE (to_jsonb(l) - 'version' - 'updated_at') <> (to_jsonb(b) - 'version' - 'updated_at')) THEN
    RAISE EXCEPTION 'CHECK FAILED: LEGOs after undo differ from the backup'; END IF;
  IF EXISTS (SELECT 1 FROM course_seeds s JOIN backup_cym_taught_556_seeds b ON b.id = s.id WHERE (to_jsonb(s) - 'version' - 'updated_at') <> (to_jsonb(b) - 'version' - 'updated_at')) THEN
    RAISE EXCEPTION 'CHECK FAILED: seeds after undo differ from the backup'; END IF;
  RAISE NOTICE 'RESTORED: % phrases back at their old ids, % LEGOs and % seeds identical to the backup but for version/updated_at',
    (SELECT count(*) FROM backup_cym_taught_556_moves), (SELECT count(*) FROM backup_cym_taught_556_flips), (SELECT count(*) FROM backup_cym_taught_556_seeds);
END $$;
DROP TABLE backup_cym_taught_556, backup_cym_taught_556_legos, backup_cym_taught_556_moves, backup_cym_taught_556_flips, backup_cym_taught_556_seeds;
SET CONSTRAINTS ALL IMMEDIATE;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
