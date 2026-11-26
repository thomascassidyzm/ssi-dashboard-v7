-- ============================================================================
-- THE ROUND MAP BECOMES A TABLE, REBUILT ONE COURSE AT A TIME (cs #533·AL).
--
-- WHY. course_round_index is a materialised view, and PostgreSQL can only
-- refresh a materialised view whole. Every content write rebuilt the round map
-- for EVERY course: on the night of 25-26 Nov that refresh was up to 46% of all
-- active backend samples on the live database in an hour and tripped Supabase's
-- >80% CPU alarm (#528·AL, https://watson-1.tail4968cb.ts.net/d/037ac318).
-- Tom, 26 Nov: "ok, that's dumb that each Kai edit does this".
--
-- WHAT.
--   course_round_index_source   a plain VIEW whose definition is the LIVE
--                               matview's own, copied by pg_get_viewdef at run
--                               time — so it cannot differ from what learners
--                               get today, and it is the ONE definition from
--                               now on (both functions select from it).
--   course_round_index          an ordinary TABLE, same name, same columns,
--                               same two unique indexes (the (course_code,
--                               round_index) one is now its primary key), same
--                               readers. anon/authenticated keep exactly what
--                               they can do today, which is READ: the matview
--                               could not be written, so their copied grants
--                               are cut to SELECT, and RLS with a read-all
--                               policy backs that up.
--   course_round_index_rebuild(course)   rebuilds one course as a DIFF, in one
--                               transaction: only rows that changed are
--                               rewritten, an unchanged course writes nothing,
--                               readers never see the course empty. Returns
--                               the number of rows changed.
--   course_round_index_rebuild_all()     every course, for manual use.
--   Every view that depends on the matview (course_stats on 25 Nov) is
--   re-pointed at the table with its definition and options as they are.
--   The old matview is kept as course_round_index_matview_pre533, readable only
--   by its owner, so the rollback is a rename back.
--
-- CODE ORDER. services/shared/round-index-refresh.cjs checks for
-- course_round_index_rebuild(text) on every run: before this migration it
-- REFRESHes the whole matview, after it it rebuilds the edited course. So the
-- code is on main first and this can run at any time, and the rollback
-- returns the code to the whole-view path by itself.
--
-- KNOWN CASUALTIES. Dated one-off scripts in tools/course-optimization/ (the
-- weave-cym-*.sql family, rechunk-short-legos/clone.cjs) end with
-- REFRESH MATERIALIZED VIEW course_round_index. After this they fail at that
-- line, loudly. They are past runs; none is on a timer.
--
-- LOCKS. Everything heavy (the source view, the new table, its rows and
-- indexes) is built BEFORE the swap. The swap's renames take ACCESS EXCLUSIVE
-- on the matview until COMMIT, which is milliseconds after; lock_timeout 5s
-- means a long reader makes this fail rather than queue learners behind it.
--
--   sudo -u popty -H tools/migrations-20261126-round-index-table.sh apply
--   ROLLBACK: ops/sql/20261126-round-index-table.ROLLBACK.sql
-- ============================================================================
\set ON_ERROR_STOP on
-- COMMITs only with  -v finish=COMMIT  (the runner's apply/rollback modes); otherwise a dry run.
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

DO $guard$
BEGIN
  IF (SELECT relkind FROM pg_class WHERE oid = to_regclass('public.course_round_index')) IS DISTINCT FROM 'm' THEN
    RAISE EXCEPTION 'course_round_index is not a materialised view — already applied?';
  END IF;
  IF to_regclass('public.course_round_index_matview_pre533') IS NOT NULL
     OR to_regclass('public.course_round_index_source') IS NOT NULL THEN
    RAISE EXCEPTION 'leftovers of an earlier run exist (course_round_index_matview_pre533 / _source)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_rewrite r ON r.oid = d.objid
               JOIN pg_class c ON c.oid = r.ev_class
              WHERE d.refobjid = 'public.course_round_index'::regclass
                AND c.oid <> 'public.course_round_index'::regclass AND c.relkind <> 'v') THEN
    RAISE EXCEPTION 'a non-view object depends on course_round_index — re-pointing it is not handled here';
  END IF;
END $guard$;

-- 1. The one definition: the live matview's own text.
DO $src$
BEGIN
  EXECUTE 'CREATE VIEW public.course_round_index_source AS '
    || regexp_replace(pg_get_viewdef('public.course_round_index'::regclass), ';\s*$', '');
END $src$;
REVOKE ALL ON public.course_round_index_source FROM PUBLIC;
DO $rv$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON public.course_round_index_source FROM %I', r);
    END IF;
  END LOOP;
END $rv$;
COMMENT ON VIEW public.course_round_index_source IS
  'THE definition of the round map (cs #533·AL). course_round_index is a table rebuilt from this by course_round_index_rebuild(course). Change the round map by replacing THIS view.';

-- 2. The views that read the matview, captured BEFORE any rename so their text
--    still names course_round_index.
CREATE TEMP TABLE round_index_dependents ON COMMIT DROP AS
SELECT DISTINCT c.oid, format('%I.%I', n.nspname, c.relname) AS name,
       pg_get_viewdef(c.oid) AS def, c.reloptions
FROM pg_depend d
JOIN pg_rewrite r ON r.oid = d.objid
JOIN pg_class c ON c.oid = r.ev_class
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE d.refobjid = 'public.course_round_index'::regclass
  AND c.oid <> 'public.course_round_index'::regclass;
SELECT 'dependent view' AS k, name FROM round_index_dependents ORDER BY name;
-- Who can read the round map today: after the swap each of them still must.
CREATE TEMP TABLE round_index_old_readers ON COMMIT DROP AS
SELECT rolname FROM pg_roles
WHERE has_table_privilege(oid, 'public.course_round_index', 'SELECT');

-- 3. The table, built and filled beside the matview.
CREATE TABLE public.course_round_index_next (LIKE public.course_round_index);
ALTER TABLE public.course_round_index_next
  ALTER COLUMN course_code SET NOT NULL,
  ALTER COLUMN round_index SET NOT NULL,
  ALTER COLUMN lego_id SET NOT NULL;
INSERT INTO public.course_round_index_next SELECT * FROM public.course_round_index_source;
CREATE UNIQUE INDEX idx_course_round_index_next_pk   ON public.course_round_index_next (course_code, round_index);
CREATE UNIQUE INDEX idx_course_round_index_next_lego ON public.course_round_index_next (course_code, lego_id);

-- What the swap changes for learners: courses whose stored matview rows differ
-- from a fresh computation (stale since the last refresh). Expected: none, or a
-- course somebody edited in the last minute.
SELECT 'stale in matview, fixed by the swap' AS k, course_code, count(*) AS rows FROM (
  (SELECT * FROM public.course_round_index_next EXCEPT SELECT * FROM public.course_round_index)
  UNION ALL
  (SELECT * FROM public.course_round_index EXCEPT SELECT * FROM public.course_round_index_next)
) s GROUP BY course_code ORDER BY course_code;

-- 4. The swap.
ALTER MATERIALIZED VIEW public.course_round_index RENAME TO course_round_index_matview_pre533;
ALTER INDEX public.idx_course_round_index_pk   RENAME TO idx_course_round_index_matview_pre533_pk;
ALTER INDEX public.idx_course_round_index_lego RENAME TO idx_course_round_index_matview_pre533_lego;
ALTER TABLE public.course_round_index_next RENAME TO course_round_index;
ALTER INDEX public.idx_course_round_index_next_pk   RENAME TO idx_course_round_index_pk;
ALTER INDEX public.idx_course_round_index_next_lego RENAME TO idx_course_round_index_lego;
ALTER TABLE public.course_round_index
  ADD CONSTRAINT idx_course_round_index_pk PRIMARY KEY USING INDEX idx_course_round_index_pk;

-- 5. Grants: whatever the matview had, copied; anon and authenticated READ only.
DO $acl$
DECLARE g record;
BEGIN
  FOR g IN
    SELECT DISTINCT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(r.rolname) END AS who,
           coalesce(r.rolname, 'PUBLIC') AS rolname, a.privilege_type
    FROM pg_class c, aclexplode(c.relacl) a
    LEFT JOIN pg_roles r ON r.oid = a.grantee
    WHERE c.oid = 'public.course_round_index_matview_pre533'::regclass
      AND a.grantee <> c.relowner
  LOOP
    IF g.rolname IN ('anon', 'authenticated', 'PUBLIC') AND g.privilege_type <> 'SELECT' THEN CONTINUE; END IF;
    EXECUTE format('GRANT %s ON public.course_round_index TO %s', g.privilege_type, g.who);
  END LOOP;
  FOR g IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
    EXECUTE format('REVOKE ALL ON public.course_round_index_matview_pre533 FROM %I', g.rolname);
  END LOOP;
END $acl$;
ALTER TABLE public.course_round_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY course_round_index_read ON public.course_round_index FOR SELECT USING (true);
COMMENT ON TABLE public.course_round_index IS
  'R -> LEGO map for instant-playback, one row per fresh-introduction LEGO per course. A TABLE since cs #533·AL: rebuilt per course by course_round_index_rebuild(course) after content writes (services/shared/round-index-refresh.cjs) and by the nightly. Definition: course_round_index_source. Cache-busting key is courses.version.';

-- 6. Re-point the dependent views at the table, definition and options as they were.
DO $deps$
DECLARE v record;
BEGIN
  FOR v IN SELECT * FROM round_index_dependents LOOP
    EXECUTE format('CREATE OR REPLACE VIEW %s %s AS %s', v.name,
      CASE WHEN v.reloptions IS NULL THEN '' ELSE 'WITH (' || array_to_string(v.reloptions, ', ') || ')' END,
      regexp_replace(v.def, ';\s*$', ''));
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_depend d JOIN pg_rewrite r ON r.oid = d.objid
              WHERE d.refobjid = 'public.course_round_index_matview_pre533'::regclass
                AND r.ev_class <> 'public.course_round_index_matview_pre533'::regclass) THEN
    RAISE EXCEPTION 'a view still reads the old matview after re-pointing';
  END IF;
END $deps$;

-- 7. The rebuilders. The source is read ONCE into an array, so both statements
--    work from one snapshot even if a lego write commits between them. Rows are
--    matched whole; differing rows are removed by round_index (unique and never
--    null per course), and the rows still missing are inserted — after the
--    delete every remaining row is a source row, so no insert can collide.
--    The advisory lock serialises two Popty processes rebuilding one course.
CREATE FUNCTION public.course_round_index_rebuild(p_course_code text) RETURNS integer
  LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE
  src course_round_index_source[];
  removed integer;
  added integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('course_round_index:' || p_course_code));
  SELECT coalesce(array_agg(s), '{}') INTO src FROM course_round_index_source s WHERE s.course_code = p_course_code;

  DELETE FROM course_round_index t
   WHERE t.course_code = p_course_code
     AND t.round_index IN (
       SELECT x.round_index FROM (
         SELECT * FROM course_round_index WHERE course_code = p_course_code
         EXCEPT
         SELECT * FROM unnest(src)) x);
  GET DIAGNOSTICS removed = ROW_COUNT;

  INSERT INTO course_round_index
  SELECT * FROM unnest(src)
  EXCEPT
  SELECT * FROM course_round_index WHERE course_code = p_course_code;
  GET DIAGNOSTICS added = ROW_COUNT;

  RETURN removed + added;
END $fn$;

CREATE FUNCTION public.course_round_index_rebuild_all() RETURNS integer
  LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE c text; n integer := 0;
BEGIN
  FOR c IN SELECT DISTINCT course_code FROM course_round_index_source
           UNION SELECT DISTINCT course_code FROM course_round_index LOOP
    n := n + course_round_index_rebuild(c);
  END LOOP;
  RETURN n;
END $fn$;

-- Owner-only: Supabase exposes public functions over RPC, and nobody outside
-- Popty should be able to make the database rebuild a course.
REVOKE ALL ON FUNCTION public.course_round_index_rebuild(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.course_round_index_rebuild_all() FROM PUBLIC;
DO $rf$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.course_round_index_rebuild(text) FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.course_round_index_rebuild_all() FROM %I', r);
    END IF;
  END LOOP;
END $rf$;

-- 8. Proof before COMMIT: the table equals its source exactly, a rebuild of
--    every course changes nothing, and the learner roles can still read it.
DO $proof$
DECLARE diff bigint; changed integer; r text;
BEGIN
  SELECT count(*) INTO diff FROM (
    (SELECT * FROM course_round_index EXCEPT SELECT * FROM course_round_index_source)
    UNION ALL
    (SELECT * FROM course_round_index_source EXCEPT SELECT * FROM course_round_index)) d;
  IF diff <> 0 THEN RAISE EXCEPTION 'PROOF FAILED: table differs from source by % rows', diff; END IF;
  changed := course_round_index_rebuild_all();
  IF changed <> 0 THEN RAISE EXCEPTION 'PROOF FAILED: an idempotent rebuild changed % rows', changed; END IF;
  FOR r IN SELECT rolname FROM round_index_old_readers LOOP
    IF NOT has_table_privilege(r, 'public.course_round_index', 'SELECT') THEN
      RAISE EXCEPTION 'PROOF FAILED: % could read the round map and now cannot', r;
    END IF;
  END LOOP;
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r)
       AND has_table_privilege(r, 'public.course_round_index', 'INSERT,UPDATE,DELETE,TRUNCATE') THEN
      RAISE EXCEPTION 'PROOF FAILED: % can write course_round_index', r;
    END IF;
  END LOOP;
  RAISE NOTICE 'PROOF PASSED: % rows across % courses',
    (SELECT count(*) FROM course_round_index), (SELECT count(DISTINCT course_code) FROM course_round_index);
END $proof$;

SELECT 'finishing with' AS k, :'finish' AS v;
:finish;
NOTIFY pgrst, 'reload schema';
