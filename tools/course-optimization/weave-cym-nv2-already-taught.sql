-- Job #997 (Aran 2026-10-07): "already taught" pass over cym_nv2_for_eng after the HC block got its
-- LEGOs through the course builder's v2 decompose route (which marks is_new by exact earlier pair,
-- or soft-mutation variant, in running order — services/course-builder/lib/welsh-mutation.cjs).
-- This script sets is_new = false on the LEGOs that route could not see were already taught:
--   'contained'          — an HC LEGO whose whole target was already taught INSIDE a bigger earlier
--                          LEGO, same meaning (an idea ⊂ a good idea; to sit ⊂ to sit down).
--   'restored-exact'     — a LEGO of a restored old seed (258-288) whose exact pair, or soft-mutated
--                          form, is now taught earlier in the running order by its HC partner.
--   'restored-judgement' — Aran's rule "a restored old seed introduces only its extra words beyond its
--                          HC partner": taught in substance, differs only in spelling or chunking.
-- Only is_new and last_edit_event_id change; no text, so no audio link moves. Dry run unless
-- invoked with  -v finish=COMMIT . Undo: weave-cym-nv2-already-taught-undo.sql.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20min';
\ir weave-fingerprint-fn.sql
CREATE TEMP TABLE at_pre AS SELECT * FROM pg_temp.others_fingerprint();

CREATE TEMP TABLE flip (seed_number int, lego_index int, target_text text, rule text, taught_by text,
                        PRIMARY KEY (seed_number, lego_index));
INSERT INTO flip VALUES
  (1018, 2, 'cyfarfod', 'contained', 'I met = wnes i gyfarfod @73'),
  (1039, 3, 'dipyn bach', 'contained', 'a little Welsh = dipyn bach o Gymraeg @1009'),
  (1044, 1, 'neu', 'contained', 'a glass or two = gwydrad neu ddau @98'),
  (1050, 1, 'gorffen', 'contained', 'after you finish = ar ôl i ti orffen @1011'),
  (1051, 3, 'diddorol', 'contained', 'I think it’s interesting = dw i’n meddwl bo’ hi’n ddiddorol @31'),
  (1064, 2, 'hawdd', 'contained', 'remember easily = cofio’n hawdd @1024'),
  (1077, 1, 'dw i’n synnu', 'contained', 'I’m surprised at = dw i’n synnu at @104'),
  (1098, 1, 'dylwn i', 'contained', 'I shouldn’t = ddylwn i ddim @115'),
  (1103, 1, 'clywed', 'contained', 'to let anyone hear = gadael i neb glywed @1071'),
  (1132, 2, 'na', 'contained', 'better than = well na @1042'),
  (1161, 1, 'fedri di?', 'contained', 'you could = mi fedri di @46'),
  (1164, 1, 'llyfr', 'contained', 'the book = y llyfr hwn @87'),
  (1228, 1, 'newydd ddechrau', 'contained', 'I’ve just started = dw i newydd ddechrau @15'),
  (1230, 2, 'dyn ifanc', 'contained', 'the young man = y dyn ifanc @66'),
  (1259, 1, 'syniad', 'contained', 'a good idea = syniad da @1123'),
  (1272, 1, 'byddwn', 'contained', 'I wouldn’t = fyddwn i ddim yn @1012'),
  (1296, 1, 'ddudes i', 'contained', 'I didn’t say = ddudes i ddim @1295'),
  (1305, 1, 'dynas', 'contained', 'an old woman = hen ddynas @70'),
  (1311, 3, 'bwysica’', 'contained', 'the most important job = y gwaith pwysica’ @1280'),
  (1409, 1, 'does dim ots', 'contained', 'I don’t care = does dim ots gen i @1048'),
  (1422, 1, 'cwestiwn', 'contained', 'the question = y cwestiwn @1202'),
  (1429, 1, 'iddyn nhw', 'contained', 'allow them to win = gadael iddyn nhw ennill @1412'),
  (1440, 2, 'teithio', 'contained', 'to travel to Africa = i deithio i Affrica @1379'),
  (1449, 1, 'ddudon nhw', 'contained', 'they told us = ddudon nhw wrthon ni @1211'),
  (1460, 2, 'ffeindio', 'contained', 'to find out = ffeindio allan @1017'),
  (1474, 2, 'hyd yn oed', 'contained', 'even if he wanted to = hyd yn oed tasai fo isio @1352'),
  (1496, 2, 'colli', 'contained', 'to lose hope = colli gobaith @1399'),
  (1497, 4, 'ychydig o', 'contained', 'a few friends = ychydig o ffrindiau @95'),
  (1499, 1, 'efallai', 'contained', 'it might be = efallai fod o’n @1261'),
  (1499, 6, 'ffenest', 'contained', 'break that window = torri’r ffenest ’na @1446'),
  (1500, 2, 'eistedd', 'contained', 'to sit down = eistedd i lawr @1303'),
  (1501, 3, 'chwarae', 'contained', 'to consider playing = ystyried chwarae @1098'),
  (1501, 4, 'efo’ch gilydd', 'contained', 'you work together = dach chi’n gweithio efo’ch gilydd @1133'),
  (1506, 5, 'yn ôl', 'contained', 'a week ago = wythnos yn ôl @42'),
  (1508, 1, 'does dim', 'contained', 'I don’t care = does dim ots gen i @1048'),
  (1508, 5, 'ti’n mynd i', 'contained', 'I heard that you were going to = clywes i bo’ ti’n mynd i @130'),
  (1512, 3, 'tra', 'contained', 'while they’re still young = tra maen nhw dal yn ifanc @1440'),
  (1513, 5, 'i fyny', 'contained', 'both of her hands up = ei dwy law i fyny @1324'),
  (1518, 3, 'fy hun', 'contained', 'on my own = ar fy mhen fy hun @1173'),
  (1518, 6, 'yr un', 'contained', 'thing = yr un peth @117'),
  (1531, 3, 'ennill', 'contained', 'allow them to win = gadael iddyn nhw ennill @1412'),
  (1531, 4, 'gêm', 'contained', 'watch all five games = gwylio’r pum gêm i gyd @1313'),
  (1532, 2, 'lwcus', 'contained', 'I was lucky enough = o’n i’n ddigon lwcus @1379'),
  (1535, 2, 'na fyddai fo’n', 'contained', 'that he couldn’t = na fyddai fo’n medru @1313'),
  (1616, 1, 'ddewr iawn', 'contained', 'you were very brave = bo’ ti’n ddewr iawn @1615'),
  (1620, 3, 'ddiwetha’', 'contained', 'last weekend = penwythnos diwetha’ @128'),
  (1628, 2, 'te', 'contained', 'or tea = neu de @1623'),
  (1630, 1, 'ga i', 'contained', 'can I ask = ga i ofyn @1119'),
  (1657, 2, 'chi gyd', 'contained', 'can you all? = fedrwch chi gyd? @1529'),
  (258, 1, 'siop', 'restored-exact', 'taught@1460'),
  (258, 2, 'yn agos at y', 'restored-exact', 'taught@1390'),
  (258, 3, 'gwesty', 'restored-exact', 'taught@1460'),
  (258, 4, 'medra i', 'restored-exact', 'taught(mut)@26'),
  (258, 5, 'brynu', 'restored-exact', 'taught(mut)@1320'),
  (258, 6, 'ychydig o gardiau post', 'restored-exact', 'taught@1461'),
  (263, 1, 'pa mor uchel', 'restored-exact', 'taught@1470'),
  (263, 2, 'dringo', 'restored-exact', 'taught@1470'),
  (263, 3, 'cyn i ni', 'restored-exact', 'taught@1470'),
  (263, 4, 'am saib', 'restored-exact', 'taught@1471'),
  (266, 1, 'mae na', 'restored-judgement', 'HC 1475 there are many reasons = mae ’na lawer o resymau (spelling ’na/na only)'),
  (266, 2, 'lawer o resymau', 'restored-judgement', 'HC 1475 there are many reasons = mae ’na lawer o resymau'),
  (266, 3, 'i ystyried', 'restored-exact', 'taught@1475'),
  (266, 4, 'aros tan', 'restored-judgement', 'HC 1476 dw i’n aros tan ddiwedd… (aros taught, until = tan @1251)'),
  (266, 5, 'ddiwedd', 'restored-exact', 'taught@1476'),
  (266, 6, 'yr ail hanner', 'restored-exact', 'taught@1476'),
  (273, 1, 'o dan', 'restored-exact', 'taught@1487'),
  (273, 2, 'bont', 'restored-exact', 'taught@1487'),
  (273, 3, 'ar ochr arall', 'restored-exact', 'taught@1488'),
  (273, 4, 'y llinell felen yna', 'restored-exact', 'taught@1488'),
  (281, 2, 'efallai', 'restored-exact', 'taught@1499'),
  (281, 3, 'agor', 'restored-exact', 'taught@1336'),
  (281, 4, 'y drws', 'restored-exact', 'taught@1336'),
  (281, 5, 'a chau’r', 'restored-exact', 'taught@1499'),
  (281, 6, 'ffenest', 'restored-exact', 'taught@1499'),
  (288, 1, 'does dim', 'restored-exact', 'taught@1508'),
  (288, 2, 'pwynt', 'restored-exact', 'taught@1508'),
  (288, 3, 'poeni', 'restored-exact', 'taught@1046'),
  (288, 4, 'ti’n mynd i', 'restored-exact', 'taught@1508'),
  (288, 5, 'talu', 'restored-exact', 'taught@1299'),
  (288, 6, 'gwely newydd', 'restored-exact', 'taught(mut)@1509'),
  (307, 2, 'camgymeriadau’n ddrwg', 'restored-judgement', 'making mistakes = wneud camgymeriadau @1046; was bad = yn ddrwg @1536');

DO $$ BEGIN
  IF to_regclass('backup_cym_nv2_legos_997') IS NULL THEN RAISE EXCEPTION 'pre-build backup missing'; END IF;
  IF to_regclass('backup_cym_nv2_isnew_997') IS NOT NULL THEN RAISE EXCEPTION 'already applied (backup_cym_nv2_isnew_997 exists)'; END IF;
  IF (SELECT count(*) FROM flip) <> 81 THEN RAISE EXCEPTION 'expected 81 rows'; END IF;
  IF (SELECT count(*) FROM flip f JOIN course_legos l ON l.course_code='cym_nv2_for_eng'
        AND l.seed_number=f.seed_number AND l.lego_index=f.lego_index AND l.target_text=f.target_text AND l.is_new) <> 81 THEN
    RAISE EXCEPTION 'a listed LEGO is missing, has other text, or is already not new'; END IF;
END $$;

CREATE TABLE backup_cym_nv2_isnew_997 AS
  SELECT l.id, l.seed_number, l.lego_index, l.is_new, l.last_edit_event_id
  FROM course_legos l JOIN flip f USING (seed_number, lego_index) WHERE l.course_code='cym_nv2_for_eng';
REVOKE ALL ON backup_cym_nv2_isnew_997 FROM anon, authenticated;

WITH e AS (
  INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
  SELECT 'cym_nv2_for_eng', 'sql:job-997 weave-cym-nv2-already-taught', 'weave-already-taught', 'agent', 'claude-job-997-hc-legos',
         'agent (claude-job-997-hc-legos)', false, 'creator',
         jsonb_build_object('lego_keys', (SELECT jsonb_agg(seed_number||':'||lego_index ORDER BY seed_number, lego_index) FROM flip)),
         jsonb_build_object(
           'ruling', 'Aran 2026-10-07: mark a LEGO new only when not already taught earlier in the running order; soft-mutated forms count as taught; a restored old seed introduces only its extras beyond its HC partner',
           'backup', 'backup_cym_nv2_isnew_997',
           'rows', (SELECT jsonb_agg(jsonb_build_object('seed', seed_number, 'idx', lego_index, 'target', target_text, 'rule', rule, 'taught_by', taught_by) ORDER BY seed_number, lego_index) FROM flip))
  RETURNING id)
SELECT id AS ev FROM e \gset

UPDATE course_legos l SET is_new = false, last_edit_event_id = :'ev'
FROM flip f WHERE l.course_code='cym_nv2_for_eng' AND l.seed_number=f.seed_number AND l.lego_index=f.lego_index;

CREATE TEMP TABLE at_post AS SELECT * FROM pg_temp.others_fingerprint();
DO $$ BEGIN
  IF EXISTS (SELECT * FROM at_pre EXCEPT SELECT * FROM at_post) OR EXISTS (SELECT * FROM at_post EXCEPT SELECT * FROM at_pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: something outside the sandbox changed'; END IF;
  IF (SELECT count(*) FROM course_legos l JOIN flip f USING (seed_number, lego_index)
      WHERE l.course_code='cym_nv2_for_eng' AND NOT l.is_new) <> 81 THEN RAISE EXCEPTION 'CHECK FAILED: not 81 flipped'; END IF;
  IF (SELECT count(*) FROM course_legos WHERE course_code='cym_nv2_for_eng' AND seed_number IN (258,263,266,273,281,288) AND is_new) <> 1 THEN
    RAISE EXCEPTION 'CHECK FAILED: restored six should keep exactly one new LEGO (281 actually)'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT rule, count(*) FROM flip GROUP BY 1 ORDER BY 1;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
