-- Migration: Checkpoint system tables
-- Created: 2026-01-25
-- Description: Database-driven checkpoint config with smart auto-approve

-- Checkpoint configuration (controls human vs auto per checkpoint)
CREATE TABLE IF NOT EXISTS course_checkpoint_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL,  -- use '_default' for fallback
  checkpoint_seed INTEGER NOT NULL,  -- 10, 50, 150, 260

  review_mode TEXT NOT NULL DEFAULT 'human'
    CHECK (review_mode IN ('human', 'auto', 'auto_with_flag')),

  -- Thresholds for auto-approve (ignored when review_mode = 'human')
  min_quality_score DECIMAL(3,2) DEFAULT 7.0,
  max_drift_rate DECIMAL(4,2) DEFAULT 0.70,  -- 0.7 points = ~10% of 7.0

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(course_code, checkpoint_seed)
);

-- Checkpoint results (audit trail)
CREATE TABLE IF NOT EXISTS course_checkpoint_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL,
  checkpoint_seed INTEGER NOT NULL,

  -- Gate results
  gate_1_quality_avg DECIMAL(3,2),
  gate_2_use_avg DECIMAL(3,2),
  gate_2_build_avg DECIMAL(3,2),
  gate_3_vocab_violations INTEGER DEFAULT 0,
  gate_4_drift_rate DECIMAL(4,2),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'pending_human', 'approved', 'rejected', 'flagged')),
  review_mode_used TEXT,
  approved_by TEXT,
  rejection_reason TEXT,
  qa_report JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(course_code, checkpoint_seed)
);

-- Default config (applies to ALL courses unless overridden)
INSERT INTO course_checkpoint_config (course_code, checkpoint_seed, review_mode, max_drift_rate) VALUES
  ('_default', 10, 'human', 0.70),
  ('_default', 50, 'human', 0.70),
  ('_default', 150, 'auto', 0.70),
  ('_default', 260, 'human', 0.70)
ON CONFLICT (course_code, checkpoint_seed) DO NOTHING;

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_checkpoint_config_course ON course_checkpoint_config(course_code);
CREATE INDEX IF NOT EXISTS idx_checkpoint_results_course ON course_checkpoint_results(course_code);
