-- Undo for weave-cym-nv2-keep-ten.sql (job #991): puts the ten drop rows back byte-identical
-- from backup_cym_nv2_drops_991 (same reason, decided_by, decided_at), so cym_nv2_for_eng's
-- running order returns to 913 with 71 drops. Nothing else is touched.
-- Dry run unless invoked with  -v finish=COMMIT .
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
DO $$ BEGIN
  IF to_regclass('backup_cym_nv2_drops_991') IS NULL THEN RAISE EXCEPTION 'backup missing'; END IF;
  IF (SELECT count(*) FROM backup_cym_nv2_drops_991) <> 10 THEN RAISE EXCEPTION 'backup is not ten rows'; END IF;
END $$;
INSERT INTO course_seed_weave_drops SELECT * FROM backup_cym_nv2_drops_991;
DO $$ BEGIN
  IF (SELECT count(*) FROM course_seed_weave_drops WHERE course_code='cym_nv2_for_eng') <> 71
     OR (SELECT count(*) FROM course_running_order WHERE course_code='cym_nv2_for_eng') <> 913 THEN
    RAISE EXCEPTION 'CHECK FAILED: expected 71 drops / 913 in order after undo'; END IF;
  RAISE NOTICE 'undo checks passed';
END $$;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
