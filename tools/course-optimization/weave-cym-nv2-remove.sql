-- Undo for weave-cym-nv2-2026-10-07.sql (job #949). Puts cym_nv2_for_eng and the Welsh North
-- HC list back BYTE-IDENTICAL to the backups that script took (row ids, version, timestamps,
-- audio links, edit attribution): the 1001-1668 rows are deleted and the original 317-679 rows
-- re-inserted from backup_cym_nv2_seeds_949 / backup_hc_north_list_949.
-- Refuses if anything (LEGOs, phrases) has been built on a block seed since: that needs its own
-- plan. course_audio is never touched (deletion needs its own plan, per the approval gate).
-- Old seeds 1-316 are not touched at all. If course_round_index already follows the weave
-- (stage 2), it is refreshed at the end so the sandbox's rounds go back to seed order.
-- Dry run unless invoked with  -v finish=COMMIT .
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
\ir weave-fingerprint-fn.sql
CREATE TEMP TABLE undo_pre AS SELECT * FROM pg_temp.others_fingerprint();

DO $$ BEGIN
  IF to_regclass('backup_cym_nv2_seeds_949') IS NULL OR to_regclass('backup_hc_north_list_949') IS NULL THEN
    RAISE EXCEPTION 'backups missing; nothing to undo from'; END IF;
  IF EXISTS (SELECT 1 FROM course_legos WHERE course_code='cym_nv2_for_eng' AND seed_number >= 1000)
     OR EXISTS (SELECT 1 FROM course_practice_phrases WHERE course_code='cym_nv2_for_eng' AND seed_number >= 1000) THEN
    RAISE EXCEPTION 'LEGOs/phrases exist on block seeds; undo needs its own plan'; END IF;
END $$;

DELETE FROM course_seed_weave_drops WHERE course_code='cym_nv2_for_eng';
DELETE FROM course_seed_weave       WHERE course_code='cym_nv2_for_eng';
DELETE FROM course_seeds WHERE course_code='cym_nv2_for_eng' AND seed_number >= 1000;
INSERT INTO course_seeds (id, course_code, seed_number, known_text, target_text, status, release_batch, version,
  updated_at, created_at, known_audio_id, target1_audio_id, target2_audio_id, decomposed_at, approved_at,
  target_text_roman, flagged_at, last_edit_event_id)
SELECT id, course_code, seed_number, known_text, target_text, status, release_batch, version,
  updated_at, created_at, known_audio_id, target1_audio_id, target2_audio_id, decomposed_at, approved_at,
  target_text_roman, flagged_at, last_edit_event_id
FROM backup_cym_nv2_seeds_949 WHERE seed_number BETWEEN 317 AND 679;

DELETE FROM canonical_list_seeds WHERE list_id='8a1af4aa-6733-4d5e-9724-e6f9df3212e0' AND seed_number >= 1000;
INSERT INTO canonical_list_seeds SELECT * FROM backup_hc_north_list_949 WHERE seed_number BETWEEN 317 AND 679;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
VALUES ('cym_nv2_for_eng', 'sql:job-949 weave-cym-nv2-remove', 'renumber', 'agent', 'claude-weave-cym-nv2-2026-10-07',
        'agent (claude-weave-cym-nv2-2026-10-07)', false, 'creator', '{"from":[1001,1668],"to":[317,679]}',
        '{"undo_of":"weave-cym-nv2-2026-10-07.sql","restored_from":"backup_cym_nv2_seeds_949"}');

CREATE TEMP TABLE undo_post AS SELECT * FROM pg_temp.others_fingerprint();
DO $$ BEGIN
  IF EXISTS (SELECT * FROM undo_pre EXCEPT SELECT * FROM undo_post) OR EXISTS (SELECT * FROM undo_post EXCEPT SELECT * FROM undo_pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: undo touched something outside the sandbox'; END IF;
  IF EXISTS (SELECT * FROM backup_cym_nv2_seeds_949 EXCEPT SELECT * FROM course_seeds WHERE course_code='cym_nv2_for_eng')
     OR EXISTS (SELECT * FROM course_seeds WHERE course_code='cym_nv2_for_eng' EXCEPT SELECT * FROM backup_cym_nv2_seeds_949) THEN
    RAISE EXCEPTION 'CHECK FAILED: sandbox seeds not identical to backup'; END IF;
  IF EXISTS (SELECT * FROM backup_hc_north_list_949 EXCEPT SELECT * FROM canonical_list_seeds WHERE list_id='8a1af4aa-6733-4d5e-9724-e6f9df3212e0')
     OR EXISTS (SELECT * FROM canonical_list_seeds WHERE list_id='8a1af4aa-6733-4d5e-9724-e6f9df3212e0' EXCEPT SELECT * FROM backup_hc_north_list_949) THEN
    RAISE EXCEPTION 'CHECK FAILED: HC list not identical to backup'; END IF;
  IF EXISTS (SELECT 1 FROM course_running_order WHERE course_code='cym_nv2_for_eng') THEN
    RAISE EXCEPTION 'CHECK FAILED: sandbox still has a running order'; END IF;
  RAISE NOTICE 'UNDO CHECKS PASSED: sandbox and HC list identical to backup';
END $$;
SELECT 'finishing with' k, :'finish' v;
:finish;
-- After a COMMIT: REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;  (cannot run inside the transaction)
