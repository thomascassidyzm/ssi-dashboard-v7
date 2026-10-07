-- Job #949 (Aran 2026-10-07): North Welsh sandbox cym_nv2_for_eng gets Hadau Creiddiol (HC) as a
-- block with its own seed ids, played after old seed 137, and old seeds' ids never change.
--   * #740 drafts at 317-679 (= HC 306-668; no LEGOs, phrases or progress) move to 1306-1668,
--     and the 35 whose Welsh predates HC North v5 take the approved v5 text.
--   * HC 1-305 are inserted at 1001-1305 from HC North v5 (draft).
--   * The Welsh North HC list (canonical_list_seeds, NOT master canonical_seeds) mirrors it:
--     list 317-679 -> 1306-1668, and 1001-1305 copy list 1-305, so the Seed Editor's
--     "course seed N <-> list seed N" pairing holds with no code change.
--   * course_seed_weave: insert_after 137 (the one setting; 257 = panic switch).
--   * course_seed_weave_drops: the amended keep/drop plan (13 HC + 58 old). Excluded, never deleted.
-- Needs database/changes/20261007_course_seed_weave.sql applied first.
-- Dry run unless invoked with  -v finish=COMMIT . Every check raises on failure, and
-- ON_ERROR_STOP then aborts the transaction. Undo: weave-cym-nv2-remove.sql (tested).
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;

\ir weave-fingerprint-fn.sql
CREATE TEMP TABLE pre AS SELECT * FROM pg_temp.others_fingerprint();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM courses WHERE course_code='cym_nv2_for_eng' AND visibility='hidden') THEN
    RAISE EXCEPTION 'cym_nv2_for_eng missing or not hidden'; END IF;
  IF EXISTS (SELECT 1 FROM course_seeds WHERE course_code='cym_nv2_for_eng' AND seed_number >= 1000) THEN
    RAISE EXCEPTION 'seeds >= 1000 already exist; already applied?'; END IF;
  IF (SELECT count(*) FROM course_seeds WHERE course_code='cym_nv2_for_eng' AND seed_number BETWEEN 317 AND 679) <> 363 THEN
    RAISE EXCEPTION 'expected 363 drafts at 317-679'; END IF;
  IF EXISTS (SELECT 1 FROM course_legos WHERE course_code='cym_nv2_for_eng' AND seed_number >= 306)
     OR EXISTS (SELECT 1 FROM course_practice_phrases WHERE course_code='cym_nv2_for_eng' AND seed_number >= 306) THEN
    RAISE EXCEPTION 'something is built on seeds >= 306; refusing to move them'; END IF;
  IF EXISTS (SELECT 1 FROM course_seeds WHERE course_code='cym_nv2_for_eng' AND seed_number BETWEEN 317 AND 679 AND status <> 'draft') THEN
    RAISE EXCEPTION 'a seed in 317-679 is not draft'; END IF;
  IF EXISTS (SELECT 1 FROM course_seed_weave WHERE course_code='cym_nv2_for_eng') THEN
    RAISE EXCEPTION 'weave row already exists'; END IF;
  IF (SELECT list_id FROM canonical_list_assignments WHERE course_code='cym_nv2_for_eng') <> '8a1af4aa-6733-4d5e-9724-e6f9df3212e0' THEN
    RAISE EXCEPTION 'unexpected HC list assignment'; END IF;
END $$;

-- Backups (service-role only, like backup_cym_nv2_seeds_20261007). The undo restores from these.
CREATE TABLE backup_cym_nv2_seeds_949 AS SELECT * FROM course_seeds WHERE course_code='cym_nv2_for_eng';
CREATE TABLE backup_hc_north_list_949 AS SELECT * FROM canonical_list_seeds WHERE list_id='8a1af4aa-6733-4d5e-9724-e6f9df3212e0';
REVOKE ALL ON backup_cym_nv2_seeds_949, backup_hc_north_list_949 FROM anon, authenticated;

WITH e AS (
  INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
  VALUES ('cym_nv2_for_eng', 'sql:job-949 weave-cym-nv2', 'renumber', 'agent', 'claude-weave-cym-nv2-2026-10-07',
          'agent (claude-weave-cym-nv2-2026-10-07)', false, 'creator',
          '{"from":[317,679],"to":[1306,1668]}',
          '{"backup":"backup_cym_nv2_seeds_949","reason":"HC seed N gets id 1000+N; #740 drafts carry nothing; 35 take approved HC North v5 Welsh; Aran 2026-10-07"}')
  RETURNING id)
SELECT id AS ev_move FROM e \gset
WITH e AS (
  INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
  VALUES ('cym_nv2_for_eng', 'sql:job-949 weave-cym-nv2', 'insert', 'agent', 'claude-weave-cym-nv2-2026-10-07',
          'agent (claude-weave-cym-nv2-2026-10-07)', false, 'creator',
          '{"seeds":[1001,1305]}',
          '{"source":"HC North v5 (approved by Aran), https://watson-1.tail4968cb.ts.net/d/0d62be4a"}')
  RETURNING id)
SELECT id AS ev_ins FROM e \gset

UPDATE course_seeds SET seed_number = seed_number + 989, last_edit_event_id = :'ev_move'
WHERE course_code='cym_nv2_for_eng' AND seed_number BETWEEN 317 AND 679;

UPDATE course_seeds s SET target_text = v.t, last_edit_event_id = :'ev_move'
FROM (VALUES
  (1325, 'dw i’n meddwl fod o angen ystyried deg problem bosib'),
  (1338, 'yn wael'),
  (1339, 'na, dw i’n meddwl fod o wedi brifo ei hun yn eitha’ gwael'),
  (1360, 'ddudodd dy ffrind unrhyw beth arall?'),
  (1384, 'do’n i ddim yn medru cytuno efo be’ ddudodd o funud yn ôl'),
  (1457, 'rhan o’r broblem ydy nifer yr ardaloedd gwahanol'),
  (1472, 'rhan o’r broblem ydy nad ydan ni ddim yn gwybod y ffeithiau'),
  (1479, 'dyna’r lleia’ o’n i’n medru gwneud'),
  (1483, 'dydy bywyd ddim yn hawdd ond dydy o ddim i fod yn hawdd'),
  (1492, 'pa un o’r llefydd yna wyt ti’n meddwl ydy’r un mwya’ diddorol?'),
  (1494, 'beth sy’n digwydd ar ôl rhan gynta’ y sioe?'),
  (1495, 'pan fydd hi’n cyfri’'),
  (1496, 'dw i ddim yn bwriadu colli pan fydd hi wirioneddol yn cyfri’'),
  (1503, 'dw i’n casáu codi twrw ond un fi ydy hwnnw'),
  (1506, 'o’n i’n arfer byw yn yr ardal hon flynyddoedd yn ôl cyn i ni symud'),
  (1513, 'mae’n brifo mwya’ pan dw i’n symud fy mhen i fyny ac i lawr'),
  (1514, 'wnes i ffeindio’r tŷ perffaith ar y diwrnod cynta’'),
  (1515, 'ar ddiwrnod cynta’ y flwyddyn newydd'),
  (1518, 'fyswn i ddim yn medru dychmygu fy hun yn cael yn union yr un broblem'),
  (1555, 'a dw i wedi blino gormod i nôl un newydd'),
  (1559, 'wyt ti ’di ffeindio’r llwybr drwy’r coed?'),
  (1563, 'fyswn i ddim wedi medru dal ati’n hirach'),
  (1564, 'fyswn i ddim wedi medru heb dy help di'),
  (1565, 'fyswn i wedi meddwl amdano fo’n fwy gofalus'),
  (1566, 'fyswn i wedi meddwl mwy tasai o wedi bod yn fy newis i'),
  (1575, 'mae wedi bod yn annifyr iawn'),
  (1583, 'sut le ydy o yn y rhan yma o’r byd?'),
  (1599, 'fyswn i wedi bod yn hapus i ddreifio ’set ti wedi deud wrthaf fi'),
  (1600, 'fyswn i wedi dreifio ’set ti wedi deud wrthaf fi faint oeddat ti wedi blino'),
  (1606, '’swn i wedi gwybod bryd hynny be’ dw i’n gwybod rŵan fyswn i wedi aros'),
  (1607, '’swn i wedi gwybod fyswn i wedi gwneud pethau’n wahanol'),
  (1611, 'fyswn i wedi bod yn barod i edrych yn rhywle arall'),
  (1612, 'fysen ni wedi prynu rhywbeth'),
  (1613, 'mwy na thebyg fysen ni wedi prynu tŷ yno'),
  (1621, 'fyswn i ddim wedi meiddio deud wrthi hi fod o wedi torri')
) v(n, t)
WHERE s.course_code='cym_nv2_for_eng' AND s.seed_number = v.n;

CREATE TEMP TABLE hc_new (n int, k text, t text, en text);
INSERT INTO hc_new VALUES
  (1001, 'I want to speak Welsh with you now', 'dw i isio siarad Cymraeg efo chdi rŵan', 'I want to speak {target} with you now.'),
  (1002, 'I''m trying to learn', 'dw i’n trio dysgu', 'I''m trying to learn.'),
  (1003, 'how to speak as often as possible', 'sut i siarad mor aml â phosib', 'how to speak as often as possible.'),
  (1004, 'how to say something in Welsh', 'sut i ddeud rhywbeth yn y Gymraeg', 'how to say something in {target}'),
  (1005, 'I''m going to practise speaking with someone else', 'dw i’n mynd i ymarfer siarad efo rhywun arall', 'I''m going to practise speaking with someone else.'),
  (1006, 'I''m trying to remember a word', 'dw i’n trio cofio gair', 'I''m trying to remember a word.'),
  (1007, 'I want to try as hard as I can today', 'dw i isio trio mor galed ag y medra i heddiw', 'I want to try as hard as I can today.'),
  (1008, 'I''m going to try to explain what I mean', 'dw i’n mynd i drio esbonio be’ dw i’n meddwl', 'I''m going to try to explain what I mean.'),
  (1009, 'I speak a little Welsh now', 'dw i’n siarad dipyn bach o Gymraeg rŵan', 'I speak a little {target} now.'),
  (1010, 'I''m not sure if I can remember the whole sentence', 'dw i ddim yn siŵr os medra i gofio’r frawddeg gyfan', 'I''m not sure if I can remember the whole sentence.'),
  (1011, 'I''d like to be able to speak after you finish', 'liciwn i fedru siarad ar ôl i ti orffen', 'I''d like to be able to speak after you finish.'),
  (1012, 'I wouldn''t like to guess what''s going to happen tomorrow', 'fyddwn i ddim yn licio dyfalu be’ sy’n mynd i ddigwydd ’fory', 'I wouldn''t like to guess what''s going to happen tomorrow.'),
  (1013, 'you speak Welsh very well', 'ti’n siarad Cymraeg yn dda iawn', 'You speak {target} very well.'),
  (1014, 'do you speak Welsh all day?', 'wyt ti’n siarad Cymraeg drwy’r dydd?', 'Do you speak {target} all day?'),
  (1015, 'and I want you to speak Welsh with me tomorrow', 'a dw i isio i ti siarad Cymraeg efo fi ’fory', 'And I want you to speak {target} with me tomorrow.'),
  (1016, 'he wants to come back with everyone else later on', 'mae o isio dod yn ôl efo pawb arall nes ymlaen', 'He wants to come back with everyone else later on.'),
  (1017, 'she wants to find out what the answer is', 'mae hi isio ffeindio allan be’ ydy’r ateb', 'She wants to find out what the answer is.'),
  (1018, 'we want to meet at six o''clock this evening', 'dan ni isio cyfarfod am chwech o’r gloch heno', 'We want to meet at six o''clock this evening.'),
  (1019, 'but I don''t want to stop talking', 'ond dw i ddim isio stopio siarad', 'But I don''t want to stop talking.'),
  (1020, 'you want to learn his name quickly', 'ti isio dysgu ei enw fo’n gyflym', 'You want to learn his name quickly.'),
  (1021, 'why are you learning her name?', 'pam wyt ti’n dysgu ei henw hi?', 'Why are you learning her name?'),
  (1022, 'because I want to meet people who speak Welsh', 'achos dw i isio cyfarfod pobl sy’n siarad Cymraeg', 'Because I want to meet people who speak {target}.'),
  (1023, 'I''m going to start talking more soon', 'dw i’n mynd i ddechrau siarad mwy cyn bo hir', 'I''m going to start talking more soon.'),
  (1024, 'I''m not going to be able to remember easily', 'dw i ddim yn mynd i fedru cofio’n hawdd', 'I''m not going to be able to remember easily.'),
  (1025, 'are you going to help me before I have to go?', 'wyt ti’n mynd i helpu fi cyn i mi orfod mynd?', 'Are you going to help me before I have to go?'),
  (1026, 'I like feeling as if I''m nearly ready to go', 'dw i’n licio teimlo fel taswn i bron yn barod i fynd', 'I like feeling as if I''m nearly ready to go.'),
  (1027, 'I don''t like taking too much time to answer', 'dw i ddim yn licio cymryd gormod o amser i ateb', 'I don''t like taking too much time to answer.'),
  (1028, 'it''s useful to start talking as soon as you can', 'mae’n ddefnyddiol dechrau siarad cyn gynted ag y medri di', 'It''s useful to start talking as soon as you can.'),
  (1029, 'I''m looking forward to speaking better as soon as I can', 'dw i’n edrych ymlaen at siarad yn well cyn gynted ag y medra i', 'I''m looking forward to speaking better as soon as I can.'),
  (1030, 'I wanted to ask you something yesterday', 'o’n i isio gofyn rhywbeth i ti ddoe', 'I wanted to ask you something yesterday.'),
  (1031, 'you wanted to speak with me tonight', 'oeddat ti isio siarad efo fi heno', 'You wanted to speak with me tonight.'),
  (1032, 'did you want to show me something?', 'oeddat ti isio dangos rhywbeth i mi?', 'Did you want to show me something?'),
  (1033, 'how long have you been learning Welsh?', 'pa mor hir wyt ti ’di bod yn dysgu Cymraeg?', 'How long have you been learning {target}?'),
  (1034, 'he doesn''t want to be quiet when other people are here', 'dydy o ddim isio bod yn ddistaw pan mae pobl eraill yma', 'He doesn''t want to be quiet when other people are here.'),
  (1035, 'she doesn''t want to read anything this afternoon', 'dydy hi ddim isio darllen unrhyw beth pnawn ’ma', 'She doesn''t want to read anything this afternoon.'),
  (1036, 'we don''t want to interrupt the story', 'dan ni ddim isio torri ar draws y stori', 'We don''t want to interrupt the story.'),
  (1037, 'I started to think about it carefully last month', 'wnes i ddechrau meddwl amdano fo’n ofalus mis diwetha’', 'I started to think about it carefully last month.'),
  (1038, 'I''ve been learning for about a week', 'dw i wedi bod yn dysgu am tua wythnos', 'I''ve been learning for about a week.'),
  (1039, 'but I''m a little tired this morning', 'ond dw i wedi blino dipyn bach bore ’ma', 'But I''m a little tired this morning.'),
  (1040, 'how do you feel at the moment?', 'sut wyt ti’n teimlo ar hyn o bryd?', 'How do you feel at the moment?'),
  (1041, 'I feel okay, but I''m starting to feel tired', 'dw i’n teimlo’n iawn, ond dw i’n dechrau blino', 'I feel okay, but I''m starting to feel tired.'),
  (1042, 'I was starting to feel better than last night', 'o’n i’n dechrau teimlo’n well na neithiwr', 'I was starting to feel better than last night.'),
  (1043, 'I wasn''t thinking about how to answer', 'do’n i ddim yn meddwl am sut i ateb', 'I wasn''t thinking about how to answer.'),
  (1044, 'or if I need to improve', 'neu os dw i angen gwella', 'Or if I need to improve.'),
  (1045, 'I don''t need to know everything', 'dw i ddim angen gwybod popeth', 'I don''t need to know everything.'),
  (1046, 'but I don''t worry about making mistakes', 'ond dw i ddim yn poeni am wneud camgymeriadau', 'But I don''t worry about making mistakes.'),
  (1047, 'because I think that it''s a good thing to make mistakes', 'achos dw i’n meddwl fod o’n beth da i wneud camgymeriadau', 'Because I think that it''s a good thing to make mistakes.'),
  (1048, 'I don''t care about making mistakes', 'does dim ots gen i am wneud camgymeriadau', 'I don''t care about making mistakes.'),
  (1049, 'it''s like this, if you know what I mean', 'mae o fel hyn, os ti’n gwybod be’ dw i’n meddwl', 'It''s like this, if you know what I mean.'),
  (1050, 'I''m not trying to finish as quickly as possible', 'dw i ddim yn trio gorffen mor gyflym â phosib', 'I''m not trying to finish as quickly as possible.'),
  (1051, 'I enjoy doing interesting things with my friends', 'dw i’n mwynhau gwneud pethau diddorol efo fy ffrindiau', 'I enjoy doing interesting things with my friends.'),
  (1052, 'he wanted to write a letter to his friend last week', 'oedd o isio sgwennu llythyr at ei ffrind wythnos diwetha’', 'He wanted to write a letter to his friend last week.'),
  (1053, 'she wanted to put his letter in her bag', 'oedd hi isio rhoi ei lythyr o yn ei bag hi', 'She wanted to put his letter in her bag.'),
  (1054, 'we wanted to give you a little more time', 'oeddan ni isio rhoi ychydig mwy o amser i ti', 'We wanted to give you a little more time.'),
  (1055, 'I don''t enjoy waking up when I didn''t sleep very well', 'dw i ddim yn mwynhau deffro pan wnes i ddim cysgu’n dda iawn', 'I don''t enjoy waking up when I didn''t sleep very well.'),
  (1056, 'so I can remember how to say a few words', 'fel medra i gofio sut i ddeud ychydig o eiriau', 'So I can remember how to say a few words.'),
  (1057, 'I can''t remember how to say what I wanted to say', 'fedra i ddim cofio sut i ddeud be’ o’n i isio deud', 'I can''t remember how to say what I wanted to say.'),
  (1058, 'it''s interesting when you understand enough words', 'mae’n ddiddorol pan ti’n dallt digon o eiriau', 'It''s interesting when you understand enough words.'),
  (1059, 'I know how to do what I need to do next week', 'dw i’n gwybod sut i wneud be’ dw i angen gwneud wythnos nesa’', 'I know how to do what I need to do next week.'),
  (1060, 'I don''t know how to say enough different words yet', 'dw i ddim yn gwybod sut i ddeud digon o eiriau gwahanol hyd yn hyn', 'I don''t know how to say enough different words yet.'),
  (1061, 'could you say that again a little more slowly?', 'fedri di ddeud hynna eto bach yn arafach?', 'Could you say that again a little more slowly?'),
  (1062, 'I''m not sure if I can help you at the same time', 'dw i ddim yn siŵr os medra i helpu chdi ar yr un pryd', 'I''m not sure if I can help you at the same time.'),
  (1063, 'are you sure you don''t mind helping me?', 'wyt ti’n siŵr bod dim ots gen ti helpu fi?', 'Are you sure you don''t mind helping me?'),
  (1064, 'learning Welsh isn''t easy but it is fun', 'dydy dysgu Cymraeg ddim yn hawdd ond mae’n hwyl', 'Learning {target} isn''t easy but it is fun.'),
  (1065, 'it''s important to take time to test yourself', 'mae’n bwysig cymryd amser i brofi dy hun', 'It''s important to take time to test yourself.'),
  (1066, 'it''s not difficult to find the answer', 'dydy hi ddim yn anodd ffeindio’r ateb', 'It''s not difficult to find the answer.'),
  (1067, 'why do you want to stop?', 'pam wyt ti isio stopio?', 'Why do you want to stop?'),
  (1068, 'what are you looking for?', 'be’ wyt ti’n chwilio amdano?', 'What are you looking for?'),
  (1069, 'he didn''t want to look after the young dog all afternoon', 'doedd o ddim isio edrych ar ôl y ci ifanc drwy’r pnawn', 'He didn''t want to look after the young dog all afternoon.'),
  (1070, 'she didn''t want to tell me where it was', 'doedd hi ddim isio deud wrtha i lle oedd o', 'She didn''t want to tell me where it was.'),
  (1071, 'we didn''t want to let anyone hear the truth', 'doeddan ni ddim isio gadael i neb glywed y gwir', 'We didn''t want to let anyone hear the truth.'),
  (1072, 'I think that you''re doing very well', 'dw i’n meddwl bo’ ti’n gwneud yn dda iawn', 'I think that you''re doing very well.'),
  (1073, 'thank you very much, but I''ve got more to learn', 'diolch yn fawr, ond mae gen i fwy i ddysgu', 'Thank you very much, but I''ve got more to learn.'),
  (1074, 'thank you very much for helping me to understand', 'diolch yn fawr am helpu fi i ddallt', 'Thank you very much for helping me to understand.'),
  (1075, 'have you got more to learn?', 'oes gen ti fwy i ddysgu?', 'Have you got more to learn?'),
  (1076, 'I''m very happy with how much I''ve learnt already', 'dw i’n hapus iawn efo faint dw i wedi dysgu’n barod', 'I''m very happy with how much I''ve learnt already.'),
  (1077, 'I''m surprised at how quickly I''m starting to understand', 'dw i’n synnu pa mor gyflym dw i’n dechrau dallt', 'I''m surprised at how quickly I''m starting to understand.'),
  (1078, 'I don''t understand what you said', 'dw i ddim yn dallt be’ ddudest ti', 'I don''t understand what you said.'),
  (1079, 'when did you start to learn?', 'pryd wnest ti ddechrau dysgu?', 'When did you start to learn?'),
  (1080, 'I''m not sure when I''ll be ready', 'dw i ddim yn siŵr pryd fydda i’n barod', 'I''m not sure when I''ll be ready.'),
  (1081, 'when do you want to start?', 'pryd wyt ti isio dechrau?', 'When do you want to start?'),
  (1082, 'I''m not going to wait for you. Why not?', 'dw i ddim yn mynd i aros amdanat ti. pam ddim?', 'I''m not going to wait for you. Why not?'),
  (1083, 'I agree with what you said about your friend', 'dw i’n cytuno efo be’ ddudest ti am dy ffrind', 'I agree with what you said about your friend.'),
  (1084, 'I don''t agree with what he said about my friend', 'dw i ddim yn cytuno efo be’ ddudodd o am fy ffrind', 'I don''t agree with what he said about my friend.'),
  (1085, 'I don''t know those people', 'dw i ddim yn nabod y bobl ’na', 'I don''t know those people.'),
  (1086, 'it wasn''t possible, unfortunately', 'doedd o ddim yn bosib, yn anffodus', 'It wasn''t possible, unfortunately.'),
  (1087, 'they are people I don''t know', 'pobl dw i ddim yn nabod ydyn nhw', 'They are people I don''t know.'),
  (1088, 'I''m not ready to talk to people I don''t know yet', 'dw i ddim yn barod i siarad efo pobl dw i ddim yn nabod hyd yn hyn', 'I''m not ready to talk to people I don''t know yet.'),
  (1089, 'I think that I''ve done a lot in a short time', 'dw i’n meddwl bo’ fi wedi gwneud llawer mewn amser byr', 'I think that I''ve done a lot in a short time.'),
  (1090, 'if you can speak more slowly that would be great', 'os medri di siarad yn arafach, fyddai hynna’n wych', 'If you can speak more slowly that would be great.'),
  (1091, 'it''s difficult to think quickly enough to answer in time', 'mae’n anodd meddwl yn ddigon cyflym i ateb mewn pryd', 'It''s difficult to think quickly enough to answer in time.'),
  (1092, 'I''d like to keep on doing this for a while', 'liciwn i gario ymlaen i wneud hyn am dipyn', 'I''d like to keep on doing this for a while.'),
  (1093, 'it''s time to go now', 'mae’n amser mynd rŵan', 'It''s time to go now.'),
  (1094, 'this is the only way it will work', 'dyma’r unig ffordd fydd o’n gweithio', 'This is the only way it will work.'),
  (1095, 'are you ready to go home on the next bus?', 'wyt ti’n barod i fynd adre ar y bws nesa’?', 'Are you ready to go home on the next bus?'),
  (1096, 'no I''m not ready yet, I need a little more time', 'na, dw i ddim yn barod hyd yn hyn, dw i angen ychydig mwy o amser', 'No I''m not ready yet, I need a little more time.'),
  (1097, 'yes I''m ready to go as soon as you want', 'yndw, dw i’n barod i fynd cyn gynted â ti isio', 'Yes I''m ready to go as soon as you want.'),
  (1098, 'I should consider playing something else', 'dylwn i ystyried chwarae rhywbeth arall', 'I should consider playing something else.'),
  (1099, 'you should ask yourself why it''s not working', 'dylet ti ofyn i dy hun pam dydy o ddim yn gweithio', 'You should ask yourself why it''s not working.'),
  (1100, 'you shouldn''t worry about doing something similar', 'ddylet ti ddim poeni am wneud rhywbeth tebyg', 'You shouldn''t worry about doing something similar.'),
  (1101, 'I''m enjoying finding out more about this language', 'dw i’n mwynhau ffeindio allan mwy am yr iaith ’ma', 'I''m enjoying finding out more about this language.'),
  (1102, 'we''re trying to say that it''s not like that', 'dan ni’n trio deud fod o ddim fel ’na', 'We''re trying to say that it''s not like that.'),
  (1103, 'we''re not trying to hear many more words', 'dan ni ddim yn trio clywed llawer mwy o eiriau', 'We''re not trying to hear many more words.'),
  (1104, 'we need to change what we''re doing', 'dan ni angen newid be’ dan ni’n gwneud', 'We need to change what we''re doing.'),
  (1105, 'that is why he didn''t know the answer', 'dyna pam doedd o ddim yn gwybod yr ateb', 'That is why he didn''t know the answer.'),
  (1106, 'we don''t need to feel happy, we just need to work hard', 'dan ni ddim angen teimlo’n hapus, dan ni jyst angen gweithio’n galed', 'We don''t need to feel happy, we just need to work hard.'),
  (1107, 'we hoped to see what you were doing', 'oeddan ni’n gobeithio gweld be’ oeddat ti’n gwneud', 'We hoped to see what you were doing.'),
  (1108, 'we didn''t hope to wake in the middle of the night', 'doeddan ni ddim yn gobeithio deffro yng nghanol y nos', 'We didn''t hope to wake in the middle of the night.'),
  (1109, 'we must work hard to learn a lot of new words', 'rhaid i ni weithio’n galed i ddysgu llawer o eiriau newydd', 'We must work hard to learn a lot of new words.'),
  (1110, 'we''re friends, and after we finish I''d like to relax', 'dan ni’n ffrindiau, ac ar ôl i ni orffen liciwn i ymlacio', 'We''re friends, and after we finish I''d like to relax.'),
  (1111, 'when we learn something new it changes our brain', 'pan dan ni’n dysgu rhywbeth newydd mae’n newid ein hymennydd ni', 'When we learn something new it changes our brain.'),
  (1112, 'that was very interesting, and I wasn''t expecting it', 'oedd hynna’n ddiddorol iawn, a do’n i ddim yn disgwyl o', 'That was very interesting, and I wasn''t expecting it.'),
  (1113, 'why can''t I remember what you said?', 'pam fedra i ddim cofio be’ ddudest ti?', 'Why can''t I remember what you said?'),
  (1114, 'I feel as if I''m doing worse today than yesterday', 'dw i’n teimlo fel taswn i’n gwneud yn waeth heddiw na ddoe', 'I feel as if I''m doing worse today than yesterday.'),
  (1115, 'I don''t feel as if I''m ready to have a conversation', 'dw i ddim yn teimlo fel taswn i’n barod i gael sgwrs', 'I don''t feel as if I''m ready to have a conversation.'),
  (1116, 'this isn''t the best choice I could make', 'dydy hwn ddim y dewis gorau fedrwn i wneud', 'This isn''t the best choice I could make.'),
  (1117, 'I''m definitely doing better than I was last time we talked to each other', 'dw i’n bendant yn gwneud yn well nag o’n i tro diwetha’ wnaethon ni siarad efo’n gilydd', 'I''m definitely doing better than I was last time we talked to each other.'),
  (1118, 'I feel better than I felt when we were in the pub', 'dw i’n teimlo’n well nag o’n i’n teimlo pan oeddan ni yn y dafarn', 'I feel better than I felt when we were in the pub.'),
  (1119, 'can I ask you something before you leave?', 'ga i ofyn rhywbeth i ti cyn i ti adael?', 'Can I ask you something before you leave?'),
  (1120, 'it''s interesting that you like to go by bus', 'mae’n ddiddorol bo’ ti’n licio mynd ar y bws', 'It''s interesting that you like to go by bus.'),
  (1121, 'it''s unusual that you don''t like to use your car', 'mae’n anarferol bo’ ti ddim yn licio defnyddio dy gar', 'It''s unusual that you don''t like to use your car.'),
  (1122, 'it''s starting to feel easier and I''m excited about how it''s going', 'mae’n dechrau teimlo’n haws a dw i’n gyffrous am sut mae’n mynd', 'It''s starting to feel easier and I''m excited about how it''s going.'),
  (1123, 'I think that''s a good idea', 'dw i’n meddwl bod hynna’n syniad da', 'I think that''s a good idea.'),
  (1124, 'I thought that was a good idea', 'o’n i’n meddwl bod hynna’n syniad da', 'I thought that was a good idea.'),
  (1125, 'I believe that your idea was very good', 'dw i’n credu bod dy syniad di wedi bod yn dda iawn', 'I believe that your idea was very good.'),
  (1126, 'this work is changing the shape of my brain', 'mae’r gwaith ’ma’n newid siâp fy ymennydd i', 'This work is changing the shape of my brain.'),
  (1127, 'that isn''t why I wanted to see you', 'dim dyna pam o’n i isio gweld chdi', 'That isn''t why I wanted to see you.'),
  (1128, 'you''re like someone I used to know', 'ti fel rhywun o’n i’n arfer nabod', 'You''re like someone I used to know.'),
  (1129, 'I''m so happy that you''re doing so well', 'dw i mor hapus bo’ ti’n gwneud mor dda', 'I''m so happy that you''re doing so well.'),
  (1130, 'that was a surprise, because he''s my friend', 'oedd hynna’n syndod, achos mae o’n ffrind i mi', 'That was a surprise, because he''s my friend.'),
  (1131, 'there are too many ideas going around in my head', 'mae ’na ormod o syniadau’n mynd rownd yn fy mhen', 'There are too many ideas going around in my head.'),
  (1132, 'that''s less exciting than what she was saying', 'mae hynna’n llai cyffrous na be’ oedd hi’n deud', 'That''s less exciting than what she was saying.'),
  (1133, 'you get to know someone very well when you work together', 'ti’n dod i nabod rhywun yn dda iawn pan dach chi’n gweithio efo’ch gilydd', 'You get to know someone very well when you work together.'),
  (1134, 'it''s not a problem when you work at something difficult with them', 'dydy hi ddim yn broblem pan ti’n gweithio ar rywbeth anodd efo nhw', 'It''s not a problem when you work at something difficult with them.'),
  (1135, 'I don''t know why you think that it''s so good', 'dw i ddim yn gwybod pam ti’n meddwl fod o mor dda', 'I don''t know why you think that it''s so good.'),
  (1136, 'of course you can ask her because she''s my friend', 'wrth gwrs gei di ofyn iddi hi achos mae hi’n ffrind i mi', 'Of course you can ask her because she''s my friend.'),
  (1137, 'it''s more important to talk often than to be perfect', 'mae’n bwysicach siarad yn aml na bod yn berffaith', 'It''s more important to talk often than to be perfect.'),
  (1138, 'this was where my friend wanted to meet us', 'fan hyn oedd fy ffrind isio cyfarfod ni', 'This was where my friend wanted to meet us.'),
  (1139, 'I''m sorry that I need to leave so early', 'mae’n ddrwg gen i bo’ fi angen gadael mor gynnar', 'I''m sorry that I need to leave so early.'),
  (1140, 'I''m sorry that I can''t see what you''re trying to show me', 'mae’n ddrwg gen i bo’ fi ddim yn medru gweld be’ ti’n trio dangos i mi', 'I''m sorry that I can''t see what you''re trying to show me.'),
  (1141, 'no problem. Everything is okay', 'dim problem. mae popeth yn iawn', 'No problem. Everything is okay.'),
  (1142, 'that''s very kind of you and I''m grateful to you for helping', 'mae hynna’n garedig iawn ohonot ti a dw i’n ddiolchgar i ti am helpu', 'That''s very kind of you and I''m grateful to you for helping.'),
  (1143, 'it''s the same thing as we were talking about earlier', 'mae o’r un peth â be’ oeddan ni’n siarad amdano gynnau', 'It''s the same thing as we were talking about earlier.'),
  (1144, 'I woke earlier than I wanted to this morning', 'wnes i ddeffro’n gynharach nag o’n i isio bore ’ma', 'I woke earlier than I wanted to this morning.'),
  (1145, 'why are you not happy any more?', 'pam dwyt ti ddim yn hapus bellach?', 'Why are you not happy any more?'),
  (1146, 'nothing seems to be working since we tried to fix it', 'does dim byd i weld yn gweithio ers i ni drio’i drwsio fo', 'Nothing seems to be working since we tried to fix it.'),
  (1147, 'she was very kind when she saw me feeling nervous', 'oedd hi’n garedig iawn pan welodd hi fi’n teimlo’n nerfus', 'She was very kind when she saw me feeling nervous.'),
  (1148, 'he wasn''t very patient when I couldn''t answer', 'doedd o ddim yn amyneddgar iawn pan o’n i ddim yn medru ateb', 'He wasn''t very patient when I couldn''t answer.'),
  (1149, 'this isn''t very difficult, so I hope you''ll finish soon', 'dydy hwn ddim yn anodd iawn, felly dw i’n gobeithio byddi di’n gorffen cyn bo hir', 'This isn''t very difficult, so I hope you''ll finish soon.'),
  (1150, 'can you tell me what your name is?', 'fedri di ddeud wrtha i be’ ydy dy enw di?', 'Can you tell me what your name is?'),
  (1151, 'that wasn''t what I was hoping would happen', 'dim hynna o’n i’n gobeithio fyddai’n digwydd', 'That wasn''t what I was hoping would happen.'),
  (1152, 'I would have done it differently if I had known what you wanted', 'fyswn i wedi gwneud o’n wahanol ’swn i wedi gwybod be’ oeddat ti isio', 'I would have done it differently if I had known what you wanted.'),
  (1153, 'I wouldn''t have said it in exactly the same way', 'fyswn i ddim wedi deud o yn union yr un ffordd', 'I wouldn''t have said it in exactly the same way.'),
  (1154, 'where do you want to meet on Saturday night?', 'lle wyt ti isio cyfarfod nos Sadwrn?', 'Where do you want to meet on Saturday night?'),
  (1155, 'I don''t mind waiting for a few minutes tomorrow morning', 'does dim ots gen i aros am ychydig funudau bore ’fory', 'I don''t mind waiting for a few minutes tomorrow morning.'),
  (1156, 'do you want to go to a restaurant tonight?', 'wyt ti isio mynd i fwyty heno?', 'Do you want to go to a restaurant tonight?'),
  (1157, 'I won''t be able to be there next month', 'fydda i ddim yn medru bod yno mis nesa’', 'I won''t be able to be there next month.'),
  (1158, 'let''s talk about something else', 'gad i ni siarad am rywbeth arall', 'Let''s talk about something else.'),
  (1159, 'that isn''t what I''m trying to say', 'dim hynna dw i’n trio deud', 'That isn''t what I''m trying to say.'),
  (1160, 'how do you say this word in Welsh?', 'sut wyt ti’n deud y gair ’ma yn y Gymraeg?', 'How do you say this word in {target}?'),
  (1161, 'can you give me that book on Sunday morning?', 'fedri di roi’r llyfr ’na i mi fore dydd Sul?', 'Can you give me that book on Sunday morning?'),
  (1162, 'what do you think about that?', 'be’ ti’n meddwl am hynna?', 'What do you think about that?'),
  (1163, 'I think that it''s interesting', 'dw i’n meddwl fod o’n ddiddorol', 'I think that it''s interesting.'),
  (1164, 'an interesting book', 'llyfr diddorol', 'An interesting book'),
  (1165, 'but I''m not sure if it''s true', 'ond dw i ddim yn siŵr os ydy o’n wir', 'But I''m not sure if it''s true.'),
  (1166, 'my name is not very unusual', 'dydy fy enw i ddim yn anarferol iawn', 'My name is not very unusual.'),
  (1167, 'what do you need to do tomorrow afternoon?', 'be’ wyt ti angen gwneud pnawn ’fory?', 'What do you need to do tomorrow afternoon?'),
  (1168, 'and then I''ll be able to come and help later on', 'ac wedyn mi fydda i’n medru dod i helpu nes ymlaen', 'And then I''ll be able to come and help later on.'),
  (1169, 'what do you want me to do?', 'be’ wyt ti isio i mi wneud?', 'What do you want me to do?'),
  (1170, 'I''d like you to tell me what you need', 'liciwn i i ti ddeud wrtha i be’ ti angen', 'I''d like you to tell me what you need.'),
  (1171, 'do you want me to help you look for it?', 'wyt ti isio i mi helpu chdi chwilio amdano fo?', 'Do you want me to help you look for it?'),
  (1172, 'yes that would be very helpful', 'yndw, fyddai hynna’n help mawr', 'Yes that would be very helpful.'),
  (1173, 'no thank you I can manage on my own', 'na, dim diolch, mi fedra i ymdopi ar fy mhen fy hun', 'No thank you I can manage on my own.'),
  (1174, 'can you understand what I''m saying?', 'fedri di ddallt be’ dw i’n deud?', 'Can you understand what I''m saying?'),
  (1175, 'what do you want to do on Sunday morning?', 'be’ wyt ti isio gwneud fore dydd Sul?', 'What do you want to do on Sunday morning?'),
  (1176, 'I''ll ask him if he''ll be able to help next year', 'mi wna i ofyn iddo fo os fydd o’n medru helpu flwyddyn nesa’', 'I''ll ask him if he''ll be able to help next year.'),
  (1177, 'I''ll ask her where she wants to go', 'mi wna i ofyn iddi hi lle mae hi isio mynd', 'I''ll ask her where she wants to go.'),
  (1178, 'I didn''t have time, although I wanted to see you', 'ges i ddim amser, er bo’ fi isio gweld chdi', 'I didn''t have time, although I wanted to see you.'),
  (1179, 'what are you going to do on Sunday afternoon?', 'be’ wnei di bnawn dydd Sul?', 'What are you going to do on Sunday afternoon?'),
  (1180, 'I''d like to read my book for a while', 'liciwn i ddarllen fy llyfr am dipyn', 'I''d like to read my book for a while.'),
  (1181, 'but I have to take my mother to the doctor', 'ond rhaid i mi fynd â fy mam at y doctor', 'But I have to take my mother to the doctor.'),
  (1182, 'have you seen my keys anywhere?', 'wyt ti wedi gweld fy ngoriadau i yn rhywle?', 'Have you seen my keys anywhere?'),
  (1183, 'no I''m afraid I haven''t seen them', 'na, mae arna i ofn bo’ fi heb eu gweld nhw', 'No I''m afraid I haven''t seen them.'),
  (1184, 'yes I saw them in the office a while ago', 'do, weles i nhw yn y swyddfa sbel yn ôl', 'Yes I saw them in the office a while ago.'),
  (1185, 'I think you left them at work', 'dw i’n meddwl bo’ ti wedi’u gadael nhw yn y gwaith', 'I think you left them at work.'),
  (1186, 'do you want to talk about something different next week?', 'wyt ti isio siarad am rywbeth gwahanol wythnos nesa’?', 'Do you want to talk about something different next week?'),
  (1187, 'I''m happy so far', 'dw i’n hapus hyd yn hyn', 'I''m happy so far.'),
  (1188, 'so I don''t need to change', 'felly dw i ddim angen newid', 'So I don''t need to change.'),
  (1189, 'yes that''s a good idea', 'ia, mae hynna’n syniad da', 'Yes that''s a good idea.'),
  (1190, 'do you mind if I ask you some questions?', 'oes ots gen ti os dw i’n gofyn ychydig o gwestiynau i ti?', 'Do you mind if I ask you some questions?'),
  (1191, 'no I don''t mind at all', 'na, does dim ots gen i o gwbl', 'No I don''t mind at all.'),
  (1192, 'I''m busy tomorrow night', 'dw i’n brysur nos ’fory', 'I''m busy tomorrow night.'),
  (1193, 'I''m sorry but I''m too busy today', 'mae’n ddrwg gen i ond dw i’n rhy brysur heddiw', 'I''m sorry but I''m too busy today.'),
  (1194, 'what are you looking for?', 'be’ wyt ti’n chwilio amdano?', 'What are you looking for?'),
  (1195, 'I''m trying to find the money I left on the table', 'dw i’n trio ffeindio’r pres wnes i adael ar y bwrdd', 'I''m trying to find the money I left on the table.'),
  (1196, 'have you heard the latest idea?', 'wyt ti wedi clywed y syniad diweddara’?', 'Have you heard the latest idea?'),
  (1197, 'my son works as a teacher', 'mae fy mab yn gweithio fel athro', 'My son works as a teacher.'),
  (1198, 'my daughter works for the council', 'mae fy merch yn gweithio i’r cyngor', 'My daughter works for the council.'),
  (1199, 'my friend used to work in an office', 'oedd fy ffrind yn arfer gweithio mewn swyddfa', 'My friend used to work in an office.'),
  (1200, 'they say they want to make sure that we finish everything in time', 'maen nhw’n deud bo’ nhw isio gwneud yn siŵr bo’ ni’n gorffen popeth mewn pryd', 'They say they want to make sure that we finish everything in time.'),
  (1201, 'we wanted to know what was going to happen', 'oeddan ni isio gwybod be’ oedd yn mynd i ddigwydd', 'We wanted to know what was going to happen.'),
  (1202, 'nobody was sure how to answer the question', 'doedd neb yn siŵr sut i ateb y cwestiwn', 'Nobody was sure how to answer the question.'),
  (1203, 'what would you do if I asked you to help me?', 'be’ fyddet ti’n gwneud ’swn i’n gofyn i ti helpu fi?', 'What would you do if I asked you to help me?'),
  (1204, 'I wanted her to help you to deal with the arrangements', 'o’n i isio iddi hi helpu chdi i ddelio efo’r trefniadau', 'I wanted her to help you to deal with the arrangements.'),
  (1205, 'I''ve forgotten the word I was trying to say', 'dw i wedi anghofio’r gair o’n i’n trio deud', 'I''ve forgotten the word I was trying to say.'),
  (1206, 'I enjoy the chance to practise speaking with you', 'dw i’n mwynhau’r cyfle i ymarfer siarad efo chdi', 'I enjoy the chance to practise speaking with you.'),
  (1207, 'you''ve done what you needed to do', 'ti wedi gwneud be’ oeddat ti angen gwneud', 'You''ve done what you needed to do.'),
  (1208, 'I didn''t want to ask you how to say it', 'do’n i ddim isio gofyn i ti sut i ddeud o', 'I didn''t want to ask you how to say it.'),
  (1209, 'they want to spend more time meeting as a group', 'maen nhw isio treulio mwy o amser yn cyfarfod fel grŵp', 'They want to spend more time meeting as a group.'),
  (1210, 'they think that we need to discuss the problem', 'maen nhw’n meddwl bo’ ni angen trafod y broblem', 'They think that we need to discuss the problem.'),
  (1211, 'they told us that they didn''t want to explain', 'ddudon nhw wrthon ni bo’ nhw ddim isio esbonio', 'They told us that they didn''t want to explain.'),
  (1212, 'they wanted to ask for help', 'oeddan nhw isio gofyn am help', 'They wanted to ask for help.'),
  (1213, 'we don''t know what they''re trying to achieve', 'dan ni ddim yn gwybod be’ maen nhw’n trio cyflawni', 'We don''t know what they''re trying to achieve.'),
  (1214, 'did you have a good time at the weekend?', 'gest ti amser da ar y penwythnos?', 'Did you have a good time at the weekend?'),
  (1215, 'I went out on Saturday night', 'es i allan nos Sadwrn', 'I went out on Saturday night.'),
  (1216, 'I saw a few friends', 'weles i ychydig o ffrindiau', 'I saw a few friends.'),
  (1217, 'I had a glass or two of water', 'ges i wydrad neu ddau o ddŵr', 'I had a glass or two of water.'),
  (1218, 'I didn''t do much on Sunday', 'wnes i ddim gwneud llawer ddydd Sul', 'I didn''t do much on Sunday.'),
  (1219, 'it was nice to relax for a while', 'oedd hi’n braf ymlacio am dipyn', 'It was nice to relax for a while.'),
  (1220, 'did you watch a bit of television?', 'wnest ti wylio bach o deledu?', 'Did you watch a bit of television?'),
  (1221, 'I watched the football and then I watched a film', 'wnes i wylio’r pêl-droed ac wedyn wnes i wylio ffilm', 'I watched the football and then I watched a film.'),
  (1222, 'he''s trying to tell me what he wants', 'mae o’n trio deud wrtha i be’ mae o isio', 'He''s trying to tell me what he wants'),
  (1223, 'he''s going to ask you tomorrow', 'mae o’n mynd i ofyn i ti ’fory', 'He''s going to ask you tomorrow.'),
  (1224, 'he''s just started to learn', 'mae o newydd ddechrau dysgu', 'He''s just started to learn.'),
  (1225, 'he would give you an answer if he could', 'mi fyddai fo’n rhoi ateb i ti tasai fo’n medru', 'He would give you an answer if he could.'),
  (1226, 'the man is trying to help me', 'mae’r dyn yn trio helpu fi', 'The man is trying to help me.'),
  (1227, 'that man is going to tell me something new', 'mae’r dyn ’na’n mynd i ddeud rhywbeth newydd wrtha i', 'That man is going to tell me something new.'),
  (1228, 'that man has just started to practise speaking', 'mae’r dyn ’na newydd ddechrau ymarfer siarad', 'That man has just started to practise speaking.'),
  (1229, 'that woman would help you if she could', 'mi fyddai’r ddynas ’na’n helpu chdi tasai hi’n medru', 'That woman would help you if she could.'),
  (1230, 'I know a young man who wants to work with you', 'dw i’n nabod dyn ifanc sydd isio gweithio efo chdi', 'I know a young man who wants to work with you.'),
  (1231, 'I know an old man who wanted to ask for help', 'dw i’n nabod hen ddyn oedd isio gofyn am help', 'I know an old man who wanted to ask for help.'),
  (1232, 'I know an old woman who can remember the answer', 'dw i’n nabod hen ddynas sy’n medru cofio’r ateb', 'I know an old woman who can remember the answer.'),
  (1233, 'I know a young woman who knows your sister', 'dw i’n nabod dynas ifanc sy’n nabod dy chwaer', 'I know a young woman who knows your sister.'),
  (1234, 'I met someone last night who works with your brother', 'wnes i gyfarfod rhywun neithiwr sy’n gweithio efo dy frawd', 'I met someone last night who works with your brother.'),
  (1235, 'I met someone who said that he wanted to tell you something', 'wnes i gyfarfod rhywun ddudodd fod o isio deud rhywbeth wrthot ti', 'I met someone who said that he wanted to tell you something.'),
  (1236, 'I know someone who said that she was going to try to help', 'dw i’n nabod rhywun ddudodd bod hi’n mynd i drio helpu', 'I know someone who said that she was going to try to help.'),
  (1237, 'he wanted me to tell you before the weekend', 'oedd o isio i mi ddeud wrthot ti cyn y penwythnos', 'He wanted me to tell you before the weekend.'),
  (1238, 'he wanted you to tell me yesterday', 'oedd o isio i ti ddeud wrtha i ddoe', 'He wanted you to tell me yesterday.'),
  (1239, 'my mother likes to read', 'mae fy mam yn licio darllen', 'My mother likes to read.'),
  (1240, 'my father doesn''t like to stop talking', 'dydy fy nhad ddim yn licio stopio siarad', 'My father doesn''t like to stop talking.'),
  (1241, 'I don''t want to give it to him', 'dw i ddim isio rhoi o iddo fo', 'I don''t want to give it to him.'),
  (1242, 'I want to give her more time', 'dw i isio rhoi mwy o amser iddi hi', 'I want to give her more time.'),
  (1243, 'I''m going to ask for the same thing to eat', 'dw i’n mynd i ofyn am yr un peth i fwyta', 'I''m going to ask for the same thing to eat.'),
  (1244, 'I''ve learnt a lot already', 'dw i wedi dysgu llawer yn barod', 'I''ve learnt a lot already'),
  (1245, 'I''m happy with how much I''ve done in a short time', 'dw i’n hapus efo faint dw i wedi gwneud mewn amser byr', 'I''m happy with how much I''ve done in a short time'),
  (1246, 'I wanted her to help you but she was too busy', 'o’n i isio iddi hi helpu chdi ond oedd hi’n rhy brysur', 'I wanted her to help you but she was too busy.'),
  (1247, 'I thought that book was fairly good', 'o’n i’n meddwl bod y llyfr ’na’n eitha’ da', 'I thought that book was fairly good.'),
  (1248, 'I thought the film was complete rubbish and I want my money back', 'o’n i’n meddwl bod y ffilm yn sothach llwyr a dw i isio fy mhres yn ôl', 'I thought the film was complete rubbish and I want my money back.'),
  (1249, 'I want you to help me before you go', 'dw i isio i ti helpu fi cyn i ti fynd', 'I want you to help me before you go.'),
  (1250, 'can you tell me something else before I answer?', 'fedri di ddeud rhywbeth arall wrtha i cyn i mi ateb?', 'Can you tell me something else before I answer?'),
  (1251, 'I don''t want to find out until after we finish', 'dw i ddim isio ffeindio allan tan ar ôl i ni orffen', 'I don''t want to find out until after we finish.'),
  (1252, 'when will you be ready to start?', 'pryd fyddi di’n barod i ddechrau?', 'When will you be ready to start?'),
  (1253, 'I should be ready in a few minutes', 'dylwn i fod yn barod mewn ychydig funudau', 'I should be ready in a few minutes.'),
  (1254, 'I''ve been ready since this morning', 'dw i wedi bod yn barod ers bore ’ma', 'I''ve been ready since this morning.'),
  (1255, 'when do you think you''ll be ready to leave?', 'pryd wyt ti’n meddwl fyddi di’n barod i adael?', 'When do you think you''ll be ready to leave?'),
  (1256, 'I think I''ll be ready in less than an hour', 'dw i’n meddwl bydda i’n barod mewn llai nag awr', 'I think I''ll be ready in less than an hour.'),
  (1257, 'I like that blue thing', 'dw i’n licio’r peth glas ’na', 'I like that blue thing.'),
  (1258, 'what''s that blue thing over there?', 'be’ ydy’r peth glas ’na draw acw?', 'What''s that blue thing over there?'),
  (1259, 'an idea', 'syniad', 'An idea.'),
  (1260, 'I don''t have the faintest idea', 'sgen i ddim syniad o gwbl', 'I don''t have the faintest idea.'),
  (1261, 'I think it might be something important', 'dw i’n meddwl efallai fod o’n rhywbeth pwysig', 'I think it might be something important.'),
  (1262, 'who was that man you were talking to yesterday?', 'pwy oedd y dyn ’na oeddat ti’n siarad efo fo ddoe?', 'Who was that man you were talking to yesterday?'),
  (1263, 'I don''t know who you mean', 'dw i ddim yn gwybod pwy ti’n meddwl', 'I don''t know who you mean.'),
  (1264, 'an old man', 'hen ddyn', 'An old man.'),
  (1265, 'a friend', 'ffrind', 'A friend.'),
  (1266, 'he was an old friend of my father', 'oedd o’n hen ffrind i fy nhad', 'He was an old friend of my father.'),
  (1267, 'have you heard from your friend?', 'wyt ti wedi clywed gan dy ffrind?', 'Have you heard from your friend?'),
  (1268, 'yes she sent me two emails last week', 'do, wnaeth hi yrru dau e-bost i mi wythnos diwetha’', 'Yes she sent me two emails last week.'),
  (1269, 'why don''t you want to wait for your father?', 'pam dwyt ti ddim isio aros am dy dad?', 'Why don''t you want to wait for your father?'),
  (1270, 'because I''m worried that I''m going to be late', 'achos dw i’n poeni bo’ fi’n mynd i fod yn hwyr', 'Because I''m worried that I''m going to be late.'),
  (1271, 'would you like to come with us next month?', 'fyddet ti’n licio dod efo ni mis nesa’?', 'Would you like to come with us next month?'),
  (1272, 'yes that sounds like a great idea', 'byddwn, mae hynna’n swnio fel syniad gwych', 'Yes that sounds like a great idea.'),
  (1273, 'no unfortunately I''ve got too much work', 'na, yn anffodus mae gen i ormod o waith', 'No unfortunately I''ve got too much work.'),
  (1274, 'do you have to leave in a few days?', 'oes rhaid i ti adael mewn ychydig o ddyddiau?', 'Do you have to leave in a few days?'),
  (1275, 'longer', 'hirach', 'Longer.'),
  (1276, 'no I can stay here for a little longer', 'na, mi fedra i aros yma am ychydig bach hirach', 'No I can stay here for a little longer.'),
  (1277, 'yes I''ve got an important meeting early next week', 'oes, mae gen i gyfarfod pwysig yn gynnar wythnos nesa’', 'Yes I''ve got an important meeting early next week.'),
  (1278, 'did you have to finish everything last night?', 'oedd rhaid i ti orffen popeth neithiwr?', 'Did you have to finish everything last night?'),
  (1279, 'yes because there wasn''t much time left', 'oedd, achos doedd ’na ddim llawer o amser ar ôl', 'Yes because there wasn''t much time left.'),
  (1280, 'no I only had to do the most important job', 'na, dim ond y gwaith pwysica’ oedd rhaid i mi wneud', 'No I only had to do the most important job.'),
  (1281, 'do you mind if I finish my coffee before you start?', 'oes ots gen ti os dw i’n gorffen fy nghoffi cyn i ti ddechrau?', 'Do you mind if I finish my coffee before you start?'),
  (1282, 'no that''s not a problem', 'na, dydy hynna ddim yn broblem', 'No that''s not a problem.'),
  (1283, 'which of your friends speak Welsh?', 'pa rai o dy ffrindiau sy’n siarad Cymraeg?', 'Which of your friends speak {target}?'),
  (1284, 'do you know my sister''s friend?', 'wyt ti’n nabod ffrind fy chwaer?', 'Do you know my sister''s friend?'),
  (1285, 'she speaks Welsh', 'mae hi’n siarad Cymraeg', 'She speaks {target}.'),
  (1286, 'people who like speaking Welsh', 'pobl sy’n licio siarad Cymraeg', 'People who like speaking {target}.'),
  (1287, 'how many people do you know who like watching television?', 'faint o bobl wyt ti’n nabod sy’n licio gwylio teledu?', 'How many people do you know who like watching television?'),
  (1288, 'most people I know like watching television', 'mae’r rhan fwya’ o’r bobl dw i’n nabod yn licio gwylio teledu', 'Most people I know like watching television.'),
  (1289, 'I wonder if she''s going to be there this afternoon', 'sgwn i ydy hi’n mynd i fod yno pnawn ’ma', 'I wonder if she''s going to be there this afternoon.'),
  (1290, 'I wonder if he knows the answer', 'sgwn i ydy o’n gwybod yr ateb', 'I wonder if he knows the answer.'),
  (1291, 'I hope I''ll be able to speak better soon', 'dw i’n gobeithio bydda i’n medru siarad yn well cyn bo hir', 'I hope I''ll be able to speak better soon.'),
  (1292, 'I hope you''ll be able to come to the party', 'dw i’n gobeithio byddi di’n medru dod i’r parti', 'I hope you''ll be able to come to the party.'),
  (1293, 'I have to find out where he''s going to meet me', 'rhaid i mi ffeindio allan lle mae o’n mynd i gyfarfod fi', 'I have to find out where he''s going to meet me.'),
  (1294, 'I don''t have enough time to call you tonight', 'sgen i ddim digon o amser i ffonio chdi heno', 'I don''t have enough time to call you tonight.'),
  (1295, 'I didn''t say that I wanted to finish in a day', 'ddudes i ddim bo’ fi isio gorffen mewn diwrnod', 'I didn''t say that I wanted to finish in a day.'),
  (1296, 'I said that I needed a little more time', 'ddudes i bo’ fi angen ychydig mwy o amser', 'I said that I needed a little more time.'),
  (1297, 'I don''t know many people who speak Welsh', 'dw i ddim yn nabod llawer o bobl sy’n siarad Cymraeg', 'I don''t know many people who speak {target}.'),
  (1298, 'I''ve got nothing left to say', 'sgen i ddim byd ar ôl i ddeud', 'I''ve got nothing left to say.'),
  (1299, 'he wants to pay half', 'mae o isio talu hanner', 'He wants to pay half.'),
  (1300, 'she doesn''t want to seem unfriendly', 'dydy hi ddim isio edrych yn anghyfeillgar', 'She doesn''t want to seem unfriendly.'),
  (1301, 'he said that he wants to show you something', 'ddudodd o fod o isio dangos rhywbeth i ti', 'He said that he wants to show you something.'),
  (1302, 'she said that she doesn''t want to live in a city', 'ddudodd hi bod hi ddim isio byw mewn dinas', 'She said that she doesn''t want to live in a city.'),
  (1303, 'I think that he wants to sit down', 'dw i’n meddwl fod o isio eistedd i lawr', 'I think that he wants to sit down.'),
  (1304, 'I think that she doesn''t want to work from home', 'dw i’n meddwl bod hi ddim isio gweithio o adre', 'I think that she doesn''t want to work from home.'),
  (1305, 'woman', 'dynas', 'Woman.');

INSERT INTO course_seeds (course_code, seed_number, known_text, target_text, status, last_edit_event_id)
SELECT 'cym_nv2_for_eng', n, k, t, 'draft', :'ev_ins' FROM hc_new ORDER BY n;

UPDATE canonical_list_seeds SET seed_number = seed_number + 989, updated_at = now()
WHERE list_id='8a1af4aa-6733-4d5e-9724-e6f9df3212e0' AND seed_number BETWEEN 317 AND 679;
INSERT INTO canonical_list_seeds (list_id, seed_number, source_text)
SELECT list_id, seed_number + 1000, source_text FROM canonical_list_seeds
WHERE list_id='8a1af4aa-6733-4d5e-9724-e6f9df3212e0' AND seed_number BETWEEN 1 AND 305;

INSERT INTO course_seed_weave (course_code, insert_after, block_start, set_by, note)
VALUES ('cym_nv2_for_eng', 137, 1000, 'job-949-aran',
        'Hadau Creiddiol block (ids 1000+HC) plays after old seed 137; 257 = panic switch. Aran 2026-10-07.');

INSERT INTO course_seed_weave_drops (course_code, seed_number, reason, decided_by)
SELECT 'cym_nv2_for_eng', n, r, 'job-949-aran (amended keep/drop plan)' FROM (VALUES
  (1002, 'HC 2: contained in old 2 (old 1-137 kept)'),
  (1013, 'HC 13: exact repeat of old 34 (old 1-137 kept); contained in old 35 (old 1-137 kept)'),
  (1033, 'HC 33: exact repeat of old 41 (old 1-137 kept)'),
  (1079, 'HC 79: contained in old 45 (old 1-137 kept)'),
  (1179, 'HC 179: exact repeat of old 112 (old 1-137 kept)'),
  (1214, 'HC 214: exact repeat of old 94 (old 1-137 kept)'),
  (1215, 'HC 215: contained in old 95 (old 1-137 kept)'),
  (1216, 'HC 216: exact repeat of old 96 (old 1-137 kept)'),
  (1219, 'HC 219: exact repeat of old 106 (old 1-137 kept)'),
  (1220, 'HC 220: contained in old 109 (old 1-137 kept)'),
  (1224, 'HC 224: contained in old 64 (old 1-137 kept)'),
  (1244, 'HC 244: exact repeat of old 99 (old 1-137 kept)'),
  (1329, 'HC 329: contained in old 127 (old 1-137 kept)'),
  (167, 'old 167: exact repeat of HC 196 (HC kept: Aran 2026-10-07 16:38Z)'),
  (183, 'old 183: exact repeat of HC 201 (HC kept: Aran 2026-10-07 16:38Z)'),
  (185, 'old 185: exact repeat of HC 211 (HC kept: Aran 2026-10-07 16:38Z)'),
  (186, 'old 186: exact repeat of HC 212 (HC kept: Aran 2026-10-07 16:38Z)'),
  (236, 'old 236: wholly inside HC 246 (HC kept: Aran 2026-10-07 16:38Z)'),
  (258, 'old 258: contains HC 460 (HC kept: Aran 2026-10-07 16:38Z)'),
  (259, 'old 259: exact repeat of HC 464 (HC kept: Aran 2026-10-07 16:38Z)'),
  (260, 'old 260: exact repeat of HC 465 (HC kept: Aran 2026-10-07 16:38Z)'),
  (261, 'old 261: exact repeat of HC 466 (HC kept: Aran 2026-10-07 16:38Z)'),
  (262, 'old 262: contains HC 468; contains HC 469 (HC kept: Aran 2026-10-07 16:38Z)'),
  (263, 'old 263: contains HC 470 (HC kept: Aran 2026-10-07 16:38Z)'),
  (264, 'old 264: exact repeat of HC 472 (HC kept: Aran 2026-10-07 16:38Z)'),
  (265, 'old 265: exact repeat of HC 474 (HC kept: Aran 2026-10-07 16:38Z)'),
  (266, 'old 266: contains HC 475 (HC kept: Aran 2026-10-07 16:38Z)'),
  (267, 'old 267: exact repeat of HC 477 (HC kept: Aran 2026-10-07 16:38Z)'),
  (268, 'old 268: contains HC 478; contains HC 479 (HC kept: Aran 2026-10-07 16:38Z)'),
  (270, 'old 270: exact repeat of HC 483 (HC kept: Aran 2026-10-07 16:38Z)'),
  (271, 'old 271: exact repeat of HC 484 (HC kept: Aran 2026-10-07 16:38Z)'),
  (273, 'old 273: contains HC 487 (HC kept: Aran 2026-10-07 16:38Z)'),
  (275, 'old 275: exact repeat of HC 492 (HC kept: Aran 2026-10-07 16:38Z)'),
  (276, 'old 276: exact repeat of HC 493 (HC kept: Aran 2026-10-07 16:38Z)'),
  (277, 'old 277: exact repeat of HC 494 (HC kept: Aran 2026-10-07 16:38Z)'),
  (279, 'old 279: exact repeat of HC 497 (HC kept: Aran 2026-10-07 16:38Z)'),
  (280, 'old 280: exact repeat of HC 498 (HC kept: Aran 2026-10-07 16:38Z)'),
  (281, 'old 281: contains HC 499 (HC kept: Aran 2026-10-07 16:38Z)'),
  (282, 'old 282: exact repeat of HC 500 (HC kept: Aran 2026-10-07 16:38Z)'),
  (283, 'old 283: exact repeat of HC 501 (HC kept: Aran 2026-10-07 16:38Z)'),
  (284, 'old 284: exact repeat of HC 502 (HC kept: Aran 2026-10-07 16:38Z)'),
  (285, 'old 285: exact repeat of HC 503 (HC kept: Aran 2026-10-07 16:38Z)'),
  (286, 'old 286: contains HC 504; contains HC 505 (HC kept: Aran 2026-10-07 16:38Z)'),
  (287, 'old 287: contains HC 506; contains HC 507 (HC kept: Aran 2026-10-07 16:38Z)'),
  (288, 'old 288: contains HC 508 (HC kept: Aran 2026-10-07 16:38Z)'),
  (289, 'old 289: exact repeat of HC 510 (HC kept: Aran 2026-10-07 16:38Z)'),
  (290, 'old 290: exact repeat of HC 511 (HC kept: Aran 2026-10-07 16:38Z)'),
  (291, 'old 291: exact repeat of HC 512 (HC kept: Aran 2026-10-07 16:38Z)'),
  (292, 'old 292: exact repeat of HC 513 (HC kept: Aran 2026-10-07 16:38Z)'),
  (293, 'old 293: contains HC 514; contains HC 515 (HC kept: Aran 2026-10-07 16:38Z)'),
  (294, 'old 294: contains HC 516; contains HC 517 (HC kept: Aran 2026-10-07 16:38Z)'),
  (295, 'old 295: exact repeat of HC 518 (HC kept: Aran 2026-10-07 16:38Z)'),
  (296, 'old 296: exact repeat of HC 519 (HC kept: Aran 2026-10-07 16:38Z)'),
  (298, 'old 298: exact repeat of HC 521 (HC kept: Aran 2026-10-07 16:38Z)'),
  (299, 'old 299: contains HC 522; contains HC 523 (HC kept: Aran 2026-10-07 16:38Z)'),
  (300, 'old 300: contains HC 524; contains HC 525 (HC kept: Aran 2026-10-07 16:38Z)'),
  (301, 'old 301: contains HC 526; contains HC 527 (HC kept: Aran 2026-10-07 16:38Z)'),
  (302, 'old 302: exact repeat of HC 528 (HC kept: Aran 2026-10-07 16:38Z)'),
  (303, 'old 303: contains HC 529; contains HC 530 (HC kept: Aran 2026-10-07 16:38Z)'),
  (304, 'old 304: contains HC 531; contains HC 532 (HC kept: Aran 2026-10-07 16:38Z)'),
  (305, 'old 305: exact repeat of HC 535 (HC kept: Aran 2026-10-07 16:38Z)'),
  (306, 'old 306: exact repeat of HC 533 (HC kept: Aran 2026-10-07 16:38Z)'),
  (307, 'old 307: contains HC 537 (HC kept: Aran 2026-10-07 16:38Z)'),
  (308, 'old 308: contains HC 538; contains HC 539 (HC kept: Aran 2026-10-07 16:38Z)'),
  (309, 'old 309: exact repeat of HC 540 (HC kept: Aran 2026-10-07 16:38Z)'),
  (310, 'old 310: contains HC 542 (HC kept: Aran 2026-10-07 16:38Z)'),
  (311, 'old 311: exact repeat of HC 544 (HC kept: Aran 2026-10-07 16:38Z)'),
  (312, 'old 312: exact repeat of HC 545 (HC kept: Aran 2026-10-07 16:38Z)'),
  (313, 'old 313: contains HC 546 (HC kept: Aran 2026-10-07 16:38Z)'),
  (314, 'old 314: contains HC 548 (HC kept: Aran 2026-10-07 16:38Z)'),
  (316, 'old 316: contains HC 554; contains HC 555 (HC kept: Aran 2026-10-07 16:38Z)')
) v(n, r);

-- ── Checks ───────────────────────────────────────────────────────────────────
CREATE TEMP TABLE post AS SELECT * FROM pg_temp.others_fingerprint();
SELECT 'pre' k, * FROM pre UNION ALL SELECT 'post', * FROM post ORDER BY 2, 1;
DO $$
DECLARE c text := 'cym_nv2_for_eng'; x bigint;
BEGIN
  IF (SELECT count(*) FROM pre) < 10 OR EXISTS (SELECT * FROM pre EXCEPT SELECT * FROM post)
     OR EXISTS (SELECT * FROM post EXCEPT SELECT * FROM pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: another course / master canonical / another list changed'; END IF;
  IF (SELECT count(*) FROM course_seeds WHERE course_code=c) <> 679 + 305 THEN RAISE EXCEPTION 'CHECK FAILED: seed count'; END IF;
  IF EXISTS (SELECT 1 FROM course_seeds WHERE course_code=c AND seed_number BETWEEN 317 AND 1000) THEN RAISE EXCEPTION 'CHECK FAILED: 317-1000 not empty'; END IF;
  IF (SELECT count(*) FROM course_seeds WHERE course_code=c AND seed_number BETWEEN 1001 AND 1668) <> 668 THEN RAISE EXCEPTION 'CHECK FAILED: block size'; END IF;
  -- Old seeds 1-316 byte-identical to the backup (ids, text, audio, version, everything).
  IF EXISTS (SELECT * FROM backup_cym_nv2_seeds_949 WHERE seed_number <= 316 EXCEPT SELECT * FROM course_seeds WHERE course_code=c AND seed_number <= 316)
     OR (SELECT count(*) FROM course_seeds WHERE course_code=c AND seed_number <= 316) <> 316 THEN
    RAISE EXCEPTION 'CHECK FAILED: an old seed 1-316 changed'; END IF;
  -- Moved drafts keep their row id and known text; Welsh is v5 (checked against hc_new-style list below).
  IF EXISTS (SELECT b.id FROM backup_cym_nv2_seeds_949 b WHERE b.seed_number BETWEEN 317 AND 679
             AND NOT EXISTS (SELECT 1 FROM course_seeds s WHERE s.id=b.id AND s.seed_number=b.seed_number+989 AND s.known_text=b.known_text)) THEN
    RAISE EXCEPTION 'CHECK FAILED: a moved draft lost its id or known text'; END IF;
  SELECT count(*) INTO x FROM course_seeds s JOIN backup_cym_nv2_seeds_949 b ON b.id=s.id WHERE s.target_text <> b.target_text;
  IF x <> 35 THEN RAISE EXCEPTION 'CHECK FAILED: % texts changed, expected 35', x; END IF;
  -- HC list mirrors the course: every block seed has a list row with the same number.
  IF EXISTS (SELECT 1 FROM course_seeds s WHERE s.course_code=c AND s.seed_number >= 1000 AND NOT EXISTS
             (SELECT 1 FROM canonical_list_seeds l WHERE l.list_id='8a1af4aa-6733-4d5e-9724-e6f9df3212e0' AND l.seed_number=s.seed_number AND l.source_text<>'')) THEN
    RAISE EXCEPTION 'CHECK FAILED: block seed without HC list row'; END IF;
  IF (SELECT count(*) FROM canonical_list_seeds WHERE list_id='8a1af4aa-6733-4d5e-9724-e6f9df3212e0') <> 679 + 305 THEN RAISE EXCEPTION 'CHECK FAILED: list size'; END IF;
  IF EXISTS (SELECT 1 FROM hc_new h JOIN canonical_list_seeds l ON l.list_id='8a1af4aa-6733-4d5e-9724-e6f9df3212e0' AND l.seed_number=h.n WHERE l.source_text <> h.en) THEN
    RAISE EXCEPTION 'CHECK FAILED: list 1001-1305 English differs from v5'; END IF;
  -- Running order.
  IF (SELECT count(*) FROM course_seed_weave_drops WHERE course_code=c) <> 71 THEN RAISE EXCEPTION 'CHECK FAILED: drops'; END IF;
  IF (SELECT count(*) FROM course_running_order WHERE course_code=c) <> 984 - 71 THEN RAISE EXCEPTION 'CHECK FAILED: kept count'; END IF;
  IF (SELECT max(position) FROM course_running_order WHERE course_code=c) <> 984 - 71 THEN RAISE EXCEPTION 'CHECK FAILED: positions not contiguous'; END IF;
  IF (SELECT seed_number FROM course_running_order WHERE course_code=c AND position=137) <> 137
     OR (SELECT seed_number FROM course_running_order WHERE course_code=c AND position=138) <> 1001 THEN
    RAISE EXCEPTION 'CHECK FAILED: block does not start at position 138'; END IF;
  IF EXISTS (SELECT 1 FROM course_running_order WHERE course_code <> c) THEN RAISE EXCEPTION 'CHECK FAILED: another course has a running order'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;

SELECT 'seeds' k, count(*) FROM course_seeds WHERE course_code='cym_nv2_for_eng'
UNION ALL SELECT 'block seeds 1001-1668', count(*) FROM course_seeds WHERE course_code='cym_nv2_for_eng' AND seed_number >= 1000
UNION ALL SELECT 'dropped (excluded)', count(*) FROM course_seed_weave_drops WHERE course_code='cym_nv2_for_eng'
UNION ALL SELECT 'running order length', count(*) FROM course_running_order WHERE course_code='cym_nv2_for_eng'
UNION ALL SELECT 'block seeds whose audio link was cleared by the text change', count(*) FROM course_seeds s JOIN backup_cym_nv2_seeds_949 b ON b.id=s.id
  WHERE (b.target1_audio_id IS NOT NULL AND s.target1_audio_id IS NULL) OR (b.known_audio_id IS NOT NULL AND s.known_audio_id IS NULL);
SELECT 'finishing with' k, :'finish' v;
:finish;
