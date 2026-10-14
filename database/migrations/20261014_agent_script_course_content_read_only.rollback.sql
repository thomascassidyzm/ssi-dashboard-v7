-- Rollback for 20261014_agent_script_course_content_read_only.sql (job #388).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['course_audio','course_seeds','course_legos','course_practice_phrases','course_gender_expansions','courses'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS zz_refuse_agent_course_write ON public.%I', t);
  END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.refuse_agent_course_write();
