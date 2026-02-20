-- Add approved_at to course_seeds for human approval tracking
-- Seeds go: empty → decomposed_at (submitted by agent) → approved_at (approved by human)
ALTER TABLE course_seeds ADD COLUMN IF NOT EXISTS approved_at timestamptz;
