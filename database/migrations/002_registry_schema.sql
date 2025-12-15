-- =============================================================================
-- Migration 002: Registry Schema
-- =============================================================================
-- Purpose: Create database schema based on SSi Variable Registry v1.1.0
-- Date: 2025-12-15
-- Source: /Users/tomcassidy/SSi/ssi-learning-app/apml/core/ssi-variable-registry.apml
--
-- Key Architectural Decisions:
--   1. phrase_type is NOT stored in database - it's computed at runtime
--   2. We store word_count and lego_count instead for classification
--   3. All content tables have version + updated_at for delta sync
--   4. All content tables have release_batch for staged rollout
--   5. Denormalized course_code, seed_number, lego_index for performance
--   6. Database enforces STRUCTURE (FKs, uniqueness), NOT business rules
--      (Per APML Design Principles: validation belongs in import/app layer)
--
-- Tables Created:
--   - courses (course configuration)
--   - course_seeds (seed sentences)
--   - course_legos (LEGO building blocks)
--   - course_practice_phrases (practice phrases with word_count/lego_count)
-- =============================================================================

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

-- Content lifecycle status
CREATE TYPE content_status AS ENUM ('draft', 'released', 'deprecated');

-- LEGO classification
CREATE TYPE lego_type AS ENUM ('A', 'M');

-- NOTE: phrase_type enum NOT created - it's a runtime classification
-- The app will compute phrase_type based on word_count, lego_count, and position

COMMENT ON TYPE content_status IS 'Lifecycle status: draft (in development), released (live), deprecated (superseded)';
COMMENT ON TYPE lego_type IS 'LEGO classification: A (Atomic - single unit), M (Molecular - multi-word)';

-- =============================================================================
-- TABLE: courses
-- =============================================================================
-- Based on registry entity: Course
-- Primary key: course_code
-- =============================================================================

CREATE TABLE courses (
    -- Primary identifier
    course_code TEXT PRIMARY KEY,

    -- Language configuration
    known_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    display_name TEXT,

    -- Voice configuration
    known_voice TEXT NOT NULL,
    target_voice_1 TEXT NOT NULL,
    target_voice_2 TEXT NOT NULL,
    presentation_voice TEXT,

    -- Lifecycle
    status content_status NOT NULL DEFAULT 'draft',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- NOTE: No course_code format constraint - validation belongs in import layer
    -- (Regex constraints removed per design principle: "Database enforces structure, not business rules")
);

-- Indexes
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_languages ON courses(known_lang, target_lang);

-- Comments
COMMENT ON TABLE courses IS 'Course configuration with language and voice settings';
COMMENT ON COLUMN courses.course_code IS 'Format: {target_lang}_for_{known_lang} (e.g., spa_for_eng)';
COMMENT ON COLUMN courses.known_lang IS 'ISO 639-3 code for known language';
COMMENT ON COLUMN courses.target_lang IS 'ISO 639-3 code for target language';
COMMENT ON COLUMN courses.presentation_voice IS 'Voice for presentation audio (defaults to known_voice if not set)';

-- =============================================================================
-- TABLE: course_seeds
-- =============================================================================
-- Based on registry entity: CourseSeed
-- Primary key: id (UUID)
-- Unique constraint: (course_code, seed_number)
-- =============================================================================

CREATE TABLE course_seeds (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Course reference
    course_code TEXT NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,

    -- Seed identification
    seed_number INTEGER NOT NULL CHECK (seed_number > 0),
    seed_id TEXT GENERATED ALWAYS AS ('S' || lpad(seed_number::text, 4, '0')) STORED,

    -- Content
    known_text TEXT NOT NULL,
    target_text TEXT NOT NULL,

    -- Lifecycle and versioning
    status content_status NOT NULL DEFAULT 'draft',
    release_batch INTEGER,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    UNIQUE(course_code, seed_number)
);

-- Indexes
CREATE INDEX idx_course_seeds_course ON course_seeds(course_code);
CREATE INDEX idx_course_seeds_sync ON course_seeds(course_code, updated_at);
CREATE INDEX idx_course_seeds_status ON course_seeds(course_code, status);
CREATE INDEX idx_course_seeds_release_batch ON course_seeds(release_batch) WHERE release_batch IS NOT NULL;

-- Comments
COMMENT ON TABLE course_seeds IS 'Seed sentences - complete teaching units containing LEGOs';
COMMENT ON COLUMN course_seeds.seed_number IS 'Position in learning sequence (1-668+)';
COMMENT ON COLUMN course_seeds.seed_id IS 'Human-readable identifier (e.g., S0001)';
COMMENT ON COLUMN course_seeds.release_batch IS 'Staged rollout batch number (1, 2, 3...)';
COMMENT ON COLUMN course_seeds.version IS 'Increments on each edit for delta sync';

-- =============================================================================
-- TABLE: course_legos
-- =============================================================================
-- Based on registry entity: CourseLego
-- Primary key: id (UUID)
-- Unique constraint: (course_code, seed_number, lego_index)
-- =============================================================================

CREATE TABLE course_legos (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Course reference (denormalized for performance)
    course_code TEXT NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,

    -- Parent seed reference (denormalized)
    seed_number INTEGER NOT NULL CHECK (seed_number > 0),

    -- LEGO identification
    lego_index INTEGER NOT NULL CHECK (lego_index > 0 AND lego_index < 100),
    lego_id TEXT GENERATED ALWAYS AS ('S' || lpad(seed_number::text, 4, '0') || 'L' || lpad(lego_index::text, 2, '0')) STORED,

    -- LEGO classification
    type lego_type NOT NULL,
    is_new BOOLEAN NOT NULL,

    -- Content
    known_text TEXT NOT NULL,
    target_text TEXT NOT NULL,

    -- Components (for M-type LEGOs only)
    -- Format: [{"known": "I", "target": "yo"}, {"known": "want", "target": "quiero"}]
    components JSONB,

    -- Lifecycle and versioning
    status content_status NOT NULL DEFAULT 'draft',
    release_batch INTEGER,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    UNIQUE(course_code, seed_number, lego_index)
    -- NOTE: No "M-type needs components" check - validation belongs in import layer
    -- (Business rule constraints removed per design principle: "Database enforces structure, not business rules")
);

-- Indexes
CREATE INDEX idx_course_legos_course ON course_legos(course_code);
CREATE INDEX idx_course_legos_seed ON course_legos(course_code, seed_number);
CREATE INDEX idx_course_legos_sync ON course_legos(course_code, updated_at);
CREATE INDEX idx_course_legos_is_new ON course_legos(course_code, is_new) WHERE is_new = true;
CREATE INDEX idx_course_legos_type ON course_legos(type);

-- Comments
COMMENT ON TABLE course_legos IS 'LEGO building blocks extracted from seeds';
COMMENT ON COLUMN course_legos.lego_index IS 'Position within seed (1-99)';
COMMENT ON COLUMN course_legos.lego_id IS 'Human-readable identifier (e.g., S0001L01)';
COMMENT ON COLUMN course_legos.type IS 'A = Atomic (single semantic unit), M = Molecular (multi-word phrase)';
COMMENT ON COLUMN course_legos.is_new IS 'true = first appearance in course (needs introduction), false = revisit';
COMMENT ON COLUMN course_legos.components IS 'For M-type only: atomic breakdown as JSONB array of {known, target} pairs';
COMMENT ON COLUMN course_legos.version IS 'Increments on each edit for delta sync';

-- =============================================================================
-- TABLE: course_practice_phrases
-- =============================================================================
-- Based on registry entity: CoursePracticePhrase
-- Primary key: id (UUID)
-- Unique constraint: (course_code, seed_number, lego_index, position)
--
-- CRITICAL: phrase_type is NOT stored - it's computed at runtime using:
--   - word_count (length/complexity of phrase)
--   - lego_count (number of LEGOs used)
--   - position (order in practice sequence)
-- =============================================================================

CREATE TABLE course_practice_phrases (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Course reference (denormalized for performance)
    course_code TEXT NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,

    -- Parent LEGO reference (denormalized)
    seed_number INTEGER NOT NULL CHECK (seed_number > 0),
    lego_index INTEGER NOT NULL CHECK (lego_index > 0 AND lego_index < 100),

    -- Position in practice sequence
    position INTEGER NOT NULL CHECK (position >= 0),

    -- Content
    known_text TEXT NOT NULL,
    target_text TEXT NOT NULL,

    -- Runtime classification metadata (replaces phrase_type enum)
    word_count INTEGER NOT NULL,
    lego_count INTEGER NOT NULL,
    -- NOTE: No CHECK (word_count > 0) or CHECK (lego_count > 0) - validation belongs in import layer

    -- Optional pedagogical metadata
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    register TEXT CHECK (register IN ('casual', 'formal')),

    -- Flexible extension point (future: grammar_focus, topic_tags, a_b_test_group)
    metadata JSONB NOT NULL DEFAULT '{}',

    -- Lifecycle and versioning
    status content_status NOT NULL DEFAULT 'draft',
    release_batch INTEGER,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    UNIQUE(course_code, seed_number, lego_index, position)
);

-- Indexes
CREATE INDEX idx_course_practice_phrases_course ON course_practice_phrases(course_code);
CREATE INDEX idx_course_practice_phrases_lego ON course_practice_phrases(course_code, seed_number, lego_index);
CREATE INDEX idx_course_practice_phrases_position ON course_practice_phrases(course_code, seed_number, lego_index, position);
CREATE INDEX idx_course_practice_phrases_sync ON course_practice_phrases(course_code, updated_at);
CREATE INDEX idx_course_practice_phrases_word_count ON course_practice_phrases(word_count);

-- Comments
COMMENT ON TABLE course_practice_phrases IS 'Practice phrases for LEGOs - phrase_type computed at runtime from word_count/lego_count/position';
COMMENT ON COLUMN course_practice_phrases.position IS 'Order within LEGO practice sequence (0=component, 1=lego, 2-7=debut, 8+=eternal)';
COMMENT ON COLUMN course_practice_phrases.word_count IS 'Number of words in phrase - used for runtime phrase_type classification';
COMMENT ON COLUMN course_practice_phrases.lego_count IS 'Number of LEGOs used in phrase - used for runtime phrase_type classification';
COMMENT ON COLUMN course_practice_phrases.difficulty IS 'Learner difficulty rating (optional)';
COMMENT ON COLUMN course_practice_phrases.register IS 'Language register (optional)';
COMMENT ON COLUMN course_practice_phrases.metadata IS 'JSONB for future extensions without schema changes';

-- =============================================================================
-- TRIGGERS: Auto-increment version on UPDATE
-- =============================================================================

-- Trigger function to increment version and update timestamp
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_version() IS 'Auto-increments version and updates timestamp on row UPDATE';

-- Apply to course_seeds
CREATE TRIGGER course_seeds_version_trigger
    BEFORE UPDATE ON course_seeds
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

-- Apply to course_legos
CREATE TRIGGER course_legos_version_trigger
    BEFORE UPDATE ON course_legos
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

-- Apply to course_practice_phrases
CREATE TRIGGER course_practice_phrases_version_trigger
    BEFORE UPDATE ON course_practice_phrases
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

-- Apply to courses (for consistency)
CREATE TRIGGER courses_updated_at_trigger
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

-- =============================================================================
-- HELPER VIEWS
-- =============================================================================

-- View: Runtime phrase_type classification
-- Shows how to compute phrase_type from word_count, lego_count, and position
CREATE OR REPLACE VIEW course_practice_phrases_with_type AS
SELECT
    *,
    CASE
        WHEN position = 0 THEN 'component'
        WHEN position = 1 THEN 'lego'
        WHEN position BETWEEN 2 AND 7 THEN 'debut'
        ELSE 'eternal'
    END AS phrase_type
FROM course_practice_phrases;

COMMENT ON VIEW course_practice_phrases_with_type IS 'Practice phrases with runtime-computed phrase_type (component|lego|debut|eternal)';

-- View: Course summary statistics
CREATE OR REPLACE VIEW course_summary AS
SELECT
    c.course_code,
    c.known_lang,
    c.target_lang,
    c.display_name,
    c.status,
    COUNT(DISTINCT s.id) as seed_count,
    COUNT(DISTINCT l.id) as lego_count,
    COUNT(DISTINCT l.id) FILTER (WHERE l.is_new = true) as new_lego_count,
    COUNT(DISTINCT p.id) as phrase_count,
    MAX(s.updated_at) as last_seed_update,
    MAX(l.updated_at) as last_lego_update,
    MAX(p.updated_at) as last_phrase_update
FROM courses c
LEFT JOIN course_seeds s ON s.course_code = c.course_code
LEFT JOIN course_legos l ON l.course_code = c.course_code AND l.seed_number = s.seed_number
LEFT JOIN course_practice_phrases p ON p.course_code = c.course_code AND p.seed_number = l.seed_number AND p.lego_index = l.lego_index
GROUP BY c.course_code, c.known_lang, c.target_lang, c.display_name, c.status;

COMMENT ON VIEW course_summary IS 'Course summary with content counts and last update timestamps';

-- View: Seed with LEGOs (useful for manifest generation)
CREATE OR REPLACE VIEW seed_with_legos AS
SELECT
    s.id as seed_uuid,
    s.course_code,
    s.seed_id,
    s.seed_number,
    s.known_text as seed_known,
    s.target_text as seed_target,
    s.status as seed_status,
    s.version as seed_version,
    l.id as lego_uuid,
    l.lego_id,
    l.lego_index,
    l.known_text as lego_known,
    l.target_text as lego_target,
    l.type as lego_type,
    l.is_new,
    l.components,
    l.status as lego_status,
    l.version as lego_version
FROM course_seeds s
LEFT JOIN course_legos l ON l.course_code = s.course_code AND l.seed_number = s.seed_number
WHERE s.status = 'released'
ORDER BY s.seed_number, l.lego_index;

COMMENT ON VIEW seed_with_legos IS 'Seeds with their LEGOs - useful for manifest generation and data export';

-- =============================================================================
-- DELTA SYNC SUPPORT
-- =============================================================================
-- Example queries for delta sync (client tracks last_sync_time):
--
-- Initial load (first time):
--   SELECT * FROM course_seeds
--   WHERE course_code = 'spa_for_eng'
--   AND status = 'released'
--   ORDER BY seed_number;
--
-- Delta sync (subsequent syncs):
--   SELECT * FROM course_seeds
--   WHERE course_code = 'spa_for_eng'
--   AND status = 'released'
--   AND updated_at > '2025-12-13 10:00:00'
--   ORDER BY updated_at;
--
-- Same pattern applies to course_legos and course_practice_phrases.
-- =============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 002 completed: Registry schema created';
    RAISE NOTICE 'Created enums: content_status, lego_type';
    RAISE NOTICE 'Created tables: courses, course_seeds, course_legos, course_practice_phrases';
    RAISE NOTICE 'Created views: course_practice_phrases_with_type, course_summary, seed_with_legos';
    RAISE NOTICE 'Created triggers: Auto-increment version on UPDATE';
    RAISE NOTICE 'NOTE: phrase_type is NOT stored - compute at runtime from word_count/lego_count/position';
END $$;
