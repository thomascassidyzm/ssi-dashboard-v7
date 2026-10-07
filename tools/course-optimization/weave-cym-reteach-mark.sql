-- Job #57 (Aran 2026-10-07): "re-teach" pass over the two hidden Welsh sandboxes, cym_nv2_for_eng (North)
-- and cym_sv2_for_eng (South). An OLD seed that plays after the HC block and re-teaches a word the HC
-- block already taught is marked already taught (is_new = false). Criteria are those of
-- weave-cym-reteach-count.cjs: the first LEGO in running order with the same English sits in an HC seed
-- (id >= 1000) and its Welsh is identical or a SOFT-mutation variant. Nasal and aspirate forms are NOT
-- folded (Aran's ruling; see welsh-mutation.test.cjs) and stay new. Same-Welsh-different-English cases
-- are not touched. Expected: 66 North LEGOs, 73 South LEGOs.
-- Only is_new and last_edit_event_id change; no text, so no audio link moves. No phrases, no audio.
-- Dry run unless invoked with  -v finish=COMMIT . Undo: weave-cym-reteach-mark-undo.sql.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20min';
-- Everything the pass must NOT change: all courses except the two sandboxes, master canonical_seeds,
-- every canonical list. (Live cym_n / cym_s are inside "all courses except the two sandboxes".)
CREATE FUNCTION pg_temp.others_fp() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'courses', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.course_code)) FROM courses x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'course_seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'course_legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'course_practice_phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'lego_introductions', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM lego_introductions x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'course_round_index', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.course_code, x.round_index)) FROM course_round_index x WHERE x.course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'canonical_list_seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_list_seeds x
  UNION ALL SELECT 'canonical_list_assignments', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_list_assignments x
$$;
CREATE TEMP TABLE rt_pre AS SELECT * FROM pg_temp.others_fp();

CREATE TEMP TABLE flip (course_code text, seed_number int, lego_index int, target_text text, taught_by text,
                        PRIMARY KEY (course_code, seed_number, lego_index));
INSERT INTO flip VALUES
  ('cym_nv2_for_eng', 140, 2, 'fel', 'taught as fel @1128'),
  ('cym_nv2_for_eng', 141, 1, 'ydyn nhw?', 'taught as ydyn nhw @1087'),
  ('cym_nv2_for_eng', 141, 2, 'pa mor hen?', 'taught as pa mor hen? @1420'),
  ('cym_nv2_for_eng', 142, 2, 'deg', 'taught as deg @1325'),
  ('cym_nv2_for_eng', 160, 1, 'felly', 'taught as felly @1149'),
  ('cym_nv2_for_eng', 168, 1, 'maen nhw isio', 'taught as maen nhw isio @1209'),
  ('cym_nv2_for_eng', 170, 1, 'cyfarfod fel grŵp', 'taught as cyfarfod fel grŵp @1209'),
  ('cym_nv2_for_eng', 171, 1, 'popeth', 'taught as popeth @1045'),
  ('cym_nv2_for_eng', 171, 2, 'bo’ ni’n gorffen', 'taught as bo’ ni’n gorffen @1200'),
  ('cym_nv2_for_eng', 171, 3, 'gwneud yn siŵr', 'taught as gwneud yn siŵr @1200'),
  ('cym_nv2_for_eng', 171, 4, 'maen nhw’n deud', 'taught as maen nhw’n deud @1200'),
  ('cym_nv2_for_eng', 173, 2, 'mewn pryd', 'taught as mewn pryd @1091'),
  ('cym_nv2_for_eng', 174, 1, 'maen nhw’n meddwl', 'taught as maen nhw’n meddwl @1210'),
  ('cym_nv2_for_eng', 174, 2, 'bo’ ni angen', 'taught as bo’ ni angen @1210'),
  ('cym_nv2_for_eng', 174, 3, 'trafod', 'taught as trafod @1210'),
  ('cym_nv2_for_eng', 176, 1, 'dan ni ddim yn gwybod', 'taught as dan ni ddim yn gwybod @1213'),
  ('cym_nv2_for_eng', 176, 2, 'cyflawni', 'taught as cyflawni @1213'),
  ('cym_nv2_for_eng', 179, 1, 'newid', 'taught as newid @1104'),
  ('cym_nv2_for_eng', 181, 1, 'be’ oedd yn mynd', 'taught as be’ oedd yn mynd @1201'),
  ('cym_nv2_for_eng', 182, 1, 'oeddan ni isio', 'taught as oeddan ni isio @1054'),
  ('cym_nv2_for_eng', 184, 2, 'esbonio', 'taught as esbonio @1008'),
  ('cym_nv2_for_eng', 184, 3, 'doeddan nhw ddim isio', 'taught as doeddan nhw ddim isio @1438'),
  ('cym_nv2_for_eng', 189, 1, 'oeddan ni’n siarad', 'taught as oeddan ni’n siarad @1143'),
  ('cym_nv2_for_eng', 190, 2, 'ffeindio', 'taught as ffeindio @1460'),
  ('cym_nv2_for_eng', 202, 1, 'dylen ni', 'taught as dylen ni @1403'),
  ('cym_nv2_for_eng', 202, 2, 'wyt ti’n meddwl?', 'taught as wyt ti’n meddwl? @1255'),
  ('cym_nv2_for_eng', 203, 1, 'dylwn i', 'taught as dylwn i @1098'),
  ('cym_nv2_for_eng', 209, 1, 'o’n i’n meddwl', 'taught as o’n i’n meddwl @1124'),
  ('cym_nv2_for_eng', 211, 2, 'oeddat ti’n meddwl', 'taught as oeddat ti’n meddwl @1617'),
  ('cym_nv2_for_eng', 212, 3, 'wythnos nesa’', 'taught as wythnos nesa’ @1059'),
  ('cym_nv2_for_eng', 212, 4, 'fyddet ti’n licio?', 'taught as fyddet ti’n licio? @1271'),
  ('cym_nv2_for_eng', 214, 4, 'wyt ti’n siŵr?', 'taught as wyt ti’n siŵr? @1063'),
  ('cym_nv2_for_eng', 218, 1, 'i’r ysgol', 'taught as i’r ysgol @1323'),
  ('cym_nv2_for_eng', 223, 1, 'ddydd Llun', 'taught as ddydd Llun @1316'),
  ('cym_nv2_for_eng', 231, 1, 'be’ fyddet ti’n gwneud?', 'taught as be’ fyddet ti’n gwneud? @1203'),
  ('cym_nv2_for_eng', 232, 1, 'ddydd Mawrth', 'taught as ddydd Mawrth @1428'),
  ('cym_nv2_for_eng', 234, 2, 'efo’r trefniadau', 'taught as efo’r trefniadau @1204'),
  ('cym_nv2_for_eng', 238, 1, 'eitha’ da', 'taught as eitha’ da @1247'),
  ('cym_nv2_for_eng', 239, 1, 'sothach llwyr', 'taught as sothach llwyr @1248'),
  ('cym_nv2_for_eng', 239, 2, 'fy mhres yn ôl', 'taught as fy mhres yn ôl @1248'),
  ('cym_nv2_for_eng', 243, 1, 'ddydd Mercher', 'taught as ddydd Mercher @1371'),
  ('cym_nv2_for_eng', 244, 1, 'cyn i mi ateb', 'taught as cyn i mi ateb @1250'),
  ('cym_nv2_for_eng', 244, 2, 'fedri di ddeud wrtha i?', 'taught as fedri di ddeud wrtha i? @1150'),
  ('cym_nv2_for_eng', 246, 1, 'ffeindio allan', 'taught as ffeindio allan @1017'),
  ('cym_nv2_for_eng', 247, 1, 'ar ôl i ni orffen', 'taught as ar ôl i ni orffen @1110'),
  ('cym_nv2_for_eng', 248, 1, 'tan', 'taught as tan @1251'),
  ('cym_nv2_for_eng', 248, 2, 'dydy o ddim isio', 'taught as dydy o ddim isio @1034'),
  ('cym_nv2_for_eng', 251, 1, 'ddudes i', 'taught as ddudes i @1296'),
  ('cym_nv2_for_eng', 252, 3, 'y cwestiwn', 'taught as y cwestiwn @1202'),
  ('cym_nv2_for_eng', 253, 1, 'ar hyn o bryd', 'taught as ar hyn o bryd @1040'),
  ('cym_nv2_for_eng', 269, 1, 'yr unig obaith real', 'taught as yr unig obaith real @1482'),
  ('cym_nv2_for_eng', 269, 2, 'sydd ar ôl i ni', 'taught as sydd ar ôl i ni @1481'),
  ('cym_nv2_for_eng', 269, 3, 'nad ydyn nhw ddim', 'taught as nad ydyn nhw ddim @1482'),
  ('cym_nv2_for_eng', 269, 4, 'o ddifri’', 'taught as o ddifri’ @1482'),
  ('cym_nv2_for_eng', 272, 1, 'fyddai dim byd', 'taught as fyddai dim byd @1485'),
  ('cym_nv2_for_eng', 272, 2, 'gwneud fi’n hapusach', 'taught as gwneud fi’n hapusach @1485'),
  ('cym_nv2_for_eng', 272, 3, 'na', 'taught as na @1132'),
  ('cym_nv2_for_eng', 274, 1, 'os na wnei di', 'taught as os na wnei di @1489'),
  ('cym_nv2_for_eng', 274, 3, 'banad o goffi', 'taught as panad o goffi @1623'),
  ('cym_nv2_for_eng', 274, 4, 'rŵan hyn', 'taught as rŵan hyn @1489'),
  ('cym_nv2_for_eng', 274, 5, 'fydda i byth', 'taught as fydda i byth @1490'),
  ('cym_nv2_for_eng', 274, 7, 'byth eto', 'taught as byth eto @1490'),
  ('cym_nv2_for_eng', 278, 2, 'colli', 'taught as colli @1496'),
  ('cym_nv2_for_eng', 278, 3, 'pan bydd hi wirioneddol', 'taught as pan fydd hi wirioneddol @1496'),
  ('cym_nv2_for_eng', 278, 4, 'yn cyfri’', 'taught as yn cyfri’ @1496'),
  ('cym_nv2_for_eng', 297, 2, 'teulu cyfan', 'taught as teulu cyfan @1520'),
  ('cym_sv2_for_eng', 140, 2, 'fel', 'taught as fel @1128'),
  ('cym_sv2_for_eng', 141, 1, 'ŷn nhw?', 'taught as ŷn nhw? @1087'),
  ('cym_sv2_for_eng', 164, 1, 'felly', 'taught as felly @1149'),
  ('cym_sv2_for_eng', 174, 1, 'maen nhw’n moyn', 'taught as maen nhw’n moyn @1209'),
  ('cym_sv2_for_eng', 175, 1, 'hala mwy o amser', 'taught as hala mwy o amser @1209'),
  ('cym_sv2_for_eng', 177, 1, 'popeth', 'taught as popeth @1045'),
  ('cym_sv2_for_eng', 177, 2, 'bo’ ni’n cwpla', 'taught as bo’ ni’n cwpla @1200'),
  ('cym_sv2_for_eng', 177, 3, 'gwneud yn siŵr', 'taught as gwneud yn siŵr @1200'),
  ('cym_sv2_for_eng', 177, 4, 'maen nhw’n dweud', 'taught as maen nhw’n dweud @1200'),
  ('cym_sv2_for_eng', 179, 1, 'mewn pryd', 'taught as mewn pryd @1091'),
  ('cym_sv2_for_eng', 180, 1, 'meddwl', 'taught as meddwl @1037'),
  ('cym_sv2_for_eng', 180, 2, 'bo’ ni angen', 'taught as bo’ ni angen @1210'),
  ('cym_sv2_for_eng', 181, 1, 'trafod', 'taught as trafod @1210'),
  ('cym_sv2_for_eng', 182, 1, 'so ni’n gwybod', 'taught as so ni’n gwybod @1213'),
  ('cym_sv2_for_eng', 182, 2, 'cyflawni', 'taught as cyflawni @1213'),
  ('cym_sv2_for_eng', 186, 1, 'newid', 'taught as newid @1104'),
  ('cym_sv2_for_eng', 188, 1, 'o’n ni’n moyn', 'taught as o’n ni’n moyn @1054'),
  ('cym_sv2_for_eng', 190, 1, 'be’ oedd yn digwydd', 'taught as be’ oedd yn digwydd @1347'),
  ('cym_sv2_for_eng', 190, 2, 'esbonio', 'taught as esbonio @1008'),
  ('cym_sv2_for_eng', 190, 3, 'do’n nhw ddim yn moyn', 'taught as do’n nhw ddim yn moyn @1438'),
  ('cym_sv2_for_eng', 191, 1, 'ddwedon nhw wrthon ni', 'taught as ddwedon nhw wrthon ni @1211'),
  ('cym_sv2_for_eng', 192, 1, 'gofyn am help', 'taught as gofyn am help @1212'),
  ('cym_sv2_for_eng', 193, 1, 'hoffen ni', 'taught as hoffen ni @1411'),
  ('cym_sv2_for_eng', 195, 1, 'o’n ni’n siarad', 'taught as o’n ni’n siarad @1143'),
  ('cym_sv2_for_eng', 196, 2, 'ffeindio', 'taught as ffeindio @1460'),
  ('cym_sv2_for_eng', 199, 1, 'wneud yn siŵr', 'taught as gwneud yn siŵr @1200'),
  ('cym_sv2_for_eng', 210, 1, 'dylen ni', 'taught as dylen ni @1403'),
  ('cym_sv2_for_eng', 210, 2, 'wyt ti’n meddwl?', 'taught as wyt ti’n meddwl? @1316'),
  ('cym_sv2_for_eng', 211, 1, 'dylen i', 'taught as dylen i @1098'),
  ('cym_sv2_for_eng', 218, 1, 'o’n i’n meddwl', 'taught as o’n i’n meddwl @1124'),
  ('cym_sv2_for_eng', 219, 2, 'o’t ti’n meddwl', 'taught as o’t ti’n meddwl @1617'),
  ('cym_sv2_for_eng', 220, 1, 'mynd mas', 'taught as mynd mas @1349'),
  ('cym_sv2_for_eng', 220, 3, 'wythnos nesa’', 'taught as wythnos nesa’ @1059'),
  ('cym_sv2_for_eng', 221, 1, 'hoffet ti?', 'taught as hoffet ti? @1271'),
  ('cym_sv2_for_eng', 226, 1, 'wyt ti’n siŵr?', 'taught as wyt ti’n siŵr? @1063'),
  ('cym_sv2_for_eng', 230, 1, 'i’r ysgol', 'taught as i’r ysgol @1323'),
  ('cym_sv2_for_eng', 235, 1, 'ddydd Llun', 'taught as ddydd Llun @1316'),
  ('cym_sv2_for_eng', 236, 1, 'rhoi e iddo fe', 'taught as rhoi e iddo fe @1241'),
  ('cym_sv2_for_eng', 243, 1, 'be’ fyddet ti’n gwneud?', 'taught as be’ fyddet ti’n gwneud? @1203'),
  ('cym_sv2_for_eng', 244, 1, 'ddydd Mawrth', 'taught as ddydd Mawrth @1428'),
  ('cym_sv2_for_eng', 249, 1, 'o’n i’n moyn iddi hi dy helpu di', 'taught as o’n i’n moyn iddi hi dy helpu di @1204'),
  ('cym_sv2_for_eng', 250, 1, 'rhy brysur', 'taught as rhy brysur @1193'),
  ('cym_sv2_for_eng', 252, 1, 'eitha da', 'taught as eitha da @1247'),
  ('cym_sv2_for_eng', 253, 1, 'rwtsh llwyr', 'taught as rwtsh llwyr @1248'),
  ('cym_sv2_for_eng', 254, 2, 'do’n i ddim yn meddwl', 'taught as do’n i ddim yn meddwl @1387'),
  ('cym_sv2_for_eng', 259, 1, 'cyn i fi ateb', 'taught as cyn i fi ateb @1250'),
  ('cym_sv2_for_eng', 261, 2, 'ffeindio mas', 'taught as ffeindio mas @1017'),
  ('cym_sv2_for_eng', 263, 1, 'ar ôl i ni gwpla', 'taught as ar ôl i ni gwpla @1110'),
  ('cym_sv2_for_eng', 264, 2, 'so fe’n moyn', 'taught as so fe’n moyn @1034'),
  ('cym_sv2_for_eng', 267, 1, 'ddwedes i', 'taught as ddwedes i @1296'),
  ('cym_sv2_for_eng', 268, 1, 'doedd hi ddim yn moyn', 'taught as doedd hi ddim yn moyn @1070'),
  ('cym_sv2_for_eng', 269, 1, 'y cwestiwn', 'taught as y cwestiwn @1202'),
  ('cym_sv2_for_eng', 270, 1, 'ar hyn o bryd', 'taught as ar hyn o bryd @1040'),
  ('cym_sv2_for_eng', 287, 1, 'yr unig', 'taught as yr unig @1482'),
  ('cym_sv2_for_eng', 287, 2, 'go iawn', 'taught as go iawn @1482'),
  ('cym_sv2_for_eng', 287, 3, 'obaith', 'taught as obaith @1482'),
  ('cym_sv2_for_eng', 287, 4, 'sydd ar ôl i ni', 'taught as sydd ar ôl i ni @1481'),
  ('cym_sv2_for_eng', 287, 5, 'nag ŷn nhw', 'taught as nag ŷn nhw @1482'),
  ('cym_sv2_for_eng', 287, 6, 'o ddifri', 'taught as o ddifri @1482'),
  ('cym_sv2_for_eng', 290, 1, 'dim byd', 'taught as dim byd @1485'),
  ('cym_sv2_for_eng', 290, 2, 'fyddai', 'taught as fyddai @1485'),
  ('cym_sv2_for_eng', 290, 4, 'yn fy ngwneud i’n', 'taught as yn fy ngwneud i’n @1485'),
  ('cym_sv2_for_eng', 290, 5, 'hapusach', 'taught as hapusach @1485'),
  ('cym_sv2_for_eng', 292, 1, 'os na wnei di', 'taught as os na wnei di @1489'),
  ('cym_sv2_for_eng', 292, 2, 'i fi', 'taught as i fi @1032'),
  ('cym_sv2_for_eng', 292, 5, 'byth eto', 'taught as byth eto @1490'),
  ('cym_sv2_for_eng', 292, 6, 'goffi', 'taught as goffi @1489'),
  ('cym_sv2_for_eng', 292, 7, 'yn syth', 'taught as yn syth @1489'),
  ('cym_sv2_for_eng', 292, 8, 'fydda i byth', 'taught as fydda i byth @1490'),
  ('cym_sv2_for_eng', 309, 2, 'nôl', 'taught as nôl @1512'),
  ('cym_sv2_for_eng', 309, 6, 'tra bo’ fi’n', 'taught as tra bo’ fi’n @1512'),
  ('cym_sv2_for_eng', 333, 1, 'ym mhen arall', 'taught as ym mhen arall @1552'),
  ('cym_sv2_for_eng', 333, 4, 'salw iawn', 'taught as salw iawn @1553');

DO $$ BEGIN
  IF to_regclass('backup_cym_reteach_isnew_57') IS NOT NULL THEN RAISE EXCEPTION 'already applied (backup_cym_reteach_isnew_57 exists)'; END IF;
  IF (SELECT count(*) FROM flip WHERE course_code='cym_nv2_for_eng') <> 66
     OR (SELECT count(*) FROM flip WHERE course_code='cym_sv2_for_eng') <> 73 THEN RAISE EXCEPTION 'unexpected row counts'; END IF;
  IF (SELECT count(*) FROM flip f JOIN course_legos l ON l.course_code=f.course_code
        AND l.seed_number=f.seed_number AND l.lego_index=f.lego_index AND l.target_text=f.target_text AND l.is_new) <> (SELECT count(*) FROM flip) THEN
    RAISE EXCEPTION 'a listed LEGO is missing, has other text, or is already not new'; END IF;
END $$;

CREATE TABLE backup_cym_reteach_isnew_57 AS
  SELECT l.id, l.course_code, l.seed_number, l.lego_index, l.is_new, l.last_edit_event_id
  FROM course_legos l JOIN flip f USING (course_code, seed_number, lego_index);
REVOKE ALL ON backup_cym_reteach_isnew_57 FROM anon, authenticated;

CREATE TEMP TABLE ev (course_code text PRIMARY KEY, id uuid);
WITH e AS (
  INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
  SELECT c.course_code, 'sql:job-57 weave-cym-reteach-mark', 'weave-reteach-mark', 'agent', 'claude-job-57-reteach-mark',
         'agent (claude-job-57-reteach-mark)', false, 'creator',
         jsonb_build_object('lego_keys', (SELECT jsonb_agg(seed_number||':'||lego_index ORDER BY seed_number, lego_index) FROM flip f WHERE f.course_code=c.course_code)),
         jsonb_build_object(
           'ruling', 'Aran 2026-10-07: (1) an old seed that plays after the HC block and re-teaches a word the HC block already taught (identical or soft-mutated Welsh, same English, first taught in an HC seed) is marked already taught, not new. (2) Nasal and aspirate mutated forms stay NEW items. Same-Welsh-different-English cases are listed, not changed.',
           'backup', 'backup_cym_reteach_isnew_57',
           'count', (SELECT count(*) FROM flip f WHERE f.course_code=c.course_code),
           'rows', (SELECT jsonb_agg(jsonb_build_object('seed', seed_number, 'idx', lego_index, 'target', target_text, 'taught_by', taught_by) ORDER BY seed_number, lego_index) FROM flip f WHERE f.course_code=c.course_code))
  FROM (VALUES ('cym_nv2_for_eng'),('cym_sv2_for_eng')) c(course_code)
  RETURNING course_code, id)
INSERT INTO ev SELECT course_code, id FROM e;

UPDATE course_legos l SET is_new = false, last_edit_event_id = ev.id
FROM flip f JOIN ev USING (course_code)
WHERE l.course_code=f.course_code AND l.seed_number=f.seed_number AND l.lego_index=f.lego_index;

CREATE TEMP TABLE rt_post AS SELECT * FROM pg_temp.others_fp();
DO $$ BEGIN
  IF EXISTS (SELECT * FROM rt_pre EXCEPT SELECT * FROM rt_post) OR EXISTS (SELECT * FROM rt_post EXCEPT SELECT * FROM rt_pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: something outside the two sandboxes changed'; END IF;
  IF (SELECT count(*) FROM course_legos l JOIN flip f USING (course_code, seed_number, lego_index) WHERE NOT l.is_new) <> (SELECT count(*) FROM flip) THEN
    RAISE EXCEPTION 'CHECK FAILED: not all flipped'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT course_code, count(*) legos, count(DISTINCT seed_number) seeds FROM flip GROUP BY 1 ORDER BY 1;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
