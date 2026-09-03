-- Rollback for 20260903_restricted_content_by_role.sql.
--
-- Restores the two policies to their 2026-08-23 visibility-only form and drops
-- the role machinery. Run the two policy statements ALONE if you only want to
-- unblock a restricted pod in a hurry — dropping the column is not required to
-- open the gate, and keeping learner_roles costs nothing.
--
-- WARNING: dropping listening_pods.required_role loses which pods were
-- restricted to whom. Note them first:
--   SELECT id, required_role FROM listening_pods WHERE required_role IS NOT NULL;

DROP POLICY IF EXISTS listening_pods_public_read ON listening_pods;
CREATE POLICY listening_pods_public_read ON listening_pods
  FOR SELECT TO anon, authenticated
  USING (visibility = 'live');

DROP POLICY IF EXISTS listening_pod_sentences_public_read ON listening_pod_sentences;
CREATE POLICY listening_pod_sentences_public_read ON listening_pod_sentences
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listening_pods p
      WHERE p.id = listening_pod_sentences.pod_id
        AND p.visibility = 'live'
    )
  );

DROP INDEX IF EXISTS idx_listening_pods_required_role;
ALTER TABLE listening_pods DROP COLUMN IF EXISTS required_role;
DROP FUNCTION IF EXISTS public.current_user_has_role(text);
DROP TABLE IF EXISTS learner_roles;
