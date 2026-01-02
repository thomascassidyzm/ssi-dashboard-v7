-- ============================================================================
-- CYCLE VIEWS v12
-- Uses the v12 audio_registry (texts + audio_files)
--
-- These views provide self-contained learning items with audio refs.
-- One row = one playable cycle in the learning app.
--
-- Prerequisite: 20251219_audio_registry_v12.sql must be run first
-- ============================================================================

-- Drop all views in dependency order
DROP VIEW IF EXISTS seed_cycles;
DROP VIEW IF EXISTS practice_cycles;
DROP VIEW IF EXISTS lego_cycles;
DROP VIEW IF EXISTS audio_registry;

-- ============================================================================
-- ADD CADENCE COLUMNS TO COURSES
-- Each course can specify what cadence to use for known/target audio
-- ============================================================================
ALTER TABLE courses ADD COLUMN IF NOT EXISTS known_cadence text DEFAULT 'natural';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_cadence text DEFAULT 'slow';

-- Set Welsh to use natural cadence for targets (recorded at natural speed)
UPDATE courses SET target_cadence = 'natural' WHERE course_code = 'cym_n_for_eng';

CREATE VIEW audio_registry AS
SELECT
  af.id AS audio_id,
  af.s3_key,
  af.s3_bucket,
  af.duration_ms,
  af.cadence,
  af.source,
  t.id AS text_id,
  t.content AS text_content,
  t.content_normalized,  -- Added for cycle view joins
  t.language,
  af.voice_id,
  v.tts_engine AS provider,
  v.tts_voice_name AS voice_name,
  v.tts_locale AS locale
FROM audio_files af
JOIN texts t ON t.id = af.text_id
LEFT JOIN voices v ON v.voice_id = af.voice_id;

-- Grant access
GRANT SELECT ON audio_registry TO authenticated;

-- ============================================================================
-- LEGO CYCLES
-- Complete LEGO learning items with audio
-- ============================================================================
CREATE VIEW lego_cycles AS
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

  -- Known audio (via audio_registry)
  ka.audio_id::text AS known_audio_uuid,
  ka.duration_ms AS known_duration_ms,

  -- Target audio voice 1
  t1.audio_id::text AS target1_audio_uuid,
  t1.duration_ms AS target1_duration_ms,

  -- Target audio voice 2
  t2.audio_id::text AS target2_audio_uuid,
  t2.duration_ms AS target2_duration_ms

FROM course_legos l
JOIN courses c ON c.course_code = l.course_code

-- v12 audio lookups via audio_registry (using course cadence config)
LEFT JOIN audio_registry ka
  ON ka.content_normalized = lower(trim(l.known_text))
  AND ka.language = c.known_lang
  AND ka.voice_id = c.known_voice
  AND ka.cadence = c.known_cadence

LEFT JOIN audio_registry t1
  ON t1.content_normalized = lower(trim(l.target_text))
  AND t1.language = c.target_lang
  AND t1.voice_id = c.target1_voice
  AND t1.cadence = c.target_cadence

LEFT JOIN audio_registry t2
  ON t2.content_normalized = lower(trim(l.target_text))
  AND t2.language = c.target_lang
  AND t2.voice_id = c.target2_voice
  AND t2.cadence = c.target_cadence;

-- ============================================================================
-- PRACTICE CYCLES
-- Complete practice phrase learning items with audio
-- ============================================================================
CREATE VIEW practice_cycles AS
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
  ka.audio_id::text AS known_audio_uuid,
  ka.duration_ms AS known_duration_ms,

  -- Target audio voice 1
  t1.audio_id::text AS target1_audio_uuid,
  t1.duration_ms AS target1_duration_ms,

  -- Target audio voice 2
  t2.audio_id::text AS target2_audio_uuid,
  t2.duration_ms AS target2_duration_ms

FROM course_practice_phrases p
JOIN courses c ON c.course_code = p.course_code

-- v12 audio lookups via audio_registry (using course cadence config)
LEFT JOIN audio_registry ka
  ON ka.content_normalized = lower(trim(p.known_text))
  AND ka.language = c.known_lang
  AND ka.voice_id = c.known_voice
  AND ka.cadence = c.known_cadence

LEFT JOIN audio_registry t1
  ON t1.content_normalized = lower(trim(p.target_text))
  AND t1.language = c.target_lang
  AND t1.voice_id = c.target1_voice
  AND t1.cadence = c.target_cadence

LEFT JOIN audio_registry t2
  ON t2.content_normalized = lower(trim(p.target_text))
  AND t2.language = c.target_lang
  AND t2.voice_id = c.target2_voice
  AND t2.cadence = c.target_cadence;

-- ============================================================================
-- SEED CYCLES
-- Complete seed learning items with audio
-- ============================================================================
CREATE VIEW seed_cycles AS
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
  ka.audio_id::text AS known_audio_uuid,
  ka.duration_ms AS known_duration_ms,

  -- Target audio voice 1
  t1.audio_id::text AS target1_audio_uuid,
  t1.duration_ms AS target1_duration_ms,

  -- Target audio voice 2
  t2.audio_id::text AS target2_audio_uuid,
  t2.duration_ms AS target2_duration_ms

FROM course_seeds s
JOIN courses c ON c.course_code = s.course_code

-- v12 audio lookups via audio_registry (using course cadence config)
LEFT JOIN audio_registry ka
  ON ka.content_normalized = lower(trim(s.known_text))
  AND ka.language = c.known_lang
  AND ka.voice_id = c.known_voice
  AND ka.cadence = c.known_cadence

LEFT JOIN audio_registry t1
  ON t1.content_normalized = lower(trim(s.target_text))
  AND t1.language = c.target_lang
  AND t1.voice_id = c.target1_voice
  AND t1.cadence = c.target_cadence

LEFT JOIN audio_registry t2
  ON t2.content_normalized = lower(trim(s.target_text))
  AND t2.language = c.target_lang
  AND t2.voice_id = c.target2_voice
  AND t2.cadence = c.target_cadence;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
GRANT SELECT ON lego_cycles TO authenticated;
GRANT SELECT ON practice_cycles TO authenticated;
GRANT SELECT ON seed_cycles TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON VIEW lego_cycles IS 'Self-contained LEGO learning items with v12 audio refs.';
COMMENT ON VIEW practice_cycles IS 'Self-contained practice phrase items with v12 audio refs.';
COMMENT ON VIEW seed_cycles IS 'Self-contained seed items with v12 audio refs.';
