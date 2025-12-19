-- ============================================================================
-- APML Compiled Schema
-- Version: 12.0.0
-- Generated: 2025-12-19T15:03:38.905Z
-- Compiler: apml-compiler.cjs v2.0
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
-- Table: voices
-- Registry of available voices (TTS and human)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS voices (
  id UUID DEFAULT gen_random_uuid(),
  voice_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  display_name TEXT,
  locale TEXT,
  languages TEXT[],
  gender TEXT,
  is_multilingual BOOLEAN,
  is_active BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id)
);
COMMENT ON TABLE voices IS 'Registry of available voices (TTS and human)';

-- ----------------------------------------------------------------------------
-- Table: audio_files
-- Audio renderings - each is a specific voice speaking specific text
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audio_files (
  id UUID DEFAULT gen_random_uuid(),
  text_id UUID NOT NULL,
  voice_id UUID NOT NULL,
  cadence TEXT NOT NULL,
  s3_bucket TEXT,
  s3_key TEXT,
  duration_ms INTEGER,
  file_size_bytes INTEGER,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE RESTRICT,
  FOREIGN KEY (voice_id) REFERENCES voices(id) ON DELETE RESTRICT,
  CONSTRAINT unique_rendering UNIQUE (text_id, voice_id, cadence)
);
CREATE INDEX IF NOT EXISTS idx_audio_text ON audio_files (text_id);
CREATE INDEX IF NOT EXISTS idx_audio_voice ON audio_files (voice_id);
COMMENT ON TABLE audio_files IS 'Audio renderings - each is a specific voice speaking specific text';

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
