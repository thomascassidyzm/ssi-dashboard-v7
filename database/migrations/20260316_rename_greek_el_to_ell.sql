-- Rename el_for_eng → ell_for_eng (ISO 639-3 correction)
-- el is ISO 639-1 (2-letter), ell is ISO 639-3 (3-letter) which all other courses use
-- Must temporarily drop FK constraints since they aren't deferrable
--
-- Actual FK definitions (from information_schema):
--   fk_course_seeds_course:            course_seeds(course_code) → courses(course_code)
--   fk_course_legos_seed:              course_legos(course_code, seed_number) → course_seeds(course_code, seed_number)
--   fk_course_practice_phrases_lego:   course_practice_phrases(course_code, seed_number, lego_index) → course_legos(course_code, seed_number, lego_index)

BEGIN;

-- Drop FK constraints (children first)
ALTER TABLE course_practice_phrases DROP CONSTRAINT IF EXISTS fk_course_practice_phrases_lego;
ALTER TABLE course_legos DROP CONSTRAINT IF EXISTS fk_course_legos_seed;
ALTER TABLE course_seeds DROP CONSTRAINT IF EXISTS fk_course_seeds_course;

-- Update all tables
UPDATE course_practice_phrases SET course_code = 'ell_for_eng' WHERE course_code = 'el_for_eng';
UPDATE course_legos SET course_code = 'ell_for_eng' WHERE course_code = 'el_for_eng';
UPDATE course_seeds SET course_code = 'ell_for_eng' WHERE course_code = 'el_for_eng';

-- Clean up duplicate course row from partial JS migration attempt, then rename original
DELETE FROM courses WHERE course_code = 'ell_for_eng';
UPDATE courses SET course_code = 'ell_for_eng', target_lang = 'ell', display_name = 'Greek for English speakers' WHERE course_code = 'el_for_eng';

-- Clean up orphan rows with no matching course (e.g. ang_for_eng)
DELETE FROM course_practice_phrases WHERE course_code NOT IN (SELECT course_code FROM courses);
DELETE FROM course_legos WHERE course_code NOT IN (SELECT course_code FROM courses);
DELETE FROM course_seeds WHERE course_code NOT IN (SELECT course_code FROM courses);

-- Re-add FK constraints with correct column definitions
ALTER TABLE course_seeds
  ADD CONSTRAINT fk_course_seeds_course
  FOREIGN KEY (course_code) REFERENCES courses(course_code);

ALTER TABLE course_legos
  ADD CONSTRAINT fk_course_legos_seed
  FOREIGN KEY (course_code, seed_number) REFERENCES course_seeds(course_code, seed_number);

ALTER TABLE course_practice_phrases
  ADD CONSTRAINT fk_course_practice_phrases_lego
  FOREIGN KEY (course_code, seed_number, lego_index) REFERENCES course_legos(course_code, seed_number, lego_index);

COMMIT;
