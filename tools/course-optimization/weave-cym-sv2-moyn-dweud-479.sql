-- Job #479 (Aran 2026-10-13): job #468 generated and dropped 'sut ŷn ni’n moyn ddweud e?' (South never mutates after moyn).
-- Aran ruled: use the UNMUTATED 'sut ŷn ni’n moyn dweud e?' ("learners at that point will roll with it"). Spelling ŷn: the sandbox's
-- own (S1400L01 target 'ŷn ni’n moyn?' and its siblings). Filed as the 7th USE row of S1400L01 (position 11, as #468's U01-U06: introduce,
-- empty lego_position, status draft, metadata job/format/pipeline). cym_sv2_for_eng ONLY; adds ONE row, changes nothing else.
-- Asserts live cym_n/cym_s/cym_nv2, canonical_seeds, all sv2 LEGOs and every other sv2 phrase byte-identical before and after.
-- Dry run unless  psql -v finish=COMMIT . Undo: weave-cym-sv2-moyn-dweud-479-undo.sql
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN;
CREATE FUNCTION pg_temp.fp() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'canonical_seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'live seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng','cym_nv2_for_eng')
  UNION ALL SELECT 'live legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng','cym_nv2_for_eng')
  UNION ALL SELECT 'live phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng','cym_nv2_for_eng')
  UNION ALL SELECT 'sv2 legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code = 'cym_sv2_for_eng'
  UNION ALL SELECT 'sv2 phrases excl new', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code = 'cym_sv2_for_eng' AND x.id <> 'cym_sv2_for_eng:S1400L01U07'
$$;
CREATE TEMP TABLE pre AS SELECT * FROM pg_temp.fp();
DO $$ BEGIN
  IF to_regclass('backup_cym_sv2_moyn_dweud_479') IS NOT NULL THEN RAISE EXCEPTION 'already applied'; END IF;
  IF (SELECT count(*) FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND seed_number=1400 AND lego_index=1 AND phrase_role='use') <> 6 THEN RAISE EXCEPTION 'S1400L01 does not have exactly 6 USE rows'; END IF;
  IF NOT EXISTS (SELECT 1 FROM course_legos WHERE course_code='cym_sv2_for_eng' AND seed_number=1400 AND lego_index=1 AND is_new AND target_text='ŷn ni’n moyn?') THEN RAISE EXCEPTION 'S1400L01 missing or not new'; END IF;
  IF EXISTS (SELECT 1 FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND (id='cym_sv2_for_eng:S1400L01U07' OR (seed_number=1400 AND lego_index=1 AND position=11))) THEN RAISE EXCEPTION 'id or position taken'; END IF;
END $$;
-- backup: the basket this row joins (the insert touches nothing else; the undo deletes the one row)
CREATE TABLE backup_cym_sv2_moyn_dweud_479 AS
  SELECT id, position, phrase_role, known_text, target_text, last_edit_event_id FROM course_practice_phrases
  WHERE course_code='cym_sv2_for_eng' AND seed_number=1400 AND lego_index=1;
REVOKE ALL ON backup_cym_sv2_moyn_dweud_479 FROM anon, authenticated;
INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
VALUES ('cym_sv2_for_eng', 'sql:job-479 weave-cym-sv2-moyn-dweud', 'add-pairing-phrase', 'agent', 'claude-job-479-moyn-dweud',
        'agent (claude-job-479-moyn-dweud)', false, 'creator',
        jsonb_build_object('phrase_ids', jsonb_build_array('cym_sv2_for_eng:S1400L01U07')),
        jsonb_build_object('ruling', 'Aran 2026-10-13: use unmutated "sut ŷn ni’n moyn dweud e?" (job #468 dropped the mutated form); learners will roll with it.', 'backup', 'backup_cym_sv2_moyn_dweud_479'))
RETURNING id AS ev \gset
INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count,
  phrase_role, introduce, connected_lego_ids, lego_position, metadata, status, version, last_edit_event_id)
VALUES ('cym_sv2_for_eng:S1400L01U07', 'cym_sv2_for_eng', 1400, 1, 11, 'how do we want to say it?', 'sut ŷn ni’n moyn dweud e?',
  char_length('sut ŷn ni’n moyn dweud e?'), 6, 'use', true, '{}'::text[], NULL,
  '{"job": 479, "format": "build_use", "pipeline": "v2"}'::jsonb, 'draft', 1, :'ev');
CREATE TEMP TABLE post AS SELECT * FROM pg_temp.fp();
DO $$ BEGIN
  IF EXISTS (SELECT * FROM pre EXCEPT SELECT * FROM post) OR EXISTS (SELECT * FROM post EXCEPT SELECT * FROM pre) THEN RAISE EXCEPTION 'CHECK FAILED: something else changed'; END IF;
  IF (SELECT count(*) FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng' AND seed_number=1400 AND lego_index=1) <> 11 THEN RAISE EXCEPTION 'CHECK FAILED: basket size'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT id, position, phrase_role, word_count, lego_count, known_text, target_text FROM course_practice_phrases WHERE id='cym_sv2_for_eng:S1400L01U07';
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \gset
\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\endif
