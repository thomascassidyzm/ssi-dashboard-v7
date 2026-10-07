-- course_round_index follows course_running_order when a course has one (job #949).
--
-- Before: round_index = row_number() OVER (PARTITION BY course_code ORDER BY seed_number, lego_index).
-- After:  ORDER BY coalesce(running-order position, seed_number), lego_index, and a woven course's
--         DROPPED seeds (course_seed_weave_drops) contribute no rounds.
-- A course with no course_seed_weave row has no running-order rows, so coalesce() gives
-- seed_number and its rounds are exactly what they were. This script PROVES that before it
-- swaps anything: the new SELECT must equal the live matview, row for row, for every course
-- except the woven ones, or it raises and nothing changes.
--
-- Swap, not drop: the new matview is built beside the old one, then names are exchanged in the
-- same transaction (ACCESS EXCLUSIVE held only from the rename to COMMIT). The old one is kept as
-- course_round_index_pre949 so the rollback is a rename back.
--   ROLLBACK: database/changes/20261007_course_round_index_follows_weave.ROLLBACK.sql
-- Dry run unless invoked with  -v finish=COMMIT .
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
DO $$ BEGIN
  IF to_regclass('course_round_index_pre949') IS NOT NULL THEN RAISE EXCEPTION 'already applied'; END IF;
  IF to_regclass('course_running_order') IS NULL THEN RAISE EXCEPTION 'apply 20261007_course_seed_weave.sql first'; END IF;
END $$;

CREATE MATERIALIZED VIEW course_round_index_next AS
SELECT l.course_code,
       row_number() OVER (PARTITION BY l.course_code
                          ORDER BY coalesce(o.position, l.seed_number), l.lego_index)::integer AS round_index,
       l.lego_id,
       l.seed_number,
       l.lego_index
FROM course_legos l
LEFT JOIN course_running_order o ON o.course_code = l.course_code AND o.seed_number = l.seed_number
WHERE l.is_new = true AND l.lego_id IS NOT NULL
  AND (o.position IS NOT NULL
       OR NOT EXISTS (SELECT 1 FROM course_seed_weave w WHERE w.course_code = l.course_code));

-- The proof: for every non-woven course, the new definition gives exactly the rows the OLD
-- definition gives when computed fresh in this same snapshot, both directions. (Compared to the
-- fresh old definition, not to the stored matview: a stored matview can be stale for a course
-- inserted by direct SQL and never refreshed - cym_sv2_for_eng was, on 2026-10-07 - and that
-- staleness is not this change's to judge. It is reported below; the swap refreshes it, exactly
-- as the next REFRESH that any Popty LEGO edit runs would.)
CREATE TEMP TABLE old_def_fresh AS
SELECT course_code,
       row_number() OVER (PARTITION BY course_code ORDER BY seed_number, lego_index)::integer AS round_index,
       lego_id, seed_number, lego_index
FROM course_legos WHERE is_new = true AND lego_id IS NOT NULL;
DO $$
DECLARE a bigint; b bigint;
BEGIN
  SELECT count(*) INTO a FROM (
    SELECT * FROM old_def_fresh WHERE course_code NOT IN (SELECT course_code FROM course_seed_weave)
    EXCEPT
    SELECT course_code, round_index, lego_id, seed_number, lego_index FROM course_round_index_next
      WHERE course_code NOT IN (SELECT course_code FROM course_seed_weave)) d;
  SELECT count(*) INTO b FROM (
    SELECT course_code, round_index, lego_id, seed_number, lego_index FROM course_round_index_next
      WHERE course_code NOT IN (SELECT course_code FROM course_seed_weave)
    EXCEPT
    SELECT * FROM old_def_fresh WHERE course_code NOT IN (SELECT course_code FROM course_seed_weave)) d;
  IF a <> 0 OR b <> 0 THEN
    RAISE EXCEPTION 'PROOF FAILED: non-woven courses differ (% old-only, % new-only rows)', a, b;
  END IF;
  RAISE NOTICE 'PROOF PASSED: every non-woven course has identical rounds under the new definition (% rows)',
    (SELECT count(*) FROM course_round_index_next WHERE course_code NOT IN (SELECT course_code FROM course_seed_weave));
END $$;
-- Staleness of the stored matview (courses whose stored rounds differ from a fresh refresh):
SELECT 'stored matview stale vs fresh refresh' k, course_code, count(*) FROM (
  (SELECT * FROM old_def_fresh EXCEPT SELECT course_code, round_index, lego_id, seed_number, lego_index FROM course_round_index)
  UNION ALL
  (SELECT course_code, round_index, lego_id, seed_number, lego_index FROM course_round_index EXCEPT SELECT * FROM old_def_fresh)
) s WHERE course_code NOT IN (SELECT course_code FROM course_seed_weave) GROUP BY 2 ORDER BY 2;

CREATE UNIQUE INDEX idx_course_round_index_next_pk   ON course_round_index_next (course_code, round_index);
CREATE UNIQUE INDEX idx_course_round_index_next_lego ON course_round_index_next (course_code, lego_id);

-- Swap. course_stats is the only object that depends on the matview (pg_depend); it is
-- recreated with its exact definition, options and grants.
DROP VIEW course_stats;
ALTER MATERIALIZED VIEW course_round_index RENAME TO course_round_index_pre949;
ALTER INDEX idx_course_round_index_pk   RENAME TO idx_course_round_index_pre949_pk;
ALTER INDEX idx_course_round_index_lego RENAME TO idx_course_round_index_pre949_lego;
ALTER MATERIALIZED VIEW course_round_index_next RENAME TO course_round_index;
ALTER INDEX idx_course_round_index_next_pk   RENAME TO idx_course_round_index_pk;
ALTER INDEX idx_course_round_index_next_lego RENAME TO idx_course_round_index_lego;
GRANT ALL ON course_round_index TO anon, authenticated, service_role;
REVOKE ALL ON course_round_index_pre949 FROM anon, authenticated;

CREATE VIEW course_stats WITH (security_invoker = on) AS
 SELECT course_code,
    (max(round_index))::bigint AS lego_count
   FROM course_round_index
  GROUP BY course_code;
GRANT ALL ON course_stats TO anon, authenticated, service_role;

COMMENT ON MATERIALIZED VIEW course_round_index IS
  'Round numbers. Ordered by course_running_order position when the course has a course_seed_weave row, else by seed_number (job #949).';

SELECT course_code, count(*) rounds, min(round_index), max(round_index) FROM course_round_index
WHERE course_code IN ('cym_nv2_for_eng','cym_n_for_eng','cym_s_for_eng') GROUP BY 1 ORDER BY 1;
SELECT 'finishing with' k, :'finish' v;
:finish;
NOTIFY pgrst, 'reload schema';
