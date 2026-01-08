-- Raw Seed Uploads Queue
-- Browser agents POST directly to Supabase, local server polls and processes
-- This provides reliable data delivery even when ngrok is flaky

-- Create the queue table
CREATE TABLE IF NOT EXISTS raw_seed_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL,
  agent_id TEXT,
  batch_id TEXT,  -- Optional: group multiple seeds from same batch
  payload JSONB NOT NULL,  -- The raw seed data (compact or full format)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error TEXT,  -- Error message if processing failed
  processed_by TEXT,  -- Which server instance processed it
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Index for efficient polling of pending items
CREATE INDEX IF NOT EXISTS idx_raw_seed_uploads_pending
  ON raw_seed_uploads(status, created_at)
  WHERE status = 'pending';

-- Index for course-specific queries
CREATE INDEX IF NOT EXISTS idx_raw_seed_uploads_course
  ON raw_seed_uploads(course_code, status);

-- RLS: Allow anonymous inserts (browser agents use anon key)
ALTER TABLE raw_seed_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (browser agents)
CREATE POLICY "Allow anonymous inserts" ON raw_seed_uploads
  FOR INSERT WITH CHECK (true);

-- Policy: Only service role can read/update (local server)
CREATE POLICY "Service role full access" ON raw_seed_uploads
  FOR ALL USING (auth.role() = 'service_role');

-- Comment for documentation
COMMENT ON TABLE raw_seed_uploads IS 'Queue for browser agent seed uploads. Agents POST here directly, local server polls and processes.';
