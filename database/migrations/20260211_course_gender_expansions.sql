-- Create course_gender_expansions table
-- Stores pre-computed gender-adjusted text for TTS audio generation.
-- Only rows where at least one gender form differs from the original are stored.
-- Run this in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS course_gender_expansions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL REFERENCES courses(course_code),
  original_text TEXT NOT NULL,
  language TEXT NOT NULL,
  expanded_f TEXT,          -- female speaker form (NULL = no change)
  expanded_m TEXT,          -- male speaker form (NULL = no change)
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_code, original_text, language)
);

-- Index for fast lookups by course_code
CREATE INDEX IF NOT EXISTS idx_gender_expansions_course
  ON course_gender_expansions(course_code);
