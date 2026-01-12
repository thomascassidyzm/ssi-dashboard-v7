-- =============================================================================
-- 010: ADD WELCOME ROLE TO COURSE_AUDIO
-- =============================================================================
-- Purpose: Add 'welcome' as a valid role for course-specific welcome audio
-- Date: 2026-01-09
--
-- Welcomes are:
--   - Course-specific (one per course)
--   - Human recordings (origin = 'human')
--   - Played at course start
--   - Have text that should be displayed in the app
-- =============================================================================

-- Drop existing CHECK constraint on role
ALTER TABLE course_audio DROP CONSTRAINT IF EXISTS course_audio_role_check;

-- Add new CHECK constraint with all roles including 'welcome'
ALTER TABLE course_audio ADD CONSTRAINT course_audio_role_check
  CHECK (role IN ('known', 'target1', 'target2', 'presentation', 'encouragement', 'instruction', 'welcome'));

-- Update table comment to reflect all roles
COMMENT ON TABLE course_audio IS 'Course-specific audio (known, target1, target2, presentation, encouragement, instruction, welcome roles)';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 010 completed: Added welcome role to course_audio';
END $$;
