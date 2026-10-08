-- UNDO for job #429 PART 2 SOUTH (weave-cym-sv2-hc-recording.sql): un-link every
-- reused clip, from the backups that script took. (The South run wrote no voice_config: nothing to un-cast.) Touches cym_sv2_for_eng ONLY; no audio row is
-- touched (reuse only pointed at existing clips). Run BEFORE weave-cym-sv2-hc-phrases-undo.sql.
BEGIN;

UPDATE course_seeds s SET target1_audio_id = b.target1_audio_id, target2_audio_id = b.target2_audio_id,
       last_edit_event_id = b.last_edit_event_id
FROM backup_cym_sv2_seed_audio_429 b WHERE s.id = b.id AND s.course_code = 'cym_sv2_for_eng';

UPDATE course_practice_phrases f SET target1_audio_id = b.target1_audio_id, target2_audio_id = b.target2_audio_id,
       last_edit_event_id = b.last_edit_event_id
FROM backup_cym_sv2_hc_phrase_audio_429 b WHERE f.id = b.id AND f.course_code = 'cym_sv2_for_eng';

UPDATE course_legos l SET target1_audio_id = b.target1_audio_id, target2_audio_id = b.target2_audio_id,
       target1_duration_ms = b.target1_duration_ms, target2_duration_ms = b.target2_duration_ms,
       last_edit_event_id = b.last_edit_event_id
FROM backup_cym_sv2_hc_lego_audio_429 b WHERE l.id = b.id AND l.course_code = 'cym_sv2_for_eng';

DO $$
DECLARE d int;
BEGIN
  SELECT count(*) INTO d FROM course_seeds s JOIN backup_cym_sv2_seed_audio_429 b USING (id)
   WHERE (s.target1_audio_id, s.target2_audio_id) IS DISTINCT FROM (b.target1_audio_id, b.target2_audio_id);
  IF d <> 0 THEN RAISE EXCEPTION 'seed audio differs from backup on % rows — rolled back', d; END IF;
  SELECT count(*) INTO d FROM course_practice_phrases f JOIN backup_cym_sv2_hc_phrase_audio_429 b USING (id)
   WHERE (f.target1_audio_id, f.target2_audio_id) IS DISTINCT FROM (b.target1_audio_id, b.target2_audio_id);
  IF d <> 0 THEN RAISE EXCEPTION 'phrase audio differs from backup on % rows — rolled back', d; END IF;
  RAISE NOTICE 'part 2 undo ok';
END $$;

COMMIT;
