-- ROLLBACK for 20260819_relink_must_match_voice_config.sql
-- Restores the voice-BLIND bodies of both DB relink paths exactly as they stood
-- on 2026-08-19 before Kai's ruling was implemented. Captured from the live
-- catalogue with pg_get_functiondef, so this is the real prior definition and
-- not a reconstruction. Applying it re-opens the defect that split the Chinese
-- known side across two voices — do it only to unblock, and re-apply the
-- forward migration afterwards.

BEGIN;

CREATE OR REPLACE FUNCTION public.link_all_audio_ids(p_course_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
    WHERE cl.course_code = p_course_code AND cl.known_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cl.course_code
          AND ca.text_normalized = normalize_text(cl.known_text)
          AND ca.role IN ('known', 'source')
      );
    GET DIAGNOSTICS v_linked_legos_known = ROW_COUNT;

    UPDATE course_legos cl SET target1_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cl.course_code
        AND ca.text_normalized = normalize_text(cl.target_text)
        AND ca.role = 'target1'
      LIMIT 1
    )
    WHERE cl.course_code = p_course_code AND cl.target1_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cl.course_code
          AND ca.text_normalized = normalize_text(cl.target_text)
          AND ca.role = 'target1'
      );
    GET DIAGNOSTICS v_linked_legos_t1 = ROW_COUNT;

    UPDATE course_legos cl SET target2_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cl.course_code
        AND ca.text_normalized = normalize_text(cl.target_text)
        AND ca.role = 'target2'
      LIMIT 1
    )
    WHERE cl.course_code = p_course_code AND cl.target2_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cl.course_code
          AND ca.text_normalized = normalize_text(cl.target_text)
          AND ca.role = 'target2'
      );
    GET DIAGNOSTICS v_linked_legos_t2 = ROW_COUNT;

    UPDATE course_practice_phrases cpp SET known_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cpp.course_code
        AND ca.text_normalized = normalize_text(cpp.known_text)
        AND ca.role IN ('known', 'source')
      LIMIT 1
    )
    WHERE cpp.course_code = p_course_code AND cpp.known_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cpp.course_code
          AND ca.text_normalized = normalize_text(cpp.known_text)
          AND ca.role IN ('known', 'source')
      );
    GET DIAGNOSTICS v_linked_phrases_known = ROW_COUNT;

    UPDATE course_practice_phrases cpp SET target1_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cpp.course_code
        AND ca.text_normalized = normalize_text(cpp.target_text)
        AND ca.role = 'target1'
      LIMIT 1
    )
    WHERE cpp.course_code = p_course_code AND cpp.target1_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cpp.course_code
          AND ca.text_normalized = normalize_text(cpp.target_text)
          AND ca.role = 'target1'
      );
    GET DIAGNOSTICS v_linked_phrases_t1 = ROW_COUNT;

    UPDATE course_practice_phrases cpp SET target2_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cpp.course_code
        AND ca.text_normalized = normalize_text(cpp.target_text)
        AND ca.role = 'target2'
      LIMIT 1
    )
    WHERE cpp.course_code = p_course_code AND cpp.target2_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cpp.course_code
          AND ca.text_normalized = normalize_text(cpp.target_text)
          AND ca.role = 'target2'
      );
    GET DIAGNOSTICS v_linked_phrases_t2 = ROW_COUNT;

    UPDATE course_seeds cs SET known_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cs.course_code
        AND ca.text_normalized = normalize_text(cs.known_text)
        AND ca.role IN ('known', 'source')
      LIMIT 1
    )
    WHERE cs.course_code = p_course_code AND cs.known_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cs.course_code
          AND ca.text_normalized = normalize_text(cs.known_text)
          AND ca.role IN ('known', 'source')
      );
    GET DIAGNOSTICS v_linked_seeds_known = ROW_COUNT;

    UPDATE course_seeds cs SET target1_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cs.course_code
        AND ca.text_normalized = normalize_text(cs.target_text)
        AND ca.role = 'target1'
      LIMIT 1
    )
    WHERE cs.course_code = p_course_code AND cs.target1_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cs.course_code
          AND ca.text_normalized = normalize_text(cs.target_text)
          AND ca.role = 'target1'
      );
    GET DIAGNOSTICS v_linked_seeds_t1 = ROW_COUNT;

    UPDATE course_seeds cs SET target2_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cs.course_code
        AND ca.text_normalized = normalize_text(cs.target_text)
        AND ca.role = 'target2'
      LIMIT 1
    )
    WHERE cs.course_code = p_course_code AND cs.target2_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cs.course_code
          AND ca.text_normalized = normalize_text(cs.target_text)
          AND ca.role = 'target2'
      );
    GET DIAGNOSTICS v_linked_seeds_t2 = ROW_COUNT;

    RETURN jsonb_build_object(
      'course_code', p_course_code,
      'legos', jsonb_build_object('known', v_linked_legos_known, 'target1', v_linked_legos_t1, 'target2', v_linked_legos_t2),
      'phrases', jsonb_build_object('known', v_linked_phrases_known, 'target1', v_linked_phrases_t1, 'target2', v_linked_phrases_t2),
      'seeds', jsonb_build_object('known', v_linked_seeds_known, 'target1', v_linked_seeds_t1, 'target2', v_linked_seeds_t2)
    );
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.link_audio_to_content()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.role = 'known' THEN
    UPDATE course_legos SET known_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND known_audio_id IS NULL
        AND normalize_text(known_text) = NEW.text_normalized;
    UPDATE course_practice_phrases SET known_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND known_audio_id IS NULL
        AND normalize_text(known_text) = NEW.text_normalized;
    UPDATE course_seeds SET known_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND known_audio_id IS NULL
        AND normalize_text(known_text) = NEW.text_normalized;

  ELSIF NEW.role = 'target1' THEN
    UPDATE course_legos
      SET target1_audio_id = NEW.id, target1_duration_ms = NEW.duration_ms
      WHERE course_code = NEW.course_code AND target1_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
    UPDATE course_practice_phrases
      SET target1_audio_id = NEW.id, target1_duration_ms = NEW.duration_ms
      WHERE course_code = NEW.course_code AND target1_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
    UPDATE course_seeds SET target1_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND target1_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;

  ELSIF NEW.role = 'target2' THEN
    UPDATE course_legos
      SET target2_audio_id = NEW.id, target2_duration_ms = NEW.duration_ms
      WHERE course_code = NEW.course_code AND target2_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
    UPDATE course_practice_phrases
      SET target2_audio_id = NEW.id, target2_duration_ms = NEW.duration_ms
      WHERE course_code = NEW.course_code AND target2_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
    UPDATE course_seeds SET target2_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND target2_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;

  ELSIF NEW.role = 'presentation' THEN
    -- course_legos.presentation_audio_id is a TEXT column (see note 4 below),
    -- hence the cast; course_practice_phrases' is uuid.
    UPDATE course_legos SET presentation_audio_id = NEW.id::text
      WHERE course_code = NEW.course_code AND presentation_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
    UPDATE course_practice_phrases SET presentation_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND presentation_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
  END IF;

  RETURN NEW;
END;
$function$
;

DROP TABLE IF EXISTS relink_refusals;
DROP FUNCTION IF EXISTS audio_configured_voice(text, text);
DROP FUNCTION IF EXISTS audio_voice_matches(text, text);
DROP FUNCTION IF EXISTS audio_bare_voice_id(text);

COMMIT;
