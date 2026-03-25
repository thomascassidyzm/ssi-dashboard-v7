-- Migration: Fix link_all_audio_ids performance
-- Date: 2026-03-25
-- Problem: normalize_text() was called on BOTH sides of every join, including
--          on course_audio.text_normalized which is already normalized at insert time.
--          This forced full table scans with per-row function calls. On courses with
--          20k+ audio rows, the function timed out repeatedly, grabbed ShareLocks,
--          and cascaded into statement timeouts across the whole DB (outage 2026-03-24/25).
-- Fix: Only call normalize_text() on the content side (lego/phrase/seed text).
--      Add composite index on course_audio for the lookup pattern.

CREATE INDEX IF NOT EXISTS idx_course_audio_text_lookup
  ON course_audio (course_code, text_normalized, role);

DROP FUNCTION IF EXISTS link_all_audio_ids(text);

CREATE OR REPLACE FUNCTION link_all_audio_ids(p_course_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_course RECORD;
  v_linked_legos_known INT := 0;
  v_linked_legos_t1 INT := 0;
  v_linked_legos_t2 INT := 0;
  v_linked_phrases_known INT := 0;
  v_linked_phrases_t1 INT := 0;
  v_linked_phrases_t2 INT := 0;
  v_linked_seeds_known INT := 0;
  v_linked_seeds_t1 INT := 0;
  v_linked_seeds_t2 INT := 0;
BEGIN
  SELECT * INTO v_course FROM courses WHERE course_code = p_course_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found: %', p_course_code;
  END IF;

  UPDATE course_legos cl SET known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND ca.text_normalized = normalize_text(cl.known_text)
      AND ca.role IN ('known', 'source')
    LIMIT 1
  )
  WHERE cl.course_code = p_course_code AND cl.known_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_legos_known = ROW_COUNT;

  UPDATE course_legos cl SET target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND ca.text_normalized = normalize_text(cl.target_text)
      AND ca.role = 'target1'
    LIMIT 1
  )
  WHERE cl.course_code = p_course_code AND cl.target1_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_legos_t1 = ROW_COUNT;

  UPDATE course_legos cl SET target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND ca.text_normalized = normalize_text(cl.target_text)
      AND ca.role = 'target2'
    LIMIT 1
  )
  WHERE cl.course_code = p_course_code AND cl.target2_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_legos_t2 = ROW_COUNT;

  UPDATE course_practice_phrases cpp SET known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND ca.text_normalized = normalize_text(cpp.known_text)
      AND ca.role IN ('known', 'source')
    LIMIT 1
  )
  WHERE cpp.course_code = p_course_code AND cpp.known_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_phrases_known = ROW_COUNT;

  UPDATE course_practice_phrases cpp SET target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND ca.text_normalized = normalize_text(cpp.target_text)
      AND ca.role = 'target1'
    LIMIT 1
  )
  WHERE cpp.course_code = p_course_code AND cpp.target1_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_phrases_t1 = ROW_COUNT;

  UPDATE course_practice_phrases cpp SET target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND ca.text_normalized = normalize_text(cpp.target_text)
      AND ca.role = 'target2'
    LIMIT 1
  )
  WHERE cpp.course_code = p_course_code AND cpp.target2_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_phrases_t2 = ROW_COUNT;

  UPDATE course_seeds cs SET known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cs.course_code
      AND ca.text_normalized = normalize_text(cs.known_text)
      AND ca.role IN ('known', 'source')
    LIMIT 1
  )
  WHERE cs.course_code = p_course_code AND cs.known_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_seeds_known = ROW_COUNT;

  UPDATE course_seeds cs SET target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cs.course_code
      AND ca.text_normalized = normalize_text(cs.target_text)
      AND ca.role = 'target1'
    LIMIT 1
  )
  WHERE cs.course_code = p_course_code AND cs.target1_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_seeds_t1 = ROW_COUNT;

  UPDATE course_seeds cs SET target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cs.course_code
      AND ca.text_normalized = normalize_text(cs.target_text)
      AND ca.role = 'target2'
    LIMIT 1
  )
  WHERE cs.course_code = p_course_code AND cs.target2_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_seeds_t2 = ROW_COUNT;

  RETURN jsonb_build_object(
    'course_code', p_course_code,
    'legos', jsonb_build_object('known', v_linked_legos_known, 'target1', v_linked_legos_t1, 'target2', v_linked_legos_t2),
    'phrases', jsonb_build_object('known', v_linked_phrases_known, 'target1', v_linked_phrases_t1, 'target2', v_linked_phrases_t2),
    'seeds', jsonb_build_object('known', v_linked_seeds_known, 'target1', v_linked_seeds_t1, 'target2', v_linked_seeds_t2)
  );
END;
$$ LANGUAGE plpgsql;
