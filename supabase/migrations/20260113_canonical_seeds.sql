-- Create canonical_seeds table for the 668 master English seeds
-- These are language-agnostic sources with {target} placeholder

CREATE TABLE IF NOT EXISTS canonical_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_number INTEGER NOT NULL UNIQUE,
  seed_id TEXT NOT NULL UNIQUE,        -- S0001, S0002, etc.
  canonical_id TEXT NOT NULL UNIQUE,   -- C0001, C0002, etc.
  source_text TEXT NOT NULL,           -- English text with {target} placeholder
  release_batch INTEGER DEFAULT 1,     -- Which release batch this seed belongs to
  difficulty_tier INTEGER DEFAULT 1,   -- 1=beginner, 2=intermediate, 3=advanced
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_canonical_seeds_seed_number ON canonical_seeds(seed_number);
CREATE INDEX IF NOT EXISTS idx_canonical_seeds_release_batch ON canonical_seeds(release_batch);

-- Add comment
COMMENT ON TABLE canonical_seeds IS 'Master list of 668 canonical English seeds with {target} placeholder';
