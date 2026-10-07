-- Job #796 (Tom 2026-10-07): clone cym_n_for_eng -> cym_nv2_for_eng as Aran's sandbox.
-- Audio is by POINTER only: seed/lego/phrase/intro rows reuse the live course_audio ids;
-- no course_audio row is copied, nothing is rendered. v2 casts NO human recordist
-- (voices.target1/target2 empty, podCast empty) and is hidden / not_available.
-- Rows are identified by course_code='cym_nv2_for_eng'; removal = clone-cym-n-v2-remove.sql.
-- Then moves the 363 machine drafts (job #740 event 64f0cfb3...) out of the live course:
-- live target_text back to '' (its 2026-10-06 state, per content_audit_log).
\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('app.v2','cym_nv2_for_eng',true);

INSERT INTO courses (course_code, display_name, known_lang, target_lang, voice_config, course_type, status,
  creator_email, translation_analysis, new_app_status, legacy_app_status, export_ready, quality_rules,
  content_version, visibility, pricing_tier, is_community, variant_label, dialect, known_dialect, seed_count)
SELECT 'cym_nv2_for_eng', 'Welsh (North) v2 — sandbox', known_lang, target_lang,
  jsonb_set(jsonb_set(jsonb_set(voice_config,
     '{voices,target1}', '{"name":"","voiceId":"","language":"","provider":"azure","settings":{"speed":1,"stability":0.5,"similarityBoost":0.75}}'),
     '{voices,target2}', '{"name":"","voiceId":"","language":"","provider":"azure","settings":{"speed":1,"stability":0.5,"similarityBoost":0.75}}'),
     '{podCast}', '{}'),
  course_type, 'draft', creator_email, translation_analysis, 'not_available', 'not_available', false, quality_rules,
  content_version, 'hidden', pricing_tier, false, variant_label, dialect, known_dialect, seed_count
FROM courses WHERE course_code='cym_n_for_eng';
UPDATE courses SET voice_config = jsonb_set(voice_config,'{courseCode}','"cym_nv2_for_eng"') WHERE course_code='cym_nv2_for_eng';

INSERT INTO course_seeds (course_code, seed_number, known_text, target_text, status, release_batch, version,
  known_audio_id, target1_audio_id, target2_audio_id, decomposed_at, approved_at, target_text_roman, flagged_at, last_edit_event_id)
SELECT 'cym_nv2_for_eng', seed_number, known_text, target_text, status, release_batch, version,
  known_audio_id, target1_audio_id, target2_audio_id, decomposed_at, approved_at, target_text_roman, flagged_at, last_edit_event_id
FROM course_seeds WHERE course_code='cym_n_for_eng';

INSERT INTO course_legos (course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status,
  release_batch, version, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms,
  target2_duration_ms, target_text_roman, target_lego_id, known_gloss_segments, last_edit_event_id)
SELECT 'cym_nv2_for_eng', seed_number, lego_index, type, is_new, known_text, target_text, components, status,
  release_batch, version, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms,
  target2_duration_ms, target_text_roman, target_lego_id, known_gloss_segments, last_edit_event_id
FROM course_legos WHERE course_code='cym_n_for_eng';

INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count,
  lego_count, difficulty, register, metadata, status, release_batch, version, target_syllable_count, phrase_role,
  connected_lego_ids, lego_position, known_audio_id, target1_audio_id, target2_audio_id, qa_checked, target1_duration_ms,
  target2_duration_ms, lego_id, target_text_roman, target_phrase_id, presentation_audio_id, introduce, decomposition,
  decomposition_course_version, display_tiling, display_tiling_version, known_gloss_segments, last_edit_event_id)
SELECT 'cym_nv2_for_eng:' || substr(id, length('cym_n_for_eng:')+1), 'cym_nv2_for_eng', seed_number, lego_index, position,
  known_text, target_text, word_count, lego_count, difficulty, register, metadata, status, release_batch, version,
  target_syllable_count, phrase_role, connected_lego_ids, lego_position, known_audio_id, target1_audio_id, target2_audio_id,
  qa_checked, target1_duration_ms, target2_duration_ms, lego_id, target_text_roman, target_phrase_id, presentation_audio_id,
  introduce, decomposition, decomposition_course_version, display_tiling, display_tiling_version, known_gloss_segments, last_edit_event_id
FROM course_practice_phrases WHERE course_code='cym_n_for_eng';

INSERT INTO lego_introductions (course_code, lego_id, audio_uuid, duration_ms, version, presentation_audio_id)
SELECT 'cym_nv2_for_eng', lego_id, audio_uuid, duration_ms, version, presentation_audio_id
FROM lego_introductions WHERE course_code='cym_n_for_eng';

-- Move the 363 machine drafts out of live (guarded: only rows still carrying the #740 draft event).
UPDATE course_seeds SET target_text='', last_edit_event_id=NULL
WHERE course_code='cym_n_for_eng' AND seed_number>=306 AND status='draft'
  AND last_edit_event_id='64f0cfb3-3150-486e-8b47-206bc5b6b474';

SELECT 'v2 seeds' k, count(*) FROM course_seeds WHERE course_code='cym_nv2_for_eng'
UNION ALL SELECT 'v2 legos', count(*) FROM course_legos WHERE course_code='cym_nv2_for_eng'
UNION ALL SELECT 'v2 phrases', count(*) FROM course_practice_phrases WHERE course_code='cym_nv2_for_eng'
UNION ALL SELECT 'v2 intros', count(*) FROM lego_introductions WHERE course_code='cym_nv2_for_eng'
UNION ALL SELECT 'live seeds', count(*) FROM course_seeds WHERE course_code='cym_n_for_eng'
UNION ALL SELECT 'live empty target', count(*) FROM course_seeds WHERE course_code='cym_n_for_eng' AND target_text=''
UNION ALL SELECT 'v2 drafts w/ text', count(*) FROM course_seeds WHERE course_code='cym_nv2_for_eng' AND status='draft' AND target_text<>'';
COMMIT;
