-- ============================================================================
-- APML Audio Registry v12 Migration
-- Generated: 2025-12-19
--
-- Creates the v12 registry-based audio architecture:
-- - texts: All unique text units across courses
-- - audio_files: Audio renderings (references existing voices table)
-- - course_audio: Course-specific usage of audio
--
-- NOTE: The 'voices' table already exists and is NOT modified.
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: texts
-- All unique text units across all courses
-- ============================================================================

CREATE TABLE IF NOT EXISTS texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  language TEXT NOT NULL,
  content_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(content))) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Same normalized text in same language = same row
  CONSTRAINT unique_text_per_language UNIQUE (content_normalized, language)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_texts_normalized ON texts (content_normalized, language);
CREATE INDEX IF NOT EXISTS idx_texts_language ON texts (language);

COMMENT ON TABLE texts IS 'All unique text units across all courses - v12 registry';
COMMENT ON COLUMN texts.content_normalized IS 'Auto-generated normalized version for deduplication';

-- ============================================================================
-- TABLE: audio_files
-- Audio renderings - each is a specific voice speaking specific text
-- ============================================================================

CREATE TABLE IF NOT EXISTS audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What text this audio speaks
  text_id UUID NOT NULL REFERENCES texts(id) ON DELETE RESTRICT,

  -- Which voice speaks it (references existing voices table)
  voice_id TEXT NOT NULL REFERENCES voices(voice_id) ON DELETE RESTRICT,

  -- Speaking speed
  cadence TEXT NOT NULL CHECK (cadence IN ('slow', 'natural')),

  -- S3 storage location
  s3_bucket TEXT,
  s3_key TEXT,

  -- Audio metadata
  duration_ms INTEGER,
  file_size_bytes INTEGER,

  -- How it was created
  source TEXT CHECK (source IN ('tts_azure', 'tts_elevenlabs', 'human_recording')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One audio file per text+voice+cadence combination
  CONSTRAINT unique_rendering UNIQUE (text_id, voice_id, cadence)
);

-- Indexes for lookup
CREATE INDEX IF NOT EXISTS idx_audio_text ON audio_files (text_id);
CREATE INDEX IF NOT EXISTS idx_audio_voice ON audio_files (voice_id);
CREATE INDEX IF NOT EXISTS idx_audio_s3_key ON audio_files (s3_key);

COMMENT ON TABLE audio_files IS 'Audio renderings - v12 registry (UUID is database-assigned, NOT hash-computed)';
COMMENT ON COLUMN audio_files.id IS 'Database-assigned UUID - NOT computed from parameters';
COMMENT ON COLUMN audio_files.s3_key IS 'NULL means audio entry exists but file not yet generated';

-- ============================================================================
-- TABLE: course_audio
-- Which courses use which audio files (role is course-specific context)
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  course_code TEXT NOT NULL,
  audio_id UUID NOT NULL REFERENCES audio_files(id) ON DELETE RESTRICT,

  -- How this course uses the audio
  role TEXT NOT NULL CHECK (role IN ('target1', 'target2', 'known', 'presentation')),

  -- Seed/LEGO reference (e.g., S0001L01)
  context TEXT,

  -- Order within course
  position INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Same course can't use same audio with same role+context twice
  CONSTRAINT unique_usage UNIQUE (course_code, audio_id, role, context)
);

-- Index for course lookup
CREATE INDEX IF NOT EXISTS idx_course_audio_course ON course_audio (course_code);
CREATE INDEX IF NOT EXISTS idx_course_audio_audio ON course_audio (audio_id);

COMMENT ON TABLE course_audio IS 'Course-specific usage of audio - role is context, not identity';

-- ============================================================================
-- HELPER VIEW: audio_registry
-- Denormalized view for easy querying
-- ============================================================================

CREATE OR REPLACE VIEW audio_registry AS
SELECT
  af.id AS audio_id,
  af.s3_key,
  af.s3_bucket,
  af.duration_ms,
  af.cadence,
  af.source,
  t.id AS text_id,
  t.content AS text_content,
  t.language,
  v.voice_id,
  v.tts_engine AS provider,
  v.tts_voice_name AS voice_name,
  v.tts_locale AS locale
FROM audio_files af
JOIN texts t ON t.id = af.text_id
JOIN voices v ON v.voice_id = af.voice_id;

COMMENT ON VIEW audio_registry IS 'Denormalized view joining audio_files, texts, and voices';

-- ============================================================================
-- HELPER FUNCTION: find_or_create_text
-- Idempotent text lookup/creation
-- ============================================================================

CREATE OR REPLACE FUNCTION find_or_create_text(
  p_content TEXT,
  p_language TEXT
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Try to insert, on conflict return existing
  INSERT INTO texts (content, language)
  VALUES (p_content, p_language)
  ON CONFLICT (content_normalized, language)
  DO UPDATE SET content = EXCLUDED.content  -- No-op, just to return row
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_or_create_text IS 'Idempotent: returns existing text_id or creates new one';

-- ============================================================================
-- HELPER FUNCTION: find_or_create_audio
-- Idempotent audio lookup/creation
-- ============================================================================

CREATE OR REPLACE FUNCTION find_or_create_audio(
  p_content TEXT,
  p_language TEXT,
  p_voice_id TEXT,
  p_cadence TEXT
) RETURNS TABLE(audio_id UUID, s3_key TEXT, needs_generation BOOLEAN) AS $$
DECLARE
  v_text_id UUID;
  v_audio_id UUID;
  v_s3_key TEXT;
BEGIN
  -- Step 1: Find or create text
  v_text_id := find_or_create_text(p_content, p_language);

  -- Step 2: Find or create audio entry
  INSERT INTO audio_files (text_id, voice_id, cadence)
  VALUES (v_text_id, p_voice_id, p_cadence)
  ON CONFLICT (text_id, voice_id, cadence) DO NOTHING;

  -- Step 3: Get the audio entry (either new or existing)
  SELECT af.id, af.s3_key INTO v_audio_id, v_s3_key
  FROM audio_files af
  WHERE af.text_id = v_text_id
    AND af.voice_id = p_voice_id
    AND af.cadence = p_cadence;

  -- Return result
  RETURN QUERY SELECT v_audio_id, v_s3_key, (v_s3_key IS NULL);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_or_create_audio IS 'Idempotent: returns audio_id and whether generation is needed';

-- ============================================================================
-- Grant permissions (adjust as needed for your RLS setup)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_audio ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (full access)
CREATE POLICY "Service role has full access to texts" ON texts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to audio_files" ON audio_files
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to course_audio" ON course_audio
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- Migration complete!
--
-- Next steps:
-- 1. Run this migration in Supabase
-- 2. Test with: SELECT find_or_create_audio('hello', 'eng', 'azure_en-US-JennyNeural', 'natural');
-- 3. Update Phase 8 audio generator to use new functions
-- ============================================================================
