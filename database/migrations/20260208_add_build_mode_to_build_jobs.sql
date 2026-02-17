-- =============================================================================
-- Migration: ADD build_mode TO build_jobs
-- Date: 2026-02-08
-- =============================================================================
-- Tracks whether a build is sequential (single agent) or parallel (coordinator + sub-agents).
-- Parallel builds use course_seed_drafts for staging, then finalize to live tables.
-- =============================================================================

ALTER TABLE build_jobs ADD COLUMN IF NOT EXISTS build_mode TEXT DEFAULT 'parallel';

COMMENT ON COLUMN build_jobs.build_mode IS 'Build strategy: parallel (coordinator + sub-agents via drafts)';

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: build_mode column added to build_jobs';
END $$;
