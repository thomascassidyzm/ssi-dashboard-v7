-- Orchestrator messages table — agent ↔ human communication for pipeline orchestration
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS orchestrator_messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_code     TEXT NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('agent_to_human', 'human_to_agent')),
  checkpoint      TEXT,
  message         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'responded')),
  response        TEXT,
  response_action TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  responded_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orch_msg_course ON orchestrator_messages(course_code, created_at DESC);

-- RLS: allow service role full access (API uses service key)
ALTER TABLE orchestrator_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON orchestrator_messages
  FOR ALL USING (true) WITH CHECK (true);
