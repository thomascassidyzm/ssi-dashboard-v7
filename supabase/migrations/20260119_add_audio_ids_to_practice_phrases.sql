-- ============================================================================
-- ADD DIRECT AUDIO ID REFERENCES TO PRACTICE PHRASES
--
-- Problem: Text-based matching to find audio is fragile (normalization issues)
-- Solution: Store audio UUIDs directly on practice phrases
--
-- Benefits:
--   - Bulletproof joins (no text normalization issues)
--   - Fast queries (UUID index lookup vs string comparison)
--   - FK constraints catch missing audio at insert time
--   - Hot-swappable: update UUID to change audio
--
-- This migration:
--   1. Adds audio ID columns to course_practice_phrases
--   2. Backfills from existing text matches
--   3. Updates practice_cycles view to use direct joins
-- ============================================================================

-- ============================================================================
-- STEP 1: Add columns
-- ============================================================================
ALTER TABLE course_practice_phrases
  ADD COLUMN IF NOT EXISTS known_audio_id UUID REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target1_audio_id UUID REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target2_audio_id UUID REFERENCES course_audio(id) ON DELETE SET NULL;

-- Add indexes for the new FK columns (improves join performance)
CREATE INDEX IF NOT EXISTS idx_practice_phrases_known_audio ON course_practice_phrases(known_audio_id) WHERE known_audio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_practice_phrases_target1_audio ON course_practice_phrases(target1_audio_id) WHERE target1_audio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_practice_phrases_target2_audio ON course_practice_phrases(target2_audio_id) WHERE target2_audio_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Backfill known_audio_id from text matches
-- ============================================================================
UPDATE course_practice_phrases p
SET known_audio_id = ka.id
FROM course_audio ka, courses c
WHERE p.known_audio_id IS NULL
  AND c.course_code = p.course_code
  AND ka.course_code = p.course_code
  AND ka.text_normalized = lower(trim(p.known_text))
  AND ka.language = c.known_lang
  AND ka.role = 'known';

-- ============================================================================
-- STEP 3: Backfill target1_audio_id from text matches
-- ============================================================================
UPDATE course_practice_phrases p
SET target1_audio_id = t1.id
FROM course_audio t1, courses c
WHERE p.target1_audio_id IS NULL
  AND c.course_code = p.course_code
  AND t1.course_code = p.course_code
  AND t1.text_normalized = lower(trim(p.target_text))
  AND t1.language = c.target_lang
  AND t1.role = 'target1';

-- ============================================================================
-- STEP 4: Backfill target2_audio_id from text matches
-- ============================================================================
UPDATE course_practice_phrases p
SET target2_audio_id = t2.id
FROM course_audio t2, courses c
WHERE p.target2_audio_id IS NULL
  AND c.course_code = p.course_code
  AND t2.course_code = p.course_code
  AND t2.text_normalized = lower(trim(p.target_text))
  AND t2.language = c.target_lang
  AND t2.role = 'target2';

-- ============================================================================
-- STEP 5: Report backfill results
-- ============================================================================
DO $$
DECLARE
  total_phrases INTEGER;
  with_known INTEGER;
  with_target1 INTEGER;
  with_target2 INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_phrases FROM course_practice_phrases;
  SELECT COUNT(*) INTO with_known FROM course_practice_phrases WHERE known_audio_id IS NOT NULL;
  SELECT COUNT(*) INTO with_target1 FROM course_practice_phrases WHERE target1_audio_id IS NOT NULL;
  SELECT COUNT(*) INTO with_target2 FROM course_practice_phrases WHERE target2_audio_id IS NOT NULL;

  RAISE NOTICE 'Backfill complete:';
  RAISE NOTICE '  Total phrases: %', total_phrases;
  RAISE NOTICE '  With known_audio_id: % (%.1f%%)', with_known, (with_known::float / NULLIF(total_phrases, 0) * 100);
  RAISE NOTICE '  With target1_audio_id: % (%.1f%%)', with_target1, (with_target1::float / NULLIF(total_phrases, 0) * 100);
  RAISE NOTICE '  With target2_audio_id: % (%.1f%%)', with_target2, (with_target2::float / NULLIF(total_phrases, 0) * 100);
END $$;

-- ============================================================================
-- STEP 6: Update practice_cycles view to use direct UUID joins
-- ============================================================================
DROP VIEW IF EXISTS practice_cycles CASCADE;

CREATE OR REPLACE VIEW practice_cycles AS
SELECT
  -- Identity
  p.id,
  p.course_code,
  p.seed_number,
  p.lego_index,
  p.position,

  -- Computed LEGO ID for grouping
  'S' || lpad(p.seed_number::text, 4, '0') || 'L' || lpad(p.lego_index::text, 2, '0') AS lego_id,

  -- phrase_role from table (used by learning app)
  -- Fallback to computed value for older courses that don't have it populated
  COALESCE(
    p.phrase_role,
    CASE
      WHEN p.position = 0 THEN 'component'
      WHEN p.position >= 8 THEN 'eternal_eligible'
      ELSE 'practice'
    END
  ) AS phrase_role,

  -- phrase_type computed from position (for backwards compatibility)
  CASE
    WHEN p.position = 0 THEN 'component'
    WHEN p.position = 1 THEN 'debut'
    WHEN p.position BETWEEN 2 AND 7 THEN 'practice'
    ELSE 'eternal'
  END AS phrase_type,

  -- Practice metadata
  p.word_count,
  p.target_syllable_count,
  p.lego_count,
  p.difficulty,
  p.register,
  p.status,
  p.version,

  -- Text pair
  p.known_text,
  p.target_text,

  -- Known audio (DIRECT UUID JOIN - fast & robust)
  ka.id::text AS known_audio_uuid,
  ka.s3_key AS known_s3_key,
  ka.duration_ms AS known_duration_ms,

  -- Target audio voice 1
  t1.id::text AS target1_audio_uuid,
  t1.s3_key AS target1_s3_key,
  t1.duration_ms AS target1_duration_ms,

  -- Target audio voice 2
  t2.id::text AS target2_audio_uuid,
  t2.s3_key AS target2_s3_key,
  t2.duration_ms AS target2_duration_ms

FROM course_practice_phrases p

-- DIRECT UUID JOINS (no text matching!)
LEFT JOIN course_audio ka ON ka.id = p.known_audio_id
LEFT JOIN course_audio t1 ON t1.id = p.target1_audio_id
LEFT JOIN course_audio t2 ON t2.id = p.target2_audio_id;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
GRANT SELECT ON practice_cycles TO authenticated;
GRANT SELECT ON practice_cycles TO anon;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON VIEW practice_cycles IS 'v14: Practice phrases with DIRECT audio UUID joins. No more text matching fragility.';
COMMENT ON COLUMN course_practice_phrases.known_audio_id IS 'Direct FK to course_audio for known language audio';
COMMENT ON COLUMN course_practice_phrases.target1_audio_id IS 'Direct FK to course_audio for target voice 1';
COMMENT ON COLUMN course_practice_phrases.target2_audio_id IS 'Direct FK to course_audio for target voice 2';
