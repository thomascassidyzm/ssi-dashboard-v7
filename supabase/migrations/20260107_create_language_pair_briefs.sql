-- Create language_pair_briefs table for Phase 0
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS language_pair_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  known_code VARCHAR(10) NOT NULL,
  target_code VARCHAR(10) NOT NULL,
  brief JSONB NOT NULL,
  generated_by VARCHAR(50),
  prompt_version VARCHAR(20),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(known_code, target_code)
);

CREATE INDEX IF NOT EXISTS idx_language_pair_briefs_codes
  ON language_pair_briefs(known_code, target_code);

-- Enable RLS
ALTER TABLE language_pair_briefs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access" ON language_pair_briefs
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE language_pair_briefs IS 'Stores language pair intelligence briefs for Phase 0';
