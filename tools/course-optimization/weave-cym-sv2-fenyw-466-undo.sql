-- Undo of weave-cym-sv2-fenyw-466.sql (job #466). Refuses if a phrase was edited since. Dry run unless psql -v finish=COMMIT.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
SELECT id AS ev FROM content_edit_events WHERE course_code='cym_sv2_for_eng' AND detail->>'backup'='backup_cym_sv2_fenyw_466' ORDER BY occurred_at DESC LIMIT 1 \gset
DO $$ BEGIN
  IF to_regclass('backup_cym_sv2_fenyw_466') IS NULL THEN RAISE EXCEPTION 'not applied'; END IF;
END $$;
CREATE TEMP TABLE ev AS SELECT :'ev'::uuid AS id;
DO $$ BEGIN
  IF (SELECT count(*) FROM course_practice_phrases p JOIN backup_cym_sv2_fenyw_466 b USING (id) WHERE p.last_edit_event_id=(SELECT id FROM ev)) <> (SELECT count(*) FROM backup_cym_sv2_fenyw_466) THEN
    RAISE EXCEPTION 'a phrase was edited since: undo by hand'; END IF;
END $$;
UPDATE course_practice_phrases p SET target_text=b.target_text, word_count=b.word_count, last_edit_event_id=b.last_edit_event_id FROM backup_cym_sv2_fenyw_466 b WHERE p.id=b.id;
DROP TABLE backup_cym_sv2_fenyw_466;
SELECT 'finishing with' k, :'finish' v;
:finish;
