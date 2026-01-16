-- Migration: Fix practice_cycles view to use metadata for phrase_type
-- Date: 2026-01-16
-- Purpose: Use metadata->>'buildup' instead of position-based logic
--
-- Problem: The old view used position-based logic:
--   position 0 → component, position 1 → debut, else → practice
-- But actual data has positions 1,2,3+ with metadata indicating type:
--   metadata->>'buildup' = 'component' → component phrases
--   metadata->>'buildup' = 'lego' → the LEGO debut itself
--   no buildup metadata → practice phrases
--
-- Run in Supabase SQL Editor

DROP VIEW IF EXISTS practice_cycles;

CREATE VIEW practice_cycles AS
SELECT
  cpp.id,
  cpp.course_code,
  cpp.seed_number,
  cpp.lego_index,
  lc.lego_id,
  cpp.position,
  -- Use metadata for phrase_type instead of position
  CASE
    WHEN cpp.metadata->>'buildup' = 'component' THEN 'component'
    WHEN cpp.metadata->>'buildup' = 'lego' THEN 'debut'
    ELSE 'practice'
  END as phrase_type,
  cpp.word_count,
  cpp.lego_count,
  cpp.difficulty,
  cpp.register,
  cpp.status,
  cpp.version,
  cpp.known_text,
  cpp.target_text,
  cpp.target_syllable_count,
  cpp.metadata,  -- Include metadata for consumers that need it
  lc.known_audio_uuid,
  lc.known_duration_ms,
  lc.target1_audio_uuid,
  lc.target1_duration_ms,
  lc.target2_audio_uuid,
  lc.target2_duration_ms
FROM course_practice_phrases cpp
JOIN lego_cycles lc
  ON cpp.seed_number = lc.seed_number
  AND cpp.lego_index = lc.lego_index
  AND cpp.course_code = lc.course_code;

-- Verify the fix works for S0007L03
SELECT
  position,
  phrase_type,
  known_text,
  target_text,
  metadata->>'buildup' as buildup
FROM practice_cycles
WHERE course_code = 'zho_for_eng'
  AND seed_number = 7
  AND lego_index = 3
ORDER BY position;
