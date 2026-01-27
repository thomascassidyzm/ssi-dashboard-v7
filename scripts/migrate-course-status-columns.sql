-- Migration: Add platform-specific deployment status columns to courses table
-- Run this in Supabase SQL Editor
-- Date: 2026-01-27
-- Updated: Added platform-specific status workflows

-- =============================================================================
-- Step 1: Drop existing constraints if they exist (for re-running migration)
-- =============================================================================

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_new_app_status_check;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_legacy_app_status_check;
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_content_status_check;

-- =============================================================================
-- Step 2: Add columns if they don't exist (no constraints yet)
-- =============================================================================

-- New app (community app) deployment status
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS new_app_status TEXT NOT NULL DEFAULT 'not_available';

-- Legacy app deployment status
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS legacy_app_status TEXT NOT NULL DEFAULT 'not_available';

-- Content build status
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS content_status TEXT NOT NULL DEFAULT 'empty';

-- Beta tracking timestamps
ALTER TABLE courses ADD COLUMN IF NOT EXISTS new_app_beta_started_at TIMESTAMPTZ NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS legacy_app_beta_started_at TIMESTAMPTZ NULL;

-- =============================================================================
-- Step 3: Migrate old status values BEFORE adding constraints
-- =============================================================================

-- Convert 'released' to 'live' for both platforms
UPDATE courses SET new_app_status = 'live' WHERE new_app_status = 'released';
UPDATE courses SET legacy_app_status = 'live' WHERE legacy_app_status = 'released';

-- Convert 'testing' to 'beta' for new_app (testing is not valid for new app)
UPDATE courses SET new_app_status = 'beta' WHERE new_app_status = 'testing';

-- Convert 'beta' to 'testing' for legacy_app (beta is not valid for legacy app)
UPDATE courses SET legacy_app_status = 'testing' WHERE legacy_app_status = 'beta';

-- Convert 'draft' to 'not_available' for legacy_app (draft is not valid for legacy app)
UPDATE courses SET legacy_app_status = 'not_available' WHERE legacy_app_status = 'draft';

-- Handle deprecated courses - keep as not_available
UPDATE courses SET new_app_status = 'not_available' WHERE new_app_status = 'deprecated';
UPDATE courses SET legacy_app_status = 'not_available' WHERE legacy_app_status = 'deprecated';

-- =============================================================================
-- Step 4: Now add the CHECK constraints (data is already valid)
-- =============================================================================

-- New App: N/A → Draft → Beta → Live
ALTER TABLE courses
ADD CONSTRAINT courses_new_app_status_check
CHECK (new_app_status IN ('not_available', 'draft', 'beta', 'live'));

-- Legacy App: N/A → Submitted → Testing → Live
ALTER TABLE courses
ADD CONSTRAINT courses_legacy_app_status_check
CHECK (legacy_app_status IN ('not_available', 'submitted', 'testing', 'live'));

-- Content status
ALTER TABLE courses
ADD CONSTRAINT courses_content_status_check
CHECK (content_status IN ('empty', 'seeds_only', 'building', 'audio_pending', 'audio_generating', 'ready'));

-- =============================================================================
-- Step 5: Add documentation comments
-- =============================================================================

COMMENT ON COLUMN courses.new_app_status IS 'Deployment status for new community app: not_available → draft → beta → live';
COMMENT ON COLUMN courses.legacy_app_status IS 'Deployment status for legacy app: not_available → submitted → testing → live (locked until new_app_status is beta or live)';
COMMENT ON COLUMN courses.new_app_beta_started_at IS 'Timestamp when new_app_status was set to beta (auto-set, auto-cleared)';
COMMENT ON COLUMN courses.legacy_app_beta_started_at IS 'Timestamp when legacy_app_status was set to beta (auto-set, auto-cleared)';
COMMENT ON COLUMN courses.content_status IS 'Content build progress: empty, seeds_only, building, audio_pending, audio_generating, ready';

-- =============================================================================
-- Step 6: Trigger for auto-setting beta timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION set_beta_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- New App: set timestamp when entering beta
  IF NEW.new_app_status = 'beta' AND (OLD.new_app_status IS NULL OR OLD.new_app_status != 'beta') THEN
    NEW.new_app_beta_started_at = NOW();
  END IF;

  -- New App: clear timestamp when leaving beta
  IF NEW.new_app_status != 'beta' AND OLD.new_app_status = 'beta' THEN
    NEW.new_app_beta_started_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS courses_beta_timestamp_trigger ON courses;
CREATE TRIGGER courses_beta_timestamp_trigger
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION set_beta_timestamp();

-- =============================================================================
-- Verification
-- =============================================================================

-- Run this to verify the migration worked:
SELECT course_code, new_app_status, legacy_app_status, content_status
FROM courses
ORDER BY course_code
LIMIT 10;
