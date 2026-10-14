-- TEMPLATE: weave-cym-aran-written-504.cjs sql fills the LEGOS and ROWS markers and writes weave-cym-aran-written-504.sql.
-- Job #504 (Aran 2026-10-13): Aran's practice lines that #494 held, re-checked under his rule (any Welsh taught earlier in
-- the running order + the current LEGO; soft mutation = same word) and his two corrections. Each listed LEGO's rows (its
-- #494 rows, or none) are REPLACED by the whole accepted set in Aran's order, filed as #494 files them. Only rows under the
-- listed LEGOs change. Live cym_n/cym_s, master canonical_seeds, sandbox LEGOs and every other sandbox phrase are asserted
-- unchanged. Dry run unless invoked with  -v finish=COMMIT . Undo: weave-cym-aran-written-504-undo.sql (restores the #494 rows).
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
SET LOCAL statement_timeout = '20min';
CREATE TEMP TABLE legos (course_code text, seed_number int, lego_index int, PRIMARY KEY (course_code, seed_number, lego_index));
INSERT INTO legos VALUES ('cym_nv2_for_eng',1087,2),('cym_nv2_for_eng',1478,2),('cym_nv2_for_eng',1496,4),('cym_nv2_for_eng',1497,2),('cym_sv2_for_eng',1054,2),('cym_sv2_for_eng',1115,3),('cym_sv2_for_eng',1166,2),('cym_sv2_for_eng',1208,4),('cym_sv2_for_eng',1286,2),('cym_sv2_for_eng',1447,1),('cym_sv2_for_eng',1512,4),('cym_sv2_for_eng',1526,1),('cym_sv2_for_eng',1551,2);
CREATE TEMP TABLE add_rows (id text PRIMARY KEY, course_code text, seed_number int, lego_index int, position int, known_text text, target_text text,
  word_count int, lego_count int, phrase_role text, introduce boolean, lego_position text, metadata jsonb);
INSERT INTO add_rows VALUES
  ('cym_nv2_for_eng:S1087L02C01', 'cym_nv2_for_eng', 1087, 2, 1, 'are', 'ydyn', 4, 1, 'component', true, 'middle', '{"buildup":"component","component_index":0,"job":504}'::jsonb),
  ('cym_nv2_for_eng:S1087L02C02', 'cym_nv2_for_eng', 1087, 2, 2, 'they', 'nhw', 3, 1, 'component', true, 'middle', '{"buildup":"component","component_index":1,"job":504}'::jsonb),
  ('cym_nv2_for_eng:S1087L02B01', 'cym_nv2_for_eng', 1087, 2, 3, 'they’re people', 'pobl ydyn nhw', 13, 2, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1087L02B02', 'cym_nv2_for_eng', 1087, 2, 4, 'they’re people I know', 'pobl dw i’n nabod ydyn nhw', 26, 4, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1087L02B03', 'cym_nv2_for_eng', 1087, 2, 5, 'they’re other people', 'pobl eraill ydyn nhw', 20, 3, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1087L02U01', 'cym_nv2_for_eng', 1087, 2, 6, 'they’re new people', 'pobl newydd ydyn nhw', 20, 3, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1087L02U02', 'cym_nv2_for_eng', 1087, 2, 7, 'they’re happy people', 'pobl hapus ydyn nhw', 19, 3, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1087L02U03', 'cym_nv2_for_eng', 1087, 2, 8, 'they’re friends', 'ffrindiau ydyn nhw', 18, 2, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1087L02U04', 'cym_nv2_for_eng', 1087, 2, 9, 'they’re my friends', 'fy ffrindiau ydyn nhw', 21, 3, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1478L02C01', 'cym_nv2_for_eng', 1478, 2, 1, 'heart', 'galon', 5, 1, 'component', true, 'middle', '{"buildup":"component","component_index":0,"job":504}'::jsonb),
  ('cym_nv2_for_eng:S1478L02C02', 'cym_nv2_for_eng', 1478, 2, 2, 'so kind', 'mor garedig', 11, 1, 'component', true, 'middle', '{"buildup":"component","component_index":1,"job":504}'::jsonb),
  ('cym_nv2_for_eng:S1478L02B01', 'cym_nv2_for_eng', 1478, 2, 3, 'such a kind heart', 'calon mor garedig', 17, 4, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1478L02B02', 'cym_nv2_for_eng', 1478, 2, 4, 'to see such a kind heart', 'gweld calon mor garedig', 23, 6, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1478L02B03', 'cym_nv2_for_eng', 1478, 2, 5, 'to remember such a kind heart', 'cofio calon mor garedig', 23, 6, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1478L02U01', 'cym_nv2_for_eng', 1478, 2, 6, 'I have such a kind heart', 'mae gen i galon mor garedig', 27, 6, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1478L02U02', 'cym_nv2_for_eng', 1478, 2, 7, 'you have such a kind heart', 'mae gen ti galon mor garedig', 28, 6, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1496L04C01', 'cym_nv2_for_eng', 1496, 4, 1, 'matters', 'cyfri’', 6, 1, 'component', true, 'middle', '{"buildup":"component","component_index":0,"job":504}'::jsonb),
  ('cym_nv2_for_eng:S1496L04B01', 'cym_nv2_for_eng', 1496, 4, 2, 'I matter', 'dw i’n cyfrif', 13, 2, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1496L04B02', 'cym_nv2_for_eng', 1496, 4, 3, 'you matter', 'ti’n cyfrif', 11, 2, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1496L04B03', 'cym_nv2_for_eng', 1496, 4, 4, 'this matters', 'mae hyn yn cyfrif', 17, 2, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1496L04U01', 'cym_nv2_for_eng', 1496, 4, 5, 'this really matters', 'mae hyn wirioneddol yn cyfrif', 29, 3, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1496L04U02', 'cym_nv2_for_eng', 1496, 4, 6, 'I don’t matter', 'dw i ddim yn cyfrif', 19, 3, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1497L02C01', 'cym_nv2_for_eng', 1497, 2, 1, 'as though', 'fel bod', 7, 1, 'component', true, 'middle', '{"buildup":"component","component_index":0,"job":504}'::jsonb),
  ('cym_nv2_for_eng:S1497L02C02', 'cym_nv2_for_eng', 1497, 2, 2, 'you need', 'angen i ti', 10, 1, 'component', true, 'middle', '{"buildup":"component","component_index":1,"job":504}'::jsonb),
  ('cym_nv2_for_eng:S1497L02B01', 'cym_nv2_for_eng', 1497, 2, 3, 'as though you need to see', 'fel bod angen i ti weld', 23, 6, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1497L02B02', 'cym_nv2_for_eng', 1497, 2, 4, 'as though you need to answer', 'fel bod angen i ti ateb', 23, 6, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1497L02B03', 'cym_nv2_for_eng', 1497, 2, 5, 'as though you need to speak', 'fel bod angen i ti siarad', 25, 6, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1497L02U01', 'cym_nv2_for_eng', 1497, 2, 6, 'as though you need to speak again', 'fel bod angen i ti siarad eto', 29, 7, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1497L02U02', 'cym_nv2_for_eng', 1497, 2, 7, 'as though you need to sleep', 'fel bod angen i ti gysgu', 24, 6, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1497L02U03', 'cym_nv2_for_eng', 1497, 2, 8, 'as though you need to practise', 'fel bod angen i ti ymarfer', 26, 6, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1497L02U04', 'cym_nv2_for_eng', 1497, 2, 9, 'as though you need to practise more', 'fel bod angen i ti ymarfer mwy', 30, 7, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02B01', 'cym_sv2_for_eng', 1054, 2, 1, 'to give time', 'rhoi amser', 10, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02B02', 'cym_sv2_for_eng', 1054, 2, 2, 'to give an answer', 'rhoi ateb', 9, 4, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02B03', 'cym_sv2_for_eng', 1054, 2, 3, 'to give something', 'rhoi rhywbeth', 13, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02U01', 'cym_sv2_for_eng', 1054, 2, 4, 'to give something else', 'rhoi rhywbeth arall', 19, 4, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02U02', 'cym_sv2_for_eng', 1054, 2, 5, 'I wanted to give', 'o’n i’n moyn rhoi', 17, 4, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02U03', 'cym_sv2_for_eng', 1054, 2, 6, 'I wanted to give something', 'o’n i’n moyn rhoi rhywbeth', 26, 5, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02U04', 'cym_sv2_for_eng', 1054, 2, 7, 'I wanted to give something else', 'o’n i’n moyn rhoi rhywbeth arall', 32, 6, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02U05', 'cym_sv2_for_eng', 1054, 2, 8, 'I wanted to give you something else', 'o’n i’n moyn rhoi rhywbeth arall i ti', 37, 7, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1115L03B01', 'cym_sv2_for_eng', 1115, 3, 1, 'to have a conversation', 'cael sgwrs', 10, 4, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1115L03B02', 'cym_sv2_for_eng', 1115, 3, 2, 'to have a conversation with you', 'cael sgwrs gyda ti', 18, 6, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1115L03B03', 'cym_sv2_for_eng', 1115, 3, 3, 'to have another conversation', 'cael sgwrs arall', 16, 4, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1115L03U01', 'cym_sv2_for_eng', 1115, 3, 4, 'to have another conversation with you', 'cael sgwrs arall gyda ti', 24, 6, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1115L03U02', 'cym_sv2_for_eng', 1115, 3, 5, 'to feel like having a conversation', 'teimlo fel cael sgwrs', 21, 6, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1115L03U03', 'cym_sv2_for_eng', 1115, 3, 6, 'to feel like having a conversation with you', 'teimlo fel cael sgwrs gyda ti', 29, 8, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1115L03U04', 'cym_sv2_for_eng', 1115, 3, 7, 'I feel like having a conversation', 'dw i’n teimlo fel cael sgwrs', 28, 6, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1115L03U05', 'cym_sv2_for_eng', 1115, 3, 8, 'I feel like having a conversation with you', 'dw i’n teimlo fel cael sgwrs gyda ti', 36, 8, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1166L02B01', 'cym_sv2_for_eng', 1166, 2, 1, 'I’m not very unusual', 'dw i ddim yn anarferol iawn', 27, 4, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1166L02B02', 'cym_sv2_for_eng', 1166, 2, 2, 'she isn’t very unusual', 'dyw hi ddim yn anarferol iawn', 29, 4, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1166L02B03', 'cym_sv2_for_eng', 1166, 2, 3, 'an answer isn’t very unusual', 'dyw ateb ddim yn anarferol iawn', 31, 5, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1166L02U01', 'cym_sv2_for_eng', 1166, 2, 4, 'speaking slowly isn’t very unusual', 'dyw siarad yn araf ddim yn anarferol iawn', 41, 5, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1166L02U02', 'cym_sv2_for_eng', 1166, 2, 5, 'that isn’t very unusual', 'dyw hynny ddim yn anarferol iawn', 32, 4, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1166L02U03', 'cym_sv2_for_eng', 1166, 2, 6, 'you’re not very unusual', 'ti ddim yn anarferol iawn', 25, 4, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1208L04B01', 'cym_sv2_for_eng', 1208, 4, 1, 'going to say it', 'mynd i ddweud e', 15, 4, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1208L04B02', 'cym_sv2_for_eng', 1208, 4, 2, 'how to say it', 'sut i ddweud e', 14, 4, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1208L04B03', 'cym_sv2_for_eng', 1208, 4, 3, 'I’m going to say it', 'dw i’n mynd i ddweud e', 22, 5, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1208L04U01', 'cym_sv2_for_eng', 1208, 4, 4, 'you’re going to say it', 'ti’n mynd i ddweud e', 20, 5, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1208L04U02', 'cym_sv2_for_eng', 1208, 4, 5, 'I’m going to say it again', 'dw i’n mynd i ddweud e eto', 26, 6, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1208L04U03', 'cym_sv2_for_eng', 1208, 4, 6, 'how to say it again', 'sut i ddweud e eto', 18, 5, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1208L04U04', 'cym_sv2_for_eng', 1208, 4, 7, 'I’m not going to say it again', 'dw i ddim yn mynd i ddweud e eto', 32, 7, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1286L02B01', 'cym_sv2_for_eng', 1286, 2, 1, 'people who like', 'pobl sy’n hoffi', 15, 3, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1286L02B02', 'cym_sv2_for_eng', 1286, 2, 2, 'someone who likes', 'rhywun sy’n hoffi', 17, 3, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1286L02B03', 'cym_sv2_for_eng', 1286, 2, 3, 'someone else who likes', 'rhywun arall sy’n hoffi', 23, 4, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1286L02U01', 'cym_sv2_for_eng', 1286, 2, 4, 'people who like trying', 'pobl sy’n hoffi trio', 20, 4, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1286L02U02', 'cym_sv2_for_eng', 1286, 2, 5, 'people who like trying to speak', 'pobl sy’n hoffi trio siarad', 27, 6, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1286L02U03', 'cym_sv2_for_eng', 1286, 2, 6, 'I know someone who likes', 'dw i’n nabod rhywun sy’n hoffi', 30, 5, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1286L02U04', 'cym_sv2_for_eng', 1286, 2, 7, 'I know someone who likes forgetting', 'dw i’n nabod rhywun sy’n hoffi anghofio', 39, 6, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01B01', 'cym_sv2_for_eng', 1447, 1, 1, 'will they be able to help?', 'fyddan nhw’n gallu helpu?', 25, 6, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01B02', 'cym_sv2_for_eng', 1447, 1, 2, 'will they be able to remember?', 'fyddan nhw’n gallu cofio?', 25, 6, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01B03', 'cym_sv2_for_eng', 1447, 1, 3, 'will they be able to remember the answer?', 'fyddan nhw’n gallu cofio’r ateb?', 32, 8, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01U01', 'cym_sv2_for_eng', 1447, 1, 4, 'will they be able to practise with us?', 'fyddan nhw’n gallu ymarfer gyda ni?', 35, 8, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01U02', 'cym_sv2_for_eng', 1447, 1, 5, 'will they be able to do it?', 'fyddan nhw’n gallu gwneud e?', 28, 7, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01U03', 'cym_sv2_for_eng', 1447, 1, 6, 'will they be able to do it again?', 'fyddan nhw’n gallu gwneud e eto?', 32, 8, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1512L04B01', 'cym_sv2_for_eng', 1512, 4, 1, 'to fetch something', 'nôl rhywbeth', 12, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1512L04B02', 'cym_sv2_for_eng', 1512, 4, 2, 'to fetch something else', 'nôl rhywbeth arall', 18, 4, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1512L04B03', 'cym_sv2_for_eng', 1512, 4, 3, 'to fetch what I need', 'nôl beth dw i angen', 19, 5, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1512L04U01', 'cym_sv2_for_eng', 1512, 4, 4, 'to fetch what you need', 'nôl beth ti angen', 17, 5, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1512L04U02', 'cym_sv2_for_eng', 1512, 4, 5, 'I can fetch it', 'dw i’n gallu nôl e', 18, 4, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1512L04U03', 'cym_sv2_for_eng', 1512, 4, 6, 'I can fetch something', 'dw i’n gallu nôl rhywbeth', 25, 4, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1512L04U04', 'cym_sv2_for_eng', 1512, 4, 7, 'I can fetch something else', 'dw i’n gallu nôl rhywbeth arall', 31, 5, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01B01', 'cym_sv2_for_eng', 1526, 1, 1, 'finding it interesting', 'cael hi’n ddiddorol', 19, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01B02', 'cym_sv2_for_eng', 1526, 1, 2, 'I’m finding it interesting', 'dw i’n cael hi’n ddiddorol', 26, 4, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01B03', 'cym_sv2_for_eng', 1526, 1, 3, 'finding it easy', 'cael hi’n hawdd', 15, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U01', 'cym_sv2_for_eng', 1526, 1, 4, 'I’m finding it easy', 'dw i’n cael hi’n hawdd', 22, 4, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U02', 'cym_sv2_for_eng', 1526, 1, 5, 'finding it easy to see', 'cael hi’n hawdd i weld', 22, 5, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U03', 'cym_sv2_for_eng', 1526, 1, 6, 'I’m finding it easy to see', 'dw i’n cael hi’n hawdd i weld', 29, 6, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U04', 'cym_sv2_for_eng', 1526, 1, 7, 'finding it easy to speak', 'cael hi’n hawdd i siarad', 24, 5, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U05', 'cym_sv2_for_eng', 1526, 1, 8, 'I’m finding it easy to speak', 'dw i’n cael hi’n hawdd i siarad', 31, 6, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U06', 'cym_sv2_for_eng', 1526, 1, 9, 'finding it easy to speak Welsh', 'cael hi’n hawdd i siarad Cymraeg', 32, 6, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02B01', 'cym_sv2_for_eng', 1551, 2, 1, 'this is ugly', 'mae hyn yn salw', 15, 3, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02B02', 'cym_sv2_for_eng', 1551, 2, 2, 'the dog is ugly', 'mae’r ci yn salw', 16, 4, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02B03', 'cym_sv2_for_eng', 1551, 2, 3, 'the cat is ugly', 'mae’r gath yn salw', 18, 4, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02U01', 'cym_sv2_for_eng', 1551, 2, 4, 'the dog isn’t ugly', 'dyw’r ci ddim yn salw', 21, 4, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02U02', 'cym_sv2_for_eng', 1551, 2, 5, 'the cat isn’t ugly', 'dyw’r gath ddim yn salw', 23, 4, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02U03', 'cym_sv2_for_eng', 1551, 2, 6, 'the cat isn’t very ugly', 'dyw’r gath ddim yn salw iawn', 28, 5, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":504,"author":"aran"}'::jsonb);
CREATE FUNCTION pg_temp.fp() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'live '||x.course_code||' seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' other phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x
    WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') AND (x.course_code, x.seed_number, x.lego_index) NOT IN (SELECT course_code, seed_number, lego_index FROM legos) GROUP BY x.course_code
$$;
CREATE TEMP TABLE pre AS SELECT * FROM pg_temp.fp();
SELECT 'BEFORE' k, * FROM pre ORDER BY t;

DO $$ BEGIN
  IF to_regclass('backup_cym_aran_written_504') IS NOT NULL THEN RAISE EXCEPTION 'already applied'; END IF;
  IF to_regclass('backup_cym_aran_written_494') IS NULL THEN RAISE EXCEPTION '#494 is not applied'; END IF;
  IF EXISTS (SELECT 1 FROM add_rows WHERE course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')) THEN RAISE EXCEPTION 'a row is outside the sandboxes'; END IF;
  IF (SELECT count(*) FROM legos g JOIN course_legos l USING (course_code, seed_number, lego_index) WHERE l.is_new) <> (SELECT count(*) FROM legos) THEN
    RAISE EXCEPTION 'a listed LEGO is missing or not new'; END IF;
  -- Under the listed LEGOs there must be only #494's own rows, unedited and without audio.
  IF EXISTS (SELECT 1 FROM course_practice_phrases p JOIN legos g USING (course_code, seed_number, lego_index)
             WHERE p.id NOT IN (SELECT id FROM backup_cym_aran_written_494)
                OR p.last_edit_event_id NOT IN (SELECT id FROM content_edit_events WHERE detail->>'backup'='backup_cym_aran_written_494')
                OR p.target1_audio_id IS NOT NULL OR p.target2_audio_id IS NOT NULL OR p.known_audio_id IS NOT NULL OR p.presentation_audio_id IS NOT NULL) THEN
    RAISE EXCEPTION 'a listed LEGO has a row that is not an unedited, unvoiced #494 row'; END IF;
  IF EXISTS (SELECT 1 FROM add_rows a JOIN course_practice_phrases p ON p.id=a.id
             WHERE (p.course_code, p.seed_number, p.lego_index) NOT IN (SELECT course_code, seed_number, lego_index FROM legos)) THEN RAISE EXCEPTION 'a phrase id is taken'; END IF;
  IF EXISTS (SELECT 1 FROM add_rows a LEFT JOIN legos g USING (course_code, seed_number, lego_index) WHERE g.seed_number IS NULL) THEN RAISE EXCEPTION 'a row is not under a listed LEGO'; END IF;
END $$;

-- The backup: every row under the listed LEGOs as it stands (the #494 rows), and the LEGO list.
CREATE TABLE backup_cym_aran_written_504 AS SELECT p.* FROM course_practice_phrases p JOIN legos g USING (course_code, seed_number, lego_index);
CREATE TABLE backup_cym_aran_written_504_legos AS SELECT * FROM legos;
REVOKE ALL ON backup_cym_aran_written_504, backup_cym_aran_written_504_legos FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
SELECT c, 'sql:job-504 weave-cym-aran-written', 'weave-aran-written-phrases', 'agent', 'claude-job-504-aran-written',
       'agent (claude-job-504-aran-written)', false, 'creator',
       jsonb_build_object('lego_keys', (SELECT jsonb_agg(seed_number||':'||lego_index ORDER BY seed_number) FROM legos WHERE course_code=c),
                          'phrase_ids', (SELECT jsonb_agg(id ORDER BY id) FROM add_rows WHERE course_code=c)),
       jsonb_build_object('ruling', 'Job #504 (Aran 2026-10-13): Aran''s lines held by #494, re-checked under his rule (any Welsh taught earlier in the running order, soft mutation = same word) and his corrections; each listed LEGO re-filed in his order. English by the agent.',
                          'author_welsh', 'Aran', 'backup', 'backup_cym_aran_written_504')
FROM (SELECT DISTINCT course_code AS c FROM legos) v;
CREATE TEMP TABLE ev AS SELECT course_code, id FROM content_edit_events WHERE detail->>'backup'='backup_cym_aran_written_504';

DELETE FROM course_practice_phrases WHERE id IN (SELECT id FROM backup_cym_aran_written_504);
INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count,
  phrase_role, introduce, connected_lego_ids, lego_position, metadata, status, version, last_edit_event_id)
SELECT a.id, a.course_code, a.seed_number, a.lego_index, a.position, a.known_text, a.target_text, a.word_count, a.lego_count,
  a.phrase_role, a.introduce, '{}'::text[], a.lego_position, a.metadata, 'draft', 1, ev.id
FROM add_rows a JOIN ev USING (course_code);
SET CONSTRAINTS ALL IMMEDIATE;

CREATE TEMP TABLE post AS SELECT * FROM pg_temp.fp();
SELECT 'AFTER' k, * FROM post ORDER BY t;
DO $$ BEGIN
  IF EXISTS (SELECT * FROM pre EXCEPT SELECT * FROM post) OR EXISTS (SELECT * FROM post EXCEPT SELECT * FROM pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: live Welsh, master canonical_seeds, sandbox LEGOs or other sandbox phrases changed'; END IF;
  IF (SELECT count(*) FROM course_practice_phrases p JOIN legos g USING (course_code, seed_number, lego_index))
     <> (SELECT count(*) FROM add_rows) THEN RAISE EXCEPTION 'CHECK FAILED: rows under the listed LEGOs are not exactly the new set'; END IF;
  IF (SELECT count(*) FROM ev) <> (SELECT count(DISTINCT course_code) FROM legos) THEN RAISE EXCEPTION 'CHECK FAILED: edit events'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT (SELECT count(*) FROM backup_cym_aran_written_504) AS replaced_494_rows, (SELECT count(*) FROM add_rows) AS written_rows;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
