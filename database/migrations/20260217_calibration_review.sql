-- =============================================================================
-- Migration: CALIBRATION REVIEW COLUMNS
-- Date: 2026-02-17
-- =============================================================================
-- Adds review workflow columns to course_seed_drafts for async human review
-- of calibration seeds via the dashboard.
-- =============================================================================

-- Add review columns
ALTER TABLE course_seed_drafts
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

-- Update the validation_status constraint to include 'pending_review'
ALTER TABLE course_seed_drafts
DROP CONSTRAINT IF EXISTS course_seed_drafts_validation_status_check;

ALTER TABLE course_seed_drafts
ADD CONSTRAINT course_seed_drafts_validation_status_check
CHECK (validation_status IN ('valid', 'collision', 'rework', 'decomposed', 'pending_review'));

-- Index for review queue queries
CREATE INDEX IF NOT EXISTS idx_course_seed_drafts_review
ON course_seed_drafts(course_code, review_status)
WHERE review_status = 'pending_review';
