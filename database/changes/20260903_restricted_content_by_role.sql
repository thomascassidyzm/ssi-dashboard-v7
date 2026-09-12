-- 2026-09-03: content can name the ONE person allowed to see it.
--
-- TOM'S RULING (2026-09-03): "I suspect we can think of making Steve a
-- 'tester' or creating that role and then making certain content only
-- available for that role." AMENDED the same day, and the amendment is the
-- heart of the design: roles are NUMBERED, ONE PER PERSON —
-- `previewer_001`, `previewer_002`, and so on. Steve is `previewer_001`.
--
-- WHY NUMBERED AND NOT A SHARED `tester` ROLE. One shared role means every
-- holder sees every restricted pod, which breaks the first moment there are
-- two sensitive pods for two different people. A per-person role makes that
-- leak structurally impossible rather than merely unlikely. This is the same
-- standing heuristic that keeps biting the estate — a hardcoded list of
-- instances is not a rule — applied one level up.
--
-- THE LIVE CASE. Steve, a contact of Aran's now on the board of S4C, needs to
-- listen to a Welsh listening pod built from the Senedd's 11 January 2024
-- committee session on bullying allegations at S4C: named individuals,
-- someone's illness, two dismissals. Nobody else may ever reach it. A
-- client-side hide is not a restriction; a learner with the anon key and a
-- browser console must get ZERO ROWS.
--
-- WHAT THIS ADDS.
--   1. `learner_roles` — a row per (person, role). Minting `previewer_002` is
--      one INSERT: no CHECK constraint to edit, no enum, no lookup table of
--      valid names, no migration, no screen. That is the whole point.
--   2. `listening_pods.required_role` — free text, NULL meaning "everyone".
--      All 128 pods that exist today have NULL and are untouched.
--   3. The gate, in RLS, on both pod policies.
--
-- WHY NOT `learners.platform_role`. It is single-valued behind a CHECK enum,
-- so adding `previewer_002` would be a migration (the code change Tom is
-- ruling out) and granting Steve a role would overwrite whatever platform
-- role he already holds. `platform_role` is deliberately left ALONE — its
-- constraint, its 'tester' value and its auto-entitlement trigger all stay
-- exactly as they are. `user_tags` is also not the answer: it is org-scoped.
--
-- WHY RLS. The learner app reads Supabase DIRECTLY with the anon key and six
-- client paths query pod content by literal id. There is no shared resolver
-- to patch and no way to make a client change bite without a deploy. In RLS
-- the gate bites the moment this runs, for every client already in the field
-- including cached ones — the same reasoning as the 2026-08-23 visibility
-- migration this sits beside, and it composes with it: a pod is reachable
-- only if it is `live` AND its required_role is NULL or held by the reader.
--
-- WHAT THIS DOES *NOT* COVER. Service-role readers bypass RLS by design. The
-- one that is learner-facing is ssi-learning-app's
-- api/courses/[code]/bundle.ts (the offline download bundle), which gets an
-- explicit `required_role IS NULL` filter in the same change: restricted
-- content is ONLINE-ONLY and never enters an offline snapshot. Popty and
-- everything in tools/ keep seeing everything, which is intended — Kai has to
-- be able to build and inspect the pod.
--
-- SCOPE. `listening_pods` only. The same nullable `required_role` column plus
-- the same one-line policy predicate would extend to any other learner-facing
-- content table (courses, seeds, phrases) unchanged if that is ever wanted;
-- nothing here is pod-specific except the two policies.
--
-- ============================================================================
-- NEXT TIME: the two statements a human runs, in full. Nothing else.
--
--   -- 1. grant the role (mint a new number by using it — no other step)
--   INSERT INTO learner_roles (learner_id, role, granted_by, note)
--   VALUES ('<learners.id uuid>', 'previewer_002', 'tom', 'why this person');
--
--   -- 2. point the content at it
--   UPDATE listening_pods
--      SET required_role = 'previewer_002'
--    WHERE id = '<course_code>:<slug>';
--
--   -- to revoke, never delete:
--   UPDATE learner_roles SET removed_at = now()
--    WHERE role = 'previewer_002' AND removed_at IS NULL;
-- ============================================================================
--
-- STEVE'S OWN GRANT IS NOT RUN HERE, and that is deliberate. Two learners
-- match "Steve" (stevej.kovacic@gmail.com, and 'Stephen'
-- sprosser@hasmissions.co.uk) and neither is confirmed as Aran's S4C contact.
-- Granting the wrong person access to bullying-allegation content is worse
-- than granting nobody. A human confirms the identity and runs:
--
--   INSERT INTO learner_roles (learner_id, role, granted_by, note)
--   VALUES ('<Steve''s learners.id>', 'previewer_001', 'tom',
--           'S4C board, Aran contact — Senedd 2024-01-11 pod');
--
-- learner_pod_state is untouched. This is a VISIBILITY change, not a content
-- change: no sentence text, slot or pod_id moves, so the standing
-- content-change migration protocol does not fire.

-- ---------------------------------------------------------------------------
-- 1. Who holds which role.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learner_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id  uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  role        text NOT NULL,
  granted_by  text,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  removed_at  timestamptz,
  note        text
);

COMMENT ON TABLE learner_roles IS
  'Free-text roles a learner holds, one row each. Roles are NUMBERED PER PERSON (previewer_001, previewer_002...) so that two restricted pods can never leak into each other. Minting a role is this INSERT and nothing else — no enum, no CHECK, no lookup table, deliberately. Revoke by setting removed_at, never by deleting: the grant trail is the audit trail. Distinct from learners.platform_role, which is untouched.';

COMMENT ON COLUMN learner_roles.role IS
  'Literal role name, matched against listening_pods.required_role. Free text ON BOTH SIDES on purpose: `previewer_002` must cost one INSERT, not a migration.';

-- One live grant per (person, role); revoked grants stay as history.
CREATE UNIQUE INDEX IF NOT EXISTS idx_learner_roles_live
  ON learner_roles (learner_id, role) WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_learner_roles_role
  ON learner_roles (role) WHERE removed_at IS NULL;

-- Nobody reads this table from a client. RLS on with NO policy for
-- anon/authenticated means zero rows for both; service_role bypasses it, which
-- is how Popty and the grant statement above still work. Fail closed.
ALTER TABLE learner_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_roles FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. The identity bridge for roles.
--
-- Same shape as public.current_user_enrolled_course_codes(): SECURITY DEFINER
-- is what stops the pod policy re-entering RLS on learners/learner_roles, and
-- the pinned search_path is what makes SECURITY DEFINER safe.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_has_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learner_roles r
    JOIN public.learners l ON l.id = r.learner_id
    WHERE l.user_id = (auth.uid())::text
      AND r.role = p_role
      AND r.removed_at IS NULL
  );
$$;

COMMENT ON FUNCTION public.current_user_has_role(text) IS
  'Does the CURRENT auth user hold this exact role right now? The only place the auth-uid -> learner -> role hop may live. Returns false for anon, for an unknown uid and for a revoked grant — never null, so a policy predicate cannot fail open.';

REVOKE ALL ON FUNCTION public.current_user_has_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Content names the role it requires.
-- ---------------------------------------------------------------------------
ALTER TABLE listening_pods
  ADD COLUMN IF NOT EXISTS required_role text;

COMMENT ON COLUMN listening_pods.required_role IS
  'Which single role may reach this pod. NULL = everyone (the default, and true of every pod that existed before 2026-09-03). Otherwise the literal name of a learner_roles.role, normally a per-person previewer_NNN. Composes with visibility: a pod must be visibility=''live'' AND role-permitted to be readable, so setting this on a held pod hides it from its owner too.';

-- Restricted pods are a handful; a partial index keeps the sentence policy's
-- per-row EXISTS cheap without paying for a full-size index.
CREATE INDEX IF NOT EXISTS idx_listening_pods_required_role
  ON listening_pods (required_role) WHERE required_role IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. The gate. Both policies keep their existing visibility clause verbatim
--    and gain the role clause; a NULL required_role short-circuits, so the
--    128 existing pods do not even call the helper.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS listening_pods_public_read ON listening_pods;
CREATE POLICY listening_pods_public_read ON listening_pods
  FOR SELECT TO anon, authenticated
  USING (
    visibility = 'live'
    AND (required_role IS NULL OR public.current_user_has_role(required_role))
  );

DROP POLICY IF EXISTS listening_pod_sentences_public_read ON listening_pod_sentences;
CREATE POLICY listening_pod_sentences_public_read ON listening_pod_sentences
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listening_pods p
      WHERE p.id = listening_pod_sentences.pod_id
        AND p.visibility = 'live'
        AND (p.required_role IS NULL OR public.current_user_has_role(p.required_role))
    )
  );
