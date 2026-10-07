-- Undo for weave-cym-sv2-2026-10-07.sql (job #22). Puts cym_sv2_for_eng back BYTE-IDENTICAL to
-- backup_cym_sv2_seeds_22 (row ids, version, timestamps, audio links, edit attribution): the
-- 1001-1668 rows are deleted and the original 335-668 rows re-inserted from the backup; the
-- weave row, the drops, the South sandbox HC list and its assignment are removed.
-- Refuses if LEGOs or phrases have been built on a block seed since: run
-- weave-cym-sv2-hc-legos-undo.sql first. course_audio is never touched.
-- Old seeds 1-334 are not touched at all. Dry run unless invoked with  -v finish=COMMIT .
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20min';
\ir weave-fingerprint-fn-sv2.sql
CREATE TEMP TABLE undo_pre AS SELECT * FROM pg_temp.others_fingerprint();

DO $$ BEGIN
  IF to_regclass('backup_cym_sv2_seeds_22') IS NULL THEN RAISE EXCEPTION 'backup missing; nothing to undo from'; END IF;
  IF EXISTS (SELECT 1 FROM course_legos WHERE course_code='cym_sv2_for_eng' AND seed_number >= 1000)
     OR EXISTS (SELECT 1 FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND seed_number >= 1000) THEN
    RAISE EXCEPTION 'LEGOs/phrases exist on block seeds; run weave-cym-sv2-hc-legos-undo.sql first'; END IF;
END $$;

DELETE FROM course_seed_weave_drops WHERE course_code='cym_sv2_for_eng';
DELETE FROM course_seed_weave       WHERE course_code='cym_sv2_for_eng';
DELETE FROM course_seeds WHERE course_code='cym_sv2_for_eng' AND seed_number >= 1000;
INSERT INTO course_seeds (id, course_code, seed_number, known_text, target_text, status, release_batch, version,
  updated_at, created_at, known_audio_id, target1_audio_id, target2_audio_id, decomposed_at, approved_at,
  target_text_roman, flagged_at, last_edit_event_id)
SELECT id, course_code, seed_number, known_text, target_text, status, release_batch, version,
  updated_at, created_at, known_audio_id, target1_audio_id, target2_audio_id, decomposed_at, approved_at,
  target_text_roman, flagged_at, last_edit_event_id
FROM backup_cym_sv2_seeds_22 WHERE seed_number BETWEEN 335 AND 668;

DELETE FROM canonical_list_assignments WHERE course_code='cym_sv2_for_eng';
DELETE FROM canonical_list_seeds WHERE list_id IN (SELECT id FROM canonical_seed_lists WHERE slug='cym-south-sandbox');
DELETE FROM canonical_seed_lists WHERE slug='cym-south-sandbox';

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
VALUES ('cym_sv2_for_eng', 'sql:job-22 weave-cym-sv2-remove', 'renumber', 'agent', 'claude-weave-cym-sv2-2026-10-07',
        'agent (claude-weave-cym-sv2-2026-10-07)', false, 'creator', '{"from":[1001,1668],"to":[335,668]}',
        '{"undo_of":"weave-cym-sv2-2026-10-07.sql","restored_from":"backup_cym_sv2_seeds_22"}');

CREATE TEMP TABLE undo_post AS SELECT * FROM pg_temp.others_fingerprint();
DO $$ BEGIN
  IF EXISTS (SELECT * FROM undo_pre EXCEPT SELECT * FROM undo_post) OR EXISTS (SELECT * FROM undo_post EXCEPT SELECT * FROM undo_pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: undo touched something outside the South sandbox'; END IF;
  IF EXISTS (SELECT * FROM backup_cym_sv2_seeds_22 EXCEPT SELECT * FROM course_seeds WHERE course_code='cym_sv2_for_eng')
     OR EXISTS (SELECT * FROM course_seeds WHERE course_code='cym_sv2_for_eng' EXCEPT SELECT * FROM backup_cym_sv2_seeds_22) THEN
    RAISE EXCEPTION 'CHECK FAILED: sandbox seeds not identical to backup'; END IF;
  IF EXISTS (SELECT 1 FROM course_running_order WHERE course_code='cym_sv2_for_eng')
     OR EXISTS (SELECT 1 FROM canonical_list_assignments WHERE course_code='cym_sv2_for_eng') THEN
    RAISE EXCEPTION 'CHECK FAILED: sandbox still has a running order or a list'; END IF;
  RAISE NOTICE 'UNDO CHECKS PASSED: South sandbox seeds identical to backup';
END $$;
SELECT 'finishing with' k, :'finish' v;
:finish;
-- After a COMMIT: REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;  (cannot run inside the transaction)
