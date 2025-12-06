-- =============================================================================
-- SSI Course Production Suite - Supabase Schema v2
-- Version: 2.0.0
-- Date: 2025-12-05
--
-- EXTENDS v1.1.0 with tables needed for:
-- 1. Learning app to work WITHOUT manifest files
-- 2. Dynamic content assembly from Supabase
-- 3. Learner progress tracking
-- 4. Canonical content (welcomes, encouragements)
-- 5. On-demand content generation by agents
--
-- Run AFTER supabase-schema.sql (v1.1.0)
-- =============================================================================

-- =============================================================================
-- CANONICAL CONTENT: Welcomes, Encouragements
-- These are shared across courses and maintained centrally
-- =============================================================================

-- Course welcomes (one per course)
CREATE TABLE IF NOT EXISTS canonical_welcomes (
  course_code TEXT PRIMARY KEY,

  -- Welcome content
  text TEXT NOT NULL,                 -- Full welcome text
  text_short TEXT,                    -- Optional short version

  -- Audio reference (links to audio_samples)
  audio_uuid TEXT REFERENCES audio_samples(uuid),

  -- Voice used
  voice_id TEXT REFERENCES voices(voice_id),

  -- Metadata
  language TEXT NOT NULL,             -- eng, spa (language welcome is spoken in)
  version TEXT DEFAULT '1.0.0',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Encouragements (shared pool)
CREATE TABLE IF NOT EXISTS canonical_encouragements (
  id SERIAL PRIMARY KEY,

  -- Content
  text TEXT NOT NULL UNIQUE,          -- Encouragement text

  -- Classification
  type TEXT NOT NULL,                 -- pooled, ordered
  order_position INTEGER,             -- For ordered encouragements (1, 2, 3...)

  -- Audio reference
  audio_uuid TEXT REFERENCES audio_samples(uuid),
  voice_id TEXT REFERENCES voices(voice_id),

  -- Language (typically English for English-known courses)
  language TEXT NOT NULL DEFAULT 'eng',

  -- Tags for filtering/selection
  tags TEXT[],                        -- {brain_science, motivation, technique}

  -- When to use (for future adaptive selection)
  min_seeds_completed INTEGER,        -- Don't play until learner has done N seeds
  max_plays INTEGER,                  -- Max times to play this encouragement

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordered encouragements
CREATE INDEX IF NOT EXISTS idx_encouragements_ordered
  ON canonical_encouragements(type, order_position)
  WHERE type = 'ordered';

-- =============================================================================
-- SEEDS: The sentences that form the course backbone
-- =============================================================================
CREATE TABLE IF NOT EXISTS seeds (
  -- Primary key: structured ID like S0042
  seed_id TEXT PRIMARY KEY,           -- S0001, S0042, etc.

  -- Course this seed belongs to
  course_code TEXT NOT NULL REFERENCES courses(course_code),

  -- The seed sentence pair
  known_text TEXT NOT NULL,           -- "I want to speak Spanish with you now."
  target_text TEXT NOT NULL,          -- "Quiero hablar español contigo ahora."

  -- Position in course
  sequence_number INTEGER NOT NULL,   -- 1, 2, 3... (ordering within course)
  slice_id TEXT DEFAULT 'main',       -- For future: multiple slices per course

  -- Node ID for manifest compatibility
  node_id TEXT,                       -- S0001000-SEED-0000-{hash}

  -- Audio references
  known_audio_uuid TEXT REFERENCES audio_samples(uuid),
  target_audio_uuid TEXT REFERENCES audio_samples(uuid),

  -- Metadata
  canonical_text TEXT,                -- Original English (if different from known)
  notes TEXT,                         -- Production notes

  -- Status
  status TEXT DEFAULT 'active',       -- active, deprecated, draft

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(course_code, sequence_number)
);

-- Index for course lookups
CREATE INDEX IF NOT EXISTS idx_seeds_by_course ON seeds(course_code, sequence_number);

-- =============================================================================
-- LEGOS: The reusable language building blocks
-- =============================================================================
CREATE TABLE IF NOT EXISTS legos (
  -- Primary key: structured ID like S0042L01
  lego_id TEXT PRIMARY KEY,           -- S0001L01, S0042L03, etc.

  -- Parent seed
  seed_id TEXT NOT NULL REFERENCES seeds(seed_id),
  course_code TEXT NOT NULL REFERENCES courses(course_code),

  -- LEGO content
  known_text TEXT NOT NULL,           -- "I want"
  target_text TEXT NOT NULL,          -- "quiero"

  -- Type and classification
  type TEXT NOT NULL,                 -- A (Atomic), M (Molecular)
  lego_index INTEGER NOT NULL,        -- Position within seed (1, 2, 3...)

  -- Is this a new introduction or review?
  is_new BOOLEAN NOT NULL DEFAULT TRUE,  -- true = needs introduction_item

  -- Node ID for manifest compatibility
  node_id TEXT,                       -- S0042L01-LEGO-0000-{hash}

  -- Audio references
  known_audio_uuid TEXT REFERENCES audio_samples(uuid),
  target_audio_uuid TEXT REFERENCES audio_samples(uuid),
  presentation_audio_uuid TEXT REFERENCES audio_samples(uuid),

  -- Presentation text (TTS speaks this)
  presentation_text TEXT,             -- "The Spanish for 'I want', is: ... 'quiero' ... 'quiero'"

  -- For M-type: reference to component LEGOs
  -- (Components are stored as separate LEGO rows, linked via parent_lego_id)
  parent_lego_id TEXT REFERENCES legos(lego_id),
  is_component BOOLEAN DEFAULT FALSE,
  component_order INTEGER,            -- Order within parent M-type LEGO

  -- Metadata
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'active',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(seed_id, lego_index)
);

-- Index for seed lookups
CREATE INDEX IF NOT EXISTS idx_legos_by_seed ON legos(seed_id, lego_index);

-- Index for course lookups
CREATE INDEX IF NOT EXISTS idx_legos_by_course ON legos(course_code);

-- Index for finding components of M-type LEGOs
CREATE INDEX IF NOT EXISTS idx_legos_components ON legos(parent_lego_id) WHERE parent_lego_id IS NOT NULL;

-- =============================================================================
-- PRACTICE PHRASES: The baskets of practice content
-- Replaces lego_baskets.json
-- =============================================================================
CREATE TABLE IF NOT EXISTS practice_phrases (
  -- Primary key: structured ID like S0042L01-DEBU-0001
  phrase_id TEXT PRIMARY KEY,

  -- Parent LEGO
  lego_id TEXT NOT NULL REFERENCES legos(lego_id),
  course_code TEXT NOT NULL REFERENCES courses(course_code),

  -- Phrase content
  known_text TEXT NOT NULL,           -- "I want water"
  target_text TEXT NOT NULL,          -- "quiero agua"

  -- Classification (v11 types)
  phrase_type TEXT NOT NULL,          -- COMP, LEGO, DEBU, ETER

  -- Ordering within type
  phrase_order INTEGER NOT NULL,      -- 1, 2, 3... within type

  -- Node ID for manifest compatibility
  node_id TEXT,                       -- S0042L01-DEBU-0001-{hash}

  -- Audio references
  known_audio_uuid TEXT REFERENCES audio_samples(uuid),
  target1_audio_uuid TEXT REFERENCES audio_samples(uuid),
  target2_audio_uuid TEXT REFERENCES audio_samples(uuid),

  -- Metadata
  word_count INTEGER,                 -- For sorting by complexity
  notes TEXT,

  -- For adaptive learning
  difficulty_rating REAL,             -- 0.0-1.0, can be updated based on learner performance
  times_practiced INTEGER DEFAULT 0,  -- Aggregate across all learners
  success_rate REAL,                  -- Aggregate success rate

  -- Status
  status TEXT DEFAULT 'active',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lego_id, phrase_type, phrase_order)
);

-- Index for LEGO lookups
CREATE INDEX IF NOT EXISTS idx_phrases_by_lego ON practice_phrases(lego_id, phrase_type, phrase_order);

-- Index for course lookups
CREATE INDEX IF NOT EXISTS idx_phrases_by_course ON practice_phrases(course_code);

-- Index for finding ETER phrases (for practice selection)
CREATE INDEX IF NOT EXISTS idx_phrases_eter ON practice_phrases(lego_id) WHERE phrase_type = 'ETER';

-- =============================================================================
-- LEARNER PROGRESS: Track individual learner state
-- =============================================================================
CREATE TABLE IF NOT EXISTS learners (
  learner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identity (nullable for anonymous learners)
  user_id UUID,                       -- Supabase auth user ID
  email TEXT,
  display_name TEXT,

  -- School/class affiliation (for schools version)
  school_id UUID,
  class_id UUID,

  -- Preferences
  preferred_voice_ids JSONB,          -- {source: "...", target1: "...", target2: "..."}

  -- Aggregate stats
  total_practice_time_ms BIGINT DEFAULT 0,
  total_items_practiced INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- LEARNER COURSE PROGRESS: Progress per course
-- =============================================================================
CREATE TABLE IF NOT EXISTS learner_course_progress (
  id SERIAL PRIMARY KEY,

  learner_id UUID NOT NULL REFERENCES learners(learner_id),
  course_code TEXT NOT NULL REFERENCES courses(course_code),

  -- Overall progress
  seeds_completed INTEGER DEFAULT 0,
  seeds_total INTEGER,                -- Cached from course

  -- Belt system (8 belts)
  current_belt TEXT DEFAULT 'white',  -- white, yellow, orange, green, blue, purple, brown, black
  belt_progress REAL DEFAULT 0.0,     -- Progress within current belt (0.0-1.0)

  -- Current position
  current_seed_id TEXT REFERENCES seeds(seed_id),
  current_lego_id TEXT REFERENCES legos(lego_id),

  -- Triple Helix state
  helix_state JSONB,                  -- {thread1: {...}, thread2: {...}, thread3: {...}}

  -- Session stats
  total_practice_time_ms BIGINT DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  last_session_at TIMESTAMPTZ,

  -- Streak tracking
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_practice_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(learner_id, course_code)
);

-- Index for learner lookups
CREATE INDEX IF NOT EXISTS idx_progress_by_learner ON learner_course_progress(learner_id);

-- =============================================================================
-- LEARNER LEGO PROGRESS: Spaced repetition state per LEGO
-- =============================================================================
CREATE TABLE IF NOT EXISTS learner_lego_progress (
  id SERIAL PRIMARY KEY,

  learner_id UUID NOT NULL REFERENCES learners(learner_id),
  lego_id TEXT NOT NULL REFERENCES legos(lego_id),

  -- Spaced repetition state
  skip_number INTEGER DEFAULT 1,      -- Fibonacci: 1, 1, 2, 3, 5, 8, 13...
  next_review_at TIMESTAMPTZ,         -- When this LEGO should be reviewed

  -- Is this LEGO "eternal" (graduated from intro to permanent practice)?
  is_eternal BOOLEAN DEFAULT FALSE,
  graduated_at TIMESTAMPTZ,

  -- Performance stats
  times_practiced INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  average_latency_ms INTEGER,         -- Average response time
  last_practiced_at TIMESTAMPTZ,

  -- Adaptation data
  spike_count INTEGER DEFAULT 0,      -- Times learner hesitated/struggled

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(learner_id, lego_id)
);

-- Index for finding LEGOs due for review
CREATE INDEX IF NOT EXISTS idx_lego_progress_review
  ON learner_lego_progress(learner_id, next_review_at);

-- Index for finding eternal LEGOs (for ETER phrase selection)
CREATE INDEX IF NOT EXISTS idx_lego_progress_eternal
  ON learner_lego_progress(learner_id)
  WHERE is_eternal = TRUE;

-- =============================================================================
-- LEARNER SESSIONS: Individual practice sessions
-- =============================================================================
CREATE TABLE IF NOT EXISTS learner_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  learner_id UUID NOT NULL REFERENCES learners(learner_id),
  course_code TEXT NOT NULL REFERENCES courses(course_code),

  -- Session timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- What was practiced
  items_practiced INTEGER DEFAULT 0,
  seeds_touched TEXT[],               -- Array of seed_ids
  legos_touched TEXT[],               -- Array of lego_ids

  -- Session type
  session_type TEXT DEFAULT 'practice',  -- practice, review, introduction

  -- Device info (for debugging/analytics)
  device_type TEXT,                   -- web, ios, android
  app_version TEXT,

  -- State snapshot (for resume capability)
  state_snapshot JSONB,               -- Full session state for resume

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for learner session history
CREATE INDEX IF NOT EXISTS idx_sessions_by_learner
  ON learner_sessions(learner_id, started_at DESC);

-- =============================================================================
-- AGENT GENERATED CONTENT: Track content created by agents on-demand
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_generated_content (
  id SERIAL PRIMARY KEY,

  -- What was generated
  content_type TEXT NOT NULL,         -- practice_phrase, basket, translation
  course_code TEXT NOT NULL REFERENCES courses(course_code),

  -- Reference to generated item
  reference_id TEXT,                  -- lego_id, phrase_id, etc.
  reference_table TEXT,               -- legos, practice_phrases, etc.

  -- Generation context
  prompt_used TEXT,                   -- The prompt given to the agent
  agent_model TEXT,                   -- claude-3-opus, etc.

  -- Quality tracking
  human_reviewed BOOLEAN DEFAULT FALSE,
  approved BOOLEAN,
  reviewer_notes TEXT,

  -- For learning which generations work well
  learner_success_rate REAL,          -- Aggregate from learner performance

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding unreviewed content
CREATE INDEX IF NOT EXISTS idx_agent_content_unreviewed
  ON agent_generated_content(course_code)
  WHERE human_reviewed = FALSE;

-- =============================================================================
-- VIEWS: Convenient access patterns
-- =============================================================================

-- View: Complete LEGO with all its phrases
CREATE OR REPLACE VIEW lego_with_phrases AS
SELECT
  l.*,
  json_agg(
    json_build_object(
      'phrase_id', p.phrase_id,
      'phrase_type', p.phrase_type,
      'phrase_order', p.phrase_order,
      'known_text', p.known_text,
      'target_text', p.target_text,
      'node_id', p.node_id
    ) ORDER BY
      CASE p.phrase_type
        WHEN 'COMP' THEN 1
        WHEN 'LEGO' THEN 2
        WHEN 'DEBU' THEN 3
        WHEN 'ETER' THEN 4
      END,
      p.phrase_order
  ) FILTER (WHERE p.phrase_id IS NOT NULL) AS phrases
FROM legos l
LEFT JOIN practice_phrases p ON p.lego_id = l.lego_id
GROUP BY l.lego_id;

-- View: Seed with all its LEGOs
CREATE OR REPLACE VIEW seed_with_legos AS
SELECT
  s.*,
  json_agg(
    json_build_object(
      'lego_id', l.lego_id,
      'lego_index', l.lego_index,
      'type', l.type,
      'is_new', l.is_new,
      'known_text', l.known_text,
      'target_text', l.target_text,
      'node_id', l.node_id,
      'presentation_text', l.presentation_text
    ) ORDER BY l.lego_index
  ) FILTER (WHERE l.lego_id IS NOT NULL) AS legos
FROM seeds s
LEFT JOIN legos l ON l.seed_id = s.seed_id AND l.is_component = FALSE
GROUP BY s.seed_id;

-- View: Learner's next items to practice (for app)
CREATE OR REPLACE VIEW learner_next_items AS
SELECT
  lcp.learner_id,
  lcp.course_code,
  llp.lego_id,
  l.seed_id,
  l.known_text,
  l.target_text,
  llp.skip_number,
  llp.next_review_at,
  llp.is_eternal,
  CASE
    WHEN llp.next_review_at IS NULL THEN 0
    WHEN llp.next_review_at <= NOW() THEN 1
    ELSE 2
  END AS priority  -- 0 = new, 1 = due for review, 2 = not yet due
FROM learner_course_progress lcp
JOIN learner_lego_progress llp ON llp.learner_id = lcp.learner_id
JOIN legos l ON l.lego_id = llp.lego_id AND l.course_code = lcp.course_code
ORDER BY priority, llp.next_review_at NULLS FIRST;

-- =============================================================================
-- FUNCTIONS: Update triggers
-- =============================================================================

-- Apply update triggers to new tables
DROP TRIGGER IF EXISTS update_canonical_welcomes_updated_at ON canonical_welcomes;
CREATE TRIGGER update_canonical_welcomes_updated_at
  BEFORE UPDATE ON canonical_welcomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_canonical_encouragements_updated_at ON canonical_encouragements;
CREATE TRIGGER update_canonical_encouragements_updated_at
  BEFORE UPDATE ON canonical_encouragements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_seeds_updated_at ON seeds;
CREATE TRIGGER update_seeds_updated_at
  BEFORE UPDATE ON seeds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_legos_updated_at ON legos;
CREATE TRIGGER update_legos_updated_at
  BEFORE UPDATE ON legos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_practice_phrases_updated_at ON practice_phrases;
CREATE TRIGGER update_practice_phrases_updated_at
  BEFORE UPDATE ON practice_phrases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_learners_updated_at ON learners;
CREATE TRIGGER update_learners_updated_at
  BEFORE UPDATE ON learners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_learner_course_progress_updated_at ON learner_course_progress;
CREATE TRIGGER update_learner_course_progress_updated_at
  BEFORE UPDATE ON learner_course_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_learner_lego_progress_updated_at ON learner_lego_progress;
CREATE TRIGGER update_learner_lego_progress_updated_at
  BEFORE UPDATE ON learner_lego_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE canonical_welcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_encouragements ENABLE ROW LEVEL SECURITY;
ALTER TABLE seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE legos ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_lego_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_generated_content ENABLE ROW LEVEL SECURITY;

-- Public read access to course content
CREATE POLICY "Public read canonical_welcomes" ON canonical_welcomes
  FOR SELECT USING (true);

CREATE POLICY "Public read canonical_encouragements" ON canonical_encouragements
  FOR SELECT USING (true);

CREATE POLICY "Public read seeds" ON seeds
  FOR SELECT USING (true);

CREATE POLICY "Public read legos" ON legos
  FOR SELECT USING (true);

CREATE POLICY "Public read practice_phrases" ON practice_phrases
  FOR SELECT USING (true);

-- Learner data: users can only access their own
CREATE POLICY "Learners own data" ON learners
  FOR ALL USING (
    user_id = auth.uid() OR
    auth.role() = 'authenticated'  -- Temp: allow all authenticated for admin
  );

CREATE POLICY "Learner progress own data" ON learner_course_progress
  FOR ALL USING (
    learner_id IN (SELECT learner_id FROM learners WHERE user_id = auth.uid()) OR
    auth.role() = 'authenticated'
  );

CREATE POLICY "Learner LEGO progress own data" ON learner_lego_progress
  FOR ALL USING (
    learner_id IN (SELECT learner_id FROM learners WHERE user_id = auth.uid()) OR
    auth.role() = 'authenticated'
  );

CREATE POLICY "Learner sessions own data" ON learner_sessions
  FOR ALL USING (
    learner_id IN (SELECT learner_id FROM learners WHERE user_id = auth.uid()) OR
    auth.role() = 'authenticated'
  );

-- Agent content: authenticated write, public read
CREATE POLICY "Public read agent content" ON agent_generated_content
  FOR SELECT USING (true);

CREATE POLICY "Authenticated write agent content" ON agent_generated_content
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- REALTIME: Enable for tables that need live updates
-- =============================================================================

-- Enable realtime for learner progress (for dashboards)
ALTER PUBLICATION supabase_realtime ADD TABLE learner_course_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE learner_sessions;

-- =============================================================================
-- MIGRATION HELPER: Import from lego_pairs.json / lego_baskets.json
-- This function can be called to populate Supabase from existing JSON files
-- =============================================================================

-- Note: This would be a Node.js script, not SQL
-- See: scripts/migrate-to-supabase.cjs

-- =============================================================================
-- Done! Schema v2 extends v1.1.0 for full learning app support
-- =============================================================================

COMMENT ON TABLE seeds IS 'Course backbone sentences - replaces manifest seeds';
COMMENT ON TABLE legos IS 'Reusable language building blocks - replaces manifest introduction_items';
COMMENT ON TABLE practice_phrases IS 'Practice content per LEGO - replaces lego_baskets.json';
COMMENT ON TABLE learners IS 'Individual learner profiles';
COMMENT ON TABLE learner_course_progress IS 'Per-course progress tracking';
COMMENT ON TABLE learner_lego_progress IS 'Spaced repetition state per LEGO';
COMMENT ON TABLE canonical_welcomes IS 'Course welcome audio - one per course';
COMMENT ON TABLE canonical_encouragements IS 'Pooled and ordered encouragements';
COMMENT ON TABLE agent_generated_content IS 'Track content generated by AI agents';
