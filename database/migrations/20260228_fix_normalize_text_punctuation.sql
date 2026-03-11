-- Migration: Fix normalize_text() to strip trailing sentence punctuation
-- Date: 2026-02-28
-- Purpose: Audio records often have trailing periods (for TTS prosody) while
--          phrase text does not. The old normalize_text() only did lower(trim()),
--          so the linker couldn't match "hola." to "hola". This fix strips
--          trailing sentence punctuation (.?!¿¡。？！) for matching purposes.

-- ============================================
-- UPDATE normalize_text() FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION normalize_text(input_text TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN rtrim(lower(trim(input_text)), '.?!¿¡。？！');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- UPDATE link_all_audio_ids() to use normalize_text() on BOTH sides
-- ============================================
-- The RPC must apply normalize_text() to course_audio.text_normalized
-- (which may contain trailing punctuation) so it matches the stripped
-- phrase text. Drop and recreate since return type may differ.

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
  -- Validate course exists
  SELECT * INTO v_course FROM courses WHERE course_code = p_course_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found: %', p_course_code;
  END IF;

  -- Link LEGOs - known
  UPDATE course_legos cl SET known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND normalize_text(ca.text_normalized) = normalize_text(cl.known_text)
      AND ca.role IN ('known', 'source')
    LIMIT 1
  )
  WHERE cl.course_code = p_course_code AND cl.known_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_legos_known = ROW_COUNT;

  -- Link LEGOs - target1
  UPDATE course_legos cl SET target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND normalize_text(ca.text_normalized) = normalize_text(cl.target_text)
      AND ca.role = 'target1'
    LIMIT 1
  )
  WHERE cl.course_code = p_course_code AND cl.target1_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_legos_t1 = ROW_COUNT;

  -- Link LEGOs - target2
  UPDATE course_legos cl SET target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND normalize_text(ca.text_normalized) = normalize_text(cl.target_text)
      AND ca.role = 'target2'
    LIMIT 1
  )
  WHERE cl.course_code = p_course_code AND cl.target2_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_legos_t2 = ROW_COUNT;

  -- Link phrases - known
  UPDATE course_practice_phrases cpp SET known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND normalize_text(ca.text_normalized) = normalize_text(cpp.known_text)
      AND ca.role IN ('known', 'source')
    LIMIT 1
  )
  WHERE cpp.course_code = p_course_code AND cpp.known_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_phrases_known = ROW_COUNT;

  -- Link phrases - target1
  UPDATE course_practice_phrases cpp SET target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND normalize_text(ca.text_normalized) = normalize_text(cpp.target_text)
      AND ca.role = 'target1'
    LIMIT 1
  )
  WHERE cpp.course_code = p_course_code AND cpp.target1_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_phrases_t1 = ROW_COUNT;

  -- Link phrases - target2
  UPDATE course_practice_phrases cpp SET target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND normalize_text(ca.text_normalized) = normalize_text(cpp.target_text)
      AND ca.role = 'target2'
    LIMIT 1
  )
  WHERE cpp.course_code = p_course_code AND cpp.target2_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_phrases_t2 = ROW_COUNT;

  -- Link seeds - known
  UPDATE course_seeds cs SET known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cs.course_code
      AND normalize_text(ca.text_normalized) = normalize_text(cs.known_text)
      AND ca.role IN ('known', 'source')
    LIMIT 1
  )
  WHERE cs.course_code = p_course_code AND cs.known_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_seeds_known = ROW_COUNT;

  -- Link seeds - target1
  UPDATE course_seeds cs SET target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cs.course_code
      AND normalize_text(ca.text_normalized) = normalize_text(cs.target_text)
      AND ca.role = 'target1'
    LIMIT 1
  )
  WHERE cs.course_code = p_course_code AND cs.target1_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_seeds_t1 = ROW_COUNT;

  -- Link seeds - target2
  UPDATE course_seeds cs SET target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cs.course_code
      AND normalize_text(ca.text_normalized) = normalize_text(cs.target_text)
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
