-- Supabase RLS triage — DRAFT migration, 2026-07-31. NOT APPLIED.
-- See supabase-rls-triage-2026-07-31.md for the analysis and apply order.
-- Service-role connections bypass RLS: no server-side write path is affected.

BEGIN;

------------------------------------------------------------------
-- PHASE A — genuine gaps, safe to apply immediately
------------------------------------------------------------------

-- G1: audio_pass_requests — service-key-only queue; anon currently has full CRUD.
REVOKE ALL ON public.audio_pass_requests FROM anon, authenticated;
ALTER TABLE public.audio_pass_requests ENABLE ROW LEVEL SECURITY;

-- G2: pod_legos — browser needs read only; anon currently has full CRUD.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.pod_legos FROM anon, authenticated;
ALTER TABLE public.pod_legos ENABLE ROW LEVEL SECURITY;
CREATE POLICY pod_legos_public_read ON public.pod_legos
  FOR SELECT TO anon, authenticated USING (true);

-- G5: govt_admins — existing policies (self-read + ssi_admin) match the app's reads.
ALTER TABLE public.govt_admins ENABLE ROW LEVEL SECURITY;

-- G7: invite_codes — drop the world-readable landmine, then enable.
-- (anon/authenticated hold no grants on this table; all flows are server-side.)
DROP POLICY IF EXISTS invite_codes_select ON public.invite_codes;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------------
-- PHASE B — schools/classes/groups/entitlement_grants
-- Requires the subtree extension below, then a /schools smoke test
-- (govt admin + teacher) after apply.
------------------------------------------------------------------

-- Subtree helper: is the current user a govt admin over the group subtree
-- containing this group? (groups.path is a materialised-path string.)
CREATE OR REPLACE FUNCTION public.is_govt_admin_over_group(target_group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.govt_admins ga
    JOIN public.groups admin_g ON admin_g.id = ga.group_id
    JOIN public.groups target_g ON target_g.id = target_group_id
    WHERE ga.user_id = (auth.uid())::text
      AND target_g.path LIKE admin_g.path || '%'
  );
$$;

-- schools: extend read to ssi_admin + govt-admin subtree, then enable.
CREATE POLICY schools_select_admin_subtree ON public.schools
  FOR SELECT TO authenticated
  USING (public.is_ssi_admin() OR public.is_govt_admin_over_group(group_id));
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- classes: same extension via the school's group, then enable.
-- (Closes G3: authenticated currently holds INSERT+UPDATE with no active policy.)
CREATE POLICY classes_select_admin_subtree ON public.classes
  FOR SELECT TO authenticated
  USING (public.is_ssi_admin() OR EXISTS (
    SELECT 1 FROM public.schools s
    WHERE s.id = classes.school_id
      AND public.is_govt_admin_over_group(s.group_id)
  ));
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- groups: org tree, read broadly by the /schools dashboard; low sensitivity.
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY groups_authenticated_read ON public.groups
  FOR SELECT TO authenticated USING (true);

-- entitlement_grants: interim authenticated read (browser reads by school/group);
-- tighten to school-staff scope later if desired.
ALTER TABLE public.entitlement_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY entitlement_grants_authenticated_read ON public.entitlement_grants
  FOR SELECT TO authenticated USING (true);

------------------------------------------------------------------
-- PHASE C — deliberately public content: make the posture explicit.
-- Access unchanged (grants are already SELECT-only for anon/authenticated;
-- writes are service-key and bypass RLS). Clears both advisor warning classes.
------------------------------------------------------------------

-- Already carry the correct policies (anon read / authenticated read / service ALL):
ALTER TABLE public.course_audio            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_legos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_practice_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_seeds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_audio            ENABLE ROW LEVEL SECURITY;

-- Cosmetic: drop duplicate anon SELECT policies.
DROP POLICY IF EXISTS "Public users can view course_legos" ON public.course_legos;
DROP POLICY IF EXISTS "Public users can view course_practice_phrases" ON public.course_practice_phrases;

-- No policies yet — add public read, then enable:
CREATE POLICY canonical_seeds_public_read ON public.canonical_seeds
  FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.canonical_seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY canonical_seed_translations_public_read ON public.canonical_seed_translations
  FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.canonical_seed_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY listening_pods_public_read ON public.listening_pods
  FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.listening_pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY listening_pod_sentences_public_read ON public.listening_pod_sentences
  FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.listening_pod_sentences ENABLE ROW LEVEL SECURITY;

COMMIT;
