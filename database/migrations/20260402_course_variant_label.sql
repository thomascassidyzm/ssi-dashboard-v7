-- Migration: Add variant_label to courses
-- Date: 2026-04-02
-- Purpose: Support regional variants (Northern/Southern Welsh, Brazilian/European
--          Portuguese, etc.) with a clean label that the learning app can display
--          in the course picker and home screen.
--
-- variant_label is NULL for courses with no regional variants.
-- When set, it provides the short human-readable variant name:
--   "Northern", "Southern", "Brazilian", "European", "Latin American",
--   "Castilian", "Egyptian", "Levantine", "MSA", etc.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS variant_label TEXT;

COMMENT ON COLUMN courses.variant_label IS
  'Short regional variant name (e.g. Northern, Southern, Brazilian). NULL if no variants exist for this language.';

-- Set Welsh variants
UPDATE courses SET variant_label = 'Northern' WHERE course_code = 'cym_n_for_eng';
UPDATE courses SET variant_label = 'Southern' WHERE course_code = 'cym_s_for_eng';
