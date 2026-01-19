-- ============================================================================
-- RPC FUNCTIONS TO LINK AUDIO IDs
--
-- These functions update *_audio_id columns by matching text.
-- Called by Phase 8's /link-audio-ids endpoint after audio generation.
-- ============================================================================

-- ============================================================================
-- PRACTICE PHRASE LINKING FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION link_practice_phrase_known_audio(
  p_course_code TEXT,
  p_known_lang TEXT
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE course_practice_phrases p
  SET known_audio_id = ka.id
  FROM course_audio ka
  WHERE p.course_code = p_course_code
    AND p.known_audio_id IS NULL
    AND ka.course_code = p.course_code
    AND ka.text_normalized = lower(trim(p.known_text))
    AND ka.language = p_known_lang
    AND ka.role = 'known';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION link_practice_phrase_target1_audio(
  p_course_code TEXT,
  p_target_lang TEXT
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE course_practice_phrases p
  SET target1_audio_id = t1.id
  FROM course_audio t1
  WHERE p.course_code = p_course_code
    AND p.target1_audio_id IS NULL
    AND t1.course_code = p.course_code
    AND t1.text_normalized = lower(trim(p.target_text))
    AND t1.language = p_target_lang
    AND t1.role = 'target1';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION link_practice_phrase_target2_audio(
  p_course_code TEXT,
  p_target_lang TEXT
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE course_practice_phrases p
  SET target2_audio_id = t2.id
  FROM course_audio t2
  WHERE p.course_code = p_course_code
    AND p.target2_audio_id IS NULL
    AND t2.course_code = p.course_code
    AND t2.text_normalized = lower(trim(p.target_text))
    AND t2.language = p_target_lang
    AND t2.role = 'target2';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- LEGO LINKING FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION link_lego_known_audio(
  p_course_code TEXT,
  p_known_lang TEXT
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE course_legos l
  SET known_audio_id = ka.id
  FROM course_audio ka
  WHERE l.course_code = p_course_code
    AND l.known_audio_id IS NULL
    AND ka.course_code = l.course_code
    AND ka.text_normalized = lower(trim(l.known_text))
    AND ka.language = p_known_lang
    AND ka.role = 'known';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION link_lego_target1_audio(
  p_course_code TEXT,
  p_target_lang TEXT
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE course_legos l
  SET target1_audio_id = t1.id
  FROM course_audio t1
  WHERE l.course_code = p_course_code
    AND l.target1_audio_id IS NULL
    AND t1.course_code = l.course_code
    AND t1.text_normalized = lower(trim(l.target_text))
    AND t1.language = p_target_lang
    AND t1.role = 'target1';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION link_lego_target2_audio(
  p_course_code TEXT,
  p_target_lang TEXT
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE course_legos l
  SET target2_audio_id = t2.id
  FROM course_audio t2
  WHERE l.course_code = p_course_code
    AND l.target2_audio_id IS NULL
    AND t2.course_code = l.course_code
    AND t2.text_normalized = lower(trim(l.target_text))
    AND t2.language = p_target_lang
    AND t2.role = 'target2';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED LINKING FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION link_seed_known_audio(
  p_course_code TEXT,
  p_known_lang TEXT
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE course_seeds s
  SET known_audio_id = ka.id
  FROM course_audio ka
  WHERE s.course_code = p_course_code
    AND s.known_audio_id IS NULL
    AND ka.course_code = s.course_code
    AND ka.text_normalized = lower(trim(s.known_text))
    AND ka.language = p_known_lang
    AND ka.role = 'known';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION link_seed_target1_audio(
  p_course_code TEXT,
  p_target_lang TEXT
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE course_seeds s
  SET target1_audio_id = t1.id
  FROM course_audio t1
  WHERE s.course_code = p_course_code
    AND s.target1_audio_id IS NULL
    AND t1.course_code = s.course_code
    AND t1.text_normalized = lower(trim(s.target_text))
    AND t1.language = p_target_lang
    AND t1.role = 'target1';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION link_seed_target2_audio(
  p_course_code TEXT,
  p_target_lang TEXT
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE course_seeds s
  SET target2_audio_id = t2.id
  FROM course_audio t2
  WHERE s.course_code = p_course_code
    AND s.target2_audio_id IS NULL
    AND t2.course_code = s.course_code
    AND t2.text_normalized = lower(trim(s.target_text))
    AND t2.language = p_target_lang
    AND t2.role = 'target2';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONVENIENCE FUNCTION: Link ALL audio IDs for a course
-- ============================================================================

CREATE OR REPLACE FUNCTION link_all_audio_ids(p_course_code TEXT)
RETURNS TABLE(
  entity TEXT,
  role TEXT,
  linked_count INTEGER
) AS $$
DECLARE
  v_known_lang TEXT;
  v_target_lang TEXT;
BEGIN
  -- Get course languages
  SELECT known_lang, target_lang INTO v_known_lang, v_target_lang
  FROM courses WHERE course_code = p_course_code;

  IF v_known_lang IS NULL THEN
    RAISE EXCEPTION 'Course not found: %', p_course_code;
  END IF;

  -- Link practice phrases
  RETURN QUERY SELECT 'practice_phrase'::TEXT, 'known'::TEXT, link_practice_phrase_known_audio(p_course_code, v_known_lang);
  RETURN QUERY SELECT 'practice_phrase'::TEXT, 'target1'::TEXT, link_practice_phrase_target1_audio(p_course_code, v_target_lang);
  RETURN QUERY SELECT 'practice_phrase'::TEXT, 'target2'::TEXT, link_practice_phrase_target2_audio(p_course_code, v_target_lang);

  -- Link legos
  RETURN QUERY SELECT 'lego'::TEXT, 'known'::TEXT, link_lego_known_audio(p_course_code, v_known_lang);
  RETURN QUERY SELECT 'lego'::TEXT, 'target1'::TEXT, link_lego_target1_audio(p_course_code, v_target_lang);
  RETURN QUERY SELECT 'lego'::TEXT, 'target2'::TEXT, link_lego_target2_audio(p_course_code, v_target_lang);

  -- Link seeds
  RETURN QUERY SELECT 'seed'::TEXT, 'known'::TEXT, link_seed_known_audio(p_course_code, v_known_lang);
  RETURN QUERY SELECT 'seed'::TEXT, 'target1'::TEXT, link_seed_target1_audio(p_course_code, v_target_lang);
  RETURN QUERY SELECT 'seed'::TEXT, 'target2'::TEXT, link_seed_target2_audio(p_course_code, v_target_lang);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION link_all_audio_ids IS 'Links all audio IDs for a course. Call after audio generation. Returns count of linked records per entity/role.';
