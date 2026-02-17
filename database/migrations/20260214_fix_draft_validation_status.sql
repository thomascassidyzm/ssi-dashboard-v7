-- =============================================================================
-- Migration: FIX DRAFT VALIDATION STATUS
-- Date: 2026-02-14
-- =============================================================================
-- The v2.cjs code uses 'decomposed' status, but the original migration
-- only allowed 'valid', 'collision', 'rework'. This fixes the constraint.
-- =============================================================================

ALTER TABLE course_seed_drafts
DROP CONSTRAINT IF EXISTS course_seed_drafts_validation_status_check;

ALTER TABLE course_seed_drafts
ADD CONSTRAINT course_seed_drafts_validation_status_check
CHECK (validation_status IN ('valid', 'collision', 'rework', 'decomposed'));
