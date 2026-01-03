-- =============================================================================
-- 003: SHARED_AUDIO TABLE
-- =============================================================================
-- Encouragements and instructions - shared across all courses with same known language.
-- NOTE: Course WELCOME is NOT shared - it goes in course_audio with role = 'presentation'

CREATE TABLE IF NOT EXISTS shared_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  text_normalized TEXT NOT NULL,
  language TEXT NOT NULL,
  audio_type TEXT NOT NULL CHECK (audio_type IN ('encouragement', 'instruction')),
  voice_id TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('tts', 'human')),
  s3_key TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_shared_audio UNIQUE (text_normalized, language, audio_type)
);

CREATE INDEX IF NOT EXISTS idx_shared_audio_language ON shared_audio(language);
CREATE INDEX IF NOT EXISTS idx_shared_audio_type ON shared_audio(language, audio_type);

COMMENT ON TABLE shared_audio IS 'Shared audio (encouragements, instructions) - reused across courses';
