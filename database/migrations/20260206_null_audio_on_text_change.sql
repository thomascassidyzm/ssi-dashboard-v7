-- Null audio IDs when text changes on course content tables.
-- Phase 8 "Start Generation" will then pick up NULLs and regenerate + auto-link.

-- course_practice_phrases: null audio when text changes
CREATE OR REPLACE FUNCTION null_phrase_audio_on_text_change()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_null_phrase_audio_on_text_change ON course_practice_phrases;
CREATE TRIGGER trg_null_phrase_audio_on_text_change
  BEFORE UPDATE ON course_practice_phrases
  FOR EACH ROW
  EXECUTE FUNCTION null_phrase_audio_on_text_change();

-- course_legos: null audio when text changes
CREATE OR REPLACE FUNCTION null_lego_audio_on_text_change()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_null_lego_audio_on_text_change ON course_legos;
CREATE TRIGGER trg_null_lego_audio_on_text_change
  BEFORE UPDATE ON course_legos
  FOR EACH ROW
  EXECUTE FUNCTION null_lego_audio_on_text_change();
