-- =============================================================================
-- Migration 005: Release Train
-- =============================================================================
-- Purpose: Add release train support for course lifecycle management
-- Date: 2025-01-02
-- Source: DHH-approved minimal design
--
-- Changes:
--   1. Add 'beta' to content_status enum
--   2. Add course_type column (official/community)
--   3. Add creator_email column for community courses
-- =============================================================================

-- Add 'beta' to content_status enum
-- Note: PostgreSQL requires ALTER TYPE ... ADD VALUE to add enum values
-- This is safe and doesn't require recreation of the enum
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'beta' AFTER 'draft';

-- Add course_type column with default 'official'
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS course_type TEXT NOT NULL DEFAULT 'official';

-- Add creator_email for community course attribution
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS creator_email TEXT;

-- Add check constraint for course_type values
ALTER TABLE courses
ADD CONSTRAINT courses_course_type_check
CHECK (course_type IN ('official', 'community'));

-- Add index for filtering by course_type (useful for dashboard queries)
CREATE INDEX IF NOT EXISTS idx_courses_course_type ON courses(course_type);

-- Comments
COMMENT ON COLUMN courses.course_type IS 'official = SSi-created courses, community = user-created courses';
COMMENT ON COLUMN courses.creator_email IS 'Email of course creator (for community courses)';

-- =============================================================================
-- Status Values After Migration:
--   draft     - Creator working on it (not visible to learners)
--   beta      - Published, feedback welcome (visible with badge)
--   released  - Stable, graduated from beta (visible)
--   deprecated - No longer maintained
-- =============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 005 completed: Release train schema added';
    RAISE NOTICE 'Added enum value: beta';
    RAISE NOTICE 'Added columns: course_type, creator_email';
END $$;
