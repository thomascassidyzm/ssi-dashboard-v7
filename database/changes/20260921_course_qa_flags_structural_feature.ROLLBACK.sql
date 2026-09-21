-- Undoes 20260921_course_qa_flags_structural_feature.sql: restores the seven-value
-- constraint. Any open structural_feature rows must be resolved or deleted first,
-- or the ADD CONSTRAINT will refuse — which is the right refusal: a flag Kai has
-- not answered should not be made unrepresentable by a rollback.
BEGIN;
ALTER TABLE public.course_qa_flags DROP CONSTRAINT IF EXISTS course_qa_flags_check_type_check;
ALTER TABLE public.course_qa_flags ADD CONSTRAINT course_qa_flags_check_type_check
  CHECK (check_type = ANY (ARRAY[
    'grammar'::text, 'semantic'::text, 'naturalness'::text, 'lego_frequency'::text,
    'lego_spread'::text, 'variety'::text, 'vocabulary'::text
  ]));
COMMIT;
