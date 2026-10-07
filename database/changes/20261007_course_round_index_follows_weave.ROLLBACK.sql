-- Rollback for 20261007_course_round_index_follows_weave.sql (job #949): rename the original
-- matview back. It was not refreshed while parked, so refresh it after (outside the transaction):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF to_regclass('course_round_index_pre949') IS NULL THEN RAISE EXCEPTION 'nothing to roll back'; END IF;
END $$;
DROP VIEW course_stats;
ALTER MATERIALIZED VIEW course_round_index RENAME TO course_round_index_949;
ALTER INDEX idx_course_round_index_pk   RENAME TO idx_course_round_index_949_pk;
ALTER INDEX idx_course_round_index_lego RENAME TO idx_course_round_index_949_lego;
ALTER MATERIALIZED VIEW course_round_index_pre949 RENAME TO course_round_index;
ALTER INDEX idx_course_round_index_pre949_pk   RENAME TO idx_course_round_index_pk;
ALTER INDEX idx_course_round_index_pre949_lego RENAME TO idx_course_round_index_lego;
GRANT ALL ON course_round_index TO anon, authenticated, service_role;
CREATE VIEW course_stats WITH (security_invoker = on) AS
 SELECT course_code, (max(round_index))::bigint AS lego_count FROM course_round_index GROUP BY course_code;
GRANT ALL ON course_stats TO anon, authenticated, service_role;
DROP MATERIALIZED VIEW course_round_index_949;
COMMIT;
NOTIFY pgrst, 'reload schema';
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
