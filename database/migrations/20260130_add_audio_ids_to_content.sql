-- Migration: Add audio ID columns to course_legos and course_practice_phrases
-- Date: 2026-01-30
-- Purpose: Cycle locking - store audio IDs directly instead of text matching at runtime

-- ============================================
-- ADD AUDIO ID COLUMNS TO course_legos
-- ============================================

ALTER TABLE course_legos
ADD COLUMN IF NOT EXISTS known_audio_id UUID REFERENCES course_audio(id),
ADD COLUMN IF NOT EXISTS target1_audio_id UUID REFERENCES course_audio(id),
ADD COLUMN IF NOT EXISTS target2_audio_id UUID REFERENCES course_audio(id);

-- ============================================
-- ADD AUDIO ID COLUMNS TO course_practice_phrases
-- ============================================

ALTER TABLE course_practice_phrases
ADD COLUMN IF NOT EXISTS known_audio_id UUID REFERENCES course_audio(id),
ADD COLUMN IF NOT EXISTS target1_audio_id UUID REFERENCES course_audio(id),
ADD COLUMN IF NOT EXISTS target2_audio_id UUID REFERENCES course_audio(id);

-- ============================================
-- BACKFILL: Match existing audio by text
-- ============================================

-- Backfill course_legos
UPDATE course_legos cl SET
  known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND ca.text_normalized = lower(trim(cl.known_text))
      AND ca.role IN ('known', 'source')
    LIMIT 1
  ),
  target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND ca.text_normalized = lower(trim(cl.target_text))
      AND ca.role = 'target1'
    LIMIT 1
  ),
  target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND ca.text_normalized = lower(trim(cl.target_text))
      AND ca.role = 'target2'
    LIMIT 1
  )
WHERE known_audio_id IS NULL;

-- Backfill course_practice_phrases
UPDATE course_practice_phrases cpp SET
  known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND ca.text_normalized = lower(trim(cpp.known_text))
      AND ca.role IN ('known', 'source')
    LIMIT 1
  ),
  target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND ca.text_normalized = lower(trim(cpp.target_text))
      AND ca.role = 'target1'
    LIMIT 1
  ),
  target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND ca.text_normalized = lower(trim(cpp.target_text))
      AND ca.role = 'target2'
    LIMIT 1
  )
WHERE known_audio_id IS NULL;

-- ============================================
-- INDEXES for efficient lookup
-- ============================================

CREATE INDEX IF NOT EXISTS idx_course_legos_audio ON course_legos(known_audio_id, target1_audio_id, target2_audio_id);
CREATE INDEX IF NOT EXISTS idx_practice_phrases_audio ON course_practice_phrases(known_audio_id, target1_audio_id, target2_audio_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN course_legos.known_audio_id IS 'Direct reference to audio for known text (cycle-locked)';
COMMENT ON COLUMN course_legos.target1_audio_id IS 'Direct reference to target voice 1 audio (cycle-locked)';
COMMENT ON COLUMN course_legos.target2_audio_id IS 'Direct reference to target voice 2 audio (cycle-locked)';

COMMENT ON COLUMN course_practice_phrases.known_audio_id IS 'Direct reference to audio for known text (cycle-locked)';
COMMENT ON COLUMN course_practice_phrases.target1_audio_id IS 'Direct reference to target voice 1 audio (cycle-locked)';
COMMENT ON COLUMN course_practice_phrases.target2_audio_id IS 'Direct reference to target voice 2 audio (cycle-locked)';
