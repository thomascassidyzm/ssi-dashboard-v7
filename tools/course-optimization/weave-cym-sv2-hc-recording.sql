-- Job #429 PART 2, SOUTH (Aran 2026-10-08 21:45Z): recording for the Hadau Creiddiol block of the South
-- sandbox cym_sv2_for_eng. NO audio is made: nothing is rendered, nothing calls TTS. Writes to
-- cym_sv2_for_eng ONLY; live South (cym_s_for_eng) is only READ, and its course row is never touched.
--   psql -v ON_ERROR_STOP=1 -f tools/course-optimization/weave-cym-sv2-hc-recording.sql
-- Undo: tools/course-optimization/weave-cym-sv2-hc-recording-undo.sql
--
-- 1. CAST: NOTHING TO COPY. Live South's voice_config has no `voices` block at all — only podCast (Dan,
--    Eleri) for its pods — so its seed sentences are in nobody's queue, and the queue can only cast a seed
--    slot to a language_recording_policy voice (all four Welsh policy voices are NORTHERN). Copying live
--    South's casting therefore changes nothing, and this script does not write voice_config.
-- 2. LIBRARY FIRST: a block seed, phrase or new-LEGO slot takes the clip live South already plays for the
--    identical words in the same role (seed, LEGO or phrase slot) — released South precedent. A seed slot
--    clip wins a tie, then the lowest id (stable).
BEGIN;

CREATE TABLE backup_cym_sv2_seed_audio_429 AS
  SELECT id, target1_audio_id, target2_audio_id, last_edit_event_id FROM course_seeds WHERE course_code = 'cym_sv2_for_eng';
CREATE TABLE backup_cym_sv2_hc_phrase_audio_429 AS
  SELECT id, target1_audio_id, target2_audio_id, last_edit_event_id FROM course_practice_phrases
  WHERE course_code = 'cym_sv2_for_eng' AND seed_number >= 1000;
CREATE TABLE backup_cym_sv2_hc_lego_audio_429 AS
  SELECT id, target1_audio_id, target2_audio_id, target1_duration_ms, target2_duration_ms, last_edit_event_id FROM course_legos
  WHERE course_code = 'cym_sv2_for_eng' AND seed_number >= 1000;
REVOKE ALL ON backup_cym_sv2_seed_audio_429, backup_cym_sv2_hc_phrase_audio_429, backup_cym_sv2_hc_lego_audio_429 FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, scope, detail)
VALUES ('cym_sv2_for_eng', 'tools:weave-cym-sv2-hc-recording.sql', 'link-audio', 'service', 'job-429-hc-recording',
        'job-429-hc-recording', false, '{"rows":"block seeds/phrases/LEGOs, sandbox only"}',
        '{"why":"Aran 2026-10-08 21:45Z: South as North — reuse existing recordings (library first); live South casts no target voice, so no cast copied"}')
RETURNING id AS ev \gset

CREATE TEMP TABLE south_in_use ON COMMIT DROP AS
SELECT DISTINCT x.role, normalize_text(x.t) AS k, a.id AS audio_id, x.src
FROM (
  SELECT 'target1' role, target_text t, target1_audio_id aid, 'seed' src FROM course_seeds WHERE course_code = 'cym_s_for_eng' AND status = 'released'
  UNION ALL SELECT 'target2', target_text, target2_audio_id, 'seed' FROM course_seeds WHERE course_code = 'cym_s_for_eng' AND status = 'released'
  UNION ALL SELECT 'target1', target_text, target1_audio_id, 'lego' FROM course_legos WHERE course_code = 'cym_s_for_eng'
  UNION ALL SELECT 'target2', target_text, target2_audio_id, 'lego' FROM course_legos WHERE course_code = 'cym_s_for_eng'
  UNION ALL SELECT 'target1', target_text, target1_audio_id, 'phrase' FROM course_practice_phrases WHERE course_code = 'cym_s_for_eng'
  UNION ALL SELECT 'target2', target_text, target2_audio_id, 'phrase' FROM course_practice_phrases WHERE course_code = 'cym_s_for_eng'
) x JOIN course_audio a ON a.id = x.aid;

CREATE TEMP TABLE pick ON COMMIT DROP AS
SELECT DISTINCT ON (role, k) role, k, audio_id, src FROM south_in_use ORDER BY role, k, (src = 'seed') DESC, audio_id;

UPDATE course_seeds s SET target1_audio_id = p.audio_id, last_edit_event_id = :'ev'
FROM pick p WHERE s.course_code = 'cym_sv2_for_eng' AND s.seed_number >= 1000 AND s.target1_audio_id IS NULL
  AND p.role = 'target1' AND p.src = 'seed' AND p.k = normalize_text(s.target_text);
UPDATE course_seeds s SET target2_audio_id = p.audio_id, last_edit_event_id = :'ev'
FROM pick p WHERE s.course_code = 'cym_sv2_for_eng' AND s.seed_number >= 1000 AND s.target2_audio_id IS NULL
  AND p.role = 'target2' AND p.src = 'seed' AND p.k = normalize_text(s.target_text);
UPDATE course_practice_phrases f SET target1_audio_id = p.audio_id, last_edit_event_id = :'ev'
FROM pick p WHERE f.course_code = 'cym_sv2_for_eng' AND f.seed_number >= 1000 AND f.target1_audio_id IS NULL
  AND p.role = 'target1' AND p.k = normalize_text(f.target_text);
UPDATE course_practice_phrases f SET target2_audio_id = p.audio_id, last_edit_event_id = :'ev'
FROM pick p WHERE f.course_code = 'cym_sv2_for_eng' AND f.seed_number >= 1000 AND f.target2_audio_id IS NULL
  AND p.role = 'target2' AND p.k = normalize_text(f.target_text);
UPDATE course_legos l SET target1_audio_id = p.audio_id, last_edit_event_id = :'ev'
FROM pick p WHERE l.course_code = 'cym_sv2_for_eng' AND l.seed_number >= 1000 AND l.is_new AND l.target1_audio_id IS NULL
  AND p.role = 'target1' AND p.k = normalize_text(l.target_text);
UPDATE course_legos l SET target2_audio_id = p.audio_id, last_edit_event_id = :'ev'
FROM pick p WHERE l.course_code = 'cym_sv2_for_eng' AND l.seed_number >= 1000 AND l.is_new AND l.target2_audio_id IS NULL
  AND p.role = 'target2' AND p.k = normalize_text(l.target_text);

SELECT 'seeds' what, count(*) n, count(target1_audio_id) t1, count(target2_audio_id) t2 FROM course_seeds WHERE course_code = 'cym_sv2_for_eng' AND seed_number >= 1000
UNION ALL SELECT 'phrases', count(*), count(target1_audio_id), count(target2_audio_id) FROM course_practice_phrases WHERE course_code = 'cym_sv2_for_eng' AND seed_number >= 1000
UNION ALL SELECT 'new legos', count(*), count(target1_audio_id), count(target2_audio_id) FROM course_legos WHERE course_code = 'cym_sv2_for_eng' AND seed_number >= 1000 AND is_new;

COMMIT;
