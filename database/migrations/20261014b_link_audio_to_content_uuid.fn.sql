-- link_audio_to_content with the course_legos presentation write assigning NEW.id (no ::text).
-- Included by 20261014b_course_legos_presentation_audio_id_uuid.sql; captured live 2026-10-14 with pg_get_functiondef.
CREATE OR REPLACE FUNCTION public.link_audio_to_content()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_wanted text;
  v_n      int;
BEGIN
  v_wanted := audio_configured_voice(NEW.course_code, NEW.role);

  -- VOICE GATE. No configured voice, or a clip in the wrong voice: link nothing
  -- and say so, once per content table whose text this clip matched.
  IF NOT audio_voice_matches(v_wanted, NEW.voice_id) THEN
    INSERT INTO relink_refusals (
      course_code, content_table, slot_id, role, reason,
      wanted_voice, candidate_voice, candidate_audio_id, refused_by)
    SELECT NEW.course_code, t.tbl, t.slot, NEW.role,
           CASE WHEN v_wanted IS NULL THEN 'no-configured-voice' ELSE 'voice-mismatch' END,
           v_wanted, NEW.voice_id, NEW.id, 'audio_autolink trigger'
    FROM (
      SELECT 'course_legos' AS tbl, l.lego_id::text AS slot FROM course_legos l
        WHERE l.course_code = NEW.course_code
          AND normalize_text(CASE WHEN NEW.role = 'known' THEN l.known_text ELSE l.target_text END) = NEW.text_normalized
          AND (CASE NEW.role
                 WHEN 'known' THEN l.known_audio_id IS NULL
                 WHEN 'target1' THEN l.target1_audio_id IS NULL
                 WHEN 'target2' THEN l.target2_audio_id IS NULL
                 WHEN 'presentation' THEN l.presentation_audio_id IS NULL
                 ELSE false END)
      UNION ALL
      SELECT 'course_practice_phrases', p.id::text FROM course_practice_phrases p
        WHERE p.course_code = NEW.course_code
          AND normalize_text(CASE WHEN NEW.role = 'known' THEN p.known_text ELSE p.target_text END) = NEW.text_normalized
          AND (CASE NEW.role
                 WHEN 'known' THEN p.known_audio_id IS NULL
                 WHEN 'target1' THEN p.target1_audio_id IS NULL
                 WHEN 'target2' THEN p.target2_audio_id IS NULL
                 WHEN 'presentation' THEN p.presentation_audio_id IS NULL
                 ELSE false END)
      UNION ALL
      SELECT 'course_seeds', s.id::text FROM course_seeds s
        WHERE s.course_code = NEW.course_code
          AND normalize_text(CASE WHEN NEW.role = 'known' THEN s.known_text ELSE s.target_text END) = NEW.text_normalized
          AND (CASE NEW.role
                 WHEN 'known' THEN s.known_audio_id IS NULL
                 WHEN 'target1' THEN s.target1_audio_id IS NULL
                 WHEN 'target2' THEN s.target2_audio_id IS NULL
                 ELSE false END)
    ) t
    LIMIT 500;   -- a bulk import must not write a million refusal rows

    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN
      RAISE WARNING 'audio_autolink REFUSED % slot(s) for clip % in %: voice % is not the configured % for role %',
        v_n, NEW.id, NEW.course_code, NEW.voice_id, COALESCE(v_wanted, '(none configured)'), NEW.role;
    END IF;
    RETURN NEW;
  END IF;

  -- Voice is correct — original behaviour, unchanged.
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
    -- course_legos.presentation_audio_id is uuid since 20261014 (job #387), like
    -- course_practice_phrases'. Assigning the uuid also worked while it was text.
    UPDATE course_legos SET presentation_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND presentation_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
    UPDATE course_practice_phrases SET presentation_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND presentation_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
  END IF;

  RETURN NEW;
END;
$function$;
