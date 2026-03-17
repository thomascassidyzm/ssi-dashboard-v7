-- Enforce ISO 639-3 course code format to prevent 2-letter codes like 'el_for_eng'
-- Format: {lang3}[_{variant}]_for_{lang3}
-- Examples: ell_for_eng, ara_eg_for_eng, cym_s_for_eng, cym_anthem_for_jpn, eng_template

ALTER TABLE courses ADD CONSTRAINT chk_course_code_format
  CHECK (course_code ~ '^[a-z]{3}(_[a-z0-9]+)?_for_[a-z]{3}$' OR course_code = 'eng_template');
