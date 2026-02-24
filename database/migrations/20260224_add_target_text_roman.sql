-- Add romanised target text column for courses that need it (e.g. Arabic)
-- target_text remains as real script (for TTS + validation)
-- target_text_roman is the display version shown to learners

ALTER TABLE course_seeds ADD COLUMN IF NOT EXISTS target_text_roman TEXT;
ALTER TABLE course_legos ADD COLUMN IF NOT EXISTS target_text_roman TEXT;
ALTER TABLE course_practice_phrases ADD COLUMN IF NOT EXISTS target_text_roman TEXT;
