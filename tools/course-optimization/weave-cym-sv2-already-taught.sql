-- Job #22 (Aran 2026-10-07; copy of #997's pass for the South sandbox): "already taught" pass over
-- cym_sv2_for_eng after the HC block got its LEGOs through the course builder's v2 decompose route
-- (which marks is_new by exact earlier pair, or soft-mutation variant, in running order —
-- services/course-builder/lib/welsh-mutation.cjs). This script sets is_new = false on the LEGOs that
-- route could not see were already taught:
--   'contained'          — an HC LEGO whose whole target was already taught INSIDE a bigger earlier
--                          LEGO, same meaning (an idea ⊂ a good idea; to sit ⊂ to sit down).
--   'restored-exact'     — a LEGO of a keep-both old seed (275-332) whose exact pair, or soft-mutated
--                          form, is now taught earlier in the running order by HC.
--   'restored-judgement' — Aran's rule "a kept-both old seed introduces only its extra words beyond its
--                          HC partner": taught in substance, differs only in spelling or chunking.
-- Left NEW on purpose in the keep-both ten: ar gyfer (283, for), a dweud y gwir (299, actually), and
-- cau (299, close: HC taught it only as aspirate "chau"; nasal/aspirate are an open question for Aran).
-- Only is_new and last_edit_event_id change; no text, so no audio link moves. Dry run unless
-- invoked with  -v finish=COMMIT . Undo: weave-cym-sv2-already-taught-undo.sql.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20min';
\ir weave-fingerprint-fn-sv2.sql
CREATE TEMP TABLE at_pre AS SELECT * FROM pg_temp.others_fingerprint();

CREATE TEMP TABLE flip (seed_number int, lego_index int, target_text text, rule text, taught_by text,
                        PRIMARY KEY (seed_number, lego_index));
INSERT INTO flip VALUES
  (275, 1, 'siop', 'restored-exact', 'exact pair HC 460'),
  (275, 2, 'ar bwys', 'restored-exact', 'exact pair HC 460'),
  (275, 3, 'gwesty', 'restored-exact', 'exact pair HC 460'),
  (275, 4, 'brynu', 'restored-exact', 'mutation of prynu HC 320'),
  (275, 5, 'cwpl o gardiau post', 'restored-exact', 'exact pair HC 461'),
  (280, 1, 'faint mor uchel?', 'restored-exact', 'exact pair HC 470'),
  (280, 2, 'dringo', 'restored-exact', 'exact pair HC 470'),
  (280, 3, 'cyn i ni', 'restored-exact', 'exact pair HC 470'),
  (280, 4, 'hoe', 'restored-judgement', 'a rest = hoe inside for a rest = am hoe @HC 471'),
  (283, 1, 'sawl reswm dros', 'restored-judgement', 'there are many reasons to = mae sawl rheswm dros @HC 475 (old spelling reswm)'),
  (283, 2, 'ystyried', 'restored-exact', 'exact pair HC 98'),
  (283, 3, 'aros', 'restored-exact', 'exact pair HC 475'),
  (283, 5, 'diwedd', 'restored-exact', 'mutation of ddiwedd HC 476'),
  (283, 6, 'yr ail', 'restored-exact', 'exact pair HC 476'),
  (283, 7, 'hanner', 'restored-exact', 'exact pair HC 299'),
  (291, 1, 'ma fe o dan', 'restored-exact', 'exact pair HC 487'),
  (291, 2, 'bont', 'restored-exact', 'exact pair HC 487'),
  (291, 3, 'ar', 'restored-exact', 'exact pair HC 488'),
  (291, 4, 'ochr arall', 'restored-exact', 'exact pair HC 488'),
  (291, 5, 'y llinell felen', 'restored-judgement', 'that yellow line = y llinell felen ’na @HC 488'),
  (299, 2, 'falle', 'restored-exact', 'exact pair HC 499'),
  (299, 3, 'agor', 'restored-exact', 'exact pair HC 336'),
  (299, 4, 'drws', 'restored-judgement', 'the door = y drws @HC 336'),
  (299, 6, 'ffenest', 'restored-judgement', 'break that window = torri’r ffenest ’na @HC 446'),
  (306, 1, 'does dim', 'restored-exact', 'exact pair HC 508'),
  (306, 2, 'pwynt', 'restored-exact', 'exact pair HC 508'),
  (306, 3, 'becso', 'restored-exact', 'exact pair HC 100'),
  (306, 4, 'talu', 'restored-exact', 'exact pair HC 299'),
  (306, 5, 'gwely newydd', 'restored-exact', 'mutation of wely newydd HC 509'),
  (325, 1, 'camgymeriadau', 'restored-judgement', 'making mistakes = wneud camgymeriadau @HC 46'),
  (325, 2, 'drwg', 'restored-judgement', 'being crazy was bad = bod yn wallgo’n ddrwg @HC 536 (bad = ’n ddrwg, soft)'),
  (328, 1, 'ta pryd', 'restored-exact', 'exact pair HC 542'),
  (328, 2, 'syniad da', 'restored-exact', 'exact pair HC 123'),
  (328, 3, 'anadlu', 'restored-judgement', 'breathe slowly = anadlu’n araf @HC 541'),
  (328, 4, 'crac', 'restored-judgement', 'you feel angry = ti’n teimlo’n grac @HC 542 (soft)'),
  (331, 1, 'ci', 'restored-judgement', 'the dog is dirty = mae’r ci’n frwnt @HC 546'),
  (331, 2, 'brwnt', 'restored-judgement', 'the dog is dirty = mae’r ci’n frwnt @HC 546 (soft)'),
  (331, 3, 'gwlyb', 'restored-judgement', 'and wet = ac yn wlyb @HC 546 (soft)'),
  (331, 4, 'mwd', 'restored-judgement', 'in the mud = yn y mwd @HC 547'),
  (332, 1, 'trist', 'restored-judgement', 'I am feeling sad = dw i’n teimlo’n drist @HC 548 (soft)'),
  (332, 2, 'tawel', 'restored-judgement', 'to be quiet = bod yn dawel @HC 34 (soft)'),
  (1023, 2, 'ddechrau', 'contained', 'I’ve just started = dw i newydd ddechrau @old 15'),
  (1024, 2, 'allu', 'contained', 'I’d like to be able to = hoffen i allu @HC 11'),
  (1026, 2, 'teimlo', 'contained', 'I feel = dw i’n teimlo @old 100'),
  (1030, 2, 'gofyn', 'contained', 'to ask you = gofyn i ti @old 56'),
  (1032, 1, 'o’t ti’n moyn?', 'contained', 'you wanted to speak = o’t ti’n moyn siarad @HC 31'),
  (1037, 2, 'meddwl', 'contained', 'I think = dw i’n meddwl @old 24'),
  (1039, 3, 'bach', 'contained', 'a little more slowly = bach yn arafach @old 47'),
  (1044, 1, 'neu', 'contained', 'a glass or two = gwydred neu ddau @old 96'),
  (1052, 1, 'oedd e’n moyn', 'contained', 'he wanted me to tell you = oedd e’n moyn i fi ddweud wrthot ti @old 75'),
  (1061, 3, 'eto', 'contained', 'to do again = gwneud eto @old 32'),
  (1064, 1, 'so', 'contained', 'he doesn’t want = so fe’n moyn @HC 34'),
  (1065, 3, 'amser', 'contained', 'a good time = amser da @old 91'),
  (1077, 1, 'dw i’n synnu', 'contained', 'I''m surprised at = dw i’n synnu at @old 102'),
  (1077, 3, 'dw i’n dechrau', 'contained', 'I’m starting to feel tired = dw i’n dechrau blino @HC 41'),
  (1087, 1, 'pobl', 'contained', 'some people = rhai pobl @old 126'),
  (1090, 2, 'galli di', 'contained', 'as soon as you can = cyn gynted ag y galli di @HC 28'),
  (1090, 3, 'yn arafach', 'contained', 'a little more slowly = bach yn arafach @old 47'),
  (1100, 2, 'becso', 'contained', 'I don’t worry about = dw i ddim yn becso am @HC 46'),
  (1138, 2, 'fy ffrind', 'contained', 'about my friend = am fy ffrind @HC 84'),
  (1155, 2, 'aros', 'contained', 'to wait for = aros am @old 126'),
  (1158, 2, 'siarad', 'contained', 'to practice speaking = ymarfer siarad @old 5'),
  (1161, 1, 'alli di?', 'contained', 'can you tell me? = alli di ddweud wrtha i? @HC 150'),
  (1164, 1, 'llyfr', 'contained', 'this book = y llyfr ’ma @old 85'),
  (1201, 4, 'ddigwydd', 'contained', 'what’s going to happen = beth sy’n mynd i ddigwydd @HC 12'),
  (1221, 4, 'ffilm', 'contained', 'that film = y ffilm ’na @old 86'),
  (1225, 3, 'ateb', 'contained', 'what the answer is = beth yw’r ateb @HC 17'),
  (1230, 2, 'dyn ifanc', 'contained', 'the young man = y dyn ifanc @old 65'),
  (1231, 3, 'oedd yn moyn', 'contained', 'someone who wanted = rhywun oedd yn moyn @old 83'),
  (1240, 2, 'ddim yn hoffi', 'contained', 'she doesn’t like = dyw hi ddim yn hoffi @old 113'),
  (1242, 3, 'mwy o amser', 'contained', 'a little more time = ychydig mwy o amser @HC 54'),
  (1248, 2, 'y ffilm', 'contained', 'that film = y ffilm ’na @old 86'),
  (1248, 4, 'a dw i’n moyn', 'contained', 'and I want you to speak = a dw i’n moyn i ti siarad @HC 15'),
  (1248, 6, 'nôl', 'contained', 'to come back = dod nôl @HC 16'),
  (1249, 1, 'dw i’n moyn i ti', 'contained', 'I want you to speak = dw i’n moyn i ti siarad @old 52'),
  (1255, 2, 'fyddi di’n barod', 'contained', 'when will you be ready = pryd fyddi di’n barod @HC 252'),
  (1259, 1, 'syniad', 'contained', 'a good idea = syniad da @HC 123'),
  (1267, 2, 'dy ffrind', 'contained', 'about your friend = am dy ffrind @HC 83'),
  (1276, 3, 'fan hyn', 'contained', 'this was where = fan hyn oedd @HC 138'),
  (1282, 2, 'yn broblem', 'contained', 'it’s not a problem = dyw hi ddim yn broblem @HC 134'),
  (1292, 3, 'dod', 'contained', 'I come from = dw i’n dod o @old 55'),
  (1295, 2, 'bo’ fi’n moyn', 'contained', 'although I wanted = er bo’ fi’n moyn @HC 178'),
  (1296, 1, 'ddwedes i', 'contained', 'I didn’t say = ddwedes i ddim @HC 295'),
  (1305, 1, 'menyw', 'contained', 'a young woman = menyw ifanc @HC 233'),
  (1310, 3, 'stori', 'contained', 'the story = y stori @HC 36'),
  (1313, 1, 'ddwedodd e', 'contained', 'he said that he = ddwedodd e fod e @old 79'),
  (1316, 1, 'wyt ti’n meddwl?', 'contained', 'when do you think = pryd wyt ti’n meddwl @HC 255'),
  (1349, 1, 'oedd e’n moyn?', 'contained', 'he wanted me to tell you = oedd e’n moyn i fi ddweud wrthot ti @old 75'),
  (1355, 2, 'siarad gyda', 'contained', 'you were talking to = o’t ti’n siarad gyda fe @HC 262'),
  (1396, 2, 'sefyll', 'contained', 'the one who is standing = yr un sy’n sefyll @HC 390'),
  (1405, 1, 'ddylen ni', 'contained', 'we shouldn’t = ddylen ni ddim @HC 404'),
  (1407, 2, 'trio', 'contained', 'I’m trying = dw i’n trio @old 2'),
  (1409, 1, 'sdim ots', 'contained', 'I don’t care = sdim ots ’da fi @HC 48'),
  (1422, 1, 'cwestiwn', 'contained', 'the question = y cwestiwn @HC 202'),
  (1429, 2, 'iddyn nhw', 'contained', 'allow them to win = gadael iddyn nhw ennill @HC 412'),
  (1434, 1, 'allen nhw?', 'contained', 'they couldn’t = allen nhw ddim @HC 433'),
  (1448, 2, 'helpu', 'contained', 'to help you = dy helpu di @old 53'),
  (1449, 1, 'ddwedon nhw', 'contained', 'they told us = ddwedon nhw wrthon ni @HC 211'),
  (1453, 1, 'ddwedon nhw', 'contained', 'they told us = ddwedon nhw wrthon ni @HC 211'),
  (1457, 2, 'broblem', 'contained', 'it’s not a problem = dyw hi ddim yn broblem @HC 134'),
  (1460, 2, 'ffeindio', 'contained', 'find out = ffeindio mas @HC 17'),
  (1460, 4, 'ar bwys', 'contained', 'near the entrance = ar bwys y fynedfa @HC 390'),
  (1465, 2, 'gofynna i', 'contained', 'I’ll ask him = gofynna i iddo fe @HC 176'),
  (1472, 3, 'nag ŷn ni’n', 'contained', 'that we can’t = nag ŷn ni’n gallu @HC 469'),
  (1474, 2, 'hyd yn oed', 'contained', 'even if he wanted to = hyd yn oed ’se fe’n moyn @HC 352'),
  (1475, 3, 'aros', 'contained', 'to wait for = aros am @old 126'),
  (1477, 5, 'gwyliau', 'contained', 'for holidays = ar gyfer gwyliau @HC 378'),
  (1479, 2, 'allen i', 'contained', 'I could make = allen i wneud @HC 116'),
  (1480, 3, 'dyw e ddim', 'contained', 'it’s not working = dyw e ddim yn gweithio @HC 99'),
  (1482, 2, 'go iawn', 'contained', 'it’s the only real hope = dyna’r unig obaith go iawn @HC 481'),
  (1482, 3, 'obaith', 'contained', 'it’s the only real hope = dyna’r unig obaith go iawn @HC 481'),
  (1485, 2, 'fyddai', 'contained', 'that he couldn’t = na fyddai fe’n gallu @HC 313'),
  (1491, 2, 'y ffordd', 'contained', 'to lead the way next year = arwain y ffordd flwyddyn nesa @HC 416'),
  (1491, 3, 'ti’n trio', 'contained', 'what you’re trying = beth ti’n trio @HC 140'),
  (1493, 2, 'fydd', 'contained', 'it will work = fydd e’n gweithio @HC 94'),
  (1494, 1, 'beth sy’n', 'contained', 'what’s going to happen = beth sy’n mynd i ddigwydd @HC 12'),
  (1494, 2, 'ar ôl', 'contained', 'after you finish = ar ôl i ti gwpla @HC 11'),
  (1496, 2, 'colli', 'contained', 'to lose hope = colli gobaith @HC 399'),
  (1497, 2, 'fel', 'contained', 'as if I’m = fel ’sen i @HC 26'),
  (1498, 1, 'sefyll', 'contained', 'the one who is standing = yr un sy’n sefyll @HC 390'),
  (1498, 5, 'fynedfa', 'contained', 'near the entrance = ar bwys y fynedfa @HC 390'),
  (1499, 1, 'falle', 'contained', 'it might be = falle fod e’n @HC 261'),
  (1500, 3, 'eistedd', 'contained', 'to sit down = eistedd lawr @HC 303'),
  (1501, 2, 'ymddiried', 'contained', 'trust anyone = ymddiried yn neb @HC 490'),
  (1501, 5, 'gyda’ch gilydd', 'contained', 'you work together = ŷch chi’n gweithio gyda’ch gilydd @HC 133'),
  (1505, 3, 'fy ngadael', 'contained', 'to leave me = fy ngadael i @HC 351'),
  (1510, 2, 'chwilio', 'contained', 'looking for = chwilio amdano @HC 68'),
  (1513, 3, 'fy mhen', 'contained', 'in my head = yn fy mhen @HC 131'),
  (1513, 4, 'lan', 'contained', 'both of her hands up = ei dwy law lan @HC 324'),
  (1513, 5, 'lawr', 'contained', 'to sit down = eistedd lawr @HC 303'),
  (1516, 2, 'daeth', 'contained', 'our friends came round = daeth ein ffrindiau ni draw @HC 454'),
  (1518, 1, 'allen i ddim', 'contained', 'I couldn’t agree with = allen i ddim cytuno gyda @HC 384'),
  (1518, 3, 'fy hunan', 'contained', 'on my own = ar fy mhen fy hunan @HC 173'),
  (1518, 5, 'gwmws', 'contained', 'exactly the same way = yn gwmws yr un ffordd @HC 153'),
  (1518, 6, 'yr un', 'contained', 'the same thing = yr un peth @old 117'),
  (1521, 3, 'anghofio', 'contained', 'I’ve forgotten = dw i wedi anghofio @old 16'),
  (1522, 2, 'gytuno', 'contained', 'did you agree with her? = wnest ti gytuno gyda hi? @HC 385'),
  (1523, 2, 'rhoi', 'contained', 'to give it to him = rhoi e iddo fe @HC 241'),
  (1524, 5, 'tair', 'contained', 'believe the three facts = credu’r tair ffaith @HC 311'),
  (1527, 2, 'pwy', 'contained', 'who was = pwy oedd @HC 262'),
  (1531, 3, 'ennill', 'contained', 'allow them to win = gadael iddyn nhw ennill @HC 412'),
  (1532, 2, 'bo’ nhw’n', 'contained', 'that they want = bo’ nhw’n moyn @HC 200'),
  (1532, 3, 'lwcus', 'contained', 'I was lucky enough = o’n i’n ddigon lwcus @HC 379'),
  (1533, 4, 'ti’n dweud', 'contained', 'do you say = wyt ti’n dweud @HC 160'),
  (1535, 3, 'na fyddai fe’n', 'contained', 'that he couldn’t = na fyddai fe’n gallu @HC 313'),
  (1543, 1, 'gywir', 'contained', 'she was right = bod hi’n gywir @HC 387'),
  (1544, 2, 'y byddai hi’n', 'contained', 'that she could = y byddai hi’n gallu @HC 312'),
  (1544, 3, 'anodd', 'contained', 'it’s not difficult = dyw hi ddim yn anodd @HC 66'),
  (1552, 3, 'y pentref', 'contained', 'the end of the village = pen y pentref @HC 550'),
  (1555, 1, '’di blino', 'contained', 'the children were tired = oedd y plant ’di blino @HC 455'),
  (1558, 2, 'yn y nos', 'contained', 'late at night = yn hwyr yn y nos @HC 556'),
  (1563, 3, 'yn hirach', 'contained', 'a little longer = ychydig bach yn hirach @HC 276'),
  (1576, 1, 'mae hi wedi bod', 'contained', 'it’s been lovely = mae hi wedi bod yn hyfryd @HC 567'),
  (1582, 1, 'sut beth yw', 'contained', 'what it’s like = sut beth yw e @HC 581'),
  (1585, 2, 'y mynyddoedd', 'contained', 'and see the mountains = a gweld y mynyddoedd @HC 584'),
  (1588, 3, 'tyfu lan', 'contained', 'to grow up here = tyfu lan yma @HC 582'),
  (1594, 1, 'oedd rhaid i fi', 'contained', 'I had to do = oedd rhaid i fi wneud @HC 280'),
  (1604, 3, 'gyda hi', 'contained', 'did you agree with her? = wnest ti gytuno gyda hi? @HC 385'),
  (1605, 2, 'o’n ni angen', 'contained', 'why we needed to = pam o’n ni angen @HC 521'),
  (1605, 3, 'help', 'contained', 'that would be very helpful = byddai hynny’n help mawr @HC 172'),
  (1611, 2, 'i chwilio', 'contained', 'to look for it = i chwilio amdano fe @HC 171'),
  (1626, 2, 'diolch', 'contained', 'thank you very much = diolch yn fawr @old 54'),
  (1630, 1, 'ga i', 'contained', 'can I ask = ga i ofyn @HC 119'),
  (1633, 2, 'byddai', 'contained', 'he would = byddai fe @old 63'),
  (1633, 3, 'yn iawn', 'contained', 'everything is okay = mae popeth yn iawn @HC 141'),
  (1637, 1, 'ble mae', 'contained', 'where she wants to go = ble mae hi’n moyn mynd @HC 177'),
  (1637, 2, 'ei bag hi', 'contained', 'in her bag = yn ei bag hi @HC 53'),
  (1640, 2, 'yw e', 'contained', 'how old he is = pa mor hen yw e @HC 420');

DO $$ BEGIN
  IF to_regclass('backup_cym_sv2_legos_22b') IS NULL THEN RAISE EXCEPTION 'pre-build backup missing'; END IF;
  IF to_regclass('backup_cym_sv2_isnew_22b') IS NOT NULL THEN RAISE EXCEPTION 'already applied (backup_cym_sv2_isnew_22b exists)'; END IF;
  IF (SELECT count(*) FROM flip) <> 168 THEN RAISE EXCEPTION 'expected 168 rows'; END IF;
  IF (SELECT count(*) FROM flip f JOIN course_legos l ON l.course_code='cym_sv2_for_eng'
        AND l.seed_number=f.seed_number AND l.lego_index=f.lego_index AND l.target_text=f.target_text AND l.is_new) <> 168 THEN
    RAISE EXCEPTION 'a listed LEGO is missing, has other text, or is already not new'; END IF;
END $$;

CREATE TABLE backup_cym_sv2_isnew_22b AS
  SELECT l.id, l.seed_number, l.lego_index, l.is_new, l.last_edit_event_id
  FROM course_legos l JOIN flip f USING (seed_number, lego_index) WHERE l.course_code='cym_sv2_for_eng';
REVOKE ALL ON backup_cym_sv2_isnew_22b FROM anon, authenticated;

WITH e AS (
  INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
  SELECT 'cym_sv2_for_eng', 'sql:job-22 weave-cym-sv2-already-taught', 'weave-already-taught', 'agent', 'claude-job-22-south-hc-legos',
         'agent (claude-job-22-south-hc-legos)', false, 'creator',
         jsonb_build_object('lego_keys', (SELECT jsonb_agg(seed_number||':'||lego_index ORDER BY seed_number, lego_index) FROM flip)),
         jsonb_build_object(
           'ruling', 'Aran 2026-10-07: mark a LEGO new only when not already taught earlier in the running order; soft-mutated forms count as taught; a restored old seed introduces only its extras beyond its HC partner',
           'backup', 'backup_cym_sv2_isnew_22b',
           'rows', (SELECT jsonb_agg(jsonb_build_object('seed', seed_number, 'idx', lego_index, 'target', target_text, 'rule', rule, 'taught_by', taught_by) ORDER BY seed_number, lego_index) FROM flip))
  RETURNING id)
SELECT id AS ev FROM e \gset

UPDATE course_legos l SET is_new = false, last_edit_event_id = :'ev'
FROM flip f WHERE l.course_code='cym_sv2_for_eng' AND l.seed_number=f.seed_number AND l.lego_index=f.lego_index;

CREATE TEMP TABLE at_post AS SELECT * FROM pg_temp.others_fingerprint();
DO $$ BEGIN
  IF EXISTS (SELECT * FROM at_pre EXCEPT SELECT * FROM at_post) OR EXISTS (SELECT * FROM at_post EXCEPT SELECT * FROM at_pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: something outside the sandbox changed'; END IF;
  IF (SELECT count(*) FROM course_legos l JOIN flip f USING (seed_number, lego_index)
      WHERE l.course_code='cym_sv2_for_eng' AND NOT l.is_new) <> 168 THEN RAISE EXCEPTION 'CHECK FAILED: not 168 flipped'; END IF;
  IF (SELECT string_agg(seed_number||':'||lego_index, ',' ORDER BY seed_number, lego_index) FROM course_legos
      WHERE course_code='cym_sv2_for_eng' AND seed_number IN (275,280,283,291,299,306,325,328,331,332) AND is_new) <> '283:4,299:1,299:5' THEN
    RAISE EXCEPTION 'CHECK FAILED: keep-both ten should keep exactly ar gyfer, a dweud y gwir, cau new'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT rule, count(*) FROM flip GROUP BY 1 ORDER BY 1;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
