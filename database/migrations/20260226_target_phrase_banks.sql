-- Target-Language Phrase Banks & Canonical LEGO Decomposition
-- Enables shared target-language content across multiple courses
-- e.g. all eng_for_* courses share the same English LEGOs and phrases

-- ── New tables ────────────────────────────────────────────────────────

-- Source of truth for seed sentences in each target language
CREATE TABLE IF NOT EXISTS target_seed_texts (
  target_lang TEXT NOT NULL,
  seed_number INTEGER NOT NULL,
  target_text TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (target_lang, seed_number)
);

-- Canonical LEGO decomposition per target language
CREATE TABLE IF NOT EXISTS target_legos (
  id TEXT PRIMARY KEY,                    -- 'eng:S0001L01'
  target_lang TEXT NOT NULL,
  seed_number INTEGER NOT NULL,
  lego_index INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('A', 'M')),
  target_text TEXT NOT NULL,
  components JSONB,                       -- M-type: [{target: 'I'}, {target: 'want to'}]
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_lang, seed_number, lego_index)
);

-- Shared phrase bank — target-language text only
CREATE TABLE IF NOT EXISTS target_phrases (
  id TEXT PRIMARY KEY,                    -- 'eng:S0001L01B02'
  target_lang TEXT NOT NULL,
  seed_number INTEGER NOT NULL,
  lego_index INTEGER NOT NULL,
  position INTEGER NOT NULL,
  target_text TEXT NOT NULL,
  word_count INTEGER,
  phrase_role TEXT NOT NULL CHECK (phrase_role IN ('component', 'build', 'use')),
  connected_lego_ids TEXT[],
  lego_position TEXT,
  metadata JSONB,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_lang, seed_number, lego_index, position)
);

-- Target-language audio (shared across courses)
CREATE TABLE IF NOT EXISTS target_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_lang TEXT NOT NULL,
  text TEXT NOT NULL,
  text_normalized TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('target1', 'target2')),
  voice_id TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('tts', 'human')),
  s3_key TEXT NOT NULL,
  duration_ms INTEGER,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_lang, text_normalized, role, voice_id)
);

-- ── FK columns on existing tables ─────────────────────────────────────

-- Link course_legos to canonical target_legos
ALTER TABLE course_legos
  ADD COLUMN IF NOT EXISTS target_lego_id TEXT REFERENCES target_legos(id);

-- Link course_practice_phrases to shared target_phrases
ALTER TABLE course_practice_phrases
  ADD COLUMN IF NOT EXISTS target_phrase_id TEXT REFERENCES target_phrases(id);

-- ── Indexes ───────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_target_legos_lang_seed
  ON target_legos(target_lang, seed_number);

CREATE INDEX IF NOT EXISTS idx_target_phrases_lang_seed
  ON target_phrases(target_lang, seed_number);

CREATE INDEX IF NOT EXISTS idx_target_phrases_lego
  ON target_phrases(target_lang, seed_number, lego_index);

CREATE INDEX IF NOT EXISTS idx_target_audio_lookup
  ON target_audio(target_lang, text_normalized, role);

CREATE INDEX IF NOT EXISTS idx_course_legos_target_lego_id
  ON course_legos(target_lego_id);

CREATE INDEX IF NOT EXISTS idx_course_phrases_target_phrase_id
  ON course_practice_phrases(target_phrase_id);

-- ── Compatibility view ────────────────────────────────────────────────
-- Existing code reads from this view with zero changes.
-- COALESCE ensures old courses (without target_phrase_id) still work.

CREATE OR REPLACE VIEW course_phrases_unified AS
SELECT
  cpp.id,
  cpp.course_code,
  cpp.seed_number,
  cpp.lego_index,
  cpp.position,
  cpp.known_text,
  COALESCE(tp.target_text, cpp.target_text) AS target_text,
  COALESCE(tp.word_count, cpp.word_count) AS word_count,
  cpp.phrase_role,
  COALESCE(tp.connected_lego_ids, cpp.connected_lego_ids) AS connected_lego_ids,
  COALESCE(tp.lego_position, cpp.lego_position) AS lego_position,
  COALESCE(tp.metadata, cpp.metadata) AS metadata,
  cpp.status,
  cpp.target_phrase_id
FROM course_practice_phrases cpp
LEFT JOIN target_phrases tp ON cpp.target_phrase_id = tp.id;
