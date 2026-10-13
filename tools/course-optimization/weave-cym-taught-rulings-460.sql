-- Job #460 (Aran 2026-10-13, review af51153f): 20 LEGOs in the hidden Welsh sandboxes are marked already taught
-- (is_new=false): 1 North (cym_nv2_for_eng), 19 South (cym_sv2_for_eng). 5 South LEGOs Aran ruled "keep as new"
-- are asserted is_new=true and NOT written. Only is_new + last_edit_event_id change. No phrases, text or audio.
-- Fingerprints printed before/after for live cym_n_for_eng, cym_s_for_eng and master canonical_seeds.
-- The hard check covers the three named fingerprints only: whole-table hashes of other courses move on a busy shared DB (other workers), so they are printed for the record but not asserted.
-- Dry run unless invoked with  -v finish=COMMIT . Undo: weave-cym-taught-rulings-460-undo.sql.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
SET LOCAL statement_timeout = '20min';
CREATE FUNCTION pg_temp.fp() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'courses', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.course_code)) FROM courses x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'course_seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'course_legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'course_practice_phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'live cym_n_for_eng legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code='cym_n_for_eng'
  UNION ALL SELECT 'live cym_s_for_eng legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code='cym_s_for_eng'
  UNION ALL SELECT 'sandbox phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng')
$$;
CREATE TEMP TABLE pre AS SELECT * FROM pg_temp.fp();
SELECT 'BEFORE' k, * FROM pre ORDER BY t;

CREATE TEMP TABLE flip (course_code text, seed_number int, lego_index int, want_new boolean, PRIMARY KEY (course_code, seed_number, lego_index));
INSERT INTO flip VALUES
 ('cym_nv2_for_eng',1092,3,false),
 ('cym_sv2_for_eng',1155,1,false),('cym_sv2_for_eng',1159,1,false),('cym_sv2_for_eng',1303,2,false),('cym_sv2_for_eng',1355,1,false),
 ('cym_sv2_for_eng',1359,2,false),('cym_sv2_for_eng',1360,1,false),('cym_sv2_for_eng',1387,1,false),('cym_sv2_for_eng',1397,1,false),
 ('cym_sv2_for_eng',1400,1,false),('cym_sv2_for_eng',1407,1,false),('cym_sv2_for_eng',1409,2,false),('cym_sv2_for_eng',1432,2,false),
 ('cym_sv2_for_eng',1442,1,false),('cym_sv2_for_eng',1474,4,false),('cym_sv2_for_eng',1504,2,false),('cym_sv2_for_eng',1505,4,false),
 ('cym_sv2_for_eng',1506,6,false),('cym_sv2_for_eng',1563,2,false),('cym_sv2_for_eng',1584,2,false),
 ('cym_sv2_for_eng',1054,2,true),('cym_sv2_for_eng',1276,2,true),('cym_sv2_for_eng',1428,1,true),('cym_sv2_for_eng',1447,1,true),('cym_sv2_for_eng',1512,4,true);

DO $$ BEGIN
  IF to_regclass('backup_cym_taught_rulings_460') IS NOT NULL THEN RAISE EXCEPTION 'already applied'; END IF;
  IF (SELECT count(*) FROM flip WHERE NOT want_new)<>20 OR (SELECT count(*) FROM flip WHERE want_new)<>5 THEN RAISE EXCEPTION 'unexpected list sizes'; END IF;
  IF (SELECT count(*) FROM flip f JOIN course_legos l USING (course_code,seed_number,lego_index))<>25 THEN RAISE EXCEPTION 'an id does not resolve'; END IF;
  IF (SELECT count(*) FROM flip f JOIN course_legos l USING (course_code,seed_number,lego_index) WHERE f.want_new AND NOT l.is_new)<>0 THEN
    RAISE EXCEPTION 'a keep-as-new LEGO is not new (needs a ruling, not an automatic flip)'; END IF;
END $$;

CREATE TABLE backup_cym_taught_rulings_460 AS
  SELECT l.id, l.course_code, l.seed_number, l.lego_index, l.is_new, l.last_edit_event_id
  FROM course_legos l JOIN flip f USING (course_code,seed_number,lego_index) WHERE NOT f.want_new;
REVOKE ALL ON backup_cym_taught_rulings_460 FROM anon, authenticated;

CREATE TEMP TABLE ev (course_code text PRIMARY KEY, id uuid);
WITH e AS (
  INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
  SELECT c.course_code, 'sql:job-460 weave-cym-taught-rulings', 'weave-taught-rulings', 'agent', 'claude-job-460-taught-rulings',
         'agent (claude-job-460-taught-rulings)', false, 'creator',
         jsonb_build_object('lego_keys', (SELECT jsonb_agg(seed_number||':'||lego_index ORDER BY seed_number, lego_index) FROM flip f WHERE f.course_code=c.course_code AND NOT want_new)),
         jsonb_build_object(
           'ruling', 'Aran 2026-10-13 (review af51153f): these LEGOs are already taught (is_new=false). The five South LEGOs 1054:2, 1276:2, 1428:1, 1447:1, 1512:4 stay new (verified, not written).',
           'backup', 'backup_cym_taught_rulings_460',
           'count', (SELECT count(*) FROM flip f WHERE f.course_code=c.course_code AND NOT want_new))
  FROM (VALUES ('cym_nv2_for_eng'),('cym_sv2_for_eng')) c(course_code)
  RETURNING course_code, id)
INSERT INTO ev SELECT course_code, id FROM e;

UPDATE course_legos l SET is_new=false, last_edit_event_id=ev.id
FROM flip f JOIN ev USING (course_code)
WHERE NOT f.want_new AND l.course_code=f.course_code AND l.seed_number=f.seed_number AND l.lego_index=f.lego_index;

CREATE TEMP TABLE post AS SELECT * FROM pg_temp.fp();
SELECT 'AFTER' k, * FROM post ORDER BY t;
DO $$ BEGIN
  IF EXISTS (SELECT * FROM pre WHERE t IN ('canonical_seeds (master)','live cym_n_for_eng legos','live cym_s_for_eng legos') EXCEPT SELECT * FROM post) THEN RAISE EXCEPTION 'CHECK FAILED: something outside the flags changed'; END IF;
  IF (SELECT count(*) FROM flip f JOIN course_legos l USING (course_code,seed_number,lego_index) WHERE l.is_new = f.want_new)<>25 THEN RAISE EXCEPTION 'CHECK FAILED: end state wrong'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT course_code, count(*) FILTER (WHERE NOT is_new) taught_in_list, count(*) FILTER (WHERE is_new) new_in_list FROM flip JOIN course_legos USING (course_code,seed_number,lego_index) GROUP BY 1;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
