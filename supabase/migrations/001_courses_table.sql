-- =============================================================================
-- 001: COURSES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS courses (
  code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  known_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  voice_config JSONB NOT NULL DEFAULT '{}',
  course_type TEXT NOT NULL DEFAULT 'official' CHECK (course_type IN ('official', 'community')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'beta', 'released')),
  creator_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_type ON courses(course_type);

COMMENT ON TABLE courses IS 'Course metadata and voice configuration';
