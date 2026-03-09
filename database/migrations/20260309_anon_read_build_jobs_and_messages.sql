-- Migration: Allow anon (frontend dashboard) to read build_jobs and orchestrator_messages
-- The dashboard frontend uses the Supabase anon key for direct queries.
-- Without these policies, fetchPhaseStatus and fetchMessages silently return empty.

-- build_jobs: anon can SELECT (read job status for pipeline UI)
CREATE POLICY "Anon can read build_jobs"
  ON build_jobs FOR SELECT
  TO anon
  USING (true);

-- orchestrator_messages: anon can SELECT (read chat messages)
CREATE POLICY "Anon can read orchestrator_messages"
  ON orchestrator_messages FOR SELECT
  TO anon
  USING (true);
