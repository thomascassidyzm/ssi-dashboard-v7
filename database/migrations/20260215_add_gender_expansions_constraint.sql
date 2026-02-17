-- Add unique constraint to course_gender_expansions for upsert support
-- This allows the gender-prep-coordinator to use ON CONFLICT for idempotent inserts

-- First, remove any duplicate rows if they exist
DELETE FROM course_gender_expansions a
USING course_gender_expansions b
WHERE a.id > b.id
  AND a.course_code = b.course_code
  AND a.original_text = b.original_text;

-- Add the unique constraint
ALTER TABLE course_gender_expansions
ADD CONSTRAINT course_gender_expansions_course_code_original_text_key
UNIQUE (course_code, original_text);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gender_expansions_course_lookup
ON course_gender_expansions(course_code, language);
