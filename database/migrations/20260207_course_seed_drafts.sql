-- =============================================================================
-- Migration: COURSE_SEED_DRAFTS TABLE
-- Date: 2026-02-07
-- =============================================================================
-- Parallel seed decomposition: agents submit drafts independently,
-- finalize endpoint processes them in order (dedup, collision detection)
-- =============================================================================

DROP TABLE IF EXISTS course_seed_drafts;

CREATE TABLE course_seed_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL REFERENCES courses(course_code),
  seed_number INTEGER NOT NULL,
  known_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  submission_data JSONB NOT NULL,   -- Full parsed legos array (with build/use phrases)
  validation_status TEXT DEFAULT 'valid' CHECK (validation_status IN ('valid', 'collision', 'rework')),
  validation_notes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_code, seed_number)  -- One draft per seed, upsert replaces
);

-- Index for common queries
CREATE INDEX idx_course_seed_drafts_course ON course_seed_drafts(course_code);
CREATE INDEX idx_course_seed_drafts_status ON course_seed_drafts(course_code, validation_status);

-- RLS policies
ALTER TABLE course_seed_drafts ENABLE ROW LEVEL SECURITY;

-- Service role: full access (API server uses service_role key)
CREATE POLICY "service_role_full_access" ON course_seed_drafts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Authenticated users: read-only (dashboard viewing)
CREATE POLICY "authenticated_read" ON course_seed_drafts
  FOR SELECT
  TO authenticated
  USING (true);
