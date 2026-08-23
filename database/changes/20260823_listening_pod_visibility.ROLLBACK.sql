-- Rollback for 20260823_listening_pod_visibility.sql.
--
-- Restores both public_read policies to USING (true) — i.e. every pod and
-- every pod sentence readable by anon/authenticated, exactly as before — and
-- drops the column. Any pod currently held becomes LIVE again the instant this
-- runs, including Welsh north (cym_n_for_eng:pod-0, Tom's "Pod 1") and its
-- unfinished takes. Restore the policies alone if that is all you want.

DROP POLICY IF EXISTS listening_pods_public_read ON listening_pods;
CREATE POLICY listening_pods_public_read ON listening_pods
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS listening_pod_sentences_public_read ON listening_pod_sentences;
CREATE POLICY listening_pod_sentences_public_read ON listening_pod_sentences
  FOR SELECT TO anon, authenticated
  USING (true);

DROP INDEX IF EXISTS idx_listening_pods_held;
ALTER TABLE listening_pods DROP CONSTRAINT IF EXISTS listening_pods_visibility_check;
ALTER TABLE listening_pods DROP COLUMN IF EXISTS visibility;
