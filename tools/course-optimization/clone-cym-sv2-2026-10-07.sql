-- Job #905 (Aran 2026-10-07): clone live cym_s_for_eng -> cym_sv2_for_eng as a hidden South sandbox,
-- mirroring cym_nv2_for_eng (job #796) EXCEPT that this script is INSERT-ONLY: it never UPDATEs or
-- DELETEs a row of any existing course (#796 also blanked live North draft text; that step is not here).
-- Audio is by POINTER only: rows reuse live course_audio ids; no course_audio row is copied or rendered.
-- No human recordist is cast (podCast {}), status draft, visibility hidden, not_available in both apps.
-- No canonical_list_assignments row: the sandbox reads the shared canonical_seeds (South numbering).
-- Runs as a dry run unless invoked with  -v finish=COMMIT ; every check below raises on failure,
-- and ON_ERROR_STOP then aborts the transaction. Undo: clone-cym-sv2-remove.sql.
\set ON_ERROR_STOP on
\if :{?finish}
\else
  \set finish ROLLBACK
\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;

-- Fingerprint of every live Welsh row the clone could reach, taken in this transaction's snapshot.
CREATE FUNCTION pg_temp.live_checksum() RETURNS TABLE(t text, course_code text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'courses', x.course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x::text)) FROM courses x WHERE x.course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_seeds', x.course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_legos', x.course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_practice_phrases', x.course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'lego_introductions', x.course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x.id)) FROM lego_introductions x WHERE x.course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
  UNION ALL SELECT 'course_audio', x.course_code, count(*), md5(string_agg(x::text, '|' ORDER BY x::text)) FROM course_audio x WHERE x.course_code IN ('cym_s_for_eng','cym_n_for_eng') GROUP BY 2
$$;
CREATE TEMP TABLE pre AS SELECT * FROM pg_temp.live_checksum();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM courses WHERE course_code='cym_sv2_for_eng') THEN
    RAISE EXCEPTION 'cym_sv2_for_eng already exists; run clone-cym-sv2-remove.sql first';
  END IF;
END $$;

INSERT INTO courses (course_code, display_name, known_lang, target_lang, voice_config, course_type, status,
  creator_email, translation_analysis, new_app_status, legacy_app_status, export_ready, quality_rules,
  content_version, visibility, pricing_tier, is_community, variant_label, dialect, known_dialect, seed_count)
SELECT 'cym_sv2_for_eng', 'Welsh (South) v2 — sandbox', known_lang, target_lang,
  voice_config || '{"podCast":{},"courseCode":"cym_sv2_for_eng"}'::jsonb,
  course_type, 'draft', creator_email, translation_analysis, 'not_available', 'not_available', false, quality_rules,
  content_version, 'hidden', pricing_tier, false, variant_label, dialect, known_dialect, seed_count
FROM courses WHERE course_code='cym_s_for_eng';

INSERT INTO course_seeds (course_code, seed_number, known_text, target_text, status, release_batch, version,
  known_audio_id, target1_audio_id, target2_audio_id, decomposed_at, approved_at, target_text_roman, flagged_at, last_edit_event_id)
SELECT 'cym_sv2_for_eng', seed_number, known_text, target_text, status, release_batch, version,
  known_audio_id, target1_audio_id, target2_audio_id, decomposed_at, approved_at, target_text_roman, flagged_at, last_edit_event_id
FROM course_seeds WHERE course_code='cym_s_for_eng';

INSERT INTO course_legos (course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status,
  release_batch, version, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms,
  target2_duration_ms, target_text_roman, target_lego_id, known_gloss_segments, last_edit_event_id)
SELECT 'cym_sv2_for_eng', seed_number, lego_index, type, is_new, known_text, target_text, components, status,
  release_batch, version, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms,
  target2_duration_ms, target_text_roman, target_lego_id, known_gloss_segments, last_edit_event_id
FROM course_legos WHERE course_code='cym_s_for_eng';

INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count,
  lego_count, difficulty, register, metadata, status, release_batch, version, target_syllable_count, phrase_role,
  connected_lego_ids, lego_position, known_audio_id, target1_audio_id, target2_audio_id, qa_checked, target1_duration_ms,
  target2_duration_ms, lego_id, target_text_roman, target_phrase_id, presentation_audio_id, introduce, decomposition,
  decomposition_course_version, display_tiling, display_tiling_version, known_gloss_segments, last_edit_event_id)
SELECT 'cym_sv2_for_eng:' || substr(id, length('cym_s_for_eng:')+1), 'cym_sv2_for_eng', seed_number, lego_index, position,
  known_text, target_text, word_count, lego_count, difficulty, register, metadata, status, release_batch, version,
  target_syllable_count, phrase_role, connected_lego_ids, lego_position, known_audio_id, target1_audio_id, target2_audio_id,
  qa_checked, target1_duration_ms, target2_duration_ms, lego_id, target_text_roman, target_phrase_id, presentation_audio_id,
  introduce, decomposition, decomposition_course_version, display_tiling, display_tiling_version, known_gloss_segments, last_edit_event_id
FROM course_practice_phrases WHERE course_code='cym_s_for_eng' AND id LIKE 'cym_s_for_eng:%';

INSERT INTO lego_introductions (course_code, lego_id, audio_uuid, duration_ms, version, presentation_audio_id)
SELECT 'cym_sv2_for_eng', lego_id, audio_uuid, duration_ms, version, presentation_audio_id
FROM lego_introductions WHERE course_code='cym_s_for_eng';

-- Checks. Any failure raises -> ON_ERROR_STOP -> nothing is committed.
CREATE TEMP TABLE post AS SELECT * FROM pg_temp.live_checksum();
SELECT 'pre' k, * FROM pre UNION ALL SELECT 'post', * FROM post ORDER BY 3,2,1;
DO $$
DECLARE s text := 'cym_s_for_eng'; v text := 'cym_sv2_for_eng'; a bigint; b bigint;
BEGIN
  IF (SELECT count(*) FROM pre) <> 12 OR EXISTS (SELECT * FROM pre EXCEPT SELECT * FROM post)
     OR EXISTS (SELECT * FROM post EXCEPT SELECT * FROM pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: live cym_s/cym_n fingerprint changed inside the clone transaction';
  END IF;
  SELECT count(*) INTO a FROM course_seeds WHERE course_code=s; SELECT count(*) INTO b FROM course_seeds WHERE course_code=v;
  IF a<>b THEN RAISE EXCEPTION 'CHECK FAILED: seeds % vs %', a, b; END IF;
  SELECT count(*) INTO a FROM course_legos WHERE course_code=s; SELECT count(*) INTO b FROM course_legos WHERE course_code=v;
  IF a<>b THEN RAISE EXCEPTION 'CHECK FAILED: legos % vs %', a, b; END IF;
  SELECT count(*) INTO a FROM course_practice_phrases WHERE course_code=s; SELECT count(*) INTO b FROM course_practice_phrases WHERE course_code=v;
  IF a<>b THEN RAISE EXCEPTION 'CHECK FAILED: phrases % vs %', a, b; END IF;
  SELECT count(*) INTO a FROM lego_introductions WHERE course_code=s; SELECT count(*) INTO b FROM lego_introductions WHERE course_code=v;
  IF a<>b THEN RAISE EXCEPTION 'CHECK FAILED: intros % vs %', a, b; END IF;
  -- Content identical seed-for-seed (text, status, audio pointers), including the #740 drafts at 335-668.
  IF EXISTS (SELECT seed_number, known_text, target_text, status, known_audio_id, target1_audio_id, target2_audio_id FROM course_seeds WHERE course_code=s
             EXCEPT SELECT seed_number, known_text, target_text, status, known_audio_id, target1_audio_id, target2_audio_id FROM course_seeds WHERE course_code=v) THEN
    RAISE EXCEPTION 'CHECK FAILED: seed content differs';
  END IF;
  IF EXISTS (SELECT seed_number, lego_index, type, known_text, target_text, components, target1_audio_id, target2_audio_id, presentation_audio_id FROM course_legos WHERE course_code=s
             EXCEPT SELECT seed_number, lego_index, type, known_text, target_text, components, target1_audio_id, target2_audio_id, presentation_audio_id FROM course_legos WHERE course_code=v) THEN
    RAISE EXCEPTION 'CHECK FAILED: lego content differs';
  END IF;
  IF EXISTS (SELECT seed_number, lego_index, position, known_text, target_text, phrase_role, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=s
             EXCEPT SELECT seed_number, lego_index, position, known_text, target_text, phrase_role, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=v) THEN
    RAISE EXCEPTION 'CHECK FAILED: phrase content differs';
  END IF;
  SELECT count(*) INTO b FROM course_seeds WHERE course_code=v AND seed_number BETWEEN 335 AND 668 AND target_text<>'';
  SELECT count(*) INTO a FROM course_seeds WHERE course_code=s AND seed_number BETWEEN 335 AND 668 AND target_text<>'';
  IF a<>b THEN RAISE EXCEPTION 'CHECK FAILED: #740 drafts with text % vs %', a, b; END IF;
  IF EXISTS (SELECT 1 FROM canonical_list_assignments WHERE course_code=v) THEN RAISE EXCEPTION 'CHECK FAILED: canonical list assigned'; END IF;
  IF (SELECT visibility FROM courses WHERE course_code=v) <> 'hidden' THEN RAISE EXCEPTION 'CHECK FAILED: not hidden'; END IF;
  IF EXISTS (SELECT 1 FROM course_audio WHERE course_code=v) THEN RAISE EXCEPTION 'CHECK FAILED: audio rows on sandbox'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;

SELECT 'v2 seeds' k, count(*) FROM course_seeds WHERE course_code='cym_sv2_for_eng'
UNION ALL SELECT 'v2 seeds 335-668 w/ text', count(*) FROM course_seeds WHERE course_code='cym_sv2_for_eng' AND seed_number BETWEEN 335 AND 668 AND target_text<>''
UNION ALL SELECT 'v2 legos', count(*) FROM course_legos WHERE course_code='cym_sv2_for_eng'
UNION ALL SELECT 'v2 phrases', count(*) FROM course_practice_phrases WHERE course_code='cym_sv2_for_eng'
UNION ALL SELECT 'v2 intros', count(*) FROM lego_introductions WHERE course_code='cym_sv2_for_eng'
UNION ALL SELECT 'v2 duration_ms differing from source (trigger refresh)', count(*) FROM course_practice_phrases v JOIN course_practice_phrases s
  ON s.id = 'cym_s_for_eng:' || substr(v.id, length('cym_sv2_for_eng:')+1)
  WHERE v.course_code='cym_sv2_for_eng' AND (v.target1_duration_ms IS DISTINCT FROM s.target1_duration_ms OR v.target2_duration_ms IS DISTINCT FROM s.target2_duration_ms);
SELECT 'finishing with' k, :'finish' v;
:finish;
