-- Migration: make link_all_audio_ids() question-mark / exclamation aware
-- Date: 2026-06-11
--
-- Problem: link_all_audio_ids() matches phrase/lego/seed text to course_audio via
--   ca.text_normalized = normalize_text(<content>). normalize_text() strips trailing
--   ?/!/¿/¡ (see 20260228_fix_normalize_text_punctuation). So a phrase whose text was
--   edited to add a '?' (a real change of intonation) RE-LINKS to the existing flat
--   statement recording instead of staying unlinked and being regenerated with question
--   intonation. Observed 2026-06-11 on eng_for_sin/eng_for_tam after adding missing '?'
--   to questions: the '?' landed in the text but the audio still said the statement.
--
-- Fix: keep the fast, indexed text_normalized equality (the 20260325 performance fix),
--   but additionally require the trailing-question/exclamation status to match between
--   the candidate audio's RAW text and the content's RAW text. A "...?" phrase now only
--   links to a "...?" recording; if none exists it stays NULL and /generate makes a fresh
--   one. Statements are unaffected (false = false).
--
-- The extra predicate is a cheap regex on ca.text, evaluated only on the already-tiny
-- candidate set produced by the indexed text_normalized match — no perf regression vs
-- the 20260325 version (no normalize_text() added to the audio side).
--
-- Pairs with the JS fallback fix in services/phases/phase8-audio-v13.cjs
-- (linkAudioIdsBatch now keys its audio map by normalizeForAudio(text), which preserves
-- ?/!, and no longer strips ? to force a match).
--
-- Terminal-intonation test: COALESCE(<text> ~ '[?!？！][[:space:]]*$', false)

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
      AND COALESCE(ca.text ~ '[?!？！][[:space:]]*$', false) = COALESCE(cl.known_text ~ '[?!？！][[:space:]]*$', false)
      AND ca.role IN ('known', 'source')
    LIMIT 1
  )
  WHERE cl.course_code = p_course_code AND cl.known_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_legos_known = ROW_COUNT;

  UPDATE course_legos cl SET target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND ca.text_normalized = normalize_text(cl.target_text)
      AND COALESCE(ca.text ~ '[?!？！][[:space:]]*$', false) = COALESCE(cl.target_text ~ '[?!？！][[:space:]]*$', false)
      AND ca.role = 'target1'
    LIMIT 1
  )
  WHERE cl.course_code = p_course_code AND cl.target1_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_legos_t1 = ROW_COUNT;

  UPDATE course_legos cl SET target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND ca.text_normalized = normalize_text(cl.target_text)
      AND COALESCE(ca.text ~ '[?!？！][[:space:]]*$', false) = COALESCE(cl.target_text ~ '[?!？！][[:space:]]*$', false)
      AND ca.role = 'target2'
    LIMIT 1
  )
  WHERE cl.course_code = p_course_code AND cl.target2_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_legos_t2 = ROW_COUNT;

  UPDATE course_practice_phrases cpp SET known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND ca.text_normalized = normalize_text(cpp.known_text)
      AND COALESCE(ca.text ~ '[?!？！][[:space:]]*$', false) = COALESCE(cpp.known_text ~ '[?!？！][[:space:]]*$', false)
      AND ca.role IN ('known', 'source')
    LIMIT 1
  )
  WHERE cpp.course_code = p_course_code AND cpp.known_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_phrases_known = ROW_COUNT;

  UPDATE course_practice_phrases cpp SET target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND ca.text_normalized = normalize_text(cpp.target_text)
      AND COALESCE(ca.text ~ '[?!？！][[:space:]]*$', false) = COALESCE(cpp.target_text ~ '[?!？！][[:space:]]*$', false)
      AND ca.role = 'target1'
    LIMIT 1
  )
  WHERE cpp.course_code = p_course_code AND cpp.target1_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_phrases_t1 = ROW_COUNT;

  UPDATE course_practice_phrases cpp SET target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND ca.text_normalized = normalize_text(cpp.target_text)
      AND COALESCE(ca.text ~ '[?!？！][[:space:]]*$', false) = COALESCE(cpp.target_text ~ '[?!？！][[:space:]]*$', false)
      AND ca.role = 'target2'
    LIMIT 1
  )
  WHERE cpp.course_code = p_course_code AND cpp.target2_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_phrases_t2 = ROW_COUNT;

  UPDATE course_seeds cs SET known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cs.course_code
      AND ca.text_normalized = normalize_text(cs.known_text)
      AND COALESCE(ca.text ~ '[?!？！][[:space:]]*$', false) = COALESCE(cs.known_text ~ '[?!？！][[:space:]]*$', false)
      AND ca.role IN ('known', 'source')
    LIMIT 1
  )
  WHERE cs.course_code = p_course_code AND cs.known_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_seeds_known = ROW_COUNT;

  UPDATE course_seeds cs SET target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cs.course_code
      AND ca.text_normalized = normalize_text(cs.target_text)
      AND COALESCE(ca.text ~ '[?!？！][[:space:]]*$', false) = COALESCE(cs.target_text ~ '[?!？！][[:space:]]*$', false)
      AND ca.role = 'target1'
    LIMIT 1
  )
  WHERE cs.course_code = p_course_code AND cs.target1_audio_id IS NULL;
  GET DIAGNOSTICS v_linked_seeds_t1 = ROW_COUNT;

  UPDATE course_seeds cs SET target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cs.course_code
      AND ca.text_normalized = normalize_text(cs.target_text)
      AND COALESCE(ca.text ~ '[?!？！][[:space:]]*$', false) = COALESCE(cs.target_text ~ '[?!？！][[:space:]]*$', false)
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
