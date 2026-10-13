-- TEMPLATE: weave-cym-sv2-sole-new-468.cjs sql fills the ROWS marker and writes weave-cym-sv2-sole-new-468-undo.sql.
-- Undo of weave-cym-sv2-sole-new-468.sql (job #468): deletes exactly the basket rows it added and puts S1159L1, S1400L1,
-- S1409L2 back to is_new=false with their previous last_edit_event_id (job #460's), from backup_cym_sv2_sole_new_468,
-- in one transaction. Refuses if any row or LEGO was edited since. Dry run unless -v finish=COMMIT.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
DO $$ BEGIN
  IF to_regclass('backup_cym_sv2_sole_new_468') IS NULL THEN RAISE EXCEPTION 'not applied (no backup_cym_sv2_sole_new_468)'; END IF;
END $$;
SELECT id AS ev FROM content_edit_events WHERE course_code='cym_sv2_for_eng' AND detail->>'backup'='backup_cym_sv2_sole_new_468'
  ORDER BY occurred_at DESC LIMIT 1 \gset
CREATE TEMP TABLE ev AS SELECT :'ev'::uuid AS id;
CREATE TEMP TABLE added (id text PRIMARY KEY);
INSERT INTO added VALUES ('cym_sv2_for_eng:S1159L01B01'), ('cym_sv2_for_eng:S1159L01B02'), ('cym_sv2_for_eng:S1159L01B03'), ('cym_sv2_for_eng:S1159L01B04'), ('cym_sv2_for_eng:S1159L01U01'), ('cym_sv2_for_eng:S1159L01U02'), ('cym_sv2_for_eng:S1159L01U03'), ('cym_sv2_for_eng:S1159L01U04'), ('cym_sv2_for_eng:S1159L01U05'), ('cym_sv2_for_eng:S1159L01U06'), ('cym_sv2_for_eng:S1159L01U07'), ('cym_sv2_for_eng:S1159L01U08'), ('cym_sv2_for_eng:S1159L01U09'), ('cym_sv2_for_eng:S1400L01B01'), ('cym_sv2_for_eng:S1400L01B02'), ('cym_sv2_for_eng:S1400L01B03'), ('cym_sv2_for_eng:S1400L01B04'), ('cym_sv2_for_eng:S1400L01U01'), ('cym_sv2_for_eng:S1400L01U02'), ('cym_sv2_for_eng:S1400L01U03'), ('cym_sv2_for_eng:S1400L01U04'), ('cym_sv2_for_eng:S1400L01U05'), ('cym_sv2_for_eng:S1400L01U06'), ('cym_sv2_for_eng:S1409L02B01'), ('cym_sv2_for_eng:S1409L02B02'), ('cym_sv2_for_eng:S1409L02B03'), ('cym_sv2_for_eng:S1409L02B04'), ('cym_sv2_for_eng:S1409L02U01'), ('cym_sv2_for_eng:S1409L02U02'), ('cym_sv2_for_eng:S1409L02U03'), ('cym_sv2_for_eng:S1409L02U04'), ('cym_sv2_for_eng:S1409L02U05'), ('cym_sv2_for_eng:S1409L02U06'), ('cym_sv2_for_eng:S1409L02U07');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM course_legos l JOIN backup_cym_sv2_sole_new_468 b USING (id) WHERE NOT l.is_new OR l.last_edit_event_id IS DISTINCT FROM (SELECT id FROM ev)) THEN
    RAISE EXCEPTION 'a flipped LEGO was edited since: undo by hand'; END IF;
  IF (SELECT count(*) FROM course_practice_phrases p JOIN added a USING (id) WHERE p.last_edit_event_id = (SELECT id FROM ev)) <> (SELECT count(*) FROM added) THEN
    RAISE EXCEPTION 'an added phrase is missing or was edited since: undo by hand'; END IF;
  IF EXISTS (SELECT 1 FROM course_practice_phrases p JOIN backup_cym_sv2_sole_new_468 b ON p.course_code=b.course_code AND p.seed_number=b.seed_number AND p.lego_index=b.lego_index
             WHERE p.id NOT IN (SELECT id FROM added)) THEN
    RAISE EXCEPTION 'other phrases were filed under a flipped LEGO since: undo by hand'; END IF;
END $$;
DELETE FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND id IN (SELECT id FROM added);
UPDATE course_legos l SET is_new = b.is_new, last_edit_event_id = b.last_edit_event_id FROM backup_cym_sv2_sole_new_468 b WHERE l.id = b.id;
DROP TABLE backup_cym_sv2_sole_new_468;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
