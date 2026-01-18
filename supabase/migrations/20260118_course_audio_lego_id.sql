-- Migration: Add lego_id column to course_audio
-- Purpose: Store LEGO ID directly for presentation audio instead of parsing text with regex
-- Date: 2026-01-18

-- Add the column
ALTER TABLE course_audio
ADD COLUMN IF NOT EXISTS lego_id TEXT;

-- Add comment explaining usage
COMMENT ON COLUMN course_audio.lego_id IS
'For presentation audio: the LEGO this introduces (e.g., S0001L01). NULL for other roles.';

-- Create partial index for fast lookups (only where lego_id is set)
CREATE INDEX IF NOT EXISTS idx_course_audio_lego
ON course_audio(course_code, lego_id)
WHERE lego_id IS NOT NULL;

-- Backfill existing presentations using lego_introductions data
-- This populates lego_id for presentations that were already linked
UPDATE course_audio ca
SET lego_id = li.lego_id
FROM lego_introductions li
WHERE ca.id = li.presentation_audio_id
  AND ca.role = 'presentation'
  AND ca.lego_id IS NULL;
