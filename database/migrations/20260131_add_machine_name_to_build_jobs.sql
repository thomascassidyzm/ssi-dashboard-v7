-- =============================================================================
-- Migration: ADD machine_name TO build_jobs
-- Date: 2026-01-31
-- =============================================================================
-- Tracks which machine is running each build job.
-- Updated on job creation, resume, and each heartbeat/progress update,
-- so it always reflects the CURRENT machine running the job.
-- =============================================================================

ALTER TABLE build_jobs ADD COLUMN IF NOT EXISTS machine_name TEXT;

COMMENT ON COLUMN build_jobs.machine_name IS 'Hostname of machine currently running this job (updated on heartbeat)';

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: machine_name column added to build_jobs';
END $$;
