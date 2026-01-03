-- =============================================================================
-- 999: CLEANUP OLD TABLES (RUN MANUALLY AFTER VERIFICATION)
-- =============================================================================
--
-- WARNING: This drops the old audio tables. Only run after:
-- 1. New schema is working
-- 2. Welsh courses are imported to new tables
-- 3. You've verified everything works
--
-- The old tables are a mess:
-- - audio_samples: 145k records, duplicated, legacy voice IDs
-- - audio_files: barely used, wrong schema
-- - course_audio (old): only 1k records
-- - texts: orphaned
--
-- S3 files in ssi-audio-stage are NOT affected - only database tables.
-- =============================================================================

-- Uncomment to run:

-- DROP TABLE IF EXISTS audio_samples CASCADE;
-- DROP TABLE IF EXISTS audio_files CASCADE;
-- DROP TABLE IF EXISTS texts CASCADE;

-- Note: We're creating a NEW course_audio table, so if there's an old one
-- with different schema, you may need to rename or drop it first:
-- ALTER TABLE course_audio RENAME TO course_audio_old;
-- or
-- DROP TABLE IF EXISTS course_audio_old CASCADE;
