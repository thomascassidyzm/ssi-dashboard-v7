-- Job #554·P: proves the undo BEFORE the apply (run 2026-10-13 13:06Z, PASSED). After the apply, the undo's own dry run is the test
-- (psql -f weave-cym-proof-fixes-554-undo.sql: restores, checks against the backup, rolls back; PASSED after stage 2 and the new-pairing rows were committed).
-- Original purpose: applies stage 1
-- committed, they are simply part of the state), runs the undo, checks every touched seed and the extra phrases
-- equal what they were before, then ROLLS BACK everything. Never commits. Run from this directory:
--   psql "$DATABASE_URL" -f weave-cym-proof-fixes-554-undo-test.sql
\set ON_ERROR_STOP on
\set finish 'SELECT 1'
BEGIN;
CREATE TEMP TABLE undo_test_pre AS
  SELECT 'lego' k, md5(string_agg(md5((l.id, l.course_code, l.seed_number, l.lego_index, l.type, l.is_new, l.known_text, l.target_text, l.components, l.target1_audio_id)::text), '' ORDER BY l.id)) h
    FROM course_legos l WHERE l.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'phrase', md5(string_agg(md5((p.id, p.lego_index, p.position, p.known_text, p.target_text, p.phrase_role, p.lego_position, p.decomposition)::text), '' ORDER BY p.id))
    FROM course_practice_phrases p WHERE p.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'intro', md5(string_agg(md5(i::text), '' ORDER BY i.id)) FROM lego_introductions i WHERE i.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'seed', md5(string_agg(md5((s.id, s.target_text, s.known_text)::text), '' ORDER BY s.id)) FROM course_seeds s WHERE s.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'flags', md5(string_agg(md5((f.course_code, f.lego_id, f.flagged, f.note, f.flagged_by)::text), '' ORDER BY f.course_code, f.lego_id)) FROM lego_proof_flags f;
\ir weave-cym-proof-fixes-554.sql
DROP TABLE t_seeds, t_extra;
\ir weave-cym-proof-fixes-554-undo.sql
CREATE TEMP TABLE undo_test_post AS
  SELECT 'lego' k, md5(string_agg(md5((l.id, l.course_code, l.seed_number, l.lego_index, l.type, l.is_new, l.known_text, l.target_text, l.components, l.target1_audio_id)::text), '' ORDER BY l.id)) h
    FROM course_legos l WHERE l.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'phrase', md5(string_agg(md5((p.id, p.lego_index, p.position, p.known_text, p.target_text, p.phrase_role, p.lego_position, p.decomposition)::text), '' ORDER BY p.id))
    FROM course_practice_phrases p WHERE p.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'intro', md5(string_agg(md5(i::text), '' ORDER BY i.id)) FROM lego_introductions i WHERE i.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'seed', md5(string_agg(md5((s.id, s.target_text, s.known_text)::text), '' ORDER BY s.id)) FROM course_seeds s WHERE s.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'flags', md5(string_agg(md5((f.course_code, f.lego_id, f.flagged, f.note, f.flagged_by)::text), '' ORDER BY f.course_code, f.lego_id)) FROM lego_proof_flags f;
SELECT 'DIFFERS' x, k FROM (SELECT * FROM undo_test_pre EXCEPT SELECT * FROM undo_test_post) d;
DO $$ BEGIN
  IF (SELECT count(*) FROM undo_test_post) <> 5 OR EXISTS (SELECT * FROM undo_test_pre EXCEPT SELECT * FROM undo_test_post) THEN
    RAISE EXCEPTION 'UNDO TEST FAILED: the sandboxes after apply + undo differ from before'; END IF;
  RAISE NOTICE 'UNDO TEST PASSED: apply then undo leaves both sandboxes and the flags exactly as they were';
END $$;
ROLLBACK;
