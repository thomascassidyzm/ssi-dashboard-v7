-- UNDO for job #429 PART 2 (weave-cym-nv2-hc-recording.sql): un-cast the sandbox and un-link every
-- reused clip, from the backups that script took. Touches cym_nv2_for_eng ONLY; no audio row is
-- touched (reuse only pointed at existing clips). Run BEFORE weave-cym-nv2-hc-phrases-undo.sql.
BEGIN;

UPDATE courses c SET voice_config = b.voice_config
FROM backup_cym_nv2_course_429 b WHERE c.course_code = 'cym_nv2_for_eng' AND b.course_code = c.course_code;

UPDATE course_seeds s SET target1_audio_id = b.target1_audio_id, target2_audio_id = b.target2_audio_id,
       last_edit_event_id = b.last_edit_event_id
FROM backup_cym_nv2_seed_audio_429 b WHERE s.id = b.id AND s.course_code = 'cym_nv2_for_eng';

UPDATE course_practice_phrases f SET target1_audio_id = b.target1_audio_id, target2_audio_id = b.target2_audio_id,
       last_edit_event_id = b.last_edit_event_id
FROM backup_cym_nv2_hc_phrase_audio_429 b WHERE f.id = b.id AND f.course_code = 'cym_nv2_for_eng';

UPDATE course_legos l SET target1_audio_id = b.target1_audio_id, target2_audio_id = b.target2_audio_id,
       target1_duration_ms = b.target1_duration_ms, target2_duration_ms = b.target2_duration_ms,
       last_edit_event_id = b.last_edit_event_id
FROM backup_cym_nv2_hc_lego_audio_429 b WHERE l.id = b.id AND l.course_code = 'cym_nv2_for_eng';

DO $$
DECLARE d int;
BEGIN
  SELECT count(*) INTO d FROM course_seeds s JOIN backup_cym_nv2_seed_audio_429 b USING (id)
   WHERE (s.target1_audio_id, s.target2_audio_id) IS DISTINCT FROM (b.target1_audio_id, b.target2_audio_id);
  IF d <> 0 THEN RAISE EXCEPTION 'seed audio differs from backup on % rows — rolled back', d; END IF;
  SELECT count(*) INTO d FROM course_practice_phrases f JOIN backup_cym_nv2_hc_phrase_audio_429 b USING (id)
   WHERE (f.target1_audio_id, f.target2_audio_id) IS DISTINCT FROM (b.target1_audio_id, b.target2_audio_id);
  IF d <> 0 THEN RAISE EXCEPTION 'phrase audio differs from backup on % rows — rolled back', d; END IF;
  IF (SELECT voice_config FROM courses WHERE course_code = 'cym_nv2_for_eng')
     IS DISTINCT FROM (SELECT voice_config FROM backup_cym_nv2_course_429) THEN
    RAISE EXCEPTION 'voice_config differs from backup — rolled back';
  END IF;
  RAISE NOTICE 'part 2 undo ok';
END $$;

COMMIT;
