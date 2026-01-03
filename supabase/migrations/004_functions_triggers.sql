-- =============================================================================
-- 004: FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Normalize text for matching (lowercase, trim)
CREATE OR REPLACE FUNCTION normalize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(input_text));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-normalize text on insert/update
CREATE OR REPLACE FUNCTION audio_normalize_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.text_normalized := normalize_text(NEW.text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for course_audio
DROP TRIGGER IF EXISTS trg_course_audio_normalize ON course_audio;
CREATE TRIGGER trg_course_audio_normalize
  BEFORE INSERT OR UPDATE ON course_audio
  FOR EACH ROW
  EXECUTE FUNCTION audio_normalize_text();

-- Trigger for shared_audio
DROP TRIGGER IF EXISTS trg_shared_audio_normalize ON shared_audio;
CREATE TRIGGER trg_shared_audio_normalize
  BEFORE INSERT OR UPDATE ON shared_audio
  FOR EACH ROW
  EXECUTE FUNCTION audio_normalize_text();

-- Auto-update updated_at on courses
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
