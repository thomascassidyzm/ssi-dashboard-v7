-- =============================================================================
-- 002: COURSE_AUDIO TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS course_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL REFERENCES courses(code) ON DELETE CASCADE,
  text TEXT NOT NULL,
  text_normalized TEXT NOT NULL,
  language TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('known', 'target1', 'target2', 'presentation')),
  voice_id TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('tts', 'human')),
  s3_key TEXT NOT NULL,
  duration_ms INTEGER,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_course_audio UNIQUE (course_code, text_normalized, language, role)
);

CREATE INDEX IF NOT EXISTS idx_course_audio_course ON course_audio(course_code);
CREATE INDEX IF NOT EXISTS idx_course_audio_role ON course_audio(course_code, role);
CREATE INDEX IF NOT EXISTS idx_course_audio_text ON course_audio(text_normalized, language);
CREATE INDEX IF NOT EXISTS idx_course_audio_origin ON course_audio(origin);

COMMENT ON TABLE course_audio IS 'Course-specific audio (known, target1, target2, presentation roles)';
COMMENT ON COLUMN course_audio.origin IS 'tts = regenerable, human = precious';
COMMENT ON COLUMN course_audio.s3_key IS 'Path in ssi-audio-stage bucket';
