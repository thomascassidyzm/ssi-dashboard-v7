-- Migration: Add target_syllable_count to course_practice_phrases
-- Date: 2025-12-21
-- Purpose: Language-agnostic cognitive load measurement for eternal phrase selection

-- Step 1: Add the column to the source table
ALTER TABLE course_practice_phrases
ADD COLUMN IF NOT EXISTS target_syllable_count INTEGER;

-- Step 2: Create index for efficient sorting by syllable count
CREATE INDEX IF NOT EXISTS idx_practice_phrases_syllable_count
ON course_practice_phrases(lego_id, target_syllable_count DESC);

-- Step 3: Update the practice_cycles view to include the new column
-- (Run this after confirming the view definition - may need adjustment)
-- DROP VIEW IF EXISTS practice_cycles;
-- CREATE OR REPLACE VIEW practice_cycles AS
-- SELECT
--   cpp.*,
--   cl.known_audio_uuid,
--   cl.known_duration_ms,
--   cl.target1_audio_uuid,
--   cl.target1_duration_ms,
--   cl.target2_audio_uuid,
--   cl.target2_duration_ms
-- FROM course_practice_phrases cpp
-- JOIN course_legos cl ON cpp.lego_id = cl.lego_id AND cpp.course_code = cl.course_code;

COMMENT ON COLUMN course_practice_phrases.target_syllable_count IS
'Syllable count of target_text. Language-agnostic measure of cognitive load. Used for eternal phrase selection (longest 5 become eternal pool).';
