-- ROLLBACK for 20260806_audio_link_integrity.sql — pre-migration definitions,
-- captured live from production 2026-08-06 before applying.

CREATE OR REPLACE FUNCTION public.link_audio_to_content()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.role = 'known' THEN
    UPDATE course_legos SET known_audio_id = NEW.id
      WHERE course_code = NEW.course_code
        AND known_audio_id IS NULL
        AND lower(trim(known_text)) = NEW.text_normalized;
    UPDATE course_practice_phrases SET known_audio_id = NEW.id
      WHERE course_code = NEW.course_code
        AND known_audio_id IS NULL
        AND lower(trim(known_text)) = NEW.text_normalized;

  ELSIF NEW.role = 'target1' THEN
    UPDATE course_legos
      SET target1_audio_id = NEW.id, target1_duration_ms = NEW.duration_ms
      WHERE course_code = NEW.course_code
        AND target1_audio_id IS NULL
        AND lower(trim(target_text)) = NEW.text_normalized;
    UPDATE course_practice_phrases
      SET target1_audio_id = NEW.id, target1_duration_ms = NEW.duration_ms
      WHERE course_code = NEW.course_code
        AND target1_audio_id IS NULL
        AND lower(trim(target_text)) = NEW.text_normalized;

  ELSIF NEW.role = 'target2' THEN
    UPDATE course_legos
      SET target2_audio_id = NEW.id, target2_duration_ms = NEW.duration_ms
      WHERE course_code = NEW.course_code
        AND target2_audio_id IS NULL
        AND lower(trim(target_text)) = NEW.text_normalized;
    UPDATE course_practice_phrases
      SET target2_audio_id = NEW.id, target2_duration_ms = NEW.duration_ms
      WHERE course_code = NEW.course_code
        AND target2_audio_id IS NULL
        AND lower(trim(target_text)) = NEW.text_normalized;

  ELSIF NEW.role = 'presentation' THEN
    UPDATE course_legos SET presentation_audio_id = NEW.id
      WHERE course_code = NEW.course_code
        AND presentation_audio_id IS NULL
        AND lower(trim(target_text)) = NEW.text_normalized;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.null_lego_audio_on_text_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.known_text IS DISTINCT FROM OLD.known_text THEN
    NEW.known_audio_id := NULL;
    NEW.presentation_audio_id := NULL;
  END IF;
  IF NEW.target_text IS DISTINCT FROM OLD.target_text THEN
    NEW.target1_audio_id := NULL;
    NEW.target2_audio_id := NULL;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.null_phrase_audio_on_text_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.known_text IS DISTINCT FROM OLD.known_text THEN
    NEW.known_audio_id := NULL;
  END IF;
  IF NEW.target_text IS DISTINCT FROM OLD.target_text THEN
    NEW.target1_audio_id := NULL;
    NEW.target2_audio_id := NULL;
  END IF;
  RETURN NEW;
END;
$function$
;

ALTER TABLE lego_introductions DROP CONSTRAINT IF EXISTS lego_introductions_presentation_audio_id_fkey;
ALTER TABLE lego_introductions ADD CONSTRAINT lego_introductions_presentation_audio_id_fkey FOREIGN KEY (presentation_audio_id) REFERENCES course_audio(id) ON DELETE CASCADE;

DROP FUNCTION IF EXISTS public.audio_id_for_text(text,text,text);
