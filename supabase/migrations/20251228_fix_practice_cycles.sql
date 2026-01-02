-- ============================================================================
-- FIX: Add target_syllable_count to practice_cycles view
-- Run this in Supabase SQL Editor
-- ============================================================================

DROP VIEW IF EXISTS practice_cycles;

CREATE VIEW practice_cycles AS
SELECT
  p.id,
  p.course_code,
  p.seed_number,
  p.lego_index,
  p.position,
  'S' || lpad(p.seed_number::text, 4, '0') || 'L' || lpad(p.lego_index::text, 2, '0') AS lego_id,
  CASE
    WHEN p.position = 0 THEN 'component'
    WHEN p.position = 1 THEN 'debut'
    WHEN p.position BETWEEN 2 AND 7 THEN 'practice'
    ELSE 'eternal'
  END AS phrase_type,
  p.word_count,
  p.target_syllable_count,
  p.lego_count,
  p.difficulty,
  p.register,
  p.status,
  p.version,
  p.known_text,
  p.target_text,
  ka.audio_id::text AS known_audio_uuid,
  ka.duration_ms AS known_duration_ms,
  t1.audio_id::text AS target1_audio_uuid,
  t1.duration_ms AS target1_duration_ms,
  t2.audio_id::text AS target2_audio_uuid,
  t2.duration_ms AS target2_duration_ms
FROM course_practice_phrases p
JOIN courses c ON c.course_code = p.course_code
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

GRANT SELECT ON practice_cycles TO authenticated;

COMMENT ON VIEW practice_cycles IS 'Practice phrase items with v12 audio refs - includes target_syllable_count';
