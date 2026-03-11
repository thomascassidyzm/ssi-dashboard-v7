-- Fix new_app_status constraint: replace 'released' with 'live' to match learning app queries
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_new_app_status_check;
ALTER TABLE courses ADD CONSTRAINT courses_new_app_status_check
  CHECK (new_app_status IN ('not_available', 'draft', 'beta', 'live'));

-- Set 9 courses to live
UPDATE courses SET new_app_status = 'live', status = 'released'
WHERE course_code IN (
  'cym_n_for_eng', 'cym_s_for_eng',
  'spa_for_eng', 'zho_for_eng', 'ita_for_eng',
  'por_for_eng', 'fra_for_eng', 'kor_for_eng', 'jpn_for_eng'
);
