-- Ensure metadata column exists on build_jobs (may already exist)
ALTER TABLE build_jobs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN build_jobs.metadata IS 'Job metadata including activity_log (last 20 seed submissions), errors, etc.';
