-- Job #22 (Aran 2026-10-07, pre-authorised): the South Welsh sandbox cym_sv2_for_eng gets the
-- Hadau Creiddiol (HC) block exactly as the North sandbox got it (#949/#974/#991), derived afresh
-- from South's own seeds. Seed ids never change for the old seeds; HC seed N is id 1000+N.
--   * #740 South drafts at 335-668 (= HC 335-668; no LEGOs, phrases or progress) move to 1335-1668,
--     Welsh unchanged.
--   * HC 1-334 are inserted at 1001-1334 with NEW South drafts (job #22, from released South
--     precedent; NOT yet proofed by Aran), status draft.
--   * A South sandbox HC list (canonical_seed_lists slug cym-south-sandbox; NOT master
--     canonical_seeds) is assigned to cym_sv2_for_eng: 1-334 = master 1-334 (what the sandbox's
--     Seed Editor reads today), 1001-1668 = master 1-668 (the HC English).
--   * course_seed_weave: insert_after 137 (the one setting; the panic switch is a second value).
--   * course_seed_weave_drops: 7 HC + 48 old (excluded, never deleted). The ten old seeds that
--     contain an HC seed AND go beyond it are NOT dropped (keep both, Aran 17:26Z).
-- Dry run unless invoked with  -v finish=COMMIT . Every check raises on failure, and
-- ON_ERROR_STOP then aborts the transaction. Undo: weave-cym-sv2-remove.sql (tested).
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20min';
\ir weave-fingerprint-fn-sv2.sql
CREATE TEMP TABLE pre AS SELECT * FROM pg_temp.others_fingerprint();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM courses WHERE course_code='cym_sv2_for_eng' AND visibility='hidden') THEN
    RAISE EXCEPTION 'cym_sv2_for_eng missing or not hidden'; END IF;
  IF EXISTS (SELECT 1 FROM course_seeds WHERE course_code='cym_sv2_for_eng' AND seed_number >= 1000) THEN
    RAISE EXCEPTION 'seeds >= 1000 already exist; already applied?'; END IF;
  IF (SELECT count(*) FROM course_seeds WHERE course_code='cym_sv2_for_eng' AND seed_number BETWEEN 335 AND 668) <> 334 THEN
    RAISE EXCEPTION 'expected 334 drafts at 335-668'; END IF;
  IF (SELECT count(*) FROM course_seeds WHERE course_code='cym_sv2_for_eng') <> 668 THEN
    RAISE EXCEPTION 'expected 668 seeds'; END IF;
  IF EXISTS (SELECT 1 FROM course_legos WHERE course_code='cym_sv2_for_eng' AND seed_number >= 335)
     OR EXISTS (SELECT 1 FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND seed_number >= 335) THEN
    RAISE EXCEPTION 'something is built on seeds >= 335; refusing to move them'; END IF;
  IF EXISTS (SELECT 1 FROM course_seeds WHERE course_code='cym_sv2_for_eng' AND seed_number BETWEEN 335 AND 668 AND status <> 'draft') THEN
    RAISE EXCEPTION 'a seed in 335-668 is not draft'; END IF;
  IF EXISTS (SELECT 1 FROM course_seed_weave WHERE course_code='cym_sv2_for_eng') THEN
    RAISE EXCEPTION 'weave row already exists'; END IF;
  IF EXISTS (SELECT 1 FROM canonical_list_assignments WHERE course_code='cym_sv2_for_eng')
     OR EXISTS (SELECT 1 FROM canonical_seed_lists WHERE slug='cym-south-sandbox') THEN
    RAISE EXCEPTION 'a South sandbox list already exists'; END IF;
  IF to_regclass('backup_cym_sv2_seeds_22') IS NOT NULL THEN RAISE EXCEPTION 'backup already taken; already applied?'; END IF;
END $$;

-- Backup (service-role only). The undo restores from it.
CREATE TABLE backup_cym_sv2_seeds_22 AS SELECT * FROM course_seeds WHERE course_code='cym_sv2_for_eng';
REVOKE ALL ON backup_cym_sv2_seeds_22 FROM anon, authenticated;

WITH e AS (
  INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
  VALUES ('cym_sv2_for_eng', 'sql:job-22 weave-cym-sv2', 'renumber', 'agent', 'claude-weave-cym-sv2-2026-10-07',
          'agent (claude-weave-cym-sv2-2026-10-07)', false, 'creator',
          '{"from":[335,668],"to":[1335,1668]}',
          '{"backup":"backup_cym_sv2_seeds_22","reason":"HC seed N gets id 1000+N; #740 South drafts carry nothing; Welsh unchanged; Aran 2026-10-07 (South replicate of North #949)"}')
  RETURNING id)
SELECT id AS ev_move FROM e \gset
WITH e AS (
  INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
  VALUES ('cym_sv2_for_eng', 'sql:job-22 weave-cym-sv2', 'insert', 'agent', 'claude-weave-cym-sv2-2026-10-07',
          'agent (claude-weave-cym-sv2-2026-10-07)', false, 'creator',
          '{"seeds":[1001,1334]}',
          '{"source":"HC 1-334 South drafts written by job #22 from released cym_s precedent; not yet proofed by Aran"}')
  RETURNING id)
SELECT id AS ev_ins FROM e \gset

UPDATE course_seeds SET seed_number = seed_number + 1000, last_edit_event_id = :'ev_move'
WHERE course_code='cym_sv2_for_eng' AND seed_number BETWEEN 335 AND 668;

CREATE TEMP TABLE hc_new (n int, k text, t text, en text);
INSERT INTO hc_new VALUES
  (1001, 'I want to speak Welsh with you now', 'dw i’n moyn siarad Cymraeg gyda ti nawr', 'I want to speak {target} with you now.'),
  (1002, 'I''m trying to learn', 'dw i’n trio dysgu', 'I''m trying to learn.'),
  (1003, 'how to speak as often as possible', 'sut i siarad mor aml â phosib', 'how to speak as often as possible.'),
  (1004, 'how to say something in Welsh', 'sut i ddweud rhywbeth yn Gymraeg', 'how to say something in {target}'),
  (1005, 'I''m going to practise speaking with someone else', 'dw i’n mynd i ymarfer siarad gyda rhywun arall', 'I''m going to practise speaking with someone else.'),
  (1006, 'I''m trying to remember a word', 'dw i’n trio cofio gair', 'I''m trying to remember a word.'),
  (1007, 'I want to try as hard as I can today', 'dw i’n moyn trio mor galed ag y galla i heddiw', 'I want to try as hard as I can today.'),
  (1008, 'I''m going to try to explain what I mean', 'dw i’n mynd i drio esbonio beth dw i’n meddwl', 'I''m going to try to explain what I mean.'),
  (1009, 'I speak a little Welsh now', 'dw i’n siarad bach o Gymraeg nawr', 'I speak a little {target} now.'),
  (1010, 'I''m not sure if I can remember the whole sentence', 'dw i ddim yn siŵr os galla i gofio’r frawddeg gyfan', 'I''m not sure if I can remember the whole sentence.'),
  (1011, 'I''d like to be able to speak after you finish', 'hoffen i allu siarad ar ôl i ti gwpla', 'I''d like to be able to speak after you finish.'),
  (1012, 'I wouldn''t like to guess what''s going to happen tomorrow', 'fydden i ddim yn hoffi dyfalu beth sy’n mynd i ddigwydd ’fory', 'I wouldn''t like to guess what''s going to happen tomorrow.'),
  (1013, 'you speak Welsh very well', 'ti’n siarad Cymraeg yn dda iawn', 'You speak {target} very well.'),
  (1014, 'do you speak Welsh all day?', 'wyt ti’n siarad Cymraeg drwy’r dydd?', 'Do you speak {target} all day?'),
  (1015, 'and I want you to speak Welsh with me tomorrow', 'a dw i’n moyn i ti siarad Cymraeg gyda fi ’fory', 'And I want you to speak {target} with me tomorrow.'),
  (1016, 'he wants to come back with everyone else later on', 'ma fe’n moyn dod nôl gyda pawb arall nes ymlaen', 'He wants to come back with everyone else later on.'),
  (1017, 'she wants to find out what the answer is', 'mae hi’n moyn ffeindio mas beth yw’r ateb', 'She wants to find out what the answer is.'),
  (1018, 'we want to meet at six o''clock this evening', 'ŷn ni’n moyn cwrdd am chwech o’r gloch heno', 'We want to meet at six o''clock this evening.'),
  (1019, 'but I don''t want to stop talking', 'ond dw i ddim yn moyn stopo siarad', 'But I don''t want to stop talking.'),
  (1020, 'you want to learn his name quickly', 'ti’n moyn dysgu ei enw fe’n glou', 'You want to learn his name quickly.'),
  (1021, 'why are you learning her name?', 'pam wyt ti’n dysgu ei henw hi?', 'Why are you learning her name?'),
  (1022, 'because I want to meet people who speak Welsh', 'achos dw i’n moyn cwrdd â phobl sy’n siarad Cymraeg', 'Because I want to meet people who speak {target}.'),
  (1023, 'I''m going to start talking more soon', 'dw i’n mynd i ddechrau siarad mwy cyn bo hir', 'I''m going to start talking more soon.'),
  (1024, 'I''m not going to be able to remember easily', 'dw i ddim yn mynd i allu cofio’n hawdd', 'I''m not going to be able to remember easily.'),
  (1025, 'are you going to help me before I have to go?', 'wyt ti’n mynd i helpu fi cyn i fi orfod mynd?', 'Are you going to help me before I have to go?'),
  (1026, 'I like feeling as if I''m nearly ready to go', 'dw i’n hoffi teimlo fel ’sen i bron yn barod i fynd', 'I like feeling as if I''m nearly ready to go.'),
  (1027, 'I don''t like taking too much time to answer', 'dw i ddim yn hoffi cymryd gormod o amser i ateb', 'I don''t like taking too much time to answer.'),
  (1028, 'it''s useful to start talking as soon as you can', 'mae’n ddefnyddiol dechrau siarad cyn gynted ag y galli di', 'It''s useful to start talking as soon as you can.'),
  (1029, 'I''m looking forward to speaking better as soon as I can', 'dw i’n edrych ymlaen at siarad yn well cyn gynted ag y galla i', 'I''m looking forward to speaking better as soon as I can.'),
  (1030, 'I wanted to ask you something yesterday', 'o’n i’n moyn gofyn rhywbeth i ti ddoe', 'I wanted to ask you something yesterday.'),
  (1031, 'you wanted to speak with me tonight', 'o’t ti’n moyn siarad gyda fi heno', 'You wanted to speak with me tonight.'),
  (1032, 'did you want to show me something?', 'o’t ti’n moyn dangos rhywbeth i fi?', 'Did you want to show me something?'),
  (1033, 'how long have you been learning Welsh?', 'pa mor hir wyt ti ’di bod yn dysgu Cymraeg?', 'How long have you been learning {target}?'),
  (1034, 'he doesn''t want to be quiet when other people are here', 'so fe’n moyn bod yn dawel pan mae pobl eraill yma', 'He doesn''t want to be quiet when other people are here.'),
  (1035, 'she doesn''t want to read anything this afternoon', 'dyw hi ddim yn moyn darllen unrhywbeth prynhawn ’ma', 'She doesn''t want to read anything this afternoon.'),
  (1036, 'we don''t want to interrupt the story', 'so ni’n moyn torri ar draws y stori', 'We don''t want to interrupt the story.'),
  (1037, 'I started to think about it carefully last month', 'wnes i ddechrau meddwl amdani’n ofalus mis diwetha’', 'I started to think about it carefully last month.'),
  (1038, 'I''ve been learning for about a week', 'dw i wedi bod yn dysgu am biti wythnos', 'I''ve been learning for about a week.'),
  (1039, 'but I''m a little tired this morning', 'ond dw i wedi blino bach bore ’ma', 'But I''m a little tired this morning.'),
  (1040, 'how do you feel at the moment?', 'sut wyt ti’n teimlo ar hyn o bryd?', 'How do you feel at the moment?'),
  (1041, 'I feel okay, but I''m starting to feel tired', 'dw i’n teimlo’n iawn, ond dw i’n dechrau blino', 'I feel okay, but I''m starting to feel tired.'),
  (1042, 'I was starting to feel better than last night', 'o’n i’n dechrau teimlo’n well na neithiwr', 'I was starting to feel better than last night.'),
  (1043, 'I wasn''t thinking about how to answer', 'do’n i ddim yn meddwl am sut i ateb', 'I wasn''t thinking about how to answer.'),
  (1044, 'or if I need to improve', 'neu os dw i angen gwella', 'Or if I need to improve.'),
  (1045, 'I don''t need to know everything', 'dw i ddim angen gwybod popeth', 'I don''t need to know everything.'),
  (1046, 'but I don''t worry about making mistakes', 'ond dw i ddim yn becso am wneud camgymeriadau', 'But I don''t worry about making mistakes.'),
  (1047, 'because I think that it''s a good thing to make mistakes', 'achos dw i’n meddwl fod e’n beth da i wneud camgymeriadau', 'Because I think that it''s a good thing to make mistakes.'),
  (1048, 'I don''t care about making mistakes', 'sdim ots ’da fi am wneud camgymeriadau', 'I don''t care about making mistakes.'),
  (1049, 'it''s like this, if you know what I mean', 'ma fe fel hyn, os ti’n gwybod beth dw i’n meddwl', 'It''s like this, if you know what I mean.'),
  (1050, 'I''m not trying to finish as quickly as possible', 'dw i ddim yn trio cwpla mor glou â phosib', 'I''m not trying to finish as quickly as possible.'),
  (1051, 'I enjoy doing interesting things with my friends', 'dw i’n joio gwneud pethau diddorol gyda fy ffrindiau', 'I enjoy doing interesting things with my friends.'),
  (1052, 'he wanted to write a letter to his friend last week', 'oedd e’n moyn sgrifennu llythyr at ei ffrind wythnos diwetha’', 'He wanted to write a letter to his friend last week.'),
  (1053, 'she wanted to put his letter in her bag', 'oedd hi’n moyn rhoi ei lythyr e yn ei bag hi', 'She wanted to put his letter in her bag.'),
  (1054, 'we wanted to give you a little more time', 'o’n ni’n moyn rhoi ychydig mwy o amser i ti', 'We wanted to give you a little more time.'),
  (1055, 'I don''t enjoy waking up when I didn''t sleep very well', 'dw i ddim yn joio dihuno pan wnes i ddim cysgu’n dda iawn', 'I don''t enjoy waking up when I didn''t sleep very well.'),
  (1056, 'so I can remember how to say a few words', 'er mwyn i fi allu cofio sut i ddweud ychydig o eiriau', 'So I can remember how to say a few words.'),
  (1057, 'I can''t remember how to say what I wanted to say', 'alla i ddim cofio sut i ddweud beth o’n i’n moyn dweud', 'I can''t remember how to say what I wanted to say.'),
  (1058, 'it''s interesting when you understand enough words', 'mae’n ddiddorol pan ti’n deall digon o eiriau', 'It''s interesting when you understand enough words.'),
  (1059, 'I know how to do what I need to do next week', 'dw i’n gwybod sut i wneud beth dw i angen gwneud wythnos nesa’', 'I know how to do what I need to do next week.'),
  (1060, 'I don''t know how to say enough different words yet', 'dw i ddim yn gwybod sut i ddweud digon o eiriau gwahanol eto', 'I don''t know how to say enough different words yet.'),
  (1061, 'could you say that again a little more slowly?', 'allet ti ddweud hynny eto bach yn arafach?', 'Could you say that again a little more slowly?'),
  (1062, 'I''m not sure if I can help you at the same time', 'dw i ddim yn siŵr os galla i dy helpu di ar yr un pryd', 'I''m not sure if I can help you at the same time.'),
  (1063, 'are you sure you don''t mind helping me?', 'wyt ti’n siŵr bod dim ots ’da ti helpu fi?', 'Are you sure you don''t mind helping me?'),
  (1064, 'learning Welsh isn''t easy but it is fun', 'so dysgu Cymraeg yn hawdd ond mae’n hwyl', 'Learning {target} isn''t easy but it is fun.'),
  (1065, 'it''s important to take time to test yourself', 'mae’n bwysig cymryd amser i brofi dy hunan', 'It''s important to take time to test yourself.'),
  (1066, 'it''s not difficult to find the answer', 'dyw hi ddim yn anodd ffeindio’r ateb', 'It''s not difficult to find the answer.'),
  (1067, 'why do you want to stop?', 'pam wyt ti’n moyn stopo?', 'Why do you want to stop?'),
  (1068, 'what are you looking for?', 'beth wyt ti’n chwilio amdano?', 'What are you looking for?'),
  (1069, 'he didn''t want to look after the young dog all afternoon', 'doedd e ddim yn moyn edrych ar ôl y ci ifanc drwy’r prynhawn', 'He didn''t want to look after the young dog all afternoon.'),
  (1070, 'she didn''t want to tell me where it was', 'doedd hi ddim yn moyn dweud wrtha i ble oedd e', 'She didn''t want to tell me where it was.'),
  (1071, 'we didn''t want to let anyone hear the truth', 'do’n ni ddim yn moyn gadael i neb glywed y gwir', 'We didn''t want to let anyone hear the truth.'),
  (1072, 'I think that you''re doing very well', 'dw i’n meddwl bo’ ti’n gwneud yn dda iawn', 'I think that you''re doing very well.'),
  (1073, 'thank you very much, but I''ve got more to learn', 'diolch yn fawr, ond mae gyda fi fwy i ddysgu', 'Thank you very much, but I''ve got more to learn.'),
  (1074, 'thank you very much for helping me to understand', 'diolch yn fawr am helpu fi i ddeall', 'Thank you very much for helping me to understand.'),
  (1075, 'have you got more to learn?', 'oes gyda ti fwy i ddysgu?', 'Have you got more to learn?'),
  (1076, 'I''m very happy with how much I''ve learnt already', 'dw i’n hapus iawn gyda faint dw i ’di dysgu’n barod', 'I''m very happy with how much I''ve learnt already.'),
  (1077, 'I''m surprised at how quickly I''m starting to understand', 'dw i’n synnu pa mor glou dw i’n dechrau deall', 'I''m surprised at how quickly I''m starting to understand.'),
  (1078, 'I don''t understand what you said', 'dw i ddim yn deall be’ ddwedest ti', 'I don''t understand what you said.'),
  (1079, 'when did you start to learn?', 'pryd wnest ti ddechrau dysgu?', 'When did you start to learn?'),
  (1080, 'I''m not sure when I''ll be ready', 'dw i ddim yn siŵr pryd fydda i’n barod', 'I''m not sure when I''ll be ready.'),
  (1081, 'when do you want to start?', 'pryd wyt ti’n moyn dechrau?', 'When do you want to start?'),
  (1082, 'I''m not going to wait for you. Why not?', 'dw i ddim yn mynd i aros amdanat ti. pam lai?', 'I''m not going to wait for you. Why not?'),
  (1083, 'I agree with what you said about your friend', 'dw i’n cytuno gyda be’ ddwedest ti am dy ffrind', 'I agree with what you said about your friend.'),
  (1084, 'I don''t agree with what he said about my friend', 'dw i ddim yn cytuno gyda be’ ddwedodd e am fy ffrind', 'I don''t agree with what he said about my friend.'),
  (1085, 'I don''t know those people', 'dw i ddim yn nabod y bobl ’na', 'I don''t know those people.'),
  (1086, 'it wasn''t possible, unfortunately', 'doedd e ddim yn bosib, yn anffodus', 'It wasn''t possible, unfortunately.'),
  (1087, 'they are people I don''t know', 'pobl dw i ddim yn nabod ŷn nhw', 'They are people I don''t know.'),
  (1088, 'I''m not ready to talk to people I don''t know yet', 'dw i ddim yn barod i siarad gyda pobl dw i ddim yn nabod eto', 'I''m not ready to talk to people I don''t know yet.'),
  (1089, 'I think that I''ve done a lot in a short time', 'dw i’n meddwl bo’ fi ’di gwneud llawer mewn amser byr', 'I think that I''ve done a lot in a short time.'),
  (1090, 'if you can speak more slowly that would be great', 'os galli di siarad yn arafach, byddai hynny’n wych', 'If you can speak more slowly that would be great.'),
  (1091, 'it''s difficult to think quickly enough to answer in time', 'mae’n anodd meddwl yn ddigon clou i ateb mewn pryd', 'It''s difficult to think quickly enough to answer in time.'),
  (1092, 'I''d like to keep on doing this for a while', 'hoffen i gario ’mlaen i wneud hyn am dipyn', 'I''d like to keep on doing this for a while.'),
  (1093, 'it''s time to go now', 'mae’n amser mynd nawr', 'It''s time to go now.'),
  (1094, 'this is the only way it will work', 'dyma’r unig ffordd fydd e’n gweithio', 'This is the only way it will work.'),
  (1095, 'are you ready to go home on the next bus?', 'wyt ti’n barod i fynd gytre ar y bws nesa’?', 'Are you ready to go home on the next bus?'),
  (1096, 'no I''m not ready yet, I need a little more time', 'na, dw i ddim yn barod eto, dw i angen ychydig mwy o amser', 'No I''m not ready yet, I need a little more time.'),
  (1097, 'yes I''m ready to go as soon as you want', 'ydw, dw i’n barod i fynd cyn gynted â ti’n moyn', 'Yes I''m ready to go as soon as you want.'),
  (1098, 'I should consider playing something else', 'dylen i ystyried chwarae rhywbeth arall', 'I should consider playing something else.'),
  (1099, 'you should ask yourself why it''s not working', 'dylet ti ofyn i dy hunan pam dyw e ddim yn gweithio', 'You should ask yourself why it''s not working.'),
  (1100, 'you shouldn''t worry about doing something similar', 'ddylet ti ddim becso am wneud rhywbeth tebyg', 'You shouldn''t worry about doing something similar.'),
  (1101, 'I''m enjoying finding out more about this language', 'dw i’n joio ffeindio mas mwy am yr iaith ’ma', 'I''m enjoying finding out more about this language.'),
  (1102, 'we''re trying to say that it''s not like that', 'ŷn ni’n trio dweud fod e ddim fel ’na', 'We''re trying to say that it''s not like that.'),
  (1103, 'we''re not trying to hear many more words', 'so ni’n trio clywed llawer mwy o eiriau', 'We''re not trying to hear many more words.'),
  (1104, 'we need to change what we''re doing', 'ŷn ni angen newid beth ŷn ni’n gwneud', 'We need to change what we''re doing.'),
  (1105, 'that is why he didn''t know the answer', 'dyna pam doedd e ddim yn gwybod yr ateb', 'That is why he didn''t know the answer.'),
  (1106, 'we don''t need to feel happy, we just need to work hard', 'so ni angen teimlo’n hapus, ŷn ni jyst angen gweithio’n galed', 'We don''t need to feel happy, we just need to work hard.'),
  (1107, 'we hoped to see what you were doing', 'o’n ni’n gobeithio gweld beth o’t ti’n gwneud', 'We hoped to see what you were doing.'),
  (1108, 'we didn''t hope to wake in the middle of the night', 'do’n ni ddim yn gobeithio dihuno yng nghanol y nos', 'We didn''t hope to wake in the middle of the night.'),
  (1109, 'we must work hard to learn a lot of new words', 'mae rhaid i ni weithio’n galed i ddysgu llawer o eiriau newydd', 'We must work hard to learn a lot of new words.'),
  (1110, 'we''re friends, and after we finish I''d like to relax', 'ŷn ni’n ffrindiau, ac ar ôl i ni gwpla hoffen i ymlacio', 'We''re friends, and after we finish I''d like to relax.'),
  (1111, 'when we learn something new it changes our brain', 'pan ŷn ni’n dysgu rhywbeth newydd mae’n newid ein hymennydd ni', 'When we learn something new it changes our brain.'),
  (1112, 'that was very interesting, and I wasn''t expecting it', 'oedd hynny’n ddiddorol iawn, a do’n i ddim yn disgwyl e', 'That was very interesting, and I wasn''t expecting it.'),
  (1113, 'why can''t I remember what you said?', 'pam alla i ddim cofio be’ ddwedest ti?', 'Why can''t I remember what you said?'),
  (1114, 'I feel as if I''m doing worse today than yesterday', 'dw i’n teimlo fel ’sen i’n gwneud yn waeth heddiw na ddoe', 'I feel as if I''m doing worse today than yesterday.'),
  (1115, 'I don''t feel as if I''m ready to have a conversation', 'dw i ddim yn teimlo fel ’sen i’n barod i gael sgwrs', 'I don''t feel as if I''m ready to have a conversation.'),
  (1116, 'this isn''t the best choice I could make', 'dyw hwn ddim y dewis gorau allen i wneud', 'This isn''t the best choice I could make.'),
  (1117, 'I''m definitely doing better than I was last time we talked to each other', 'dw i’n bendant yn gwneud yn well nag o’n i tro diwetha’ wnaethon ni siarad gyda’n gilydd', 'I''m definitely doing better than I was last time we talked to each other.'),
  (1118, 'I feel better than I felt when we were in the pub', 'dw i’n teimlo’n well nag o’n i’n teimlo pan o’n ni yn y dafarn', 'I feel better than I felt when we were in the pub.'),
  (1119, 'can I ask you something before you leave?', 'ga i ofyn rhywbeth i ti cyn i ti adael?', 'Can I ask you something before you leave?'),
  (1120, 'it''s interesting that you like to go by bus', 'mae’n ddiddorol bo’ ti’n hoffi mynd ar y bws', 'It''s interesting that you like to go by bus.'),
  (1121, 'it''s unusual that you don''t like to use your car', 'mae’n anarferol bo’ ti ddim yn hoffi defnyddio dy gar', 'It''s unusual that you don''t like to use your car.'),
  (1122, 'it''s starting to feel easier and I''m excited about how it''s going', 'mae’n dechrau teimlo’n haws a dw i’n gyffrous am sut mae’n mynd', 'It''s starting to feel easier and I''m excited about how it''s going.'),
  (1123, 'I think that''s a good idea', 'dw i’n meddwl bod hynny’n syniad da', 'I think that''s a good idea.'),
  (1124, 'I thought that was a good idea', 'o’n i’n meddwl bod hynny’n syniad da', 'I thought that was a good idea.'),
  (1125, 'I believe that your idea was very good', 'dw i’n credu bod dy syniad di wedi bod yn dda iawn', 'I believe that your idea was very good.'),
  (1126, 'this work is changing the shape of my brain', 'mae’r gwaith ’ma’n newid siâp fy ymennydd i', 'This work is changing the shape of my brain.'),
  (1127, 'that isn''t why I wanted to see you', 'nid dyna pam o’n i’n moyn dy weld di', 'That isn''t why I wanted to see you.'),
  (1128, 'you''re like someone I used to know', 'ti fel rhywun o’n i’n arfer nabod', 'You''re like someone I used to know.'),
  (1129, 'I''m so happy that you''re doing so well', 'dw i mor hapus bo’ ti’n gwneud mor dda', 'I''m so happy that you''re doing so well.'),
  (1130, 'that was a surprise, because he''s my friend', 'oedd hynny’n syndod, achos mae e’n ffrind i fi', 'That was a surprise, because he''s my friend.'),
  (1131, 'there are too many ideas going around in my head', 'mae gormod o syniadau’n mynd rownd yn fy mhen', 'There are too many ideas going around in my head.'),
  (1132, 'that''s less exciting than what she was saying', 'mae hynny’n llai cyffrous na beth oedd hi’n dweud', 'That''s less exciting than what she was saying.'),
  (1133, 'you get to know someone very well when you work together', 'ti’n dod i nabod rhywun yn dda iawn pan ŷch chi’n gweithio gyda’ch gilydd', 'You get to know someone very well when you work together.'),
  (1134, 'it''s not a problem when you work at something difficult with them', 'dyw hi ddim yn broblem pan ti’n gweithio ar rywbeth anodd gyda nhw', 'It''s not a problem when you work at something difficult with them.'),
  (1135, 'I don''t know why you think that it''s so good', 'dw i ddim yn gwybod pam ti’n meddwl fod e mor dda', 'I don''t know why you think that it''s so good.'),
  (1136, 'of course you can ask her because she''s my friend', 'wrth gwrs gei di ofyn iddi hi achos mae hi’n ffrind i fi', 'Of course you can ask her because she''s my friend.'),
  (1137, 'it''s more important to talk often than to be perfect', 'mae’n bwysicach siarad yn aml na bod yn berffaith', 'It''s more important to talk often than to be perfect.'),
  (1138, 'this was where my friend wanted to meet us', 'fan hyn oedd fy ffrind yn moyn cwrdd â ni', 'This was where my friend wanted to meet us.'),
  (1139, 'I''m sorry that I need to leave so early', 'mae’n ddrwg ’da fi bo’ fi angen gadael mor gynnar', 'I''m sorry that I need to leave so early.'),
  (1140, 'I''m sorry that I can''t see what you''re trying to show me', 'mae’n ddrwg ’da fi bo’ fi ddim yn gallu gweld beth ti’n trio dangos i fi', 'I''m sorry that I can''t see what you''re trying to show me.'),
  (1141, 'no problem. Everything is okay', 'dim problem. mae popeth yn iawn', 'No problem. Everything is okay.'),
  (1142, 'that''s very kind of you and I''m grateful to you for helping', 'mae hynny’n garedig iawn ohonot ti a dw i’n ddiolchgar i ti am helpu', 'That''s very kind of you and I''m grateful to you for helping.'),
  (1143, 'it''s the same thing as we were talking about earlier', 'mae e’r un peth â beth o’n ni’n siarad amdano gynne', 'It''s the same thing as we were talking about earlier.'),
  (1144, 'I woke earlier than I wanted to this morning', 'wnes i ddihuno’n gynt nag o’n i’n moyn bore ’ma', 'I woke earlier than I wanted to this morning.'),
  (1145, 'why are you not happy any more?', 'pam nag wyt ti’n hapus rhagor?', 'Why are you not happy any more?'),
  (1146, 'nothing seems to be working since we tried to fix it', 'sdim byd i weld yn gweithio ers i ni drio’i drwsio fe', 'Nothing seems to be working since we tried to fix it.'),
  (1147, 'she was very kind when she saw me feeling nervous', 'oedd hi’n garedig iawn pan welodd hi fi’n teimlo’n nerfus', 'She was very kind when she saw me feeling nervous.'),
  (1148, 'he wasn''t very patient when I couldn''t answer', 'doedd e ddim yn amyneddgar iawn pan o’n i ddim yn gallu ateb', 'He wasn''t very patient when I couldn''t answer.'),
  (1149, 'this isn''t very difficult, so I hope you''ll finish soon', 'dyw hwn ddim yn anodd iawn, felly dw i’n gobeithio byddi di’n cwpla cyn bo hir', 'This isn''t very difficult, so I hope you''ll finish soon.'),
  (1150, 'can you tell me what your name is?', 'alli di ddweud wrtha i beth yw dy enw di?', 'Can you tell me what your name is?'),
  (1151, 'that wasn''t what I was hoping would happen', 'nid hynny o’n i’n gobeithio fyddai’n digwydd', 'That wasn''t what I was hoping would happen.'),
  (1152, 'I would have done it differently if I had known what you wanted', 'bydden i wedi gwneud e’n wahanol ’sen i wedi gwybod beth o’t ti’n moyn', 'I would have done it differently if I had known what you wanted.'),
  (1153, 'I wouldn''t have said it in exactly the same way', 'fydden i ddim wedi dweud e yn gwmws yr un ffordd', 'I wouldn''t have said it in exactly the same way.'),
  (1154, 'where do you want to meet on Saturday night?', 'ble wyt ti’n moyn cwrdd nos Sadwrn?', 'Where do you want to meet on Saturday night?'),
  (1155, 'I don''t mind waiting for a few minutes tomorrow morning', 'sdim ots ’da fi aros am gwpl o funudau bore ’fory', 'I don''t mind waiting for a few minutes tomorrow morning.'),
  (1156, 'do you want to go to a restaurant tonight?', 'wyt ti’n moyn mynd i dŷ bwyta heno?', 'Do you want to go to a restaurant tonight?'),
  (1157, 'I won''t be able to be there next month', 'fydda i ddim yn gallu bod yno mis nesa’', 'I won''t be able to be there next month.'),
  (1158, 'let''s talk about something else', 'gadewch i ni siarad am rywbeth arall', 'Let''s talk about something else.'),
  (1159, 'that isn''t what I''m trying to say', 'nid hynny dw i’n trio dweud', 'That isn''t what I''m trying to say.'),
  (1160, 'how do you say this word in Welsh?', 'sut wyt ti’n dweud y gair ’ma yn Gymraeg?', 'How do you say this word in {target}?'),
  (1161, 'can you give me that book on Sunday morning?', 'alli di roi’r llyfr ’na i fi fore dydd Sul?', 'Can you give me that book on Sunday morning?'),
  (1162, 'what do you think about that?', 'be’ ti’n meddwl am hynny?', 'What do you think about that?'),
  (1163, 'I think that it''s interesting', 'dw i’n meddwl fod e’n ddiddorol', 'I think that it''s interesting.'),
  (1164, 'an interesting book', 'llyfr diddorol', 'An interesting book'),
  (1165, 'but I''m not sure if it''s true', 'ond dw i ddim yn siŵr os yw e’n wir', 'But I''m not sure if it''s true.'),
  (1166, 'my name is not very unusual', 'dyw fy enw i ddim yn anarferol iawn', 'My name is not very unusual.'),
  (1167, 'what do you need to do tomorrow afternoon?', 'beth wyt ti angen gwneud prynhawn ’fory?', 'What do you need to do tomorrow afternoon?'),
  (1168, 'and then I''ll be able to come and help later on', 'ac wedyn bydda i’n gallu dod i helpu nes ymlaen', 'And then I''ll be able to come and help later on.'),
  (1169, 'what do you want me to do?', 'beth wyt ti’n moyn i fi wneud?', 'What do you want me to do?'),
  (1170, 'I''d like you to tell me what you need', 'hoffen i i ti ddweud wrtha i beth ti angen', 'I''d like you to tell me what you need.'),
  (1171, 'do you want me to help you look for it?', 'wyt ti’n moyn i fi dy helpu di i chwilio amdano fe?', 'Do you want me to help you look for it?'),
  (1172, 'yes that would be very helpful', 'ydw, byddai hynny’n help mawr', 'Yes that would be very helpful.'),
  (1173, 'no thank you I can manage on my own', 'na, dim diolch, galla i ymdopi ar fy mhen fy hunan', 'No thank you I can manage on my own.'),
  (1174, 'can you understand what I''m saying?', 'alli di ddeall beth dw i’n dweud?', 'Can you understand what I''m saying?'),
  (1175, 'what do you want to do on Sunday morning?', 'beth wyt ti’n moyn gwneud fore dydd Sul?', 'What do you want to do on Sunday morning?'),
  (1176, 'I''ll ask him if he''ll be able to help next year', 'gofynna i iddo fe os bydd e’n gallu helpu flwyddyn nesa’', 'I''ll ask him if he''ll be able to help next year.'),
  (1177, 'I''ll ask her where she wants to go', 'gofynna i iddi hi ble mae hi’n moyn mynd', 'I''ll ask her where she wants to go.'),
  (1178, 'I didn''t have time, although I wanted to see you', 'ches i ddim amser, er bo’ fi’n moyn dy weld di', 'I didn''t have time, although I wanted to see you.'),
  (1179, 'what are you going to do on Sunday afternoon?', 'be’ ti’n mynd i wneud bnawn dydd Sul?', 'What are you going to do on Sunday afternoon?'),
  (1180, 'I''d like to read my book for a while', 'hoffen i ddarllen fy llyfr am dipyn', 'I''d like to read my book for a while.'),
  (1181, 'but I have to take my mother to the doctor', 'ond mae rhaid i fi fynd â fy mam at y doctor', 'But I have to take my mother to the doctor.'),
  (1182, 'have you seen my keys anywhere?', 'wyt ti ’di gweld fy allweddi i yn rhywle?', 'Have you seen my keys anywhere?'),
  (1183, 'no I''m afraid I haven''t seen them', 'na, dw i’n ofni bo’ fi heb eu gweld nhw', 'No I''m afraid I haven''t seen them.'),
  (1184, 'yes I saw them in the office a while ago', 'do, weles i nhw yn y swyddfa sbel yn ôl', 'Yes I saw them in the office a while ago.'),
  (1185, 'I think you left them at work', 'dw i’n meddwl bo’ ti ’di gadael nhw yn y gwaith', 'I think you left them at work.'),
  (1186, 'do you want to talk about something different next week?', 'wyt ti’n moyn siarad am rywbeth gwahanol wythnos nesa’?', 'Do you want to talk about something different next week?'),
  (1187, 'I''m happy so far', 'dw i’n hapus hyd yn hyn', 'I''m happy so far.'),
  (1188, 'so I don''t need to change', 'felly dw i ddim angen newid', 'So I don''t need to change.'),
  (1189, 'yes that''s a good idea', 'ie, mae hynny’n syniad da', 'Yes that''s a good idea.'),
  (1190, 'do you mind if I ask you some questions?', 'oes ots ’da ti os dw i’n gofyn cwpl o gwestiynau i ti?', 'Do you mind if I ask you some questions?'),
  (1191, 'no I don''t mind at all', 'na, sdim ots ’da fi o gwbl', 'No I don''t mind at all.'),
  (1192, 'I''m busy tomorrow night', 'dw i’n brysur nos ’fory', 'I''m busy tomorrow night.'),
  (1193, 'I''m sorry but I''m too busy today', 'mae’n ddrwg ’da fi ond dw i’n rhy brysur heddiw', 'I''m sorry but I''m too busy today.'),
  (1194, 'what are you looking for?', 'beth wyt ti’n chwilio amdano?', 'What are you looking for?'),
  (1195, 'I''m trying to find the money I left on the table', 'dw i’n trio ffeindio’r arian wnes i adael ar y bwrdd', 'I''m trying to find the money I left on the table.'),
  (1196, 'have you heard the latest idea?', 'wyt ti ’di clywed y syniad diweddara?', 'Have you heard the latest idea?'),
  (1197, 'my son works as a teacher', 'mae fy mab yn gweithio fel athro', 'My son works as a teacher.'),
  (1198, 'my daughter works for the council', 'mae fy merch yn gweithio i’r cyngor', 'My daughter works for the council.'),
  (1199, 'my friend used to work in an office', 'oedd fy ffrind yn arfer gweithio mewn swyddfa', 'My friend used to work in an office.'),
  (1200, 'they say they want to make sure that we finish everything in time', 'maen nhw’n dweud bo’ nhw’n moyn gwneud yn siŵr bo’ ni’n cwpla popeth mewn pryd', 'They say they want to make sure that we finish everything in time.'),
  (1201, 'we wanted to know what was going to happen', 'o’n ni’n moyn gwybod be’ oedd yn mynd i ddigwydd', 'We wanted to know what was going to happen.'),
  (1202, 'nobody was sure how to answer the question', 'doedd neb yn siŵr sut i ateb y cwestiwn', 'Nobody was sure how to answer the question.'),
  (1203, 'what would you do if I asked you to help me?', 'be’ fyddet ti’n gwneud ’sen i’n gofyn i ti helpu fi?', 'What would you do if I asked you to help me?'),
  (1204, 'I wanted her to help you to deal with the arrangements', 'o’n i’n moyn iddi hi dy helpu di i ddelio gyda’r trefniadau', 'I wanted her to help you to deal with the arrangements.'),
  (1205, 'I''ve forgotten the word I was trying to say', 'dw i wedi anghofio’r gair o’n i’n trio dweud', 'I''ve forgotten the word I was trying to say.'),
  (1206, 'I enjoy the chance to practise speaking with you', 'dw i’n joio’r cyfle i ymarfer siarad gyda ti', 'I enjoy the chance to practise speaking with you.'),
  (1207, 'you''ve done what you needed to do', 'ti wedi gwneud beth o’t ti angen gwneud', 'You''ve done what you needed to do.'),
  (1208, 'I didn''t want to ask you how to say it', 'do’n i ddim yn moyn gofyn i ti sut i ddweud e', 'I didn''t want to ask you how to say it.'),
  (1209, 'they want to spend more time meeting as a group', 'maen nhw’n moyn hala mwy o amser yn cwrdd fel grŵp', 'They want to spend more time meeting as a group.'),
  (1210, 'they think that we need to discuss the problem', 'maen nhw’n meddwl bo’ ni angen trafod y broblem', 'They think that we need to discuss the problem.'),
  (1211, 'they told us that they didn''t want to explain', 'ddwedon nhw wrthon ni bo’ nhw ddim yn moyn esbonio', 'They told us that they didn''t want to explain.'),
  (1212, 'they wanted to ask for help', 'o’n nhw’n moyn gofyn am help', 'They wanted to ask for help.'),
  (1213, 'we don''t know what they''re trying to achieve', 'so ni’n gwybod beth maen nhw’n trio cyflawni', 'We don''t know what they''re trying to achieve.'),
  (1214, 'did you have a good time at the weekend?', 'gest ti amser da ar y penwythnos?', 'Did you have a good time at the weekend?'),
  (1215, 'I went out on Saturday night', 'es i mas nos Sadwrn', 'I went out on Saturday night.'),
  (1216, 'I saw a few friends', 'weles i ychydig o ffrindiau', 'I saw a few friends.'),
  (1217, 'I had a glass or two of water', 'ges i wydred neu ddau o ddŵr', 'I had a glass or two of water.'),
  (1218, 'I didn''t do much on Sunday', 'wnes i ddim gwneud llawer ddydd Sul', 'I didn''t do much on Sunday.'),
  (1219, 'it was nice to relax for a while', 'oedd hi’n braf ymlacio am dipyn', 'It was nice to relax for a while.'),
  (1220, 'did you watch a bit of television?', 'wyliest ti bach o deledu?', 'Did you watch a bit of television?'),
  (1221, 'I watched the football and then I watched a film', 'wylies i’r pêl-droed ac wedyn wylies i ffilm', 'I watched the football and then I watched a film.'),
  (1222, 'he''s trying to tell me what he wants', 'ma fe’n trio dweud wrtha i beth mae e’n moyn', 'He''s trying to tell me what he wants'),
  (1223, 'he''s going to ask you tomorrow', 'ma fe’n mynd i ofyn i ti ’fory', 'He''s going to ask you tomorrow.'),
  (1224, 'he''s just started to learn', 'ma fe newydd ddechrau dysgu', 'He''s just started to learn.'),
  (1225, 'he would give you an answer if he could', 'byddai fe’n rhoi ateb i ti ’se fe’n gallu', 'He would give you an answer if he could.'),
  (1226, 'the man is trying to help me', 'mae’r dyn yn trio helpu fi', 'The man is trying to help me.'),
  (1227, 'that man is going to tell me something new', 'mae’r dyn ’na’n mynd i ddweud rhywbeth newydd wrtha i', 'That man is going to tell me something new.'),
  (1228, 'that man has just started to practise speaking', 'mae’r dyn ’na newydd ddechrau ymarfer siarad', 'That man has just started to practise speaking.'),
  (1229, 'that woman would help you if she could', 'byddai’r fenyw ’na’n dy helpu di ’se hi’n gallu', 'That woman would help you if she could.'),
  (1230, 'I know a young man who wants to work with you', 'dw i’n nabod dyn ifanc sy’n moyn gweithio gyda ti', 'I know a young man who wants to work with you.'),
  (1231, 'I know an old man who wanted to ask for help', 'dw i’n nabod hen ddyn oedd yn moyn gofyn am help', 'I know an old man who wanted to ask for help.'),
  (1232, 'I know an old woman who can remember the answer', 'dw i’n nabod hen fenyw sy’n gallu cofio’r ateb', 'I know an old woman who can remember the answer.'),
  (1233, 'I know a young woman who knows your sister', 'dw i’n nabod menyw ifanc sy’n nabod dy chwaer di', 'I know a young woman who knows your sister.'),
  (1234, 'I met someone last night who works with your brother', 'wnes i gwrdd â rhywun neithiwr sy’n gweithio gyda dy frawd di', 'I met someone last night who works with your brother.'),
  (1235, 'I met someone who said that he wanted to tell you something', 'wnes i gwrdd â rhywun ddwedodd fod e’n moyn dweud rhywbeth wrthot ti', 'I met someone who said that he wanted to tell you something.'),
  (1236, 'I know someone who said that she was going to try to help', 'dw i’n nabod rhywun ddwedodd bod hi’n mynd i drio helpu', 'I know someone who said that she was going to try to help.'),
  (1237, 'he wanted me to tell you before the weekend', 'oedd e’n moyn i fi ddweud wrthot ti cyn y penwythnos', 'He wanted me to tell you before the weekend.'),
  (1238, 'he wanted you to tell me yesterday', 'oedd e’n moyn i ti ddweud wrtha i ddoe', 'He wanted you to tell me yesterday.'),
  (1239, 'my mother likes to read', 'mae fy mam yn hoffi darllen', 'My mother likes to read.'),
  (1240, 'my father doesn''t like to stop talking', 'dyw fy nhad ddim yn hoffi stopo siarad', 'My father doesn''t like to stop talking.'),
  (1241, 'I don''t want to give it to him', 'dw i ddim yn moyn rhoi e iddo fe', 'I don''t want to give it to him.'),
  (1242, 'I want to give her more time', 'dw i’n moyn rhoi mwy o amser iddi hi', 'I want to give her more time.'),
  (1243, 'I''m going to ask for the same thing to eat', 'dw i’n mynd i ofyn am yr un peth i fwyta', 'I''m going to ask for the same thing to eat.'),
  (1244, 'I''ve learnt a lot already', 'dw i ’di dysgu llawer yn barod', 'I''ve learnt a lot already'),
  (1245, 'I''m happy with how much I''ve done in a short time', 'dw i’n hapus gyda faint dw i ’di gwneud mewn amser byr', 'I''m happy with how much I''ve done in a short time'),
  (1246, 'I wanted her to help you but she was too busy', 'o’n i’n moyn iddi hi dy helpu di ond oedd hi’n rhy brysur', 'I wanted her to help you but she was too busy.'),
  (1247, 'I thought that book was fairly good', 'o’n i’n meddwl bod y llyfr ’na’n eitha da', 'I thought that book was fairly good.'),
  (1248, 'I thought the film was complete rubbish and I want my money back', 'o’n i’n meddwl bod y ffilm yn rwtsh llwyr a dw i’n moyn fy arian i nôl', 'I thought the film was complete rubbish and I want my money back.'),
  (1249, 'I want you to help me before you go', 'dw i’n moyn i ti helpu fi cyn i ti fynd', 'I want you to help me before you go.'),
  (1250, 'can you tell me something else before I answer?', 'alli di ddweud rhywbeth arall wrtha i cyn i fi ateb?', 'Can you tell me something else before I answer?'),
  (1251, 'I don''t want to find out until after we finish', 'dw i ddim yn moyn ffeindio mas nes ar ôl i ni gwpla', 'I don''t want to find out until after we finish.'),
  (1252, 'when will you be ready to start?', 'pryd fyddi di’n barod i ddechrau?', 'When will you be ready to start?'),
  (1253, 'I should be ready in a few minutes', 'dylen i fod yn barod mewn cwpl o funudau', 'I should be ready in a few minutes.'),
  (1254, 'I''ve been ready since this morning', 'dw i wedi bod yn barod ers bore ’ma', 'I''ve been ready since this morning.'),
  (1255, 'when do you think you''ll be ready to leave?', 'pryd wyt ti’n meddwl fyddi di’n barod i adael?', 'When do you think you''ll be ready to leave?'),
  (1256, 'I think I''ll be ready in less than an hour', 'dw i’n meddwl bydda i’n barod mewn llai nag awr', 'I think I''ll be ready in less than an hour.'),
  (1257, 'I like that blue thing', 'dw i’n hoffi’r peth glas ’na', 'I like that blue thing.'),
  (1258, 'what''s that blue thing over there?', 'beth yw’r peth glas ’na draw fanco?', 'What''s that blue thing over there?'),
  (1259, 'an idea', 'syniad', 'An idea.'),
  (1260, 'I don''t have the faintest idea', 'sdim syniad ’da fi o gwbl', 'I don''t have the faintest idea.'),
  (1261, 'I think it might be something important', 'dw i’n meddwl falle fod e’n rhywbeth pwysig', 'I think it might be something important.'),
  (1262, 'who was that man you were talking to yesterday?', 'pwy oedd y dyn ’na o’t ti’n siarad gyda fe ddoe?', 'Who was that man you were talking to yesterday?'),
  (1263, 'I don''t know who you mean', 'dw i ddim yn gwybod pwy ti’n meddwl', 'I don''t know who you mean.'),
  (1264, 'an old man', 'hen ddyn', 'An old man.'),
  (1265, 'a friend', 'ffrind', 'A friend.'),
  (1266, 'he was an old friend of my father', 'oedd e’n hen ffrind i fy nhad', 'He was an old friend of my father.'),
  (1267, 'have you heard from your friend?', 'wyt ti ’di clywed gan dy ffrind?', 'Have you heard from your friend?'),
  (1268, 'yes she sent me two emails last week', 'do, halodd hi ddau e-bost ata i wythnos diwetha’', 'Yes she sent me two emails last week.'),
  (1269, 'why don''t you want to wait for your father?', 'pam nag wyt ti’n moyn aros am dy dad?', 'Why don''t you want to wait for your father?'),
  (1270, 'because I''m worried that I''m going to be late', 'achos dw i’n becso bo’ fi’n mynd i fod yn hwyr', 'Because I''m worried that I''m going to be late.'),
  (1271, 'would you like to come with us next month?', 'hoffet ti ddod gyda ni mis nesa’?', 'Would you like to come with us next month?'),
  (1272, 'yes that sounds like a great idea', 'hoffen, mae hynny’n swno fel syniad gwych', 'Yes that sounds like a great idea.'),
  (1273, 'no unfortunately I''ve got too much work', 'na, yn anffodus mae gormod o waith ’da fi', 'No unfortunately I''ve got too much work.'),
  (1274, 'do you have to leave in a few days?', 'oes rhaid i ti adael mewn cwpl o ddyddiau?', 'Do you have to leave in a few days?'),
  (1275, 'longer', 'hirach', 'Longer.'),
  (1276, 'no I can stay here for a little longer', 'na, galla i aros fan hyn am ychydig bach yn hirach', 'No I can stay here for a little longer.'),
  (1277, 'yes I''ve got an important meeting early next week', 'oes, mae cyfarfod pwysig ’da fi yn gynnar wythnos nesa’', 'Yes I''ve got an important meeting early next week.'),
  (1278, 'did you have to finish everything last night?', 'oedd rhaid i ti gwpla popeth neithiwr?', 'Did you have to finish everything last night?'),
  (1279, 'yes because there wasn''t much time left', 'oedd, achos doedd dim llawer o amser ar ôl', 'Yes because there wasn''t much time left.'),
  (1280, 'no I only had to do the most important job', 'na, dim ond y gwaith pwysica’ oedd rhaid i fi wneud', 'No I only had to do the most important job.'),
  (1281, 'do you mind if I finish my coffee before you start?', 'oes ots ’da ti os dw i’n cwpla fy nghoffi cyn i ti ddechrau?', 'Do you mind if I finish my coffee before you start?'),
  (1282, 'no that''s not a problem', 'na, dyw hynny ddim yn broblem', 'No that''s not a problem.'),
  (1283, 'which of your friends speak Welsh?', 'pa rai o dy ffrindiau sy’n siarad Cymraeg?', 'Which of your friends speak {target}?'),
  (1284, 'do you know my sister''s friend?', 'wyt ti’n nabod ffrind fy chwaer?', 'Do you know my sister''s friend?'),
  (1285, 'she speaks Welsh', 'mae hi’n siarad Cymraeg', 'She speaks {target}.'),
  (1286, 'people who like speaking Welsh', 'pobl sy’n hoffi siarad Cymraeg', 'People who like speaking {target}.'),
  (1287, 'how many people do you know who like watching television?', 'faint o bobl wyt ti’n nabod sy’n hoffi gwylio teledu?', 'How many people do you know who like watching television?'),
  (1288, 'most people I know like watching television', 'mae’r rhan fwya’ o’r bobl dw i’n nabod yn hoffi gwylio teledu', 'Most people I know like watching television.'),
  (1289, 'I wonder if she''s going to be there this afternoon', 'tybed ydy hi’n mynd i fod yno prynhawn ’ma', 'I wonder if she''s going to be there this afternoon.'),
  (1290, 'I wonder if he knows the answer', 'tybed ydy e’n gwybod yr ateb', 'I wonder if he knows the answer.'),
  (1291, 'I hope I''ll be able to speak better soon', 'dw i’n gobeithio bydda i’n gallu siarad yn well cyn bo hir', 'I hope I''ll be able to speak better soon.'),
  (1292, 'I hope you''ll be able to come to the party', 'dw i’n gobeithio byddi di’n gallu dod i’r parti', 'I hope you''ll be able to come to the party.'),
  (1293, 'I have to find out where he''s going to meet me', 'mae rhaid i fi ffeindio mas ble mae e’n mynd i gwrdd â fi', 'I have to find out where he''s going to meet me.'),
  (1294, 'I don''t have enough time to call you tonight', 'sdim digon o amser ’da fi i dy ffonio di heno', 'I don''t have enough time to call you tonight.'),
  (1295, 'I didn''t say that I wanted to finish in a day', 'ddwedes i ddim bo’ fi’n moyn cwpla mewn diwrnod', 'I didn''t say that I wanted to finish in a day.'),
  (1296, 'I said that I needed a little more time', 'ddwedes i bo’ fi angen ychydig mwy o amser', 'I said that I needed a little more time.'),
  (1297, 'I don''t know many people who speak Welsh', 'dw i ddim yn nabod llawer o bobl sy’n siarad Cymraeg', 'I don''t know many people who speak {target}.'),
  (1298, 'I''ve got nothing left to say', 'sdim byd ar ôl ’da fi i ddweud', 'I''ve got nothing left to say.'),
  (1299, 'he wants to pay half', 'ma fe’n moyn talu hanner', 'He wants to pay half.'),
  (1300, 'she doesn''t want to seem unfriendly', 'dyw hi ddim yn moyn ymddangos yn anghyfeillgar', 'She doesn''t want to seem unfriendly.'),
  (1301, 'he said that he wants to show you something', 'ddwedodd e fod e’n moyn dangos rhywbeth i ti', 'He said that he wants to show you something.'),
  (1302, 'she said that she doesn''t want to live in a city', 'ddwedodd hi bod hi ddim yn moyn byw mewn dinas', 'She said that she doesn''t want to live in a city.'),
  (1303, 'I think that he wants to sit down', 'dw i’n meddwl fod e’n moyn eistedd lawr', 'I think that he wants to sit down.'),
  (1304, 'I think that she doesn''t want to work from home', 'dw i’n meddwl bod hi ddim yn moyn gweithio o gytre', 'I think that she doesn''t want to work from home.'),
  (1305, 'woman', 'menyw', 'Woman.'),
  (1306, 'I know that young woman who''s talking to your friend', 'dw i’n nabod y fenyw ifanc ’na sy’n siarad gyda dy ffrind', 'I know that young woman who''s talking to your friend.'),
  (1307, 'I know that young man who''s sitting over there', 'dw i’n nabod y dyn ifanc ’na sy’n eistedd draw fanco', 'I know that young man who''s sitting over there.'),
  (1308, 'yes she''s a friend of my mother', 'ie, mae hi’n ffrind i fy mam', 'Yes she''s a friend of my mother.'),
  (1309, 'no I''ve never seen her before', 'na, dw i erioed wedi gweld hi o’r blaen', 'No I''ve never seen her before.'),
  (1310, 'she could write a story about that man', 'gallai hi sgrifennu stori am y dyn ’na', 'She could write a story about that man.'),
  (1311, 'he couldn''t believe the three most important facts', 'doedd e ddim yn gallu credu’r tair ffaith bwysica’', 'He couldn''t believe the three most important facts.'),
  (1312, 'she said that she could use the other room tomorrow night', 'ddwedodd hi y byddai hi’n gallu defnyddio’r stafell arall nos ’fory', 'She said that she could use the other room tomorrow night.'),
  (1313, 'he said that he couldn''t watch all five games', 'ddwedodd e na fyddai fe’n gallu gwylio’r pum gêm i gyd', 'He said that he couldn''t watch all five games.'),
  (1314, 'I think that she could put it on the table', 'dw i’n meddwl y byddai hi’n gallu rhoi e ar y bwrdd', 'I think that she could put it on the table.'),
  (1315, 'I think that he couldn''t afford the car that he wanted', 'dw i’n meddwl nag oedd e’n gallu fforddio’r car oedd e’n moyn', 'I think that he couldn''t afford the car that he wanted.'),
  (1316, 'do you think that she could bring her brother on Monday?', 'wyt ti’n meddwl y byddai hi’n gallu dod â’i brawd ddydd Llun?', 'Do you think that she could bring her brother on Monday?'),
  (1317, 'yes I think she could if she wanted to', 'ydw, dw i’n meddwl y byddai hi’n gallu ’se hi’n moyn', 'Yes I think she could if she wanted to.'),
  (1318, 'no I don''t think she could this time', 'na, dw i ddim yn meddwl y byddai hi’n gallu y tro ’ma', 'No I don''t think she could this time.'),
  (1319, 'she needs to move to a different country', 'mae hi angen symud i wlad wahanol', 'She needs to move to a different country.'),
  (1320, 'he doesn''t need to buy another television this year', 'dyw e ddim angen prynu teledu arall eleni', 'He doesn''t need to buy another television this year.'),
  (1321, 'a book', 'llyfr', 'A book.'),
  (1322, 'she said that she needs to read the same book', 'ddwedodd hi bod hi angen darllen yr un llyfr', 'She said that she needs to read the same book.'),
  (1323, 'he said that he doesn''t need to walk to school', 'ddwedodd e fod e ddim angen cerdded i’r ysgol', 'He said that he doesn''t need to walk to school.'),
  (1324, 'that student has both of her hands up', 'mae gyda’r fyfyrwraig ’na ei dwy law lan', 'That student has both of her hands up.'),
  (1325, 'I think that he needs to consider ten possible problems', 'dw i’n meddwl fod e angen ystyried deg problem bosib', 'I think that he needs to consider ten possible problems.'),
  (1326, 'I don''t think that she needs to sell the company', 'dw i ddim yn meddwl bod hi angen gwerthu’r cwmni', 'I don''t think that she needs to sell the company.'),
  (1327, 'do you think that she needs to offer another way?', 'wyt ti’n meddwl bod hi angen cynnig ffordd arall?', 'Do you think that she needs to offer another way?'),
  (1328, 'yes I think she ought to', 'ydw, dw i’n meddwl y dylai hi', 'Yes I think she ought to.'),
  (1329, 'it''s important', 'mae’n bwysig', 'It''s important.'),
  (1330, 'no I don''t think it''s very important', 'na, dw i ddim yn meddwl fod e’n bwysig iawn', 'No I don''t think it''s very important.'),
  (1331, 'she can''t provide all the answers', 'all hi ddim darparu’r atebion i gyd', 'She can''t provide all the answers.'),
  (1332, 'he can build a new life for his sister', 'gall e adeiladu bywyd newydd i’w chwaer', 'He can build a new life for his sister.'),
  (1333, 'she said that she can''t spend much time with the group', 'ddwedodd hi bod hi ddim yn gallu hala llawer o amser gyda’r grŵp', 'She said that she can''t spend much time with the group.'),
  (1334, 'he said that he can let you hold the kitten', 'ddwedodd e fod e’n gallu gadael i ti ddala’r gath fach', 'He said that he can let you hold the kitten');

INSERT INTO course_seeds (course_code, seed_number, known_text, target_text, status, last_edit_event_id)
SELECT 'cym_sv2_for_eng', n, k, t, 'draft', :'ev_ins' FROM hc_new ORDER BY n;

-- South sandbox HC list (never master canonical_seeds).
INSERT INTO canonical_seed_lists (slug, name, description, created_by)
VALUES ('cym-south-sandbox', 'Welsh South (sandbox)',
        'Hadau Creiddiol for cym_sv2_for_eng: 1-334 = canonical_seeds 1-334 (old South pairing, unchanged); 1001-1668 = HC N at 1000+N',
        'job-22-aran');
INSERT INTO canonical_list_seeds (list_id, seed_number, source_text)
SELECT l.id, c.seed_number, c.source_text FROM canonical_seed_lists l, canonical_seeds c
WHERE l.slug='cym-south-sandbox' AND c.seed_number BETWEEN 1 AND 334;
INSERT INTO canonical_list_seeds (list_id, seed_number, source_text)
SELECT l.id, c.seed_number + 1000, c.source_text FROM canonical_seed_lists l, canonical_seeds c
WHERE l.slug='cym-south-sandbox' AND c.seed_number BETWEEN 1 AND 668;
INSERT INTO canonical_list_assignments (course_code, list_id, assigned_by)
SELECT 'cym_sv2_for_eng', id, 'job-22-aran' FROM canonical_seed_lists WHERE slug='cym-south-sandbox';

INSERT INTO course_seed_weave (course_code, insert_after, block_start, set_by, note)
VALUES ('cym_sv2_for_eng', 137, 1000, 'job-22-aran',
        'Hadau Creiddiol block (ids 1000+HC) plays after old seed 137; panic switch = end of South Level 2 (274). Aran 2026-10-07.');

INSERT INTO course_seed_weave_drops (course_code, seed_number, reason, decided_by)
SELECT 'cym_sv2_for_eng', n, r, 'job-22-aran (South keep/drop plan, North rules)' FROM (VALUES
  (1002, 'HC 2: contained in old 2 (old 1-137 kept)'),
  (1179, 'HC 179: same Welsh as old 109 (be’ ti’n mynd i wneud bnawn dydd Sul?), English differs only will/are going to (old 1-137 kept)'),
  (1215, 'HC 215: contained in old 93 (old 1-137 kept)'),
  (1219, 'HC 219: contained in old 104 (old 1-137 kept)'),
  (1220, 'HC 220: contained in old 106 (old 1-137 kept)'),
  (1244, 'HC 244: exact repeat of old 97 (old 1-137 kept)'),
  (1329, 'HC 329: contained in old 127 (old 1-137 kept)'),
  (143, 'old 143: wholly inside HC 325 (deg) (HC kept: Aran 2026-10-07 16:38Z)'),
  (173, 'old 173: exact repeat of HC 196 (HC kept: Aran 2026-10-07 16:38Z)'),
  (183, 'old 183: exact repeat of HC 213 (HC kept: Aran 2026-10-07 16:38Z)'),
  (189, 'old 189: exact repeat of HC 201 (HC kept: Aran 2026-10-07 16:38Z)'),
  (247, 'old 247: wholly inside HC 204 (y trefniadau) (HC kept: Aran 2026-10-07 16:38Z)'),
  (276, 'old 276: exact repeat of HC 464 (HC kept: Aran 2026-10-07 16:38Z)'),
  (277, 'old 277: exact repeat of HC 465 (HC kept: Aran 2026-10-07 16:38Z)'),
  (278, 'old 278: exact repeat of HC 466 (HC kept: Aran 2026-10-07 16:38Z)'),
  (279, 'old 279: contains HC 468; contains HC 469 (nothing beyond them) (HC kept: Aran 2026-10-07 16:38Z)'),
  (281, 'old 281: exact repeat of HC 472 (HC kept: Aran 2026-10-07 16:38Z)'),
  (282, 'old 282: exact repeat of HC 474 (HC kept: Aran 2026-10-07 16:38Z)'),
  (284, 'old 284: exact repeat of HC 477 (HC kept: Aran 2026-10-07 16:38Z)'),
  (285, 'old 285: contains HC 478; contains HC 479 (nothing beyond them) (HC kept: Aran 2026-10-07 16:38Z)'),
  (286, 'old 286: exact repeat of HC 480 (HC kept: Aran 2026-10-07 16:38Z)'),
  (288, 'old 288: exact repeat of HC 483 (HC kept: Aran 2026-10-07 16:38Z)'),
  (289, 'old 289: exact repeat of HC 484 (HC kept: Aran 2026-10-07 16:38Z)'),
  (293, 'old 293: exact repeat of HC 492 (HC kept: Aran 2026-10-07 16:38Z)'),
  (294, 'old 294: exact repeat of HC 493 (HC kept: Aran 2026-10-07 16:38Z)'),
  (295, 'old 295: exact repeat of HC 494 (HC kept: Aran 2026-10-07 16:38Z)'),
  (296, 'old 296: same Welsh as HC 496 (intending/planning) (HC kept: Aran 2026-10-07 16:38Z)'),
  (297, 'old 297: exact repeat of HC 497 (HC kept: Aran 2026-10-07 16:38Z)'),
  (298, 'old 298: exact repeat of HC 498 (HC kept: Aran 2026-10-07 16:38Z)'),
  (300, 'old 300: exact repeat of HC 500 (HC kept: Aran 2026-10-07 16:38Z)'),
  (301, 'old 301: exact repeat of HC 501 (HC kept: Aran 2026-10-07 16:38Z)'),
  (302, 'old 302: exact repeat of HC 502 (HC kept: Aran 2026-10-07 16:38Z)'),
  (303, 'old 303: exact repeat of HC 503 (HC kept: Aran 2026-10-07 16:38Z)'),
  (304, 'old 304: contains HC 504; contains HC 505 (nothing beyond them) (HC kept: Aran 2026-10-07 16:38Z)'),
  (305, 'old 305: contains HC 506; contains HC 507 (nothing beyond them) (HC kept: Aran 2026-10-07 16:38Z)'),
  (307, 'old 307: same Welsh as HC 510 (she has gone / she''s gone) (HC kept: Aran 2026-10-07 16:38Z)'),
  (308, 'old 308: exact repeat of HC 511 (HC kept: Aran 2026-10-07 16:38Z)'),
  (310, 'old 310: exact repeat of HC 513 (HC kept: Aran 2026-10-07 16:38Z)'),
  (311, 'old 311: contains HC 514; contains HC 515 (nothing beyond them) (HC kept: Aran 2026-10-07 16:38Z)'),
  (312, 'old 312: contains HC 516; contains HC 517 (nothing beyond them) (HC kept: Aran 2026-10-07 16:38Z)'),
  (313, 'old 313: exact repeat of HC 518 (HC kept: Aran 2026-10-07 16:38Z)'),
  (314, 'old 314: exact repeat of HC 519 (HC kept: Aran 2026-10-07 16:38Z)'),
  (316, 'old 316: exact repeat of HC 521 (HC kept: Aran 2026-10-07 16:38Z)'),
  (317, 'old 317: contains HC 522; contains HC 523 (nothing beyond them) (HC kept: Aran 2026-10-07 16:38Z)'),
  (318, 'old 318: contains HC 524; contains HC 525 (nothing beyond them) (HC kept: Aran 2026-10-07 16:38Z)'),
  (319, 'old 319: contains HC 526; contains HC 527 (nothing beyond them) (HC kept: Aran 2026-10-07 16:38Z)'),
  (320, 'old 320: exact repeat of HC 528 (HC kept: Aran 2026-10-07 16:38Z)'),
  (322, 'old 322: contains HC 531; contains HC 532 (nothing beyond them) (HC kept: Aran 2026-10-07 16:38Z)'),
  (323, 'old 323: exact repeat of HC 533 (HC kept: Aran 2026-10-07 16:38Z)'),
  (324, 'old 324: exact repeat of HC 535 (HC kept: Aran 2026-10-07 16:38Z)'),
  (326, 'old 326: contains HC 538; contains HC 539 (nothing beyond them) (HC kept: Aran 2026-10-07 16:38Z)'),
  (327, 'old 327: exact repeat of HC 540 (HC kept: Aran 2026-10-07 16:38Z)'),
  (329, 'old 329: exact repeat of HC 544 (HC kept: Aran 2026-10-07 16:38Z)'),
  (330, 'old 330: exact repeat of HC 545 (HC kept: Aran 2026-10-07 16:38Z)'),
  (334, 'old 334: contains HC 554; contains HC 555 (nothing beyond them) (HC kept: Aran 2026-10-07 16:38Z)')
) v(n, r);

-- ── Checks ───────────────────────────────────────────────────────────────────
CREATE TEMP TABLE post AS SELECT * FROM pg_temp.others_fingerprint();
SELECT 'pre' k, * FROM pre UNION ALL SELECT 'post', * FROM post ORDER BY 2, 1;
DO $$
DECLARE c text := 'cym_sv2_for_eng'; x bigint;
BEGIN
  IF (SELECT count(*) FROM pre) < 12 OR EXISTS (SELECT * FROM pre EXCEPT SELECT * FROM post)
     OR EXISTS (SELECT * FROM post EXCEPT SELECT * FROM pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: another course / master canonical / another list changed'; END IF;
  IF (SELECT count(*) FROM course_seeds WHERE course_code=c) <> 668 + 334 THEN RAISE EXCEPTION 'CHECK FAILED: seed count'; END IF;
  IF EXISTS (SELECT 1 FROM course_seeds WHERE course_code=c AND seed_number BETWEEN 335 AND 1000) THEN RAISE EXCEPTION 'CHECK FAILED: 335-1000 not empty'; END IF;
  IF (SELECT count(*) FROM course_seeds WHERE course_code=c AND seed_number BETWEEN 1001 AND 1668) <> 668 THEN RAISE EXCEPTION 'CHECK FAILED: block size'; END IF;
  -- Old seeds 1-334 byte-identical to the backup.
  IF EXISTS (SELECT * FROM backup_cym_sv2_seeds_22 WHERE seed_number <= 334 EXCEPT SELECT * FROM course_seeds WHERE course_code=c AND seed_number <= 334)
     OR (SELECT count(*) FROM course_seeds WHERE course_code=c AND seed_number <= 334) <> 334 THEN
    RAISE EXCEPTION 'CHECK FAILED: an old seed 1-334 changed'; END IF;
  -- Moved drafts keep their row id, known text and Welsh.
  IF EXISTS (SELECT b.id FROM backup_cym_sv2_seeds_22 b WHERE b.seed_number BETWEEN 335 AND 668
             AND NOT EXISTS (SELECT 1 FROM course_seeds s WHERE s.id=b.id AND s.seed_number=b.seed_number+1000
                             AND s.known_text=b.known_text AND s.target_text=b.target_text)) THEN
    RAISE EXCEPTION 'CHECK FAILED: a moved draft lost its id or text'; END IF;
  -- HC list mirrors the course: every seed has a non-empty list row with the same number.
  IF EXISTS (SELECT 1 FROM course_seeds s WHERE s.course_code=c AND NOT EXISTS
             (SELECT 1 FROM canonical_list_seeds l JOIN canonical_seed_lists sl ON sl.id=l.list_id
              WHERE sl.slug='cym-south-sandbox' AND l.seed_number=s.seed_number AND l.source_text<>'')) THEN
    RAISE EXCEPTION 'CHECK FAILED: seed without HC list row'; END IF;
  IF (SELECT count(*) FROM canonical_list_seeds l JOIN canonical_seed_lists sl ON sl.id=l.list_id WHERE sl.slug='cym-south-sandbox') <> 334 + 668 THEN
    RAISE EXCEPTION 'CHECK FAILED: list size'; END IF;
  IF EXISTS (SELECT 1 FROM hc_new h JOIN canonical_list_seeds l ON l.seed_number=h.n JOIN canonical_seed_lists sl ON sl.id=l.list_id
             WHERE sl.slug='cym-south-sandbox' AND l.source_text <> h.en) THEN
    RAISE EXCEPTION 'CHECK FAILED: list 1001-1334 English differs from HC'; END IF;
  -- Running order.
  IF (SELECT count(*) FROM course_seed_weave_drops WHERE course_code=c) <> 55 THEN RAISE EXCEPTION 'CHECK FAILED: drops'; END IF;
  IF (SELECT count(*) FROM course_running_order WHERE course_code=c) <> 1002 - 55 THEN RAISE EXCEPTION 'CHECK FAILED: kept count'; END IF;
  IF (SELECT max(position) FROM course_running_order WHERE course_code=c) <> 1002 - 55 THEN RAISE EXCEPTION 'CHECK FAILED: positions not contiguous'; END IF;
  IF (SELECT seed_number FROM course_running_order WHERE course_code=c AND position=137) <> 137
     OR (SELECT seed_number FROM course_running_order WHERE course_code=c AND position=138) <> 1001 THEN
    RAISE EXCEPTION 'CHECK FAILED: block does not start at position 138'; END IF;
  -- Keep-both: each of the ten plays after its HC partner.
  IF EXISTS (SELECT 1 FROM (VALUES (275,1460),(280,1470),(283,1475),(291,1487),(299,1499),(306,1508),(325,1537),(328,1542),(331,1546),(332,1548)) k(o,h)
             LEFT JOIN course_running_order ro ON ro.course_code=c AND ro.seed_number=k.o
             LEFT JOIN course_running_order rh ON rh.course_code=c AND rh.seed_number=k.h
             WHERE ro.position IS NULL OR rh.position IS NULL OR ro.position <= rh.position) THEN
    RAISE EXCEPTION 'CHECK FAILED: a keep-both pair is missing or out of order'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;

SELECT 'seeds' k, count(*) FROM course_seeds WHERE course_code='cym_sv2_for_eng'
UNION ALL SELECT 'block seeds 1001-1668', count(*) FROM course_seeds WHERE course_code='cym_sv2_for_eng' AND seed_number >= 1000
UNION ALL SELECT 'dropped (excluded)', count(*) FROM course_seed_weave_drops WHERE course_code='cym_sv2_for_eng'
UNION ALL SELECT 'running order length', count(*) FROM course_running_order WHERE course_code='cym_sv2_for_eng';
SELECT 'finishing with' k, :'finish' v;
:finish;
