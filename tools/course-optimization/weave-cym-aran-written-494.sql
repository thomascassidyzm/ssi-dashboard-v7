-- TEMPLATE: weave-cym-aran-written-494.cjs sql fills the LEGOS and ROWS markers and writes weave-cym-aran-written-494.sql.
-- Job #494 (Aran 2026-10-13): Aran's hand-written practice phrases for the 17 new LEGOs that had none in the Welsh
-- sandboxes cym_nv2_for_eng / cym_sv2_for_eng. Welsh as Aran wrote it (tidied to sandbox ’ / "dw i" / "be’"), English ours.
-- Rows are filed as the v2 door files them (job #468's shape). Only rows are added; no LEGO, seed or other row changes.
-- Fingerprints of live cym_n_for_eng / cym_s_for_eng (seeds, legos, phrases) and master canonical_seeds are asserted unchanged.
-- Dry run unless invoked with  -v finish=COMMIT . Undo: weave-cym-aran-written-494-undo.sql.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
SET LOCAL statement_timeout = '20min';
CREATE FUNCTION pg_temp.fp() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'live '||x.course_code||' seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'live '||x.course_code||' phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng') GROUP BY x.course_code
  UNION ALL SELECT 'sandbox '||x.course_code||' legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_nv2_for_eng','cym_sv2_for_eng') GROUP BY x.course_code
$$;
CREATE TEMP TABLE pre AS SELECT * FROM pg_temp.fp();
SELECT 'BEFORE' k, * FROM pre ORDER BY t;

CREATE TEMP TABLE legos (course_code text, seed_number int, lego_index int, PRIMARY KEY (course_code, seed_number, lego_index));
INSERT INTO legos VALUES ('cym_nv2_for_eng',1087,2),('cym_nv2_for_eng',1478,2),('cym_nv2_for_eng',1496,4),('cym_nv2_for_eng',1497,2),('cym_nv2_for_eng',1502,1),('cym_sv2_for_eng',1054,2),('cym_sv2_for_eng',1115,3),('cym_sv2_for_eng',1166,2),('cym_sv2_for_eng',1208,4),('cym_sv2_for_eng',1276,2),('cym_sv2_for_eng',1286,2),('cym_sv2_for_eng',1428,1),('cym_sv2_for_eng',1447,1),('cym_sv2_for_eng',1502,1),('cym_sv2_for_eng',1512,4),('cym_sv2_for_eng',1526,1),('cym_sv2_for_eng',1551,2);
CREATE TEMP TABLE add_rows (id text PRIMARY KEY, course_code text, seed_number int, lego_index int, position int, known_text text, target_text text,
  word_count int, lego_count int, phrase_role text, introduce boolean, lego_position text, metadata jsonb);
INSERT INTO add_rows VALUES
  ('cym_nv2_for_eng:S1087L02C01', 'cym_nv2_for_eng', 1087, 2, 1, 'are', 'ydyn', 4, 1, 'component', true, 'middle', '{"buildup":"component","component_index":0,"job":494}'::jsonb),
  ('cym_nv2_for_eng:S1087L02C02', 'cym_nv2_for_eng', 1087, 2, 2, 'they', 'nhw', 3, 1, 'component', true, 'middle', '{"buildup":"component","component_index":1,"job":494}'::jsonb),
  ('cym_nv2_for_eng:S1087L02B01', 'cym_nv2_for_eng', 1087, 2, 3, 'they’re people', 'pobl ydyn nhw', 13, 2, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1087L02B02', 'cym_nv2_for_eng', 1087, 2, 4, 'they’re people I know', 'pobl dw i’n nabod ydyn nhw', 26, 4, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1087L02B03', 'cym_nv2_for_eng', 1087, 2, 5, 'they’re other people', 'pobl eraill ydyn nhw', 20, 3, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1478L02C01', 'cym_nv2_for_eng', 1478, 2, 1, 'heart', 'galon', 5, 1, 'component', true, 'middle', '{"buildup":"component","component_index":0,"job":494}'::jsonb),
  ('cym_nv2_for_eng:S1478L02C02', 'cym_nv2_for_eng', 1478, 2, 2, 'so kind', 'mor garedig', 11, 1, 'component', true, 'middle', '{"buildup":"component","component_index":1,"job":494}'::jsonb),
  ('cym_nv2_for_eng:S1478L02B01', 'cym_nv2_for_eng', 1478, 2, 3, 'I have such a kind heart', 'mae gen i galon mor garedig', 27, 6, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1478L02B02', 'cym_nv2_for_eng', 1478, 2, 4, 'you have such a kind heart', 'mae gen ti galon mor garedig', 28, 6, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1497L02C01', 'cym_nv2_for_eng', 1497, 2, 1, 'as though', 'fel bod', 7, 1, 'component', true, 'middle', '{"buildup":"component","component_index":0,"job":494}'::jsonb),
  ('cym_nv2_for_eng:S1497L02C02', 'cym_nv2_for_eng', 1497, 2, 2, 'you need', 'angen i ti', 10, 1, 'component', true, 'middle', '{"buildup":"component","component_index":1,"job":494}'::jsonb),
  ('cym_nv2_for_eng:S1497L02B01', 'cym_nv2_for_eng', 1497, 2, 3, 'as though you need to answer', 'fel bod angen i ti ateb', 23, 6, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1497L02B02', 'cym_nv2_for_eng', 1497, 2, 4, 'as though you need to speak', 'fel bod angen i ti siarad', 25, 6, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1497L02B03', 'cym_nv2_for_eng', 1497, 2, 5, 'as though you need to speak again', 'fel bod angen i ti siarad eto', 29, 7, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1497L02U01', 'cym_nv2_for_eng', 1497, 2, 6, 'as though you need to practise', 'fel bod angen i ti ymarfer', 26, 6, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1497L02U02', 'cym_nv2_for_eng', 1497, 2, 7, 'as though you need to practise more', 'fel bod angen i ti ymarfer mwy', 30, 7, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1502L01C01', 'cym_nv2_for_eng', 1502, 1, 1, 'almost', 'bu bron', 7, 1, 'component', true, 'middle', '{"buildup":"component","component_index":0,"job":494}'::jsonb),
  ('cym_nv2_for_eng:S1502L01C02', 'cym_nv2_for_eng', 1502, 1, 2, 'she', 'iddi', 4, 1, 'component', true, 'middle', '{"buildup":"component","component_index":1,"job":494}'::jsonb),
  ('cym_nv2_for_eng:S1502L01B01', 'cym_nv2_for_eng', 1502, 1, 3, 'she almost answered', 'bu bron iddi ateb', 17, 3, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1502L01B02', 'cym_nv2_for_eng', 1502, 1, 4, 'she almost spoke', 'bu bron iddi siarad', 19, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1502L01B03', 'cym_nv2_for_eng', 1502, 1, 5, 'she almost finished', 'bu bron iddi orffen', 19, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1502L01U01', 'cym_nv2_for_eng', 1502, 1, 6, 'she almost finished speaking', 'bu bron iddi orffen siarad', 26, 4, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1502L01U02', 'cym_nv2_for_eng', 1502, 1, 7, 'she almost remembered', 'bu bron iddi gofio', 18, 3, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_nv2_for_eng:S1502L01U03', 'cym_nv2_for_eng', 1502, 1, 8, 'she almost remembered something else', 'bu bron iddi gofio rhywbeth arall', 33, 5, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02B01', 'cym_sv2_for_eng', 1054, 2, 1, 'to give an answer', 'rhoi ateb', 9, 4, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02B02', 'cym_sv2_for_eng', 1054, 2, 2, 'to give something', 'rhoi rhywbeth', 13, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02B03', 'cym_sv2_for_eng', 1054, 2, 3, 'to give something else', 'rhoi rhywbeth arall', 19, 4, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02U01', 'cym_sv2_for_eng', 1054, 2, 4, 'I wanted to give', 'o’n i’n moyn rhoi', 17, 4, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02U02', 'cym_sv2_for_eng', 1054, 2, 5, 'I wanted to give something', 'o’n i’n moyn rhoi rhywbeth', 26, 5, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02U03', 'cym_sv2_for_eng', 1054, 2, 6, 'I wanted to give something else', 'o’n i’n moyn rhoi rhywbeth arall', 32, 6, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1054L02U04', 'cym_sv2_for_eng', 1054, 2, 7, 'I wanted to give you something else', 'o’n i’n moyn rhoi rhywbeth arall i ti', 37, 7, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1208L04B01', 'cym_sv2_for_eng', 1208, 4, 1, 'I’m going to say it', 'dw i’n mynd i ddweud e', 22, 5, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1208L04B02', 'cym_sv2_for_eng', 1208, 4, 2, 'I’m going to say it again', 'dw i’n mynd i ddweud e eto', 26, 6, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1208L04B03', 'cym_sv2_for_eng', 1208, 4, 3, 'I’m not going to say it again', 'dw i ddim yn mynd i ddweud e eto', 32, 7, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1276L02B01', 'cym_sv2_for_eng', 1276, 2, 1, 'I want to stay', 'dw i’n moyn aros', 16, 4, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1276L02B02', 'cym_sv2_for_eng', 1276, 2, 2, 'I don’t want to stay', 'dw i ddim yn moyn aros', 22, 5, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1276L02B03', 'cym_sv2_for_eng', 1276, 2, 3, 'you want to stay with me', 'ti’n moyn aros gyda fi', 22, 6, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1276L02U01', 'cym_sv2_for_eng', 1276, 2, 4, 'do you want to stay with me?', 'wyt ti’n moyn aros gyda fi?', 27, 7, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1286L02B01', 'cym_sv2_for_eng', 1286, 2, 1, 'people who like', 'pobl sy’n hoffi', 15, 3, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1286L02B02', 'cym_sv2_for_eng', 1286, 2, 2, 'someone who likes', 'rhywun sy’n hoffi', 17, 3, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1286L02B03', 'cym_sv2_for_eng', 1286, 2, 3, 'someone else who likes', 'rhywun arall sy’n hoffi', 23, 4, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1286L02U01', 'cym_sv2_for_eng', 1286, 2, 4, 'I know someone who likes', 'dw i’n nabod rhywun sy’n hoffi', 30, 5, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1428L01B01', 'cym_sv2_for_eng', 1428, 1, 1, 'would they like to try?', 'fydden nhw’n hoffi trio?', 24, 5, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1428L01B02', 'cym_sv2_for_eng', 1428, 1, 2, 'would they like to speak?', 'fydden nhw’n hoffi siarad?', 26, 5, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1428L01B03', 'cym_sv2_for_eng', 1428, 1, 3, 'would they like to speak Welsh?', 'fydden nhw’n hoffi siarad Cymraeg?', 34, 6, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1428L01U01', 'cym_sv2_for_eng', 1428, 1, 4, 'would they like to speak with me?', 'fydden nhw’n hoffi siarad gyda fi?', 34, 7, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1428L01U02', 'cym_sv2_for_eng', 1428, 1, 5, 'would they like to try again?', 'fydden nhw’n hoffi trio eto?', 28, 6, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1428L01U03', 'cym_sv2_for_eng', 1428, 1, 6, 'would they like to try to remember?', 'fydden nhw’n hoffi trio cofio?', 30, 7, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1428L01U04', 'cym_sv2_for_eng', 1428, 1, 7, 'would they like something else?', 'fydden nhw’n hoffi rhywbeth arall?', 34, 5, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01B01', 'cym_sv2_for_eng', 1447, 1, 1, 'will they be able to remember?', 'fyddan nhw’n gallu cofio?', 25, 6, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01B02', 'cym_sv2_for_eng', 1447, 1, 2, 'will they be able to remember the answer?', 'fyddan nhw’n gallu cofio’r ateb?', 32, 8, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1502L01B01', 'cym_sv2_for_eng', 1502, 1, 1, 'she almost answered', 'bu bron iddi ateb', 17, 3, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1502L01B02', 'cym_sv2_for_eng', 1502, 1, 2, 'she almost spoke', 'bu bron iddi siarad', 19, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1502L01B03', 'cym_sv2_for_eng', 1502, 1, 3, 'she almost remembered', 'bu bron iddi gofio', 18, 3, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1502L01U01', 'cym_sv2_for_eng', 1502, 1, 4, 'she almost remembered something else', 'bu bron iddi gofio rhywbeth arall', 33, 5, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1512L04B01', 'cym_sv2_for_eng', 1512, 4, 1, 'to fetch something', 'nôl rhywbeth', 12, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1512L04B02', 'cym_sv2_for_eng', 1512, 4, 2, 'to fetch something else', 'nôl rhywbeth arall', 18, 4, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1512L04B03', 'cym_sv2_for_eng', 1512, 4, 3, 'to fetch what I need', 'nôl beth dw i angen', 19, 5, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1512L04U01', 'cym_sv2_for_eng', 1512, 4, 4, 'to fetch what you need', 'nôl beth ti angen', 17, 5, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":494,"author":"aran"}'::jsonb);

DO $$ BEGIN
  IF to_regclass('backup_cym_aran_written_494') IS NOT NULL THEN RAISE EXCEPTION 'already applied'; END IF;
  IF EXISTS (SELECT 1 FROM add_rows WHERE course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')) THEN RAISE EXCEPTION 'a row is outside the sandboxes'; END IF;
  IF (SELECT count(*) FROM legos g JOIN course_legos l USING (course_code, seed_number, lego_index) WHERE l.is_new) <> 17 THEN
    RAISE EXCEPTION 'a listed LEGO is missing or not new'; END IF;
  IF EXISTS (SELECT 1 FROM course_practice_phrases p JOIN legos g USING (course_code, seed_number, lego_index)) THEN
    RAISE EXCEPTION 'a listed LEGO already has phrases'; END IF;
  IF EXISTS (SELECT 1 FROM add_rows a JOIN course_practice_phrases p ON p.id=a.id) THEN RAISE EXCEPTION 'a phrase id is taken'; END IF;
  IF EXISTS (SELECT 1 FROM add_rows a LEFT JOIN legos g USING (course_code, seed_number, lego_index) WHERE g.seed_number IS NULL) THEN RAISE EXCEPTION 'a row is not under a listed LEGO'; END IF;
END $$;

-- The backup is the list of what was added: nothing existed under these LEGOs before.
CREATE TABLE backup_cym_aran_written_494 AS SELECT id, course_code, seed_number, lego_index FROM add_rows;
REVOKE ALL ON backup_cym_aran_written_494 FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
SELECT c, 'sql:job-494 weave-cym-aran-written', 'weave-aran-written-phrases', 'agent', 'claude-job-494-aran-written',
       'agent (claude-job-494-aran-written)', false, 'creator',
       jsonb_build_object('lego_keys', (SELECT jsonb_agg(seed_number||':'||lego_index ORDER BY seed_number) FROM legos WHERE course_code=c),
                          'phrase_ids', (SELECT jsonb_agg(id ORDER BY id) FROM add_rows WHERE course_code=c)),
       jsonb_build_object('ruling', 'Job #494 (Aran 2026-10-13): Aran wrote the Welsh practice phrases for the new LEGOs that had none; English by the agent.',
                          'author_welsh', 'Aran', 'backup', 'backup_cym_aran_written_494')
FROM (VALUES ('cym_nv2_for_eng'), ('cym_sv2_for_eng')) v(c);
CREATE TEMP TABLE ev AS SELECT course_code, id FROM content_edit_events WHERE detail->>'backup'='backup_cym_aran_written_494';

INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count,
  phrase_role, introduce, connected_lego_ids, lego_position, metadata, status, version, last_edit_event_id)
SELECT a.id, a.course_code, a.seed_number, a.lego_index, a.position, a.known_text, a.target_text, a.word_count, a.lego_count,
  a.phrase_role, a.introduce, '{}'::text[], a.lego_position, a.metadata, 'draft', 1, ev.id
FROM add_rows a JOIN ev USING (course_code);

CREATE TEMP TABLE post AS SELECT * FROM pg_temp.fp();
SELECT 'AFTER' k, * FROM post ORDER BY t;
DO $$ BEGIN
  IF EXISTS (SELECT * FROM pre EXCEPT SELECT * FROM post) OR EXISTS (SELECT * FROM post EXCEPT SELECT * FROM pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: live Welsh, master canonical_seeds or sandbox LEGOs changed'; END IF;
  IF (SELECT count(*) FROM course_practice_phrases p JOIN add_rows a USING (id)) <> (SELECT count(*) FROM add_rows) THEN RAISE EXCEPTION 'CHECK FAILED: rows missing'; END IF;
  IF (SELECT count(*) FROM ev) <> 2 THEN RAISE EXCEPTION 'CHECK FAILED: edit events'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT a.course_code, a.id, a.phrase_role, a.target_text, a.known_text FROM add_rows a ORDER BY a.id;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
