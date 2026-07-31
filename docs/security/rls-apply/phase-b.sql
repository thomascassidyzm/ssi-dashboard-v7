-- PHASE B — schools / classes / groups / entitlement_grants.
-- Revised from the draft after pre-apply verification against
-- ssi-learning-app (browser access paths) and live data. Two deltas, each
-- marked DELTA-n below and explained in the report.
BEGIN;

-- Subtree helper. DELTA-1 vs draft: the draft's `target_g.path LIKE admin_g.path || '%'`
-- matches sibling groups that merely share a slug prefix (an admin over
-- 'ime-demo-programme' would also see a future 'ime-demo-programme-2').
-- Anchor on the '/' separator instead. Verified govt_admins.user_id is `text`,
-- so (auth.uid())::text is the correct comparison.
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
      AND (target_g.path = admin_g.path
           OR target_g.path LIKE admin_g.path || '/%')
  );
$$;

-- schools: extend read to ssi_admin + govt-admin subtree, then enable.
CREATE POLICY schools_select_admin_subtree ON public.schools
  FOR SELECT TO authenticated
  USING (public.is_ssi_admin() OR public.is_govt_admin_over_group(group_id));
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- classes: same extension via the school's group, then enable.
CREATE POLICY classes_select_admin_subtree ON public.classes
  FOR SELECT TO authenticated
  USING (public.is_ssi_admin() OR EXISTS (
    SELECT 1 FROM public.schools s
    WHERE s.id = classes.school_id
      AND public.is_govt_admin_over_group(s.group_id)
  ));

-- DELTA-2: the draft enables RLS on classes with SELECT-only additions, but the
-- browser writes classes directly with the user's JWT — useClassesData.createClass
-- (INSERT) and updateClassProgress (UPDATE last_lego_id). The pre-existing
-- classes_insert / classes_update policies cover the *creating* teacher only
-- (teacher_user_id = auth.uid()). Co-teachers (class_teachers, added via
-- /api/teacher/class-teachers) would silently fail the resume-pointer write —
-- the "false Saved" hazard the composable's own comments call out. Extend UPDATE
-- to any linked teacher. 19 class_teachers links exist today, 0 multi-teacher
-- classes, so this changes no current behaviour; it prevents the next co-teach
-- from breaking.
DROP POLICY IF EXISTS classes_update ON public.classes;
CREATE POLICY classes_update ON public.classes
  FOR UPDATE
  USING (teacher_user_id = (auth.uid())::text
         OR EXISTS (SELECT 1 FROM public.class_teachers ct
                    WHERE ct.class_id = classes.id
                      AND ct.teacher_user_id = (auth.uid())::text))
  WITH CHECK (teacher_user_id = (auth.uid())::text
         OR EXISTS (SELECT 1 FROM public.class_teachers ct
                    WHERE ct.class_id = classes.id
                      AND ct.teacher_user_id = (auth.uid())::text));

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- groups: org tree, read broadly by the /schools dashboard; browser is read-only
-- (verified: no .insert/.update/.delete on groups in player-vue).
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY groups_authenticated_read ON public.groups
  FOR SELECT TO authenticated USING (true);

-- entitlement_grants: browser is read-only (useCourseAccess.ts selects by
-- school_id / group_id). Interim authenticated read; tighten later if desired.
ALTER TABLE public.entitlement_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY entitlement_grants_authenticated_read ON public.entitlement_grants
  FOR SELECT TO authenticated USING (true);

COMMIT;
