-- Migration: Add content_feedback table
-- Version: 12.1
-- Date: 2025-12-26
--
-- Purpose: User-submitted feedback on audio/content quality
-- Aggregated by threshold to surface issues needing attention

-- ----------------------------------------------------------------------------
-- Table: content_feedback
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS content_feedback (
  id UUID DEFAULT gen_random_uuid(),
  audio_id UUID,                          -- References audio_files(id), nullable for general feedback
  course_code TEXT NOT NULL,
  feedback_type TEXT NOT NULL,            -- 'translation', 'audio_quality', 'pronunciation', 'too_fast', 'confusing', 'other'
  user_id TEXT,                           -- User identifier (anonymous or authenticated)
  comment TEXT,                           -- Optional free-text description
  session_context JSONB,                  -- { seed_id, cycle_index, lego_id, device, app_version, etc }
  resolved_at TIMESTAMPTZ,                -- When the issue was addressed
  resolved_by TEXT,                       -- Who resolved it
  resolution_note TEXT,                   -- How it was resolved
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (audio_id) REFERENCES audio_files(id) ON DELETE SET NULL
);

-- Indexes for efficient aggregation queries
CREATE INDEX IF NOT EXISTS idx_feedback_audio ON content_feedback (audio_id, feedback_type) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_course ON content_feedback (course_code) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_type ON content_feedback (feedback_type) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_created ON content_feedback (created_at DESC);

-- Comments
COMMENT ON TABLE content_feedback IS 'User-submitted feedback on audio/content - aggregated by threshold to surface issues';
COMMENT ON COLUMN content_feedback.feedback_type IS 'translation, audio_quality, pronunciation, too_fast, confusing, other';
COMMENT ON COLUMN content_feedback.session_context IS 'JSON context: seed_id, cycle_index, lego_id, device, app_version';

-- Create view for aggregated feedback (issues above threshold)
CREATE OR REPLACE VIEW feedback_aggregated AS
SELECT
  audio_id,
  course_code,
  feedback_type,
  COUNT(*) as flag_count,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_flagged,
  MAX(created_at) as last_flagged,
  array_agg(DISTINCT comment) FILTER (WHERE comment IS NOT NULL) as comments
FROM content_feedback
WHERE resolved_at IS NULL
GROUP BY audio_id, course_code, feedback_type;

COMMENT ON VIEW feedback_aggregated IS 'Aggregated unresolved feedback - use with threshold filter';
