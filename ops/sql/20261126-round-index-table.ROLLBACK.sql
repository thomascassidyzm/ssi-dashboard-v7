-- ROLLBACK of ops/sql/20261126-round-index-table.sql (cs #533·AL).
-- Puts the materialised view back under its own name, refreshed, with the
-- table's grants; re-points dependent views at it; drops the rebuild functions,
-- the source view and the table. services/shared/round-index-refresh.cjs then
-- finds no course_round_index_rebuild(text) and goes back to the whole-view
-- REFRESH by itself — no code change needed.
--   sudo -u popty -H tools/migrations-20261126-round-index-table.sh rollback
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
  IF (SELECT relkind FROM pg_class WHERE oid = to_regclass('public.course_round_index')) IS DISTINCT FROM 'r'
     OR to_regclass('public.course_round_index_matview_pre533') IS NULL THEN
    RAISE EXCEPTION 'nothing to roll back: course_round_index is not the #533 table, or the kept matview is gone';
  END IF;
END $guard$;

CREATE TEMP TABLE round_index_dependents ON COMMIT DROP AS
SELECT DISTINCT c.oid, format('%I.%I', n.nspname, c.relname) AS name,
       pg_get_viewdef(c.oid) AS def, c.reloptions
FROM pg_depend d
JOIN pg_rewrite r ON r.oid = d.objid
JOIN pg_class c ON c.oid = r.ev_class
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE d.refobjid = 'public.course_round_index'::regclass
  AND c.oid <> 'public.course_round_index'::regclass
  AND c.relname <> 'course_round_index_source';

DROP FUNCTION public.course_round_index_rebuild_all();
DROP FUNCTION public.course_round_index_rebuild(text);

ALTER TABLE public.course_round_index RENAME TO course_round_index_table_533;
ALTER INDEX public.idx_course_round_index_pk   RENAME TO idx_course_round_index_table_533_pk;
ALTER INDEX public.idx_course_round_index_lego RENAME TO idx_course_round_index_table_533_lego;
ALTER MATERIALIZED VIEW public.course_round_index_matview_pre533 RENAME TO course_round_index;
ALTER INDEX public.idx_course_round_index_matview_pre533_pk   RENAME TO idx_course_round_index_pk;
ALTER INDEX public.idx_course_round_index_matview_pre533_lego RENAME TO idx_course_round_index_lego;
REFRESH MATERIALIZED VIEW public.course_round_index;

-- Grants back as the matview always had them: the table's, which were the
-- matview's own copied at apply (anon/authenticated cut to SELECT there; a
-- matview cannot be written anyway).
DO $acl$
DECLARE g record;
BEGIN
  FOR g IN
    SELECT DISTINCT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(r.rolname) END AS who, a.privilege_type
    FROM pg_class c, aclexplode(c.relacl) a
    LEFT JOIN pg_roles r ON r.oid = a.grantee
    WHERE c.oid = 'public.course_round_index_table_533'::regclass AND a.grantee <> c.relowner
  LOOP
    EXECUTE format('GRANT %s ON public.course_round_index TO %s', g.privilege_type, g.who);
  END LOOP;
END $acl$;

DO $deps$
DECLARE v record;
BEGIN
  FOR v IN SELECT * FROM round_index_dependents LOOP
    EXECUTE format('CREATE OR REPLACE VIEW %s %s AS %s', v.name,
      CASE WHEN v.reloptions IS NULL THEN '' ELSE 'WITH (' || array_to_string(v.reloptions, ', ') || ')' END,
      regexp_replace(v.def, ';\s*$', ''));
  END LOOP;
END $deps$;

DROP VIEW public.course_round_index_source;
DROP TABLE public.course_round_index_table_533;

COMMENT ON MATERIALIZED VIEW public.course_round_index IS
  'Round numbers. Ordered by course_running_order position when the course has a course_seed_weave row, else by seed_number (job #949). Restored by the cs #533·AL rollback.';
SELECT 'finishing with' AS k, :'finish' AS v;
:finish;
NOTIFY pgrst, 'reload schema';
