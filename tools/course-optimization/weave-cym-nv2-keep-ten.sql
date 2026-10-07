-- Job #991 (Aran's ruling 2026-10-07 17:26Z): KEEP BOTH for the ten old seeds in 138-316 that
-- #949/#974 dropped although their content goes beyond the HC seed that replaced them
-- (published list: https://watson-1.tail4968cb.ts.net/d/da5e6773).
--   * The HC seed stays where it is (in the block).
--   * The old seed comes back to the running order in its normal later place: its drop row is
--     deleted, nothing else. No seed, LEGO or phrase row is written.
--   * Each restored old seed INTRODUCES ONLY ITS EXTRA LEGOs: any LEGO already introduced
--     earlier in the running order (by its HC partner or anything before it) is not new for it.
--     A mutated form counts as already introduced (Gymraeg/Cymraeg, fedra/medra: Aran 17:25Z).
--     Recorded in content_edit_events (operation 'weave-keep-both', detail.rule / detail.pairs),
--     the only near-pair record #974 kept being its plan doc. Today no is_new flag needs to
--     change: the HC partners have no LEGOs yet, so nothing earlier introduces these LEGOs.
--     When the HC block is built, the 6 released seeds below (258-288) must have is_new
--     re-checked against the order; the 4 drafts (307-314) get it right when first built.
-- Dry run unless invoked with  -v finish=COMMIT . Undo: weave-cym-nv2-keep-ten-undo.sql.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '15min';  -- the all-courses fingerprint outruns the default
\ir weave-fingerprint-fn.sql
CREATE TEMP TABLE kt_pre AS SELECT * FROM pg_temp.others_fingerprint();
CREATE TEMP TABLE kt_content_pre AS
  SELECT 'seeds' t, md5(string_agg(md5(x::text), '' ORDER BY x.id)) h FROM course_seeds x WHERE x.course_code='cym_nv2_for_eng'
  UNION ALL SELECT 'legos', md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code='cym_nv2_for_eng'
  UNION ALL SELECT 'phrases', md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code='cym_nv2_for_eng'
  UNION ALL SELECT 'weave', md5(string_agg(md5(x::text), '' ORDER BY x.course_code)) FROM course_seed_weave x;

CREATE TEMP TABLE keep_ten (old_seed int PRIMARY KEY, hc_seed int, extra text);
INSERT INTO keep_ten VALUES
  (258, 1460, 'where I can buy some postcards'),
  (263, 1470, 'for a rest'),
  (266, 1475, 'for the end of the second half'),
  (273, 1487, 'on the other side of that yellow line'),
  (281, 1499, 'actually'),
  (288, 1508, 'for a new bed'),
  (307, 1537, 'I used to think that making mistakes was bad'),
  (310, 1542, 'it''s a good idea to try to breathe slowly'),
  (313, 1546, 'because he''s been playing in the mud'),
  (314, 1548, 'because I must be quiet');

DO $$ BEGIN
  IF (SELECT count(*) FROM course_seed_weave_drops WHERE course_code='cym_nv2_for_eng') <> 71
     OR (SELECT count(*) FROM course_running_order WHERE course_code='cym_nv2_for_eng') <> 913 THEN
    RAISE EXCEPTION 'expected 71 drops / 913 in order; already applied?'; END IF;
  IF (SELECT count(*) FROM course_seed_weave_drops d JOIN keep_ten k ON k.old_seed=d.seed_number
      WHERE d.course_code='cym_nv2_for_eng') <> 10 THEN
    RAISE EXCEPTION 'not all ten are drop rows'; END IF;
  IF (SELECT count(*) FROM course_running_order o JOIN keep_ten k ON k.hc_seed=o.seed_number
      WHERE o.course_code='cym_nv2_for_eng' AND o.in_block) <> 10 THEN
    RAISE EXCEPTION 'an HC partner is not in the running order'; END IF;
END $$;

-- Backup of the ten drop rows exactly as they stand (service-role only). The undo restores from it.
CREATE TABLE backup_cym_nv2_drops_991 AS
  SELECT d.* FROM course_seed_weave_drops d JOIN keep_ten k ON k.old_seed=d.seed_number
  WHERE d.course_code='cym_nv2_for_eng';
REVOKE ALL ON backup_cym_nv2_drops_991 FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
SELECT 'cym_nv2_for_eng', 'sql:job-991 weave-cym-nv2-keep-ten', 'weave-keep-both', 'agent', 'claude-weave-cym-nv2-keep-ten',
       'agent (claude-weave-cym-nv2-keep-ten)', false, 'creator',
       jsonb_build_object('restored_to_running_order', (SELECT jsonb_agg(old_seed ORDER BY old_seed) FROM keep_ten)),
       jsonb_build_object(
         'ruling', 'Aran 2026-10-07 17:26Z: keep both; HC seed stays, old seed restored in its normal later place',
         'rule', 'restored old seed introduces only LEGOs not already introduced earlier in the running order; mutated forms count as introduced (Aran 17:25Z)',
         'backup', 'backup_cym_nv2_drops_991',
         'pairs', (SELECT jsonb_agg(jsonb_build_object('old_seed', old_seed, 'hc_seed', hc_seed, 'extra', extra) ORDER BY old_seed) FROM keep_ten));

DELETE FROM course_seed_weave_drops d USING keep_ten k
WHERE d.course_code='cym_nv2_for_eng' AND d.seed_number=k.old_seed;

-- ── Checks ───────────────────────────────────────────────────────────────────
CREATE TEMP TABLE kt_post AS SELECT * FROM pg_temp.others_fingerprint();
DO $$
DECLARE c text := 'cym_nv2_for_eng';
BEGIN
  IF (SELECT count(*) FROM kt_pre) < 10 OR EXISTS (SELECT * FROM kt_pre EXCEPT SELECT * FROM kt_post)
     OR EXISTS (SELECT * FROM kt_post EXCEPT SELECT * FROM kt_pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: something outside the sandbox changed'; END IF;
  IF EXISTS (SELECT * FROM kt_content_pre EXCEPT (
             SELECT 'seeds', md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code=c
             UNION ALL SELECT 'legos', md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code=c
             UNION ALL SELECT 'phrases', md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code=c
             UNION ALL SELECT 'weave', md5(string_agg(md5(x::text), '' ORDER BY x.course_code)) FROM course_seed_weave x)) THEN
    RAISE EXCEPTION 'CHECK FAILED: a sandbox seed/LEGO/phrase or the weave setting changed'; END IF;
  IF (SELECT count(*) FROM course_seed_weave_drops WHERE course_code=c) <> 61 THEN RAISE EXCEPTION 'CHECK FAILED: drops <> 61'; END IF;
  IF (SELECT count(*) FROM course_running_order WHERE course_code=c) <> 923
     OR (SELECT max(position) FROM course_running_order WHERE course_code=c) <> 923 THEN RAISE EXCEPTION 'CHECK FAILED: order <> 923'; END IF;
  -- Each restored seed plays after its HC partner, and among the old 138+ tail.
  IF EXISTS (SELECT 1 FROM keep_ten k
             JOIN course_running_order o ON o.course_code=c AND o.seed_number=k.old_seed
             JOIN course_running_order h ON h.course_code=c AND h.seed_number=k.hc_seed
             WHERE o.in_block OR o.position <= h.position) THEN
    RAISE EXCEPTION 'CHECK FAILED: a restored seed is not after its HC partner'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;

SELECT o.position, o.seed_number, left(s.known_text, 60) known
FROM course_running_order o JOIN course_seeds s USING (course_code, seed_number)
JOIN keep_ten k ON k.old_seed=o.seed_number WHERE o.course_code='cym_nv2_for_eng' ORDER BY 1;
SELECT 'drops' k, count(*) FROM course_seed_weave_drops WHERE course_code='cym_nv2_for_eng'
UNION ALL SELECT 'running order length', count(*) FROM course_running_order WHERE course_code='cym_nv2_for_eng';
SELECT 'finishing with' k, :'finish' v;
:finish;
-- After COMMIT: the sandbox's rounds follow the order, so refresh them (cannot run in a transaction).
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
