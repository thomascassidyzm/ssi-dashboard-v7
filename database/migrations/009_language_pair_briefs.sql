-- Migration 009: Language Pair Briefs Table
--
-- Stores agent-generated linguistic intelligence briefs for language pairs.
-- Generated once per pair at first course creation, then reused.
-- Phase 0 agent analyzes the language pair and produces guidance for Phase 1-3.

CREATE TABLE IF NOT EXISTS language_pair_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Language pair identification (ISO 639-3 codes)
    known_code TEXT NOT NULL,      -- e.g., 'eng', 'deu', 'fra'
    target_code TEXT NOT NULL,     -- e.g., 'spa', 'cym', 'cmn'

    -- The brief content (structured JSON)
    brief JSONB NOT NULL,

    -- Generation metadata
    generated_at TIMESTAMPTZ DEFAULT now(),
    generated_by TEXT,             -- Agent/model identifier
    prompt_version TEXT,           -- Phase 0 prompt version used

    -- Validation
    validated BOOLEAN DEFAULT false,
    validated_by TEXT,
    validated_at TIMESTAMPTZ,

    -- Versioning (allows regeneration if needed)
    version INTEGER DEFAULT 1,

    -- Unique constraint on language pair
    UNIQUE(known_code, target_code)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_language_pair_briefs_pair
    ON language_pair_briefs(known_code, target_code);

-- RLS policies
ALTER TABLE language_pair_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read language_pair_briefs" ON language_pair_briefs
    FOR SELECT TO anon USING (true);

CREATE POLICY "Service can manage language_pair_briefs" ON language_pair_briefs
    FOR ALL TO service_role USING (true);

-- Comment documenting the JSONB structure
COMMENT ON COLUMN language_pair_briefs.brief IS 'JSON structure:
{
  "target_language_profile": {
    "word_order": "SVO|VSO|SOV|...",
    "has_gender": boolean,
    "has_cases": boolean,
    "has_tones": boolean,
    "writing_system": "latin|cyrillic|hanzi|...",
    "notable_features": ["feature1", "feature2"]
  },
  "zut_failures": [
    {"known": "the", "why": "reason for ambiguity"}
  ],
  "zut_passes": [
    {"known": "I want", "target": "quiero", "why": "reason unambiguous"}
  ],
  "chunking_guidance": [
    "guidance string 1",
    "guidance string 2"
  ],
  "phrase_generation_notes": [
    "note for Phase 3 basket generation"
  ],
  "common_pitfalls": [
    "mistake agents commonly make"
  ],
  "cognate_notes": "notes about cognates if applicable",
  "formality_notes": "notes about register/formality"
}';

-- Verify
SELECT 'language_pair_briefs table created' AS status;
