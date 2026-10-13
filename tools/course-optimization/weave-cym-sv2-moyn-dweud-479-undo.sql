-- Undo of weave-cym-sv2-moyn-dweud-479.sql (job #479): deletes cym_sv2_for_eng:S1400L01U07 only. Refuses if the row was edited
-- since, or the rest of the S1400L01 basket differs from the backup. Dry run unless -v finish=COMMIT.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
DO $$ BEGIN
  IF to_regclass('backup_cym_sv2_moyn_dweud_479') IS NULL THEN RAISE EXCEPTION 'not applied (no backup)'; END IF;
END $$;
SELECT id AS ev FROM content_edit_events WHERE course_code='cym_sv2_for_eng' AND detail->>'backup'='backup_cym_sv2_moyn_dweud_479' ORDER BY occurred_at DESC LIMIT 1 \gset
CREATE TEMP TABLE ev AS SELECT :'ev'::uuid AS id;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM course_practice_phrases WHERE id='cym_sv2_for_eng:S1400L01U07' AND last_edit_event_id = (SELECT id FROM ev)
                 AND target_text='sut ŷn ni’n moyn dweud e?') THEN RAISE EXCEPTION 'U07 missing or edited since: undo by hand'; END IF;
  IF EXISTS (SELECT * FROM (SELECT id, position, phrase_role, known_text, target_text, last_edit_event_id FROM course_practice_phrases
               WHERE course_code='cym_sv2_for_eng' AND seed_number=1400 AND lego_index=1 AND id <> 'cym_sv2_for_eng:S1400L01U07') c
             EXCEPT SELECT * FROM backup_cym_sv2_moyn_dweud_479)
     OR (SELECT count(*) FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND seed_number=1400 AND lego_index=1) <> (SELECT count(*) FROM backup_cym_sv2_moyn_dweud_479) + 1 THEN
    RAISE EXCEPTION 'S1400L01 basket changed since: undo by hand'; END IF;
END $$;
DELETE FROM course_practice_phrases WHERE id='cym_sv2_for_eng:S1400L01U07';
DROP TABLE backup_cym_sv2_moyn_dweud_479;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
