-- Job #536 (Aran standing rule: same Welsh, identical or soft-mutated, AND same English taught earlier = already taught).
-- #522 found 6 per Welsh sandbox marked is_new although the same pair was introduced earlier. 5 have another new LEGO in
-- their seed and are flipped is_new=false here; the 7 that are the ONLY new LEGO of their seed are asserted is_new=true and
-- NOT written (flipping them would stop the seed playing). Only is_new + last_edit_event_id change; the flipped LEGOs'
-- phrases are left where they are (dark, as in #460). lego_proof_flags is never touched.
-- Fingerprints printed before/after for live cym_n_for_eng, cym_s_for_eng and master canonical_seeds.
-- Dry run unless invoked with  -v finish=COMMIT . Undo: weave-cym-same-pair-536-undo.sql.
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
 ('cym_nv2_for_eng',188,2,false),('cym_nv2_for_eng',218,2,false),
 ('cym_sv2_for_eng',194,2,false),('cym_sv2_for_eng',230,2,false),('cym_sv2_for_eng',234,2,false),
 ('cym_nv2_for_eng',194,1,true),('cym_nv2_for_eng',195,1,true),('cym_nv2_for_eng',208,1,true),('cym_nv2_for_eng',222,1,true),
 ('cym_sv2_for_eng',205,1,true),('cym_sv2_for_eng',217,1,true),('cym_sv2_for_eng',219,1,true);

DO $$ BEGIN
  IF to_regclass('backup_cym_same_pair_536') IS NOT NULL THEN RAISE EXCEPTION 'already applied'; END IF;
  IF (SELECT count(*) FROM flip WHERE NOT want_new)<>5 OR (SELECT count(*) FROM flip WHERE want_new)<>7 THEN RAISE EXCEPTION 'unexpected list sizes'; END IF;
  IF (SELECT count(*) FROM flip f JOIN course_legos l USING (course_code,seed_number,lego_index))<>12 THEN RAISE EXCEPTION 'an id does not resolve'; END IF;
  IF (SELECT count(*) FROM flip f JOIN course_legos l USING (course_code,seed_number,lego_index) WHERE f.want_new AND NOT l.is_new)<>0 THEN
    RAISE EXCEPTION 'a sole-new LEGO is not new'; END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM flip f WHERE NOT f.want_new AND NOT EXISTS (SELECT 1 FROM course_legos o WHERE o.course_code=f.course_code AND o.seed_number=f.seed_number AND o.lego_index<>f.lego_index AND o.is_new))
  THEN RAISE EXCEPTION 'a flipped LEGO is the only new LEGO of its seed'; END IF;
END $$;

CREATE TABLE backup_cym_same_pair_536 AS
  SELECT l.id, l.course_code, l.seed_number, l.lego_index, l.is_new, l.last_edit_event_id
  FROM course_legos l JOIN flip f USING (course_code,seed_number,lego_index) WHERE NOT f.want_new;
REVOKE ALL ON backup_cym_same_pair_536 FROM anon, authenticated;

CREATE TEMP TABLE ev (course_code text PRIMARY KEY, id uuid);
WITH e AS (
  INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
  SELECT c.course_code, 'sql:job-536 weave-cym-same-pair', 'weave-same-pair', 'agent', 'claude-job-536-same-pair',
         'agent (claude-job-536-same-pair)', false, 'creator',
         jsonb_build_object('lego_keys', (SELECT jsonb_agg(seed_number||':'||lego_index ORDER BY seed_number, lego_index) FROM flip f WHERE f.course_code=c.course_code AND NOT want_new)),
         jsonb_build_object(
           'ruling', 'Aran standing rule: same Welsh (identical or soft-mutated) AND same English taught earlier = already taught. Sole-new-LEGO seeds (N 194:1 195:1 208:1 222:1, S 205:1 217:1 219:1) stay new (verified, not written).',
           'backup', 'backup_cym_same_pair_536',
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
  IF (SELECT count(*) FROM flip f JOIN course_legos l USING (course_code,seed_number,lego_index) WHERE l.is_new = f.want_new)<>12 THEN RAISE EXCEPTION 'CHECK FAILED: end state wrong'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT course_code, count(*) FILTER (WHERE NOT is_new) taught_in_list, count(*) FILTER (WHERE is_new) new_in_list FROM flip JOIN course_legos USING (course_code,seed_number,lego_index) GROUP BY 1;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
