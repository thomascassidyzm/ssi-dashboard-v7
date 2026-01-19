-- ============================================================================
-- ADD DIRECT AUDIO ID REFERENCES TO LEGOS AND SEEDS
--
-- Same pattern as practice phrases - direct UUID joins instead of text matching
-- ============================================================================

-- ============================================================================
-- STEP 1: Add columns to course_legos
-- ============================================================================
ALTER TABLE course_legos
  ADD COLUMN IF NOT EXISTS known_audio_id UUID REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target1_audio_id UUID REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target2_audio_id UUID REFERENCES course_audio(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_legos_known_audio ON course_legos(known_audio_id) WHERE known_audio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_legos_target1_audio ON course_legos(target1_audio_id) WHERE target1_audio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_legos_target2_audio ON course_legos(target2_audio_id) WHERE target2_audio_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Backfill legos - known_audio_id
-- ============================================================================
UPDATE course_legos l
SET known_audio_id = ka.id
FROM course_audio ka, courses c
WHERE l.known_audio_id IS NULL
  AND c.course_code = l.course_code
  AND ka.course_code = l.course_code
  AND ka.text_normalized = lower(trim(l.known_text))
  AND ka.language = c.known_lang
  AND ka.role = 'known';

-- ============================================================================
-- STEP 3: Backfill legos - target1_audio_id
-- ============================================================================
UPDATE course_legos l
SET target1_audio_id = t1.id
FROM course_audio t1, courses c
WHERE l.target1_audio_id IS NULL
  AND c.course_code = l.course_code
  AND t1.course_code = l.course_code
  AND t1.text_normalized = lower(trim(l.target_text))
  AND t1.language = c.target_lang
  AND t1.role = 'target1';

-- ============================================================================
-- STEP 4: Backfill legos - target2_audio_id
-- ============================================================================
UPDATE course_legos l
SET target2_audio_id = t2.id
FROM course_audio t2, courses c
WHERE l.target2_audio_id IS NULL
  AND c.course_code = l.course_code
  AND t2.course_code = l.course_code
  AND t2.text_normalized = lower(trim(l.target_text))
  AND t2.language = c.target_lang
  AND t2.role = 'target2';

-- ============================================================================
-- STEP 5: Report lego backfill results
-- ============================================================================
DO $$
DECLARE
  total_legos INTEGER;
  with_known INTEGER;
  with_target1 INTEGER;
  with_target2 INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_legos FROM course_legos;
  SELECT COUNT(*) INTO with_known FROM course_legos WHERE known_audio_id IS NOT NULL;
  SELECT COUNT(*) INTO with_target1 FROM course_legos WHERE target1_audio_id IS NOT NULL;
  SELECT COUNT(*) INTO with_target2 FROM course_legos WHERE target2_audio_id IS NOT NULL;

  RAISE NOTICE 'LEGO Backfill complete:';
  RAISE NOTICE '  Total LEGOs: %', total_legos;
  RAISE NOTICE '  With known_audio_id: % (%.1f%%)', with_known, (with_known::float / NULLIF(total_legos, 0) * 100);
  RAISE NOTICE '  With target1_audio_id: % (%.1f%%)', with_target1, (with_target1::float / NULLIF(total_legos, 0) * 100);
  RAISE NOTICE '  With target2_audio_id: % (%.1f%%)', with_target2, (with_target2::float / NULLIF(total_legos, 0) * 100);
END $$;

-- ============================================================================
-- STEP 6: Update lego_cycles view to use direct UUID joins
-- ============================================================================
DROP VIEW IF EXISTS lego_cycles CASCADE;

CREATE OR REPLACE VIEW lego_cycles AS
SELECT
  -- Identity
  l.id,
  l.lego_id,
  l.course_code,
  l.seed_number,
  l.lego_index,

  -- LEGO metadata
  l.type,
  l.is_new,
  l.components,
  l.status,
  l.version,

  -- Text pair
  l.known_text,
  l.target_text,

  -- Known audio (DIRECT UUID JOIN)
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

FROM course_legos l

-- DIRECT UUID JOINS (no text matching!)
LEFT JOIN course_audio ka ON ka.id = l.known_audio_id
LEFT JOIN course_audio t1 ON t1.id = l.target1_audio_id
LEFT JOIN course_audio t2 ON t2.id = l.target2_audio_id;

-- ============================================================================
-- STEP 7: Add columns to course_seeds
-- ============================================================================
ALTER TABLE course_seeds
  ADD COLUMN IF NOT EXISTS known_audio_id UUID REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target1_audio_id UUID REFERENCES course_audio(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target2_audio_id UUID REFERENCES course_audio(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 8: Backfill seeds
-- ============================================================================
UPDATE course_seeds s
SET known_audio_id = ka.id
FROM course_audio ka, courses c
WHERE s.known_audio_id IS NULL
  AND c.course_code = s.course_code
  AND ka.course_code = s.course_code
  AND ka.text_normalized = lower(trim(s.known_text))
  AND ka.language = c.known_lang
  AND ka.role = 'known';

UPDATE course_seeds s
SET target1_audio_id = t1.id
FROM course_audio t1, courses c
WHERE s.target1_audio_id IS NULL
  AND c.course_code = s.course_code
  AND t1.course_code = s.course_code
  AND t1.text_normalized = lower(trim(s.target_text))
  AND t1.language = c.target_lang
  AND t1.role = 'target1';

UPDATE course_seeds s
SET target2_audio_id = t2.id
FROM course_audio t2, courses c
WHERE s.target2_audio_id IS NULL
  AND c.course_code = s.course_code
  AND t2.course_code = s.course_code
  AND t2.text_normalized = lower(trim(s.target_text))
  AND t2.language = c.target_lang
  AND t2.role = 'target2';

-- ============================================================================
-- STEP 9: Update seed_cycles view
-- ============================================================================
DROP VIEW IF EXISTS seed_cycles CASCADE;

CREATE OR REPLACE VIEW seed_cycles AS
SELECT
  -- Identity
  s.id,
  'S' || lpad(s.seed_number::text, 4, '0') AS seed_id,
  s.course_code,
  s.seed_number,

  -- Seed metadata
  s.status,
  s.version,

  -- Text pair
  s.known_text,
  s.target_text,

  -- Known audio (DIRECT UUID JOIN)
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

FROM course_seeds s

-- DIRECT UUID JOINS
LEFT JOIN course_audio ka ON ka.id = s.known_audio_id
LEFT JOIN course_audio t1 ON t1.id = s.target1_audio_id
LEFT JOIN course_audio t2 ON t2.id = s.target2_audio_id;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
GRANT SELECT ON lego_cycles TO authenticated;
GRANT SELECT ON lego_cycles TO anon;
GRANT SELECT ON seed_cycles TO authenticated;
GRANT SELECT ON seed_cycles TO anon;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON VIEW lego_cycles IS 'v14: LEGOs with DIRECT audio UUID joins. No more text matching.';
COMMENT ON VIEW seed_cycles IS 'v14: Seeds with DIRECT audio UUID joins. No more text matching.';
