-- Undo of job #554·P (weave-cym-proof-fixes-554.sql and its stage 2, and the job's new-pairing rows): every touched seed of
-- cym_nv2_for_eng / cym_sv2_for_eng is put back WHOLE from backup_cym_proof_fixes_554_*, the extra phrases and the N S1178 seed row
-- are restored, the flags put back, and the result is checked byte for byte against the backup. Dry run unless -v finish=COMMIT.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
SET LOCAL statement_timeout = '20min';

DO $$ BEGIN IF to_regclass('backup_cym_proof_fixes_554_legos') IS NULL THEN RAISE EXCEPTION 'not applied (no backup_cym_proof_fixes_554_legos)'; END IF; END $$;
SET CONSTRAINTS ALL DEFERRED;  -- the debut guard judges the restored seeds at the end, not each delete
CREATE TEMP TABLE t_seeds AS SELECT course_code, v::int AS seed_number FROM backup_cym_proof_fixes_554_scope WHERE k = 'seed';
CREATE TEMP TABLE t_extra AS SELECT v AS id FROM backup_cym_proof_fixes_554_scope WHERE k = 'extra';
LOCK TABLE course_practice_phrases, course_legos, lego_introductions IN SHARE ROW EXCLUSIVE MODE;
DELETE FROM course_practice_phrases p USING t_seeds t WHERE p.course_code = t.course_code AND p.seed_number = t.seed_number;
DELETE FROM course_practice_phrases WHERE id IN (SELECT id FROM t_extra);
DELETE FROM lego_introductions i USING t_seeds t WHERE i.course_code = t.course_code AND substr(i.lego_id, 2, 4)::int = t.seed_number;
DELETE FROM course_legos l USING t_seeds t WHERE l.course_code = t.course_code AND l.seed_number = t.seed_number;
INSERT INTO course_legos (id, course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status, release_batch, version, updated_at, created_at, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms, target2_duration_ms, target_text_roman, target_lego_id, known_gloss_segments, last_edit_event_id) SELECT id, course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status, release_batch, version, updated_at, created_at, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms, target2_duration_ms, target_text_roman, target_lego_id, known_gloss_segments, last_edit_event_id FROM backup_cym_proof_fixes_554_legos;
INSERT INTO course_practice_phrases SELECT * FROM backup_cym_proof_fixes_554_phrases;
INSERT INTO lego_introductions SELECT * FROM backup_cym_proof_fixes_554_intros;
UPDATE course_seeds s SET target_text = b.target_text, known_text = b.known_text, last_edit_event_id = b.last_edit_event_id FROM backup_cym_proof_fixes_554_seeds b WHERE s.id = b.id;
-- the job's flag rows sit at the LEGO's new id (or its old one, where it did not move)
DELETE FROM lego_proof_flags WHERE (course_code, lego_id) IN (('cym_nv2_for_eng','S0031L04'),('cym_nv2_for_eng','S1148L03'),('cym_nv2_for_eng','S1312L02'),('cym_nv2_for_eng','S0076L03'),('cym_nv2_for_eng','S0077L02'),('cym_nv2_for_eng','S1009L01'),('cym_nv2_for_eng','S1010L04'),('cym_nv2_for_eng','S1092L02'),('cym_nv2_for_eng','S1115L02'),('cym_nv2_for_eng','S1147L04'),('cym_nv2_for_eng','S1161L03'),('cym_nv2_for_eng','S1178L01'),('cym_nv2_for_eng','S1211L02'),('cym_nv2_for_eng','S1332L03'),('cym_nv2_for_eng','S1335L04'),('cym_nv2_for_eng','S1413L04'),('cym_sv2_for_eng','S1152L02'),('cym_sv2_for_eng','S1257L02'),('cym_sv2_for_eng','S1268L02'),('cym_sv2_for_eng','S1364L03'),('cym_sv2_for_eng','S1434L02'),('cym_sv2_for_eng','S1530L01'),('cym_sv2_for_eng','S1590L02'))
  OR (course_code, lego_id) IN (SELECT course_code, lego_id FROM backup_cym_proof_fixes_554_flags);
INSERT INTO lego_proof_flags SELECT * FROM backup_cym_proof_fixes_554_flags;
SET CONSTRAINTS ALL IMMEDIATE;
DO $$ BEGIN
  IF (SELECT md5(string_agg(md5(row(l.id,l.course_code,l.seed_number,l.lego_index,l.type,l.is_new,l.known_text,l.target_text,l.components,l.status,l.release_batch,l.created_at,l.known_audio_id,l.target1_audio_id,l.target2_audio_id,l.presentation_audio_id,l.target1_duration_ms,l.target2_duration_ms,l.target_text_roman,l.target_lego_id,l.known_gloss_segments,l.last_edit_event_id)::text), '' ORDER BY l.id)) FROM course_legos l JOIN t_seeds USING (course_code, seed_number))
     IS DISTINCT FROM (SELECT md5(string_agg(md5(row(b.id,b.course_code,b.seed_number,b.lego_index,b.type,b.is_new,b.known_text,b.target_text,b.components,b.status,b.release_batch,b.created_at,b.known_audio_id,b.target1_audio_id,b.target2_audio_id,b.presentation_audio_id,b.target1_duration_ms,b.target2_duration_ms,b.target_text_roman,b.target_lego_id,b.known_gloss_segments,b.last_edit_event_id)::text), '' ORDER BY b.id)) FROM backup_cym_proof_fixes_554_legos b) THEN
    RAISE EXCEPTION 'CHECK FAILED: LEGOs differ from the backup'; END IF;
  IF (SELECT md5(string_agg(md5((p.id, p.lego_index, p.position, p.known_text, p.target_text, p.phrase_role, p.lego_position, p.decomposition, p.target1_audio_id, p.target2_audio_id)::text), '' ORDER BY p.id))
        FROM course_practice_phrases p WHERE (p.course_code, p.seed_number) IN (SELECT course_code, seed_number FROM t_seeds) OR p.id IN (SELECT id FROM t_extra))
     IS DISTINCT FROM (SELECT md5(string_agg(md5((b.id, b.lego_index, b.position, b.known_text, b.target_text, b.phrase_role, b.lego_position, b.decomposition, b.target1_audio_id, b.target2_audio_id)::text), '' ORDER BY b.id)) FROM backup_cym_proof_fixes_554_phrases b) THEN
    RAISE EXCEPTION 'CHECK FAILED: phrases differ from the backup'; END IF;
  IF (SELECT count(*) FROM lego_introductions i JOIN t_seeds t ON t.course_code = i.course_code AND t.seed_number = substr(i.lego_id, 2, 4)::int) <> (SELECT count(*) FROM backup_cym_proof_fixes_554_intros) THEN
    RAISE EXCEPTION 'CHECK FAILED: intros'; END IF;
  RAISE NOTICE 'RESTORED: % LEGOs, % phrases, % intros, % flags', (SELECT count(*) FROM backup_cym_proof_fixes_554_legos), (SELECT count(*) FROM backup_cym_proof_fixes_554_phrases), (SELECT count(*) FROM backup_cym_proof_fixes_554_intros), (SELECT count(*) FROM backup_cym_proof_fixes_554_flags);
END $$;
DROP TABLE backup_cym_proof_fixes_554_legos, backup_cym_proof_fixes_554_phrases, backup_cym_proof_fixes_554_intros, backup_cym_proof_fixes_554_seeds, backup_cym_proof_fixes_554_flags, backup_cym_proof_fixes_554_scope;
DROP TABLE IF EXISTS backup_cym_nv2_newpairing_554;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
