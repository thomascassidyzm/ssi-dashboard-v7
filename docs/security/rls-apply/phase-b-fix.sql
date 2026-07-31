-- PHASE B FIX — break the schools <-> user_tags policy recursion.
--
-- Defect found by post-apply verification (not present in the draft plan):
--   schools_select      subqueries user_tags
--   user_tags_select    subqueries schools (and classes)
-- user_tags already had RLS ON before this work, so enabling RLS on schools
-- closed the cycle: ANY authenticated SELECT on schools now fails with
-- "42P17 infinite recursion detected in policy for relation schools".
-- That is the whole /schools read path, plus every teacher's own school row.
--
-- Fix: move the cross-table lookups inside SECURITY DEFINER helpers (the same
-- pattern the existing is_ssi_admin / is_govt_admin_over_group helpers use), so
-- the inner scans run as the table owner and do not re-enter RLS. Policy
-- semantics are preserved exactly — same predicates, same roles, same commands.
BEGIN;

-- Replaces the inline user_tags EXISTS in schools_select / classes_select.
CREATE OR REPLACE FUNCTION public.has_user_tag(p_tag_type text, p_tag_value text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tags ut
    WHERE ut.user_id = (auth.uid())::text
      AND ut.tag_type = p_tag_type
      AND ut.tag_value = p_tag_value
      AND ut.removed_at IS NULL
  );
$$;

-- Replaces the inline schools EXISTS in classes_select. Keeping this in a
-- helper too avoids a second-order surprise: with RLS now on schools, an
-- inline subquery would only see RLS-visible schools rather than all of them.
CREATE OR REPLACE FUNCTION public.is_school_admin_of(p_school_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.schools s
    WHERE s.id = p_school_id
      AND s.admin_user_id = (auth.uid())::text
  );
$$;

-- schools_select: identical predicate, user_tags lookup via the helper.
DROP POLICY IF EXISTS schools_select ON public.schools;
CREATE POLICY schools_select ON public.schools
  FOR SELECT
  USING (admin_user_id = (auth.uid())::text
         OR public.has_user_tag('school', 'SCHOOL:' || (schools.id)::text));

-- classes_select: identical predicate, both lookups via helpers.
DROP POLICY IF EXISTS classes_select ON public.classes;
CREATE POLICY classes_select ON public.classes
  FOR SELECT
  USING (teacher_user_id = (auth.uid())::text
         OR public.is_school_admin_of(classes.school_id)
         OR public.has_user_tag('class', 'CLASS:' || (classes.id)::text));

COMMIT;
