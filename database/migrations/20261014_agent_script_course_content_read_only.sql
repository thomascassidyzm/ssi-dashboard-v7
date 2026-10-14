-- Courses change only through Popty (Tom's standing ruling). Job #388, 2026-10-14.
--
-- agent_script (the login in .env.psql) holds NO table grants of its own: it writes through its
-- membership of service_role, so REVOKE … FROM agent_script is a no-op, and REVOKE … FROM
-- service_role would break Popty and the learner app. Postgres has no DENY, so the lock is a
-- statement-level trigger keyed on SESSION_USER: it holds even after `SET ROLE service_role`,
-- and agent_script cannot drop or replace it (both need the owner, postgres). SELECT is untouched
-- (pg_read_all_data). Popty's own logins — postgres (owner.env) and service_role over PostgREST
-- (session_user authenticator) — are not agent_script and pass. One check per statement, not per row.
-- clip_index is deliberately NOT locked: it is a lookup index the nightly voices-reconcile writes.
-- Rollback: database/migrations/20261014_agent_script_course_content_read_only.rollback.sql

CREATE OR REPLACE FUNCTION public.refuse_agent_course_write() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF session_user = 'agent_script' THEN
    RAISE EXCEPTION 'COURSE_CONTENT_READ_ONLY: % on % refused for agent_script — courses change only through Popty (see CLAUDE.md "Course content is written only through Popty")', TG_OP, TG_TABLE_NAME
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.refuse_agent_course_write() FROM PUBLIC;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['course_audio','course_seeds','course_legos','course_practice_phrases','course_gender_expansions','courses'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS zz_refuse_agent_course_write ON public.%I', t);
    EXECUTE format('CREATE TRIGGER zz_refuse_agent_course_write BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.refuse_agent_course_write()', t);
  END LOOP;
END $$;
