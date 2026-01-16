-- Migration: Fix practice_cycles view - v2
-- Date: 2026-01-16
-- Purpose: Fix both phrase_type AND audio lookup
--
-- Problem with v1 fix:
--   The previous fix joined with lego_cycles which only has LEGO audio,
--   causing all phrases to play the LEGO's audio instead of their own.
--
-- This fix:
--   1. Uses metadata->>'buildup' for phrase_type (from v1)
--   2. Joins course_audio directly based on phrase text (from original v13)
--
-- Run in Supabase SQL Editor

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

  -- Phrase type (use metadata instead of position-based logic)
  CASE
    WHEN p.metadata->>'buildup' = 'component' THEN 'component'
    WHEN p.metadata->>'buildup' = 'lego' THEN 'debut'
    ELSE 'practice'
  END AS phrase_type,

  -- Practice metadata
  p.word_count,
  p.target_syllable_count,
  p.lego_count,
  p.difficulty,
  p.register,
  p.status,
  p.version,
  p.metadata,  -- Include metadata for consumers that need it

  -- Text pair
  p.known_text,
  p.target_text,

  -- Known audio (joined by phrase text, not LEGO text!)
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
JOIN courses c ON c.code = p.course_code

-- Join course_audio directly based on PHRASE text (not LEGO text)
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

-- Grant permissions
GRANT SELECT ON practice_cycles TO authenticated;
GRANT SELECT ON practice_cycles TO anon;

-- Verify: Check a few phrases to confirm audio is correct
-- Each phrase should have its own audio UUID based on its text
SELECT
  lego_id,
  position,
  phrase_type,
  known_text,
  target_text,
  known_audio_uuid,
  target1_audio_uuid
FROM practice_cycles
WHERE course_code = 'zho_for_eng'
  AND seed_number = 7
  AND lego_index = 3
ORDER BY position
LIMIT 10;
