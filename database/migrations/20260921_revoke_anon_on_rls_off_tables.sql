-- 20260921_revoke_anon_on_rls_off_tables.sql
--
-- Close anonymous (and `authenticated`) read AND write access to the 22 public
-- tables that have RLS disabled and yet carry grants to `anon`.
--
-- WHY THIS IS SAFE. Job #462 established that no learner, no teacher and no
-- Popty screen reaches any of these 22 through the anon or authenticated roles:
-- every real consumer is Popty server-side on the service_role key, or a
-- tools/ script on the direct DATABASE_URL. Re-verified here before applying:
-- the Popty SPA's anon-key client (src/services/supabase.js) queries only
-- course_seeds / course_legos / course_practice_phrases / course_audio /
-- courses / listening_pod* / pod_legos / canonical_seeds / audio_flags /
-- content_feedback / course_gender_expansions / dashboard_users /
-- orchestrator_messages — none of the 22. The five src/ files that mention a
-- table in this set mention it only in a comment; they read over HTTP from the
-- server API, which holds the service_role key.
--
-- WHAT THIS IS NOT. This is a grant revoke only. RLS is deliberately NOT
-- enabled and no policies are written; that is a separate, later decision.
-- service_role and postgres keep every privilege they have today, which is
-- what keeps Popty's server-side writes working.
--
-- THE SET is not hard-coded by hand: it is re-derived inside the transaction
-- from the same predicate the audit used (public schema, relkind='r',
-- relrowsecurity=false, at least one grant to anon), and the transaction
-- ABORTS if that predicate does not return exactly the 22 named below.
--
-- Rollback: 20260921_revoke_anon_on_rls_off_tables.ROLLBACK.sql
-- Applied to the live shared Supabase project (swfvymspfxmnfhevgdkg) 2026-09-21.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Pin the set. Abort if the live catalogue disagrees with what was audited.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _lock_set ON COMMIT DROP AS
SELECT c.oid, c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
  AND has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE');

DO $$
DECLARE
  expected text[] := ARRAY[
    '_audit_s3_touch','_canon_alive','_canon_lang_map','_canon_reselect',
    '_canon_stage','_canon_voice_map','_converge_probe','_converge_set',
    '_divergence_partition','_fix_broken','_fix_lang_map','_fix_plan',
    '_fix_serving','_fix_voice_map','audio_clip_promotions','audio_clips',
    'audio_convergence_log','canonical_pod_walk_steps',
    'canonical_script_versions','language_canonical','relink_refusals',
    'voice_language_roles'];
  actual text[];
BEGIN
  SELECT array_agg(relname ORDER BY relname) INTO actual FROM _lock_set;
  IF actual IS DISTINCT FROM (SELECT array_agg(x ORDER BY x) FROM unnest(expected) x) THEN
    RAISE EXCEPTION 'SET MISMATCH: live catalogue returned % not the audited 22: %',
      cardinality(actual), actual;
  END IF;
  RAISE NOTICE 'set pinned: 22 tables match the audit';
END $$;

-- ---------------------------------------------------------------------------
-- 1. Revoke every privilege on the 22 from anon, authenticated and PUBLIC.
--    (PUBLIC holds nothing on these today; revoked anyway so a later
--     GRANT ... TO PUBLIC cannot reopen them by accident.)
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT relname FROM _lock_set ORDER BY relname LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated, PUBLIC', r.relname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Sequences owned by those tables. anon holding USAGE/UPDATE on a sequence
--    for a table it can no longer insert into is a leftover, not a need.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT s.relname
    FROM pg_class s
    JOIN pg_depend d ON d.objid = s.oid AND d.classid = 'pg_class'::regclass AND d.deptype = 'a'
    JOIN _lock_set t ON t.oid = d.refobjid
    WHERE s.relkind = 'S'
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE public.%I FROM anon, authenticated, PUBLIC', r.relname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. The three audio-linking functions. All are SECURITY INVOKER, so step 1
--    already closes the path they open; the EXECUTE grant is revoked as well
--    so the door is shut at both ends. service_role and postgres keep EXECUTE
--    explicitly, so Popty's audio-linking path cannot be collateral damage.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.link_all_audio_ids(text)            FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.link_audio_to_content()             FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.course_audio_link_canonical_clip()  FROM anon, authenticated, PUBLIC;

GRANT  EXECUTE ON FUNCTION public.link_all_audio_ids(text)            TO service_role, postgres;
GRANT  EXECUTE ON FUNCTION public.link_audio_to_content()             TO service_role, postgres;
GRANT  EXECUTE ON FUNCTION public.course_audio_link_canonical_clip()  TO service_role, postgres;

-- ---------------------------------------------------------------------------
-- 4. The reason these arrived open in the first place. pg_default_acl carries
--    an entry for role postgres on schema public granting arwdDxtm to anon and
--    authenticated, so every CREATE TABLE lands grant-open. Close it for
--    TABLES and SEQUENCES. service_role is left untouched.
--
--    FUNCTIONS are deliberately NOT touched: revoking default EXECUTE from
--    authenticated is a wider blast radius than this change's evidence covers.
--
--    LIMIT, stated honestly: supabase_admin carries an identical default ACL
--    on schema public and we are connected as postgres, not a superuser, so we
--    cannot alter it. A table created by the Supabase dashboard (which acts as
--    supabase_admin) will still arrive grant-open. Closing that needs the
--    Supabase dashboard's own SQL editor as supabase_admin, or support.
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. THE CANARY. Everything above is thrown away unless every assertion here
--    passes. A revoke that catches service_role is the outcome that breaks
--    Popty, so service_role is asserted positively, not just anon negatively.
-- ---------------------------------------------------------------------------

-- 5a. anon and authenticated denied on all 22, in all four DML privileges.
DO $$
DECLARE r record; p text; bad text[] := '{}';
BEGIN
  FOR r IN SELECT oid, relname FROM _lock_set LOOP
    FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      IF has_table_privilege('anon', r.oid, p) THEN
        bad := bad || format('anon:%s:%s', r.relname, p);
      END IF;
      IF has_table_privilege('authenticated', r.oid, p) THEN
        bad := bad || format('authenticated:%s:%s', r.relname, p);
      END IF;
    END LOOP;
  END LOOP;
  IF cardinality(bad) > 0 THEN
    RAISE EXCEPTION 'CANARY FAIL (5a): privilege still present: %', bad;
  END IF;
  RAISE NOTICE 'CANARY OK 5a: anon + authenticated denied SELECT/INSERT/UPDATE/DELETE on all 22';
END $$;

-- 5b. service_role and postgres keep everything on all 22.
DO $$
DECLARE r record; p text; bad text[] := '{}';
BEGIN
  FOR r IN SELECT oid, relname FROM _lock_set LOOP
    FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
      IF NOT has_table_privilege('service_role', r.oid, p) THEN
        bad := bad || format('service_role:%s:%s', r.relname, p);
      END IF;
      IF NOT has_table_privilege('postgres', r.oid, p) THEN
        bad := bad || format('postgres:%s:%s', r.relname, p);
      END IF;
    END LOOP;
  END LOOP;
  IF cardinality(bad) > 0 THEN
    RAISE EXCEPTION 'CANARY FAIL (5b): service_role/postgres LOST a privilege: %', bad;
  END IF;
  RAISE NOTICE 'CANARY OK 5b: service_role + postgres retain all 7 privileges on all 22';
END $$;

-- 5c. Functions: anon/authenticated/PUBLIC denied, service_role/postgres keep EXECUTE.
DO $$
DECLARE f oid; bad text[] := '{}';
BEGIN
  FOREACH f IN ARRAY ARRAY[
      'public.link_all_audio_ids(text)'::regprocedure::oid,
      'public.link_audio_to_content()'::regprocedure::oid,
      'public.course_audio_link_canonical_clip()'::regprocedure::oid] LOOP
    IF has_function_privilege('anon', f, 'EXECUTE')          THEN bad := bad || format('anon:%s', f::regprocedure); END IF;
    IF has_function_privilege('authenticated', f, 'EXECUTE') THEN bad := bad || format('authenticated:%s', f::regprocedure); END IF;
    IF NOT has_function_privilege('service_role', f, 'EXECUTE') THEN bad := bad || format('LOST service_role:%s', f::regprocedure); END IF;
    IF NOT has_function_privilege('postgres', f, 'EXECUTE')      THEN bad := bad || format('LOST postgres:%s', f::regprocedure); END IF;
  END LOOP;
  IF cardinality(bad) > 0 THEN
    RAISE EXCEPTION 'CANARY FAIL (5c): function EXECUTE wrong: %', bad;
  END IF;
  RAISE NOTICE 'CANARY OK 5c: 3 functions closed to anon/authenticated, open to service_role/postgres';
END $$;

-- 5d. Default privileges: postgres/public/tables+sequences no longer mention
--     anon or authenticated.
DO $$
DECLARE acl text; bad text[] := '{}';
BEGIN
  FOR acl IN
    SELECT unnest(d.defaclacl)::text
    FROM pg_default_acl d
    JOIN pg_namespace n ON n.oid = d.defaclnamespace
    WHERE n.nspname = 'public'
      AND pg_get_userbyid(d.defaclrole) = 'postgres'
      AND d.defaclobjtype IN ('r','S')
  LOOP
    IF acl LIKE 'anon=%' OR acl LIKE 'authenticated=%' THEN
      bad := bad || acl;
    END IF;
  END LOOP;
  IF cardinality(bad) > 0 THEN
    RAISE EXCEPTION 'CANARY FAIL (5d): default ACL still grants: %', bad;
  END IF;
  RAISE NOTICE 'CANARY OK 5d: postgres default ACL on public tables+sequences no longer grants anon/authenticated';
END $$;

-- 5e. Behavioural, not just catalogue: actually become anon and be refused,
--     then actually become service_role and succeed. The failing SELECT runs
--     in a subtransaction so the outer transaction survives it, and leaves no
--     residue.
DO $$
DECLARE n bigint;
BEGIN
  PERFORM set_config('role', 'anon', true);
  BEGIN
    EXECUTE 'SELECT count(*) FROM public.audio_clips' INTO n;
    PERFORM set_config('role', 'postgres', true);
    RAISE EXCEPTION 'CANARY FAIL (5e): anon still read audio_clips, got % rows', n;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;  -- expected
  END;
  PERFORM set_config('role', 'postgres', true);
  RAISE NOTICE 'CANARY OK 5e: anon SELECT on audio_clips raised insufficient_privilege';
END $$;

RESET ROLE;

DO $$
DECLARE n bigint;
BEGIN
  PERFORM set_config('role', 'service_role', true);
  EXECUTE 'SELECT count(*) FROM public.audio_clips' INTO n;
  PERFORM set_config('role', 'postgres', true);
  IF n IS NULL THEN
    RAISE EXCEPTION 'CANARY FAIL (5f): service_role read returned NULL';
  END IF;
  RAISE NOTICE 'CANARY OK 5f: service_role still reads audio_clips (% rows)', n;
END $$;

RESET ROLE;

-- 5g. The control. course_seeds is NOT in the set and must be untouched, so
--     the external "after" probe proves a revoke rather than an outage.
DO $$
BEGIN
  IF NOT has_table_privilege('anon', 'public.course_seeds', 'SELECT') THEN
    RAISE EXCEPTION 'CANARY FAIL (5g): control table course_seeds lost anon SELECT';
  END IF;
  RAISE NOTICE 'CANARY OK 5g: control table course_seeds still readable by anon';
END $$;

COMMIT;
