-- =============================================================================
-- Migration: BUILD_JOBS TABLE
-- Date: 2026-01-28
-- =============================================================================
-- Coordination layer between Dashboard (Vercel) and Course-Builder (local)
-- Database is the contract - no direct API calls between them
--
-- Pass 1: Translate 668 canonical seeds + generate analysis doc
-- Pass 2: Decompose seeds -> LEGOs -> phrases (course_size configurable)
-- =============================================================================

-- Safe cleanup if re-running
DO $$
BEGIN
  DROP TRIGGER IF EXISTS enforce_pass_order ON build_jobs;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DROP FUNCTION IF EXISTS check_pass_1_complete();
DROP TABLE IF EXISTS build_jobs;

-- =============================================================================
-- BUILD_JOBS TABLE
-- =============================================================================

CREATE TABLE build_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL REFERENCES courses(course_code),

  -- Job type
  pass TEXT NOT NULL CHECK (pass IN ('pass_1', 'pass_2')),

  -- Status: pending -> running -> complete/stopped/stalled/failed
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'stalled', 'stopped', 'complete', 'failed')),

  -- Progress
  current_seed INTEGER,               -- Where agent is now
  seeds_completed INTEGER DEFAULT 0,  -- How many done
  total_seeds INTEGER NOT NULL,       -- 668 for pass_1, course_size for pass_2

  -- Pass 1 specific: analysis happens after all 668 translated
  analysis_complete BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,             -- When agent claimed job
  last_heartbeat TIMESTAMPTZ,         -- Last sign of life
  completed_at TIMESTAMPTZ,           -- When finished

  -- Control
  requested_by TEXT,                  -- 'dashboard', 'cli', email
  stop_requested BOOLEAN DEFAULT FALSE,

  -- Error/resumption info
  error_message TEXT,
  resume_from_seed INTEGER,           -- Set when resuming a stopped/stalled job

  -- Constraints
  CONSTRAINT pass_1_always_668
    CHECK (pass != 'pass_1' OR total_seeds = 668)
);

-- Partial unique index: only one active job per course per pass
CREATE UNIQUE INDEX idx_build_jobs_one_active
  ON build_jobs(course_code, pass)
  WHERE status IN ('pending', 'running');

-- Query indexes
CREATE INDEX idx_build_jobs_status ON build_jobs(status);
CREATE INDEX idx_build_jobs_course_pass ON build_jobs(course_code, pass);
CREATE INDEX idx_build_jobs_stall_check ON build_jobs(last_heartbeat)
  WHERE status = 'running';

-- =============================================================================
-- PASS ORDER ENFORCEMENT
-- =============================================================================
-- Prevents pass_2 from starting if pass_1 isn't complete

CREATE OR REPLACE FUNCTION check_pass_1_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pass = 'pass_2' AND NEW.status = 'pending' THEN
    IF NOT EXISTS (
      SELECT 1 FROM build_jobs
      WHERE course_code = NEW.course_code
        AND pass = 'pass_1'
        AND status = 'complete'
    ) THEN
      RAISE EXCEPTION 'Cannot start pass_2: pass_1 not complete for course %', NEW.course_code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_pass_order
  BEFORE INSERT ON build_jobs
  FOR EACH ROW
  EXECUTE FUNCTION check_pass_1_complete();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE build_jobs ENABLE ROW LEVEL SECURITY;

-- Dashboard (authenticated) can read all jobs
CREATE POLICY "Authenticated users can read build_jobs"
  ON build_jobs FOR SELECT
  TO authenticated
  USING (true);

-- Dashboard can insert new jobs
CREATE POLICY "Authenticated users can insert build_jobs"
  ON build_jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Dashboard can update jobs (stop_requested, etc.)
CREATE POLICY "Authenticated users can update build_jobs"
  ON build_jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role (course-builder) has full access
CREATE POLICY "Service role has full access to build_jobs"
  ON build_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE build_jobs IS 'Coordinates course builds between Dashboard and Course-Builder';
COMMENT ON COLUMN build_jobs.pass IS 'pass_1 = translate 668 seeds + analysis, pass_2 = decompose to LEGOs/phrases';
COMMENT ON COLUMN build_jobs.status IS 'pending -> running -> complete/stopped/stalled/failed';
COMMENT ON COLUMN build_jobs.total_seeds IS '668 for pass_1, configurable course_size for pass_2';
COMMENT ON COLUMN build_jobs.analysis_complete IS 'Pass 1 only: set true when language analysis doc generated';
COMMENT ON COLUMN build_jobs.stop_requested IS 'Dashboard sets true to signal agent to stop gracefully';
COMMENT ON COLUMN build_jobs.resume_from_seed IS 'When resuming stopped/stalled job, start from this seed';

-- =============================================================================
-- DONE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: build_jobs table created';
END $$;
