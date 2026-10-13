-- Job #429 PART 2 (Aran 2026-10-08): put the Hadau Creiddiol block of the North sandbox
-- cym_nv2_for_eng in front of its human recordists, reusing every recording that already exists.
-- NO audio is made here: nothing is rendered, nothing calls TTS. Touches cym_nv2_for_eng ONLY.
--   psql -v ON_ERROR_STOP=1 -f tools/course-optimization/weave-cym-nv2-hc-recording.sql
-- Undo: tools/course-optimization/weave-cym-nv2-hc-recording-undo.sql
--
-- 1. CAST, copied from live North. The recordist queue (services/voice-engine/recordist-queue.cjs)
--    serves a course's seed sentences to whoever the course casts in voice_config.voices.target1 /
--    target2, and to nobody when a slot is not cast. Live cym_n_for_eng casts target1 = Catrin
--    (human_catrinlliar_cym_n) and target2 = Aran (human_aran_cym_n); the sandbox cast nobody, so
--    its seeds were in nobody's queue. Copying the two slots puts the sandbox's released seeds in
--    Catrin's and Aran's queues. Old seeds collapse with live North's identical lines (the queue keys
--    a line by voice + role + text), so only genuinely new sentences add work.
-- 2. LIBRARY FIRST, SEEDS. A block seed slot takes a clip only when that clip is ALREADY the cast
--    person's take of the identical sentence, linked in live North's own seed slot (a take in use,
--    never a rejected one). That is what the queue counts as "recorded", so the line never appears.
-- 3. LIBRARY FIRST, PHRASES AND LEGOs. A block phrase or new LEGO slot takes the clip live North
--    already plays for the identical words in the same role (seed, LEGO or phrase slot) — released
--    North precedent: its phrases play those same clips. The cast person's own take wins a tie.
BEGIN;

CREATE TABLE backup_cym_nv2_course_429 AS SELECT * FROM courses WHERE course_code = 'cym_nv2_for_eng';
CREATE TABLE backup_cym_nv2_seed_audio_429 AS
  SELECT id, target1_audio_id, target2_audio_id, last_edit_event_id FROM course_seeds WHERE course_code = 'cym_nv2_for_eng';
CREATE TABLE backup_cym_nv2_hc_phrase_audio_429 AS
  SELECT id, target1_audio_id, target2_audio_id, last_edit_event_id FROM course_practice_phrases
  WHERE course_code = 'cym_nv2_for_eng' AND seed_number >= 1000;
CREATE TABLE backup_cym_nv2_hc_lego_audio_429 AS
  SELECT id, target1_audio_id, target2_audio_id, target1_duration_ms, target2_duration_ms, last_edit_event_id FROM course_legos
  WHERE course_code = 'cym_nv2_for_eng' AND seed_number >= 1000;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, scope, detail)
VALUES ('cym_nv2_for_eng', 'tools:weave-cym-nv2-hc-recording.sql', 'link-audio', 'service', 'job-429-hc-recording',
        'job-429-hc-recording', false, '{"rows":"block seeds/phrases/LEGOs, sandbox only"}',
        '{"why":"Aran 2026-10-08: reuse existing recordings (library first), cast target1/target2 as live North"}')
RETURNING id AS ev \gset

-- 1. cast
UPDATE courses c SET voice_config = jsonb_set(jsonb_set(c.voice_config,
         '{voices,target1}', n.voice_config->'voices'->'target1'),
         '{voices,target2}', n.voice_config->'voices'->'target2')
FROM courses n
WHERE c.course_code = 'cym_nv2_for_eng' AND n.course_code = 'cym_n_for_eng'
  AND n.voice_config->'voices'->'target1'->>'voiceId' = 'human_catrinlliar_cym_n'
  AND n.voice_config->'voices'->'target2'->>'voiceId' = 'human_aran_cym_n';

-- Clips live North plays, by role and normalised words, with whose voice they are.
CREATE TEMP TABLE north_in_use ON COMMIT DROP AS
SELECT DISTINCT x.role, normalize_text(x.t) AS k, a.id AS audio_id, a.voice_id, x.src
FROM (
  SELECT 'target1' role, target_text t, target1_audio_id aid, 'seed' src FROM course_seeds WHERE course_code = 'cym_n_for_eng' AND status = 'released'
  UNION ALL SELECT 'target2', target_text, target2_audio_id, 'seed' FROM course_seeds WHERE course_code = 'cym_n_for_eng' AND status = 'released'
  UNION ALL SELECT 'target1', target_text, target1_audio_id, 'lego' FROM course_legos WHERE course_code = 'cym_n_for_eng'
  UNION ALL SELECT 'target2', target_text, target2_audio_id, 'lego' FROM course_legos WHERE course_code = 'cym_n_for_eng'
  UNION ALL SELECT 'target1', target_text, target1_audio_id, 'phrase' FROM course_practice_phrases WHERE course_code = 'cym_n_for_eng'
  UNION ALL SELECT 'target2', target_text, target2_audio_id, 'phrase' FROM course_practice_phrases WHERE course_code = 'cym_n_for_eng'
) x JOIN course_audio a ON a.id = x.aid;

CREATE TEMP TABLE cast_voice ON COMMIT DROP AS
SELECT * FROM (VALUES ('target1', ARRAY['human_catrinlliar_cym_n','human_catrinv2_cym_n']),
                      ('target2', ARRAY['human_aran_cym_n','human_aran_cym_n_2','human_aranv3_cym_n'])) v(role, voices);

-- One clip per (role, words): the cast person's own take first, then a seed slot, then by id (stable).
CREATE TEMP TABLE pick ON COMMIT DROP AS
SELECT DISTINCT ON (u.role, u.k) u.role, u.k, u.audio_id, (u.voice_id = ANY (c.voices)) AS cast_take, u.src
FROM north_in_use u JOIN cast_voice c USING (role)
ORDER BY u.role, u.k, (u.voice_id = ANY (c.voices)) DESC, (u.src = 'seed') DESC, u.audio_id;

-- 2. block seeds: the cast person's own in-use take of the identical sentence only
UPDATE course_seeds s SET target1_audio_id = p.audio_id, last_edit_event_id = :'ev'
FROM pick p WHERE s.course_code = 'cym_nv2_for_eng' AND s.seed_number >= 1000 AND s.target1_audio_id IS NULL
  AND p.role = 'target1' AND p.cast_take AND p.src = 'seed' AND p.k = normalize_text(s.target_text);
UPDATE course_seeds s SET target2_audio_id = p.audio_id, last_edit_event_id = :'ev'
FROM pick p WHERE s.course_code = 'cym_nv2_for_eng' AND s.seed_number >= 1000 AND s.target2_audio_id IS NULL
  AND p.role = 'target2' AND p.cast_take AND p.src = 'seed' AND p.k = normalize_text(s.target_text);

-- 3. block phrases and new LEGOs: whatever live North plays for the identical words in that role
UPDATE course_practice_phrases f SET target1_audio_id = p.audio_id, last_edit_event_id = :'ev'
FROM pick p WHERE f.course_code = 'cym_nv2_for_eng' AND f.seed_number >= 1000 AND f.target1_audio_id IS NULL
  AND p.role = 'target1' AND p.k = normalize_text(f.target_text);
UPDATE course_practice_phrases f SET target2_audio_id = p.audio_id, last_edit_event_id = :'ev'
FROM pick p WHERE f.course_code = 'cym_nv2_for_eng' AND f.seed_number >= 1000 AND f.target2_audio_id IS NULL
  AND p.role = 'target2' AND p.k = normalize_text(f.target_text);
UPDATE course_legos l SET target1_audio_id = p.audio_id, last_edit_event_id = :'ev'
FROM pick p WHERE l.course_code = 'cym_nv2_for_eng' AND l.seed_number >= 1000 AND l.is_new AND l.target1_audio_id IS NULL
  AND p.role = 'target1' AND p.k = normalize_text(l.target_text);
UPDATE course_legos l SET target2_audio_id = p.audio_id, last_edit_event_id = :'ev'
FROM pick p WHERE l.course_code = 'cym_nv2_for_eng' AND l.seed_number >= 1000 AND l.is_new AND l.target2_audio_id IS NULL
  AND p.role = 'target2' AND p.k = normalize_text(l.target_text);

-- What landed (printed for the run log).
SELECT 'cast' what, voice_config->'voices'->'target1'->>'voiceId' t1, voice_config->'voices'->'target2'->>'voiceId' t2
  FROM courses WHERE course_code = 'cym_nv2_for_eng';
SELECT 'seeds' what, count(*) n, count(target1_audio_id) t1, count(target2_audio_id) t2 FROM course_seeds WHERE course_code = 'cym_nv2_for_eng' AND seed_number >= 1000
UNION ALL SELECT 'phrases', count(*), count(target1_audio_id), count(target2_audio_id) FROM course_practice_phrases WHERE course_code = 'cym_nv2_for_eng' AND seed_number >= 1000
UNION ALL SELECT 'new legos', count(*), count(target1_audio_id), count(target2_audio_id) FROM course_legos WHERE course_code = 'cym_nv2_for_eng' AND seed_number >= 1000 AND is_new;

COMMIT;
