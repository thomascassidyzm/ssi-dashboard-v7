-- PHASE B FIX 2 — break the classes -> class_teachers -> classes recursion.
--
-- Defect: the draft's DELTA-2 co-teacher clause treats `class_teachers` as a
-- table. It is a VIEW:
--     SELECT c.id AS class_id, ut.user_id AS teacher_user_id, ...
--     FROM user_tags ut JOIN classes c ON ut.tag_value = 'CLASS:' || c.id
--     WHERE ut.tag_type='class' AND ut.role_in_context='teacher'
--       AND ut.removed_at IS NULL
-- so classes_update's EXISTS re-enters `classes` (and `user_tags`), and with RLS
-- now on classes that is a cycle: every UPDATE on classes failed with
-- "42P17 infinite recursion detected in policy for relation classes" — i.e. the
-- teacher resume-pointer write (useClassesData.updateClassProgress) was dead.
-- SELECT was unaffected; only UPDATE evaluated the offending policy.
--
-- Fix: resolve the co-teacher link in a SECURITY DEFINER helper that reads
-- user_tags directly, reproducing the view's predicate exactly (including
-- role_in_context='teacher', which the generic has_user_tag helper does not
-- filter on). Policy semantics are unchanged.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tags ut
    WHERE ut.user_id = (auth.uid())::text
      AND ut.tag_type = 'class'
      AND ut.role_in_context = 'teacher'
      AND ut.removed_at IS NULL
      AND ut.tag_value = 'CLASS:' || (p_class_id)::text
  );
$$;

DROP POLICY IF EXISTS classes_update ON public.classes;
CREATE POLICY classes_update ON public.classes
  FOR UPDATE
  USING (teacher_user_id = (auth.uid())::text
         OR public.is_class_teacher(classes.id))
  WITH CHECK (teacher_user_id = (auth.uid())::text
         OR public.is_class_teacher(classes.id));

COMMIT;
