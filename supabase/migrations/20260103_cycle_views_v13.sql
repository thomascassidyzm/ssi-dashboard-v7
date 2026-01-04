-- ============================================================================
-- CYCLE VIEWS v13
-- Uses flat course_audio table (no texts/audio_files indirection)
--
-- These views provide self-contained learning items with audio refs.
-- One row = one playable cycle in the learning app.
--
-- v13 Changes:
-- - course_audio is flat (course-owned), not shared via texts/audio_files
-- - voice_config is JSONB in courses table, not separate columns
-- - duration_ms comes directly from course_audio
-- - S3 keys are just UUIDs (flat storage)
--
-- Prerequisite: 001-007 v13 migrations must be run first
-- ============================================================================

-- Drop v12 views (they depend on deprecated audio_registry)
DROP VIEW IF EXISTS seed_cycles CASCADE;
DROP VIEW IF EXISTS practice_cycles CASCADE;
DROP VIEW IF EXISTS lego_cycles CASCADE;
DROP VIEW IF EXISTS audio_registry CASCADE;

-- ============================================================================
-- LEGO CYCLES v13
-- Complete LEGO learning items with audio from course_audio
-- ============================================================================
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

  -- Known audio (from course_audio)
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
JOIN courses c ON c.code = l.course_code

-- v13: Join course_audio directly (flat, course-owned)
LEFT JOIN course_audio ka
  ON ka.course_code = l.course_code
  AND ka.text_normalized = lower(trim(l.known_text))
  AND ka.language = c.known_lang
  AND ka.role = 'known'

LEFT JOIN course_audio t1
  ON t1.course_code = l.course_code
  AND t1.text_normalized = lower(trim(l.target_text))
  AND t1.language = c.target_lang
  AND t1.role = 'target1'

LEFT JOIN course_audio t2
  ON t2.course_code = l.course_code
  AND t2.text_normalized = lower(trim(l.target_text))
  AND t2.language = c.target_lang
  AND t2.role = 'target2';

-- ============================================================================
-- PRACTICE CYCLES v13
-- Complete practice phrase learning items with audio
-- Includes duration_ms for ordering (debut=shortest, eternal=longest)
-- ============================================================================
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

  -- Phrase type (computed from position)
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

  -- Known audio
  ka.id::text AS known_audio_uuid,
  ka.s3_key AS known_s3_key,
  ka.duration_ms AS known_duration_ms,

  -- Target audio voice 1 (USE THIS FOR ORDERING!)
  t1.id::text AS target1_audio_uuid,
  t1.s3_key AS target1_s3_key,
  t1.duration_ms AS target1_duration_ms,

  -- Target audio voice 2
  t2.id::text AS target2_audio_uuid,
  t2.s3_key AS target2_s3_key,
  t2.duration_ms AS target2_duration_ms

FROM course_practice_phrases p
JOIN courses c ON c.code = p.course_code

-- v13: Join course_audio directly
LEFT JOIN course_audio ka
  ON ka.course_code = p.course_code
  AND ka.text_normalized = lower(trim(p.known_text))
  AND ka.language = c.known_lang
  AND ka.role = 'known'

LEFT JOIN course_audio t1
  ON t1.course_code = p.course_code
  AND t1.text_normalized = lower(trim(p.target_text))
  AND t1.language = c.target_lang
  AND t1.role = 'target1'

LEFT JOIN course_audio t2
  ON t2.course_code = p.course_code
  AND t2.text_normalized = lower(trim(p.target_text))
  AND t2.language = c.target_lang
  AND t2.role = 'target2';

-- ============================================================================
-- SEED CYCLES v13
-- Complete seed learning items with audio
-- ============================================================================
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

  -- Known audio
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
JOIN courses c ON c.code = s.course_code

-- v13: Join course_audio directly
LEFT JOIN course_audio ka
  ON ka.course_code = s.course_code
  AND ka.text_normalized = lower(trim(s.known_text))
  AND ka.language = c.known_lang
  AND ka.role = 'known'

LEFT JOIN course_audio t1
  ON t1.course_code = s.course_code
  AND t1.text_normalized = lower(trim(s.target_text))
  AND t1.language = c.target_lang
  AND t1.role = 'target1'

LEFT JOIN course_audio t2
  ON t2.course_code = s.course_code
  AND t2.text_normalized = lower(trim(s.target_text))
  AND t2.language = c.target_lang
  AND t2.role = 'target2';

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
GRANT SELECT ON lego_cycles TO authenticated;
GRANT SELECT ON practice_cycles TO authenticated;
GRANT SELECT ON seed_cycles TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON VIEW lego_cycles IS 'v13: Self-contained LEGO items with audio from course_audio (flat).';
COMMENT ON VIEW practice_cycles IS 'v13: Practice phrases with duration_ms for ordering. Order by target1_duration_ms for cognitive load.';
COMMENT ON VIEW seed_cycles IS 'v13: Seed items with audio from course_audio (flat).';
