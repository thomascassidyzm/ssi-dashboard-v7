-- 2026-08-23: a per-course hold/release gate on listening pods.
--
-- TOM'S RULING (2026-08-23 16:32Z): "Can we not make PODS live in certain
-- courses? It would be good to be able to keep them back in a human course
-- until ... after all until they exist!!!"
--
-- The live case: Welsh north (cym_n_for_eng) pod-0 — the pod Tom calls
-- "Pod 1" — is mid-recording. Catrin recorded four takes on 2026-08-23; three
-- were 45-90s of background noise (a sheep in one), and every one of them was
-- reachable by learners, because a pod is live the moment its row and its
-- sentences exist. There was no flag to say otherwise.
--
-- WHAT THIS ADDS. `visibility` on listening_pods: 'live' or 'held'. Default
-- 'live', so every one of the 110 pods that exists today keeps behaving
-- EXACTLY as it does now — this change is invisible to every course except
-- one that is deliberately held.
--
-- WHY A COLUMN, NOT A metadata KEY. It decides what a learner can reach, so
-- it has to be filterable inside an RLS policy and readable at a glance. The
-- hand-rolled precedent (cym_n_for_eng:pod-0-gated-2026-08-06, held by moving
-- its sentences away and leaving the pod childless) is exactly the practice
-- this replaces: reversible by a flag, not by a data migration.
--
-- WHY RLS AND NOT A CLIENT CHECK. The learner app reads Supabase DIRECTLY
-- with the anon key. Six client paths resolve pod content and all six query
-- the literal id `<course>:pod-0` — there is no shared resolver to patch and
-- no way to make a client change bite without a Vercel deploy. Tightening the
-- two public_read policies makes the hold bite the moment this runs, for every
-- client already in the field including cached ones. A held pod's row and its
-- sentences simply stop existing for anon/authenticated; the client's exact-id
-- query returns nothing, which is the same empty-pod state that
-- packages/player-vue/e2e/empty-pod-hidden-probe.mjs already proves hides the
-- Dialogues tab entirely.
--
-- WHAT THIS DOES *NOT* COVER. Service-role readers bypass RLS by design —
-- Popty, everything in tools/, and (learner-facing, so it matters)
-- ssi-learning-app's api/courses/[code]/bundle.ts, which builds the offline
-- bundle with SUPABASE_SERVICE_ROLE_KEY. That route needs its own explicit
-- `visibility = 'live'` filter; it is landed on a learning-app branch and is
-- NOT deployed. Until it is, the bundle route is the one learner-facing path a
-- hold does not close.
--
-- GOING LIVE IS A HUMAN ACT. Nothing in this change, and nothing that writes
-- to this column, may flip a pod to 'live' because it looks finished.
-- Completeness is a precondition for release, never a trigger for it.
--
-- learner_pod_state is untouched. A hold is a VISIBILITY change, not a content
-- change: no sentence text, slot or pod_id moves, so the standing
-- content-change migration protocol (docs/pods/pod-migration-protocol.md) does
-- not fire and progress stays exactly where it is filed.

ALTER TABLE listening_pods
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'live';

COMMENT ON COLUMN listening_pods.visibility IS
  'Learner reachability gate. ''live'' = readable by anon/authenticated through RLS. ''held'' = invisible to learners entirely (no pod row, no sentences) while staying fully visible to service-role admin surfaces. Release is a deliberate human act — never set to ''live'' automatically on completeness. Trail in metadata.held_at / metadata.released_at.';

ALTER TABLE listening_pods DROP CONSTRAINT IF EXISTS listening_pods_visibility_check;
ALTER TABLE listening_pods ADD CONSTRAINT listening_pods_visibility_check
  CHECK (visibility IN ('live', 'held'));

-- Held pods are usually a handful; the index keeps the policy's per-row check
-- cheap on the sentence table without paying for a full-size index.
CREATE INDEX IF NOT EXISTS idx_listening_pods_held
  ON listening_pods (id) WHERE visibility = 'held';

-- The gate itself. Both policies were USING (true).
DROP POLICY IF EXISTS listening_pods_public_read ON listening_pods;
CREATE POLICY listening_pods_public_read ON listening_pods
  FOR SELECT TO anon, authenticated
  USING (visibility = 'live');

-- Sentences are queried by pod_id directly, so hiding the parent row is not
-- enough on its own.
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
