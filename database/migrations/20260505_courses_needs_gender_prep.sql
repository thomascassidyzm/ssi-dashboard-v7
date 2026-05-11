-- Per-course gender-prep determination (replaces hardcoded list)
--
-- Until now, whether a course needs the gender-prep pipeline (1st-person
-- predicate forms varying by speaker gender) was decided by a hardcoded list
-- of language codes in services/gender-haiku-service.cjs. That list missed
-- many gendered languages (Hebrew, Latvian, Greek, Slavic, Indo-Aryan, etc.).
--
-- This migration adds a per-course flag so the determination can be made by
-- a Haiku check after seeds are translated, sampling actual phrases. The
-- hardcoded list remains as a fallback when the flag is null.
--
-- Schema:
--   needs_gender_prep         null = unchecked, true = run gender prep, false = skip
--   gender_prep_check_notes   Haiku's reasoning + sample examples (audit trail)
--   gender_prep_checked_at    when Haiku made the determination

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS needs_gender_prep BOOLEAN DEFAULT NULL;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS gender_prep_check_notes TEXT;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS gender_prep_checked_at TIMESTAMPTZ;

COMMENT ON COLUMN courses.needs_gender_prep IS
  'Per-course override for gender-prep eligibility. NULL = use hardcoded GENDERED_LANGUAGES fallback. TRUE = course needs gender-prep regardless of language. FALSE = skip even if language is in fallback list.';

COMMENT ON COLUMN courses.gender_prep_check_notes IS
  'Haiku''s reasoning when needs_gender_prep was set automatically (yes/no examples).';

COMMENT ON COLUMN courses.gender_prep_checked_at IS
  'When the Haiku detector last ran for this course.';
