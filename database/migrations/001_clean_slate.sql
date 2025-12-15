-- =============================================================================
-- Migration 001: Clean Slate
-- =============================================================================
-- Purpose: Drop existing course content tables and prepare for registry-based schema
-- Date: 2025-12-13
-- Source: SSi Variable Registry v1.0.0
--
-- Strategy:
--   DROP: Tables that store course-specific content (will be recreated in 002)
--   KEEP: Course-agnostic reusable tables (audio_samples, voices, etc.)
--
-- Safety:
--   - Uses IF EXISTS to prevent errors if tables don't exist
--   - Uses CASCADE to handle foreign key dependencies automatically
--   - Ordered from most dependent to least dependent
-- =============================================================================

-- Drop course content tables (most dependent to least dependent)
-- These will be recreated in migration 002 with registry-based schema

-- 1. Drop basket_phrases (depends on legos)
DROP TABLE IF EXISTS basket_phrases CASCADE;

-- 2. Drop lego_components (depends on legos)
DROP TABLE IF EXISTS lego_components CASCADE;

-- 3. Drop legos (depends on seeds)
DROP TABLE IF EXISTS legos CASCADE;

-- 4. Drop seeds (depends on courses)
DROP TABLE IF EXISTS seeds CASCADE;

-- 5. Drop course-related junction tables
DROP TABLE IF EXISTS course_encouragements CASCADE;

-- 6. Drop encouragements and presentation templates
DROP TABLE IF EXISTS encouragements CASCADE;
DROP TABLE IF EXISTS presentation_templates CASCADE;

-- 7. Drop views that depend on the tables above
DROP VIEW IF EXISTS course_summary CASCADE;
DROP VIEW IF EXISTS seed_with_legos CASCADE;

-- 8. Drop functions that may reference old schema
DROP FUNCTION IF EXISTS generate_node_id(TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- 9. Drop the courses table (will be recreated with updated schema in 002)
DROP TABLE IF EXISTS courses CASCADE;

-- =============================================================================
-- TABLES PRESERVED (Course-Agnostic, Reusable)
-- =============================================================================
-- These tables are NOT dropped as they contain reusable data:
--
-- ✓ audio_samples          - Reusable audio registry (keyed by text+voice+role)
-- ✓ voices                 - TTS and human voice registry
-- ✓ sample_flags           - QA workflow flags for audio
-- ✓ recording_provenance   - Human recording metadata
-- ✓ course_audio_usage     - Audio usage tracking
--
-- These tables will continue to work with the new schema in migration 002.
-- =============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 001 completed: Clean slate established';
  RAISE NOTICE 'Dropped tables: basket_phrases, lego_components, legos, seeds, courses';
  RAISE NOTICE 'Preserved tables: audio_samples, voices, sample_flags, recording_provenance, course_audio_usage';
END $$;
