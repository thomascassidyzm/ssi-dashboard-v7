-- =============================================================================
-- Migration 004: Make Voice Columns Nullable
-- =============================================================================
-- Purpose: Allow course creation without voice configuration
-- Date: 2025-12-16
--
-- Problem: Courses are created before voice selection. The workflow is:
--   1. Create course (languages only)
--   2. Run Phase 1-3 (translation, LEGOs, baskets)
--   3. Configure voices (select from available TTS voices)
--   4. Run Phase 8 (audio generation)
--   5. Run Phase 9 (manifest compilation)
--
-- The original schema required voice columns to be NOT NULL, which blocks
-- step 1 from completing.
--
-- Solution: Make voice columns nullable. Validation that voices are configured
-- before audio generation belongs in the application layer (Phase 8 preflight).
-- =============================================================================

ALTER TABLE courses ALTER COLUMN known_voice DROP NOT NULL;
ALTER TABLE courses ALTER COLUMN target_voice_1 DROP NOT NULL;
ALTER TABLE courses ALTER COLUMN target_voice_2 DROP NOT NULL;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 004 completed: Voice columns are now nullable';
    RAISE NOTICE '';
    RAISE NOTICE 'Affected columns:';
    RAISE NOTICE '  - known_voice: NOT NULL → nullable';
    RAISE NOTICE '  - target_voice_1: NOT NULL → nullable';
    RAISE NOTICE '  - target_voice_2: NOT NULL → nullable';
    RAISE NOTICE '  - presentation_voice: already nullable (no change)';
    RAISE NOTICE '';
    RAISE NOTICE 'Workflow impact:';
    RAISE NOTICE '  - Courses can now be created without voice configuration';
    RAISE NOTICE '  - Phase 8 should validate voices are configured before generating audio';
END $$;
