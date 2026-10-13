-- Undo of weave-cym-nv2-new-pairing-459.sql (job #459). cym_nv2_for_eng ONLY. Dry run unless psql -v finish=COMMIT.
-- Deletes exactly the rows it added (refusing if any was edited since), restores is_new from backup_cym_nv2_newpairing_459.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
CREATE TEMP TABLE added (id text PRIMARY KEY);
INSERT INTO added VALUES ('cym_nv2_for_eng:S1092L02U08'), ('cym_nv2_for_eng:S1092L02U09'), ('cym_nv2_for_eng:S1092L02U10');
SELECT id AS ev FROM content_edit_events WHERE course_code = 'cym_nv2_for_eng' AND detail->>'backup' = 'backup_cym_nv2_newpairing_459'
  ORDER BY occurred_at DESC LIMIT 1 \gset
DO $$ BEGIN
  IF to_regclass('backup_cym_nv2_newpairing_459') IS NULL THEN RAISE EXCEPTION 'not applied (no backup_cym_nv2_newpairing_459)'; END IF;
END $$;
CREATE TEMP TABLE ev AS SELECT :'ev'::uuid AS id;
DO $$ BEGIN
  IF (SELECT count(*) FROM course_practice_phrases p JOIN added a USING (id) WHERE p.last_edit_event_id = (SELECT id FROM ev)) <> (SELECT count(*) FROM added) THEN
    RAISE EXCEPTION 'an added phrase is missing or was edited since: undo by hand'; END IF;
  IF EXISTS (SELECT 1 FROM course_legos l JOIN backup_cym_nv2_newpairing_459 b USING (id) WHERE l.is_new OR l.last_edit_event_id IS DISTINCT FROM (SELECT id FROM ev)) THEN
    RAISE EXCEPTION 'a flipped LEGO was edited since: undo by hand'; END IF;
END $$;
DELETE FROM course_practice_phrases WHERE id IN (SELECT id FROM added) AND course_code = 'cym_nv2_for_eng';
UPDATE course_legos l SET is_new = b.is_new, last_edit_event_id = b.last_edit_event_id FROM backup_cym_nv2_newpairing_459 b WHERE l.id = b.id;
DROP TABLE backup_cym_nv2_newpairing_459;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
