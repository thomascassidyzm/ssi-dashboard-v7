-- Migration: Add seed_count to courses table
-- Run this in Supabase SQL editor

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS seed_count INTEGER;

COMMENT ON COLUMN courses.seed_count IS 'Target number of seeds (10=test, 250=beta, 668=full)';

-- Example: Set existing courses to full
-- UPDATE courses SET seed_count = 668 WHERE seed_count IS NULL;
