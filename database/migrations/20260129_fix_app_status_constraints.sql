-- Fix the app status constraints on courses table
-- The constraints were too restrictive (only allowing 'not_available')
-- Should allow: not_available, draft, beta, released

-- Drop the old constraints
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_new_app_status_check;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_legacy_app_status_check;

-- Add the correct constraints
-- Valid statuses: not_available (not deployed), draft (testing), beta, released (live)
ALTER TABLE courses ADD CONSTRAINT courses_new_app_status_check
  CHECK (new_app_status IN ('not_available', 'draft', 'beta', 'released'));

ALTER TABLE courses ADD CONSTRAINT courses_legacy_app_status_check
  CHECK (legacy_app_status IN ('not_available', 'draft', 'beta', 'released'));

-- Update any existing invalid values
UPDATE courses SET new_app_status = 'draft' WHERE new_app_status = 'testing';
UPDATE courses SET legacy_app_status = 'draft' WHERE legacy_app_status = 'testing';
UPDATE courses SET new_app_status = 'released' WHERE new_app_status = 'live';
UPDATE courses SET legacy_app_status = 'released' WHERE legacy_app_status = 'live';
