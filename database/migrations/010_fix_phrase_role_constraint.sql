-- Migration: Fix phrase_role constraint to allow new values
-- Date: 2026-01-22
-- Purpose: Update CHECK constraint to allow 'build', 'use', 'eternal_eligible'
--
-- Problem: course-builder-api.cjs is trying to insert phrase_role values:
--   - 'build' (for BUILD phrases that lock in patterns)
--   - 'use' (for USE phrases that are eternal-eligible)
--   - 'eternal_eligible' (computed from position >= 8)
-- But the current constraint only allows 'component' and 'practice'
--
-- Run in Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE course_practice_phrases
DROP CONSTRAINT IF EXISTS course_practice_phrases_phrase_role_check;

-- Add new constraint with all allowed values
ALTER TABLE course_practice_phrases
ADD CONSTRAINT course_practice_phrases_phrase_role_check
CHECK (phrase_role IN ('component', 'practice', 'build', 'use', 'eternal_eligible'));

-- Verify the constraint was updated
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'course_practice_phrases_phrase_role_check';
