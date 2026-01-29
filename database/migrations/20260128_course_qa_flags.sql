-- =============================================================================
-- Migration: COURSE_QA_FLAGS TABLE + QA_CHECKED COLUMN
-- Date: 2026-01-28
-- =============================================================================
-- QA monitoring infrastructure for async phrase quality checks.
-- Monitor agent flags issues here; human reviews at checkpoints.
-- =============================================================================

-- =============================================================================
-- QA_CHECKED COLUMN ON COURSE_PRACTICE_PHRASES
-- =============================================================================
-- Track when each phrase was last checked by the monitor

ALTER TABLE course_practice_phrases
  ADD COLUMN IF NOT EXISTS qa_checked TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_practice_phrases_qa_unchecked
  ON course_practice_phrases(course_code, created_at)
  WHERE qa_checked IS NULL;

COMMENT ON COLUMN course_practice_phrases.qa_checked IS 'Timestamp when phrase was last checked by QA monitor';

-- =============================================================================
-- COURSE_QA_FLAGS TABLE
-- =============================================================================

DROP TABLE IF EXISTS course_qa_flags;

CREATE TABLE course_qa_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL REFERENCES courses(course_code),

  -- What's flagged
  phrase_id UUID REFERENCES course_practice_phrases(id),  -- NULL for cross-seed issues
  seed_number INTEGER,
  lego_id TEXT,

  -- Flag details
  check_type TEXT NOT NULL
    CHECK (check_type IN (
      'grammar',         -- Grammar errors (either language)
      'semantic',        -- Translation meaning issues
      'naturalness',     -- Unnatural phrasing
      'lego_frequency',  -- LEGO phrase count issues (per-LEGO)
      'lego_spread',     -- LEGO usage distribution across course
      'variety',         -- Pattern repetition issues
      'vocabulary'       -- Uses words not yet introduced
    )),

  severity TEXT NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('error', 'warning', 'info')),

  issue TEXT NOT NULL,           -- Brief description of the problem
  details JSONB DEFAULT '{}',    -- Additional context (examples, counts, etc.)

  -- Resolution
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'ignored', 'false_positive')),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,

  -- Timestamps
  flagged_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: unique flag per phrase/check_type combo (prevent duplicates)
  CONSTRAINT unique_phrase_flag UNIQUE (phrase_id, check_type)
    DEFERRABLE INITIALLY DEFERRED
);

-- Query indexes
CREATE INDEX idx_qa_flags_course ON course_qa_flags(course_code);
CREATE INDEX idx_qa_flags_status ON course_qa_flags(status);
CREATE INDEX idx_qa_flags_severity ON course_qa_flags(severity);
CREATE INDEX idx_qa_flags_type ON course_qa_flags(check_type);
CREATE INDEX idx_qa_flags_seed ON course_qa_flags(seed_number);
CREATE INDEX idx_qa_flags_open ON course_qa_flags(course_code, severity)
  WHERE status = 'open';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE course_qa_flags ENABLE ROW LEVEL SECURITY;

-- Dashboard can read all flags
CREATE POLICY "Authenticated users can read qa_flags"
  ON course_qa_flags FOR SELECT
  TO authenticated
  USING (true);

-- Dashboard can insert flags (for manual flagging)
CREATE POLICY "Authenticated users can insert qa_flags"
  ON course_qa_flags FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Dashboard can update flags (resolve, ignore, etc.)
CREATE POLICY "Authenticated users can update qa_flags"
  ON course_qa_flags FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role has full access (for monitor agent)
CREATE POLICY "Service role has full access to qa_flags"
  ON course_qa_flags FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get QA summary for a course
CREATE OR REPLACE FUNCTION get_qa_summary(p_course_code TEXT)
RETURNS TABLE (
  total_flags BIGINT,
  error_count BIGINT,
  warning_count BIGINT,
  info_count BIGINT,
  open_count BIGINT,
  resolved_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_flags,
    COUNT(*) FILTER (WHERE severity = 'error')::BIGINT AS error_count,
    COUNT(*) FILTER (WHERE severity = 'warning')::BIGINT AS warning_count,
    COUNT(*) FILTER (WHERE severity = 'info')::BIGINT AS info_count,
    COUNT(*) FILTER (WHERE status = 'open')::BIGINT AS open_count,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT AS resolved_count
  FROM course_qa_flags
  WHERE course_code = p_course_code;
END;
$$ LANGUAGE plpgsql;

-- Get flags by type for a course
CREATE OR REPLACE FUNCTION get_qa_flags_by_type(p_course_code TEXT)
RETURNS TABLE (
  check_type TEXT,
  flag_count BIGINT,
  open_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.check_type,
    COUNT(*)::BIGINT AS flag_count,
    COUNT(*) FILTER (WHERE f.status = 'open')::BIGINT AS open_count
  FROM course_qa_flags f
  WHERE f.course_code = p_course_code
  GROUP BY f.check_type
  ORDER BY flag_count DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE course_qa_flags IS 'QA issues flagged by monitor agent for human review';
COMMENT ON COLUMN course_qa_flags.check_type IS 'Type of check that found the issue';
COMMENT ON COLUMN course_qa_flags.severity IS 'error = must fix, warning = should review, info = pattern noticed';
COMMENT ON COLUMN course_qa_flags.phrase_id IS 'NULL for cross-seed issues like frequency/variety';
COMMENT ON COLUMN course_qa_flags.details IS 'JSON with additional context (examples, counts, patterns)';

-- =============================================================================
-- DONE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: course_qa_flags table created, qa_checked column added';
END $$;
