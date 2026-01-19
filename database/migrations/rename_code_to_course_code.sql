-- Migration: Rename courses.code to courses.course_code
-- Date: 2026-01-18
-- Purpose: Consistent naming across all tables
--
-- All other tables use `course_code` as the foreign key column:
--   - course_seeds.course_code
--   - course_legos.course_code
--   - course_practice_phrases.course_code
--
-- The courses table itself should match this convention.

ALTER TABLE courses RENAME COLUMN code TO course_code;

-- Update any views that reference this column
-- (Add view updates here if needed)

COMMENT ON COLUMN courses.course_code IS 'Primary identifier for the course (e.g., spa_for_eng, zho_for_eng)';
