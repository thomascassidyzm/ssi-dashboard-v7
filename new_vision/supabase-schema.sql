-- =============================================================================
-- SSI Course Production Suite - Supabase Schema
-- Version: 1.1.0
-- Date: 2025-12-04
--
-- Run this in Supabase SQL Editor to set up the database
--
-- Changes in 1.1.0:
-- - Added CHECK constraint for sample_flags.status
-- - Added hash_input column for UUID verification
-- - Added decrement trigger for voice sample count
-- - Added additional indexes for common queries
-- =============================================================================

-- =============================================================================
-- VOICES: Registry of available voices (TTS and human)
-- Must be created first due to foreign key references
-- =============================================================================
CREATE TABLE IF NOT EXISTS voices (
  voice_id TEXT PRIMARY KEY,        -- azure_zh-CN-XiaoxiaoNeural, human_maria_spa

  -- Voice type
  type TEXT NOT NULL,               -- tts, human

  -- For TTS voices
  tts_engine TEXT,                  -- azure, elevenlabs
  tts_voice_name TEXT,              -- XiaoxiaoNeural
  tts_locale TEXT,                  -- zh-CN

  -- For human voices
  human_name TEXT,                  -- Maria Garcia
  human_email TEXT,                 -- For contact/attribution

  -- Language capabilities
  languages TEXT[] NOT NULL,        -- {cmn, eng} - languages this voice can speak

  -- Metadata
  sample_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AUDIO SAMPLES: Master registry of all audio files
-- =============================================================================
CREATE TABLE IF NOT EXISTS audio_samples (
  -- Primary key: deterministic hash of voice|text|lang|role|cadence
  uuid TEXT PRIMARY KEY,

  -- The composite key components (for lookups and debugging)
  voice_id TEXT NOT NULL REFERENCES voices(voice_id),
  text TEXT NOT NULL,               -- Original phrase
  text_normalized TEXT NOT NULL,    -- Lowercase, trimmed for matching
  lang TEXT NOT NULL,               -- ISO 639-3: eng, cmn, spa, cym
  role TEXT NOT NULL,               -- source, target1, target2, presentation
  cadence TEXT NOT NULL,            -- natural, slow

  -- Hash input for debugging/verification (the string that was hashed to create UUID)
  hash_input TEXT,                  -- "azure_zh-CN-XiaoxiaoNeural|你好|cmn|target1|slow"

  -- S3 location
  s3_bucket TEXT NOT NULL DEFAULT 'popty-bach-lfs',
  s3_key TEXT NOT NULL,             -- mastered/{uuid}.mp3

  -- Audio metadata
  duration_ms INTEGER,
  file_size_bytes INTEGER,
  checksum_md5 TEXT,                -- For integrity verification

  -- Generation info
  source TEXT NOT NULL,             -- tts_azure, tts_elevenlabs, human_recording
  tts_engine TEXT,                  -- azure, elevenlabs (null for human)
  tts_voice_variant TEXT,           -- es-ES-ElviraNeural (null for human)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for the main lookup pattern
CREATE INDEX IF NOT EXISTS idx_audio_lookup
  ON audio_samples(text_normalized, lang, role, voice_id, cadence);

-- Index for finding all samples by voice
CREATE INDEX IF NOT EXISTS idx_audio_by_voice ON audio_samples(voice_id);

-- Index for finding by language
CREATE INDEX IF NOT EXISTS idx_audio_by_lang ON audio_samples(lang);

-- =============================================================================
-- COURSE AUDIO USAGE: Track which courses use which audio (for stats/cleanup)
-- =============================================================================
CREATE TABLE IF NOT EXISTS course_audio_usage (
  course_code TEXT NOT NULL,        -- cmn_for_eng, spa_for_eng
  audio_uuid TEXT NOT NULL REFERENCES audio_samples(uuid),
  used_in TEXT,                     -- basket, encouragement, welcome, introduction
  seed_id TEXT,                     -- S0042 (if applicable)
  lego_id TEXT,                     -- S0042L01 (if applicable)

  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (course_code, audio_uuid)
);

-- Index for finding all audio used by a course
CREATE INDEX IF NOT EXISTS idx_usage_by_course ON course_audio_usage(course_code);

-- Index for finding which courses use a specific audio (for "what courses use this audio?")
CREATE INDEX IF NOT EXISTS idx_usage_by_audio ON course_audio_usage(audio_uuid);

-- =============================================================================
-- SAMPLE FLAGS: QA workflow state
-- =============================================================================
CREATE TABLE IF NOT EXISTS sample_flags (
  id SERIAL PRIMARY KEY,

  -- Reference to audio
  audio_uuid TEXT NOT NULL REFERENCES audio_samples(uuid),
  course_code TEXT NOT NULL,        -- Flags are per-course

  -- Status (matches the 12-status lifecycle)
  status TEXT NOT NULL DEFAULT 'pending',

  -- Enforce valid status values
  CONSTRAINT valid_status CHECK (status IN (
    'pending',
    'flagged_text_edit',
    'flagged_regen_tts',
    'flagged_human_needed',
    'in_pipeline',
    'tts_complete',
    'tts_failed',
    'in_recording',
    'recorded',
    'needs_review',
    'approved',
    'rejected',
    'complete'
  )),

  -- Flag details
  notes TEXT,
  flagged_by TEXT,                  -- User email
  flagged_at TIMESTAMPTZ,

  -- Context for navigation
  context JSONB,                    -- {seed_id, cycle_index, phrase}

  -- History tracking
  history JSONB DEFAULT '[]',       -- Array of status changes

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(audio_uuid, course_code)
);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_flags_by_status ON sample_flags(course_code, status);

-- Index for finding flags by audio (for "what flags exist for this audio?")
CREATE INDEX IF NOT EXISTS idx_flags_by_audio ON sample_flags(audio_uuid);

-- =============================================================================
-- RECORDING PROVENANCE: Metadata for human recordings
-- Especially important for endangered language documentation
-- =============================================================================
CREATE TABLE IF NOT EXISTS recording_provenance (
  audio_uuid TEXT PRIMARY KEY REFERENCES audio_samples(uuid),

  -- Speaker info
  recorded_by TEXT NOT NULL,        -- Speaker name/identifier
  speaker_native_language TEXT,     -- Their L1
  speaker_proficiency TEXT,         -- native, fluent_l2, heritage_speaker
  speaker_age_range TEXT,           -- 18-25, 26-35, 36-45, 46-55, 56-65, 65+
  speaker_dialect TEXT,             -- North Welsh, Castilian Spanish
  speaker_region TEXT,              -- Geographic region

  -- Recording session info
  recorded_at TIMESTAMPTZ NOT NULL,
  recording_location TEXT,          -- Where recorded
  recording_device TEXT,            -- Microphone/setup used
  recording_environment TEXT,       -- studio, home, outdoor

  -- Consent and rights
  speaker_consent BOOLEAN DEFAULT TRUE,
  consent_form_ref TEXT,            -- Reference to consent documentation
  usage_rights TEXT,                -- CC-BY, internal-only, etc.

  -- Quality notes
  quality_notes TEXT,
  retake_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- COURSES: Registry of courses (optional, for dashboard overview)
-- =============================================================================
CREATE TABLE IF NOT EXISTS courses (
  course_code TEXT PRIMARY KEY,     -- cmn_for_eng

  known_lang TEXT NOT NULL,         -- eng
  target_lang TEXT NOT NULL,        -- cmn

  display_name TEXT,                -- Chinese for English Speakers

  -- Voice configuration
  source_voice_id TEXT REFERENCES voices(voice_id),
  target1_voice_id TEXT REFERENCES voices(voice_id),
  target2_voice_id TEXT REFERENCES voices(voice_id),
  presentation_voice_id TEXT REFERENCES voices(voice_id),

  -- Status
  status TEXT DEFAULT 'draft',      -- draft, in_production, published

  -- Stats (updated by triggers or periodic job)
  total_samples INTEGER DEFAULT 0,
  approved_samples INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FUNCTIONS: Automatic timestamp updates
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_voices_updated_at ON voices;
CREATE TRIGGER update_voices_updated_at
  BEFORE UPDATE ON voices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_audio_samples_updated_at ON audio_samples;
CREATE TRIGGER update_audio_samples_updated_at
  BEFORE UPDATE ON audio_samples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_sample_flags_updated_at ON sample_flags;
CREATE TRIGGER update_sample_flags_updated_at
  BEFORE UPDATE ON sample_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_recording_provenance_updated_at ON recording_provenance;
CREATE TRIGGER update_recording_provenance_updated_at
  BEFORE UPDATE ON recording_provenance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- FUNCTIONS: Increment voice sample count
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_voice_sample_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE voices
  SET sample_count = sample_count + 1,
      last_used_at = NOW()
  WHERE voice_id = NEW.voice_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_voice_count_on_insert ON audio_samples;
CREATE TRIGGER increment_voice_count_on_insert
  AFTER INSERT ON audio_samples
  FOR EACH ROW EXECUTE FUNCTION increment_voice_sample_count();

-- =============================================================================
-- FUNCTIONS: Decrement voice sample count on delete
-- =============================================================================
CREATE OR REPLACE FUNCTION decrement_voice_sample_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE voices
  SET sample_count = sample_count - 1
  WHERE voice_id = OLD.voice_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS decrement_voice_count_on_delete ON audio_samples;
CREATE TRIGGER decrement_voice_count_on_delete
  AFTER DELETE ON audio_samples
  FOR EACH ROW EXECUTE FUNCTION decrement_voice_sample_count();

-- =============================================================================
-- REALTIME: Enable for tables that need live updates
-- =============================================================================
-- Note: Run these after creating the tables

-- Enable realtime for sample_flags (QA workflow updates)
ALTER PUBLICATION supabase_realtime ADD TABLE sample_flags;

-- Enable realtime for audio_samples (new audio generated)
ALTER PUBLICATION supabase_realtime ADD TABLE audio_samples;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- For now, allow all authenticated access
-- TODO: Add proper RLS policies for multi-tenant volunteer system
-- =============================================================================
ALTER TABLE voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_audio_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Temporary: allow all for authenticated users
CREATE POLICY "Allow all for authenticated" ON voices
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated" ON audio_samples
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated" ON course_audio_usage
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated" ON sample_flags
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated" ON recording_provenance
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated" ON courses
  FOR ALL USING (auth.role() = 'authenticated');

-- Also allow anonymous read access to audio_samples (for app playback)
CREATE POLICY "Allow anonymous read" ON audio_samples
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read" ON voices
  FOR SELECT USING (true);

-- =============================================================================
-- SEED DATA: Initial TTS voices
-- =============================================================================
INSERT INTO voices (voice_id, type, tts_engine, tts_voice_name, tts_locale, languages)
VALUES
  -- Chinese voices
  ('azure_zh-CN-XiaoxiaoNeural', 'tts', 'azure', 'XiaoxiaoNeural', 'zh-CN', ARRAY['cmn']),
  ('azure_zh-CN-YunxiNeural', 'tts', 'azure', 'YunxiNeural', 'zh-CN', ARRAY['cmn']),

  -- English voices
  ('azure_en-GB-BellaNeural', 'tts', 'azure', 'BellaNeural', 'en-GB', ARRAY['eng']),
  ('azure_en-US-JennyNeural', 'tts', 'azure', 'JennyNeural', 'en-US', ARRAY['eng']),

  -- Spanish voices
  ('azure_es-ES-ElviraNeural', 'tts', 'azure', 'ElviraNeural', 'es-ES', ARRAY['spa']),
  ('azure_es-ES-AlvaroNeural', 'tts', 'azure', 'AlvaroNeural', 'es-ES', ARRAY['spa']),

  -- Welsh voices (for future)
  ('azure_cy-GB-AledNeural', 'tts', 'azure', 'AledNeural', 'cy-GB', ARRAY['cym']),
  ('azure_cy-GB-NiaNeural', 'tts', 'azure', 'NiaNeural', 'cy-GB', ARRAY['cym'])
ON CONFLICT (voice_id) DO NOTHING;

-- =============================================================================
-- Done!
-- =============================================================================
