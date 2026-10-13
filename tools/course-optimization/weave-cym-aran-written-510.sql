-- TEMPLATE: weave-cym-aran-written-510.cjs sql fills the LEGOS and ROWS markers and writes weave-cym-aran-written-510.sql.
-- Job #510 (Aran 2026-10-13): Aran's practice lines that #494 held, re-checked under his rule (any Welsh taught earlier in
-- the running order + the current LEGO; soft mutation = same word) and his two corrections. Each listed LEGO's rows (its
-- #494 rows, or none) are REPLACED by the whole accepted set in Aran's order, filed as #494 files them. Only rows under the
-- listed LEGOs change. Live cym_n/cym_s, master canonical_seeds, sandbox LEGOs and every other sandbox phrase are asserted
-- unchanged. Dry run unless invoked with  -v finish=COMMIT . Undo: weave-cym-aran-written-510-undo.sql (restores the #494 rows).
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
SET LOCAL statement_timeout = '20min';
CREATE TEMP TABLE legos (course_code text, seed_number int, lego_index int, PRIMARY KEY (course_code, seed_number, lego_index));
INSERT INTO legos VALUES ('cym_sv2_for_eng',1276,2),('cym_sv2_for_eng',1447,1),('cym_sv2_for_eng',1502,1),('cym_sv2_for_eng',1526,1),('cym_sv2_for_eng',1551,2);
CREATE TEMP TABLE add_rows (id text PRIMARY KEY, course_code text, seed_number int, lego_index int, position int, known_text text, target_text text,
  word_count int, lego_count int, phrase_role text, introduce boolean, lego_position text, metadata jsonb);
INSERT INTO add_rows VALUES
  ('cym_sv2_for_eng:S1276L02B01', 'cym_sv2_for_eng', 1276, 2, 1, 'I want to stay', 'dw i’n moyn aros', 16, 4, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1276L02B02', 'cym_sv2_for_eng', 1276, 2, 2, 'I want to stay with you', 'dw i’n moyn aros gyda ti', 24, 6, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1276L02B03', 'cym_sv2_for_eng', 1276, 2, 3, 'I don’t want to stay', 'dw i ddim yn moyn aros', 22, 5, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1276L02U01', 'cym_sv2_for_eng', 1276, 2, 4, 'I don’t want to stay with you', 'dw i ddim yn moyn aros gyda ti', 30, 7, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1276L02U02', 'cym_sv2_for_eng', 1276, 2, 5, 'I don’t want to stay with you again', 'dw i ddim yn moyn aros gyda ti eto', 34, 8, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1276L02U03', 'cym_sv2_for_eng', 1276, 2, 6, 'you want to stay with me', 'ti’n moyn aros gyda fi', 22, 6, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1276L02U04', 'cym_sv2_for_eng', 1276, 2, 7, 'do you want to stay with me?', 'wyt ti’n moyn aros gyda fi?', 27, 7, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01B01', 'cym_sv2_for_eng', 1447, 1, 1, 'will they be able to help?', 'fyddan nhw’n gallu helpu?', 25, 6, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01B02', 'cym_sv2_for_eng', 1447, 1, 2, 'will they be able to stop?', 'fyddan nhw’n gallu stopo?', 25, 6, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01B03', 'cym_sv2_for_eng', 1447, 1, 3, 'will they be able to remember?', 'fyddan nhw’n gallu cofio?', 25, 6, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01U01', 'cym_sv2_for_eng', 1447, 1, 4, 'will they be able to remember the answer?', 'fyddan nhw’n gallu cofio’r ateb?', 32, 8, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01U02', 'cym_sv2_for_eng', 1447, 1, 5, 'will they be able to practise with us?', 'fyddan nhw’n gallu ymarfer gyda ni?', 35, 8, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01U03', 'cym_sv2_for_eng', 1447, 1, 6, 'will they be able to do it?', 'fyddan nhw’n gallu gwneud e?', 28, 7, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1447L01U04', 'cym_sv2_for_eng', 1447, 1, 7, 'will they be able to do it again?', 'fyddan nhw’n gallu gwneud e eto?', 32, 8, 'use', true, NULL, '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1502L01B01', 'cym_sv2_for_eng', 1502, 1, 1, 'she almost answered', 'bu bron iddi ateb', 17, 3, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1502L01B02', 'cym_sv2_for_eng', 1502, 1, 2, 'she almost spoke', 'bu bron iddi siarad', 19, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1502L01B03', 'cym_sv2_for_eng', 1502, 1, 3, 'she almost finished', 'bu bron iddi orffen', 19, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1502L01U01', 'cym_sv2_for_eng', 1502, 1, 4, 'she almost finished speaking', 'bu bron iddi orffen siarad', 26, 4, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1502L01U02', 'cym_sv2_for_eng', 1502, 1, 5, 'she almost remembered', 'bu bron iddi gofio', 18, 3, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1502L01U03', 'cym_sv2_for_eng', 1502, 1, 6, 'she almost remembered something else', 'bu bron iddi gofio rhywbeth arall', 33, 5, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01B01', 'cym_sv2_for_eng', 1526, 1, 1, 'finding it interesting', 'cael hi’n ddiddorol', 19, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01B02', 'cym_sv2_for_eng', 1526, 1, 2, 'I’m finding it interesting', 'dw i’n cael hi’n ddiddorol', 26, 4, 'build', true, 'middle', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01B03', 'cym_sv2_for_eng', 1526, 1, 3, 'finding it easy', 'cael hi’n hawdd', 15, 3, 'build', true, 'start', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U01', 'cym_sv2_for_eng', 1526, 1, 4, 'I’m finding it easy', 'dw i’n cael hi’n hawdd', 22, 4, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U02', 'cym_sv2_for_eng', 1526, 1, 5, 'finding it easy to see', 'cael hi’n hawdd i weld', 22, 5, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U03', 'cym_sv2_for_eng', 1526, 1, 6, 'I’m finding it easy to see', 'dw i’n cael hi’n hawdd i weld', 29, 6, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U04', 'cym_sv2_for_eng', 1526, 1, 7, 'finding it easy to speak', 'cael hi’n hawdd i siarad', 24, 5, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U05', 'cym_sv2_for_eng', 1526, 1, 8, 'I’m finding it easy to speak', 'dw i’n cael hi’n hawdd i siarad', 31, 6, 'use', true, 'middle', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U06', 'cym_sv2_for_eng', 1526, 1, 9, 'finding it easy to speak Welsh', 'cael hi’n hawdd i siarad Cymraeg', 32, 6, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1526L01U07', 'cym_sv2_for_eng', 1526, 1, 10, 'finding what you said interesting', 'cael hi’n ddiddorol be’ ddwedest ti', 35, 5, 'use', true, 'start', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02B01', 'cym_sv2_for_eng', 1551, 2, 1, 'this is ugly', 'mae hyn yn salw', 15, 3, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02B02', 'cym_sv2_for_eng', 1551, 2, 2, 'that’s ugly', 'mae hynny’n salw', 16, 2, 'build', true, NULL, '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02B03', 'cym_sv2_for_eng', 1551, 2, 3, 'the dog is ugly', 'mae’r ci yn salw', 16, 4, 'build', true, 'end', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02U01', 'cym_sv2_for_eng', 1551, 2, 4, 'the cat is ugly', 'mae’r gath yn salw', 18, 4, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02U02', 'cym_sv2_for_eng', 1551, 2, 5, 'the dog isn’t ugly', 'dyw’r ci ddim yn salw', 21, 4, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02U03', 'cym_sv2_for_eng', 1551, 2, 6, 'the cat isn’t ugly', 'dyw’r gath ddim yn salw', 23, 4, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb),
  ('cym_sv2_for_eng:S1551L02U04', 'cym_sv2_for_eng', 1551, 2, 7, 'the cat isn’t very ugly', 'dyw’r gath ddim yn salw iawn', 28, 5, 'use', true, 'end', '{"format":"build_use","pipeline":"v2","job":510,"author":"aran"}'::jsonb);
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
  IF to_regclass('backup_cym_aran_written_510') IS NOT NULL THEN RAISE EXCEPTION 'already applied'; END IF;
  IF to_regclass('backup_cym_aran_written_504') IS NULL THEN RAISE EXCEPTION '#504 is not applied'; END IF;
  IF EXISTS (SELECT 1 FROM add_rows WHERE course_code NOT IN ('cym_nv2_for_eng','cym_sv2_for_eng')) THEN RAISE EXCEPTION 'a row is outside the sandboxes'; END IF;
  IF (SELECT count(*) FROM legos g JOIN course_legos l USING (course_code, seed_number, lego_index) WHERE l.is_new) <> (SELECT count(*) FROM legos) THEN
    RAISE EXCEPTION 'a listed LEGO is missing or not new'; END IF;
  -- Under the listed LEGOs there must be only #494's or #504's own rows (a LEGO #504 did not re-file still carries #494's), unedited and without audio.
  IF EXISTS (SELECT 1 FROM course_practice_phrases p JOIN legos g USING (course_code, seed_number, lego_index)
             WHERE p.last_edit_event_id IS NULL
                OR p.last_edit_event_id NOT IN (SELECT id FROM content_edit_events WHERE detail->>'backup' IN ('backup_cym_aran_written_494','backup_cym_aran_written_504'))
                OR p.target1_audio_id IS NOT NULL OR p.target2_audio_id IS NOT NULL OR p.known_audio_id IS NOT NULL OR p.presentation_audio_id IS NOT NULL) THEN
    RAISE EXCEPTION 'a listed LEGO has a row that is not an unedited, unvoiced #494/#504 row'; END IF;
  IF EXISTS (SELECT 1 FROM add_rows a JOIN course_practice_phrases p ON p.id=a.id
             WHERE (p.course_code, p.seed_number, p.lego_index) NOT IN (SELECT course_code, seed_number, lego_index FROM legos)) THEN RAISE EXCEPTION 'a phrase id is taken'; END IF;
  IF EXISTS (SELECT 1 FROM add_rows a LEFT JOIN legos g USING (course_code, seed_number, lego_index) WHERE g.seed_number IS NULL) THEN RAISE EXCEPTION 'a row is not under a listed LEGO'; END IF;
END $$;

-- The backup: every row under the listed LEGOs as it stands (the #494 rows), and the LEGO list.
CREATE TABLE backup_cym_aran_written_510 AS SELECT p.* FROM course_practice_phrases p JOIN legos g USING (course_code, seed_number, lego_index);
CREATE TABLE backup_cym_aran_written_510_legos AS SELECT * FROM legos;
REVOKE ALL ON backup_cym_aran_written_510, backup_cym_aran_written_510_legos FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
SELECT c, 'sql:job-510 weave-cym-aran-written', 'weave-aran-written-phrases', 'agent', 'claude-job-510-aran-written',
       'agent (claude-job-510-aran-written)', false, 'creator',
       jsonb_build_object('lego_keys', (SELECT jsonb_agg(seed_number||':'||lego_index ORDER BY seed_number) FROM legos WHERE course_code=c),
                          'phrase_ids', (SELECT jsonb_agg(id ORDER BY id) FROM add_rows WHERE course_code=c)),
       jsonb_build_object('ruling', 'Job #510 (Aran 2026-10-13): Aran''s lines held by #494, re-checked under his rule (any Welsh taught earlier in the running order, soft mutation = same word) and his corrections; each listed LEGO re-filed in his order. English by the agent.',
                          'author_welsh', 'Aran', 'backup', 'backup_cym_aran_written_510')
FROM (SELECT DISTINCT course_code AS c FROM legos) v;
-- newest only: an undo leaves its events behind, so a re-apply must not pick up the earlier ones too.
CREATE TEMP TABLE ev AS SELECT DISTINCT ON (course_code) course_code, id FROM content_edit_events WHERE detail->>'backup'='backup_cym_aran_written_510' ORDER BY course_code, occurred_at DESC, id;

DELETE FROM course_practice_phrases WHERE id IN (SELECT id FROM backup_cym_aran_written_510);
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
SELECT (SELECT count(*) FROM backup_cym_aran_written_510) AS replaced_504_rows, (SELECT count(*) FROM add_rows) AS written_rows;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
