-- =============================================================================
-- SSi Course Structure Schema
-- =============================================================================
-- Database-first architecture for course content management.
-- Replaces JSON files (lego_pairs.json, lego_baskets.json) as source of truth.
-- The manifest becomes a VIEW of this data, not a separate artifact.
--
-- Existing tables (already in Supabase):
--   - courses (course metadata, voice assignments)
--   - audio_samples (generated audio with UUIDs)
--   - course_audio_usage (which courses use which audio)
--   - voices (TTS and human voice registry)
--   - sample_flags (QA workflow)
--   - recording_provenance (human recording metadata)
--
-- New tables (this migration):
--   - seeds (seed sentences - the teaching units)
--   - legos (LEGO pieces extracted from seeds)
--   - lego_components (M-type LEGO building blocks)
--   - baskets (practice phrases for each LEGO)
--   - nodes (text pairs: known + target)
--   - encouragements (pooled and ordered)
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SEEDS
-- A seed is a complete sentence that teaches vocabulary through context.
-- Each seed contains multiple LEGOs (the "new" pieces to learn).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,

    -- Seed identification
    seed_number INTEGER NOT NULL,  -- e.g., 42 for "s0042"
    seed_id TEXT GENERATED ALWAYS AS ('s' || lpad(seed_number::text, 4, '0')) STORED,

    -- The seed sentence pair
    known_text TEXT NOT NULL,      -- English: "I want to learn Spanish"
    target_text TEXT NOT NULL,     -- Spanish: "Quiero aprender español"
    canonical TEXT NOT NULL,       -- Canonical form (usually = known_text)

    -- Metadata
    position INTEGER NOT NULL,     -- Order within course
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(course_code, seed_number)
);

CREATE INDEX idx_seeds_course ON seeds(course_code);
CREATE INDEX idx_seeds_position ON seeds(course_code, position);

-- -----------------------------------------------------------------------------
-- LEGOS
-- A LEGO is a reusable piece of language extracted from a seed.
-- Types: A (Atomic - single word), M (Molecular - multi-word phrase)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seed_id UUID NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,

    -- LEGO identification
    lego_index INTEGER NOT NULL,   -- Position within seed (1, 2, 3...)
    lego_id TEXT,                  -- Original ID from JSON (e.g., "lego_s0042_001")

    -- The LEGO pair
    known_text TEXT NOT NULL,      -- English: "want"
    target_text TEXT NOT NULL,     -- Spanish: "quiero"

    -- Type and status
    type CHAR(1) NOT NULL DEFAULT 'A' CHECK (type IN ('A', 'M')),  -- Atomic or Molecular
    is_new BOOLEAN NOT NULL DEFAULT true,  -- First introduction in course?

    -- Position in introduction sequence
    position INTEGER NOT NULL,     -- Order within seed's introduction_items

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(seed_id, lego_index)
);

CREATE INDEX idx_legos_seed ON legos(seed_id);
CREATE INDEX idx_legos_is_new ON legos(is_new) WHERE is_new = true;

-- -----------------------------------------------------------------------------
-- LEGO_COMPONENTS
-- For M-type LEGOs, the building blocks that make up the phrase.
-- E.g., "quiero aprender" might have components: "quiero", "aprender"
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lego_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lego_id UUID NOT NULL REFERENCES legos(id) ON DELETE CASCADE,

    -- Component position and text
    position INTEGER NOT NULL,     -- Order within LEGO
    known_text TEXT NOT NULL,
    target_text TEXT NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(lego_id, position)
);

CREATE INDEX idx_components_lego ON lego_components(lego_id);

-- -----------------------------------------------------------------------------
-- BASKETS
-- Practice phrases for each LEGO - the "debut" and reinforcement sentences.
-- These are the nodes[] array in introduction_items.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS basket_phrases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lego_id UUID NOT NULL REFERENCES legos(id) ON DELETE CASCADE,

    -- Phrase content
    known_text TEXT NOT NULL,
    target_text TEXT NOT NULL,

    -- Classification
    phrase_type TEXT NOT NULL DEFAULT 'practice'
        CHECK (phrase_type IN ('component', 'debut', 'practice')),
    position INTEGER NOT NULL,     -- Order within basket

    -- Flags
    is_debut BOOLEAN DEFAULT false,      -- First appearance of LEGO in full
    is_component BOOLEAN DEFAULT false,  -- Building block phrase

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(lego_id, position)
);

CREATE INDEX idx_basket_lego ON basket_phrases(lego_id);
CREATE INDEX idx_basket_type ON basket_phrases(phrase_type);

-- -----------------------------------------------------------------------------
-- ENCOURAGEMENTS
-- Motivational phrases (English) played during learning.
-- Two types: pooled (random) and ordered (sequential).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS encouragements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    text TEXT NOT NULL UNIQUE,

    -- Classification
    pool_type TEXT NOT NULL CHECK (pool_type IN ('pooled', 'ordered')),
    position INTEGER,              -- For ordered encouragements

    -- Language (usually 'eng' for English encouragements)
    lang TEXT NOT NULL DEFAULT 'eng',

    -- Link to audio (TEXT to match audio_samples.uuid type)
    audio_uuid TEXT REFERENCES audio_samples(uuid),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_encouragements_pool ON encouragements(pool_type);
CREATE INDEX idx_encouragements_lang ON encouragements(lang);

-- -----------------------------------------------------------------------------
-- COURSE_ENCOURAGEMENTS
-- Links courses to encouragements (many-to-many).
-- Allows different courses to use different encouragement sets.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_encouragements (
    course_code TEXT NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
    encouragement_id UUID NOT NULL REFERENCES encouragements(id) ON DELETE CASCADE,

    PRIMARY KEY (course_code, encouragement_id)
);

-- -----------------------------------------------------------------------------
-- PRESENTATION_TEMPLATES
-- Templates for generating presentation text.
-- E.g., "The {target_lang} for '{known}', is: ... '{target}' ... '{target}'"
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS presentation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template
    template TEXT NOT NULL,

    -- Which language pair this applies to
    known_lang TEXT,               -- NULL = all
    target_lang TEXT,              -- NULL = all

    -- Priority (higher = preferred)
    priority INTEGER DEFAULT 0,

    -- Active
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT now()
);

-- Default template
INSERT INTO presentation_templates (template, priority, is_active)
VALUES ('The {target_lang_name} for ''{known}'', is: ... ''{target}'' ... ''{target}''', 0, true)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- VIEWS
-- -----------------------------------------------------------------------------

-- Course summary view
CREATE OR REPLACE VIEW course_summary AS
SELECT
    c.course_code,
    c.known_lang,
    c.target_lang,
    COUNT(DISTINCT s.id) as seed_count,
    COUNT(DISTINCT l.id) as lego_count,
    COUNT(DISTINCT l.id) FILTER (WHERE l.is_new = true) as new_lego_count,
    COUNT(DISTINCT bp.id) as basket_phrase_count
FROM courses c
LEFT JOIN seeds s ON s.course_code = c.course_code
LEFT JOIN legos l ON l.seed_id = s.id
LEFT JOIN basket_phrases bp ON bp.lego_id = l.id
GROUP BY c.course_code, c.known_lang, c.target_lang;

-- Seed with LEGOs view (useful for manifest generation)
CREATE OR REPLACE VIEW seed_with_legos AS
SELECT
    s.id as seed_uuid,
    s.course_code,
    s.seed_id,
    s.seed_number,
    s.known_text as seed_known,
    s.target_text as seed_target,
    s.canonical,
    s.position as seed_position,
    l.id as lego_uuid,
    l.lego_index,
    l.known_text as lego_known,
    l.target_text as lego_target,
    l.type as lego_type,
    l.is_new,
    l.position as lego_position
FROM seeds s
JOIN legos l ON l.seed_id = s.id
WHERE s.is_active = true
ORDER BY s.position, l.position;

-- -----------------------------------------------------------------------------
-- FUNCTIONS
-- -----------------------------------------------------------------------------

-- Generate node ID (matches uuid-v11.cjs format)
CREATE OR REPLACE FUNCTION generate_node_id(
    seed_id TEXT,
    lego_index TEXT,
    known_text TEXT,
    target_text TEXT
) RETURNS TEXT AS $$
DECLARE
    hash_input TEXT;
    hash_result TEXT;
BEGIN
    hash_input := seed_id || ':' || lego_index || ':' || known_text || ':' || target_text;
    hash_result := encode(sha256(hash_input::bytea), 'hex');
    RETURN upper(seed_id) || upper(lego_index) || '-LEGO-0000-' || upper(substring(hash_result, 1, 12));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS seeds_updated_at ON seeds;
CREATE TRIGGER seeds_updated_at
    BEFORE UPDATE ON seeds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS legos_updated_at ON legos;
CREATE TRIGGER legos_updated_at
    BEFORE UPDATE ON legos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (optional - for multi-tenant)
-- -----------------------------------------------------------------------------
-- Uncomment if you want RLS policies

-- ALTER TABLE seeds ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE legos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE basket_phrases ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- COMMENTS
-- -----------------------------------------------------------------------------
COMMENT ON TABLE seeds IS 'Seed sentences - the teaching units containing LEGOs';
COMMENT ON TABLE legos IS 'LEGO pieces - reusable language chunks extracted from seeds';
COMMENT ON TABLE lego_components IS 'Building blocks for M-type (molecular) LEGOs';
COMMENT ON TABLE basket_phrases IS 'Practice phrases for each LEGO';
COMMENT ON TABLE encouragements IS 'Motivational phrases played during learning';
COMMENT ON TABLE presentation_templates IS 'Templates for generating LEGO presentation text';

COMMENT ON COLUMN seeds.seed_number IS 'Numeric ID (42 becomes seed_id "s0042")';
COMMENT ON COLUMN seeds.canonical IS 'Canonical form of seed sentence (usually = known_text)';
COMMENT ON COLUMN legos.is_new IS 'true = first introduction in course, false = already seen';
COMMENT ON COLUMN legos.type IS 'A = Atomic (single word), M = Molecular (multi-word)';
COMMENT ON COLUMN basket_phrases.phrase_type IS 'component/debut/practice - order in basket cycle';
