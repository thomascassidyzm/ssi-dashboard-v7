-- Rollback of 20260921_human_authored_presentations.sql.
-- Drops the guard trigger and the marks table, and returns the course_qa_flags
-- check_type constraint to its previous list (structural_feature kept). Any open
-- 'human_authored_presentation' flags must be resolved or deleted first, or the
-- constraint re-add fails — deliberately: a rollback should not silently orphan
-- an escalation Kai has not seen.
BEGIN;
DROP TRIGGER IF EXISTS trg_guard_human_authored_presentation ON public.course_audio;
DROP FUNCTION IF EXISTS public.guard_human_authored_presentation();
DROP TABLE IF EXISTS public.human_authored_presentations;
ALTER TABLE public.course_qa_flags DROP CONSTRAINT IF EXISTS course_qa_flags_check_type_check;
ALTER TABLE public.course_qa_flags ADD CONSTRAINT course_qa_flags_check_type_check
  CHECK (check_type = ANY (ARRAY[
    'grammar'::text, 'semantic'::text, 'naturalness'::text, 'lego_frequency'::text,
    'lego_spread'::text, 'variety'::text, 'vocabulary'::text,
    'structural_feature'::text
  ]));
COMMIT;
