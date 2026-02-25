-- Add flagged_at to course_seeds for final pass flagging
-- Flagged seeds show as red in the seed grid and are excluded from mass approve
ALTER TABLE course_seeds ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;
