-- =============================================================================
-- Migration: ADD PROGRESS TRACKING TO BUILD_JOBS
-- Date: 2026-01-28
-- =============================================================================
-- Adds last_progress_at column for stuck agent detection.
--
-- Problem: Agents sometimes ask questions and wait for user input (17+ minutes)
-- without making progress. The heartbeat stays alive but no seeds are submitted.
--
-- Solution: Track last_progress_at separately from last_heartbeat:
-- - last_heartbeat: Updated on any activity (including spawn)
-- - last_progress_at: Updated ONLY when a seed is successfully submitted
--
-- Detection logic:
-- - Heartbeat stale → agent dead → respawn
-- - Heartbeat fresh + progress stale (5+ min) → agent stuck → respawn
-- =============================================================================

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'build_jobs' AND column_name = 'last_progress_at'
  ) THEN
    ALTER TABLE build_jobs ADD COLUMN last_progress_at TIMESTAMPTZ;
    COMMENT ON COLUMN build_jobs.last_progress_at IS
      'When last seed was submitted. Heartbeat fresh + progress stale = agent stuck waiting for input.';
  END IF;
END $$;

-- =============================================================================
-- DONE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: last_progress_at column added to build_jobs';
END $$;
