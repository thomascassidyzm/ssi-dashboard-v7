-- 20260921_course_qa_flags_structural_feature.sql
--
-- Kai's ruling, 2026-09-21 (job #491): the build agent does not decide how a
-- structural feature of a language is first shown to the learner, and does not
-- write learner-facing explanations. It STOPS and flags the question to a human,
-- with the seeds quoted and the closest precedent cited. The place this repo
-- already puts a finding in front of a human is course_qa_flags ("QA issues
-- flagged by monitor agent for human review"). Its check_type constraint lists
-- the monitor's seven checks and nothing else, so the flag needs one more value.
--
-- Writer: services/course-builder/lib/structural-features.cjs (raiseStructuralFlag).
-- Reader: src/views/production/QAReview.vue, via GET /qa/flags/:courseCode.
-- Until this is applied, raising the flag throws with this file's name; the
-- build still stops, and the flag still returns in the generator's result.
BEGIN;

ALTER TABLE public.course_qa_flags DROP CONSTRAINT IF EXISTS course_qa_flags_check_type_check;
ALTER TABLE public.course_qa_flags ADD CONSTRAINT course_qa_flags_check_type_check
  CHECK (check_type = ANY (ARRAY[
    'grammar'::text, 'semantic'::text, 'naturalness'::text, 'lego_frequency'::text,
    'lego_spread'::text, 'variety'::text, 'vocabulary'::text,
    'structural_feature'::text
  ]));

-- Canary: the new value is admitted, the old ones still are, and a stranger is not.
-- course_code is a foreign key to courses, so the canary borrows a real code and
-- is removed by its own marker before the transaction ends.
DO $$
DECLARE c text;
BEGIN
  SELECT course_code INTO c FROM public.courses ORDER BY course_code LIMIT 1;
  INSERT INTO public.course_qa_flags (course_code, check_type, severity, issue, details, status)
    VALUES (c, 'structural_feature', 'error', '__canary_20260921__', '{"kind":"canary"}', 'ignored');
  INSERT INTO public.course_qa_flags (course_code, check_type, severity, issue, details, status)
    VALUES (c, 'grammar', 'info', '__canary_20260921__', '{}', 'ignored');
  BEGIN
    INSERT INTO public.course_qa_flags (course_code, check_type, severity, issue, details, status)
      VALUES (c, 'not_a_check', 'info', '__canary_20260921__', '{}', 'ignored');
    RAISE EXCEPTION 'canary: an unknown check_type was admitted';
  EXCEPTION WHEN check_violation THEN
    NULL; -- refused, as it must be
  END;
  DELETE FROM public.course_qa_flags WHERE issue = '__canary_20260921__';
END $$;

COMMIT;
