-- cs #950: BEFORE/AFTER numbers for one LEGO text edit on ita_for_eng. Everything that writes is inside
-- BEGIN..ROLLBACK, so nothing persists. Short lock wait: backs off rather than queue behind learners.
\set ON_ERROR_STOP 1
SET statement_timeout = '180s';
SET lock_timeout = '3s';
-- A real mid-course ita_for_eng LEGO with live target1 + target2 links (deterministic pick).
SELECT l.id AS lego_uuid, l.lego_id, l.target_text, l.target1_audio_id AS clip1, l.target2_audio_id AS clip2
  FROM public.course_legos l
  JOIN public.course_audio a1 ON a1.id = l.target1_audio_id
  JOIN public.course_audio a2 ON a2.id = l.target2_audio_id
 WHERE l.course_code = 'ita_for_eng'
 ORDER BY l.seed_number, l.lego_id OFFSET 300 LIMIT 1 \gset
\echo measured LEGO :lego_id target_text=:'target_text' clip1=:clip1 clip2=:clip2
\echo (Popty dry-run sample: the 10 LEGOs from here on)
SELECT l.lego_id, l.target_text FROM public.course_legos l
 WHERE l.course_code = 'ita_for_eng' AND l.target1_audio_id IS NOT NULL
 ORDER BY l.seed_number, l.lego_id OFFSET 300 LIMIT 10;
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'course_audio'
   AND indexname IN ('idx_course_audio_text_lookup','idx_course_audio_course_role_normtext','idx_course_audio_role');
\timing on
\echo == 1. the lookup body, literal values (custom plan), miss case = the worst case
EXPLAIN (ANALYZE, BUFFERS)
SELECT a.id FROM public.course_audio a JOIN public.course_audio prev ON prev.id = :'clip1'::uuid
 WHERE a.course_code = 'ita_for_eng' AND a.role = 'target1' AND a.s3_key IS NOT NULL
   AND (a.text_normalized = public.normalize_text(:'target_text' || ' prova950')
        OR public.normalize_text(a.text) = public.normalize_text(:'target_text' || ' prova950'))
   AND public.audio_canon_voice(a.voice_id) = public.audio_canon_voice(prev.voice_id)
   AND a.language IS NOT DISTINCT FROM prev.language
 ORDER BY (a.origin = 'human') DESC, a.created_at DESC, a.id::text DESC LIMIT 1;
\echo == 2. the same body as a generic plan (how a parameterised function body can be planned)
PREPARE q950(text, text, text, uuid) AS
SELECT a.id FROM public.course_audio a JOIN public.course_audio prev ON prev.id = $4
 WHERE a.course_code = $1 AND a.role = $3 AND a.s3_key IS NOT NULL
   AND (a.text_normalized = public.normalize_text($2) OR public.normalize_text(a.text) = public.normalize_text($2))
   AND public.audio_canon_voice(a.voice_id) = public.audio_canon_voice(prev.voice_id)
   AND a.language IS NOT DISTINCT FROM prev.language
 ORDER BY (a.origin = 'human') DESC, a.created_at DESC, a.id::text DESC LIMIT 1;
SET plan_cache_mode = force_generic_plan;
EXPLAIN (ANALYZE, BUFFERS) EXECUTE q950('ita_for_eng', :'target_text' || ' prova950', 'target1', :'clip1'::uuid);
RESET plan_cache_mode;
DEALLOCATE q950;
\echo == 3. the function itself, as the trigger calls it (twice: first may be cold)
SELECT public.audio_id_for_text_same_voice('ita_for_eng', :'target_text' || ' prova950', 'target1', :'clip1'::uuid) AS miss_t1;
SELECT public.audio_id_for_text_same_voice('ita_for_eng', :'target_text' || ' prova950', 'target2', :'clip2'::uuid) AS miss_t2;
\echo == 4. the plan the function body really gets (auto_explain to this client; skipped if not loadable)
\set ON_ERROR_STOP 0
LOAD 'auto_explain';
SET auto_explain.log_min_duration = 0;
SET auto_explain.log_analyze = on;
SET auto_explain.log_nested_statements = on;
SET auto_explain.log_level = 'notice';
SET client_min_messages = 'notice';
SELECT public.audio_id_for_text_same_voice('ita_for_eng', :'target_text' || ' prova950', 'target1', :'clip1'::uuid) AS miss_t1_explained;
SET auto_explain.log_min_duration = -1;
\set ON_ERROR_STOP 1
\echo == 5. one real LEGO text edit, rolled back: per-trigger times (run twice: cold, warm)
BEGIN;
EXPLAIN (ANALYZE, BUFFERS) UPDATE public.course_legos SET target_text = target_text || ' prova950' WHERE id = :'lego_uuid';
ROLLBACK;
BEGIN;
EXPLAIN (ANALYZE, BUFFERS) UPDATE public.course_legos SET target_text = target_text || ' prova950' WHERE id = :'lego_uuid';
ROLLBACK;
\echo == 6. the same edit as a plain UPDATE, rolled back (wall time as a writer sees it)
BEGIN;
UPDATE public.course_legos SET target_text = target_text || ' prova950' WHERE id = :'lego_uuid'
 RETURNING lego_id, target1_audio_id, target2_audio_id, presentation_audio_id;
ROLLBACK;
