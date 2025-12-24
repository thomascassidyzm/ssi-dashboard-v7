-- ============================================================================
-- APML Compiled Schema
-- Version: 12.0.1
-- Updated: 2025-12-24
--
-- KEY PRINCIPLE: Separate WHAT from HOW
--   WHAT (identity): text_id + voice_id + cadence
--   HOW (access):    id, s3_key (just file pointers)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- Table: texts
-- All unique text units across all courses
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS texts (
  id UUID DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  language TEXT NOT NULL,
  content_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(content))) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id),
  CONSTRAINT unique_text_per_language UNIQUE (content_normalized, language)
);
CREATE INDEX IF NOT EXISTS idx_texts_normalized ON texts (content_normalized, language);
CREATE INDEX IF NOT EXISTS idx_texts_language ON texts (language);
COMMENT ON TABLE texts IS 'All unique text units across all courses';

-- ----------------------------------------------------------------------------
-- Table: voices (EXISTING - not created by this migration)
-- Registry of available voices (TTS and human)
-- Primary key is voice_id (TEXT), not UUID
-- ----------------------------------------------------------------------------

-- NOTE: voices table already exists with voice_id as TEXT primary key
-- This migration does NOT recreate it - just documents the structure:
--
-- CREATE TABLE IF NOT EXISTS voices (
--   voice_id TEXT PRIMARY KEY,  -- e.g., "azure_zh-CN-XiaoxiaoNeural"
--   type TEXT,                  -- "tts" or "human"
--   tts_engine TEXT,            -- "azure", "elevenlabs"
--   tts_voice_name TEXT,
--   tts_locale TEXT,
--   languages TEXT[],
--   is_active BOOLEAN,
--   ...
-- );

COMMENT ON TABLE voices IS 'Registry of available voices (TTS and human) - voice_id TEXT is PK';

-- ----------------------------------------------------------------------------
-- Table: audio_files
-- Audio renderings - each is a specific voice speaking specific text
-- Identity: (text_id, voice_id, cadence) - the WHAT
-- Access: id, s3_key - the HOW (just file pointers)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audio_files (
  id UUID DEFAULT gen_random_uuid(),
  text_id UUID NOT NULL,
  voice_id TEXT NOT NULL,  -- TEXT, references voices(voice_id)
  cadence TEXT NOT NULL,
  s3_bucket TEXT,
  s3_key TEXT,
  duration_ms INTEGER,
  file_size_bytes INTEGER,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE RESTRICT,
  FOREIGN KEY (voice_id) REFERENCES voices(voice_id) ON DELETE RESTRICT,
  CONSTRAINT unique_rendering UNIQUE (text_id, voice_id, cadence)
);
CREATE INDEX IF NOT EXISTS idx_audio_text ON audio_files (text_id);
CREATE INDEX IF NOT EXISTS idx_audio_voice ON audio_files (voice_id);
COMMENT ON TABLE audio_files IS 'Audio renderings - identity is (text_id, voice_id, cadence), id/s3_key are just file pointers';

-- ----------------------------------------------------------------------------
-- Table: course_audio
-- Which courses use which audio files
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_audio (
  id UUID DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL,
  audio_id UUID NOT NULL,
  role TEXT NOT NULL,
  context TEXT,
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (audio_id) REFERENCES audio_files(id) ON DELETE RESTRICT,
  CONSTRAINT unique_usage UNIQUE (course_code, audio_id, role, context)
);
CREATE INDEX IF NOT EXISTS idx_course_audio_course ON course_audio (course_code);
COMMENT ON TABLE course_audio IS 'Which courses use which audio files';
