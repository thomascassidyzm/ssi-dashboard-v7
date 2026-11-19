-- cs #950: the re-link RESULTS for a fixed sample, printed sorted so a BEFORE run and an AFTER run can be
-- diffed: identical output = the index changed no result. Read-only except section 3 (BEGIN..ROLLBACK).
\set ON_ERROR_STOP 1
\pset footer off
SET statement_timeout = '20min';
SET lock_timeout = '3s';
\timing on
\echo == 1. LEGO edited to its neighbour's text (a real edit shape; hits and misses), target1 and target2
WITH s AS (
  SELECT l.lego_id, l.target1_audio_id AS c1, l.target2_audio_id AS c2,
         lead(l.target_text) OVER (ORDER BY l.seed_number, l.lego_id) AS other
    FROM public.course_legos l WHERE l.course_code = 'ita_for_eng'
)
SELECT lego_id, other,
       public.audio_id_for_text_same_voice('ita_for_eng', other, 'target1', c1) AS t1,
       public.audio_id_for_text_same_voice('ita_for_eng', other, 'target2', c2) AS t2
  FROM (SELECT * FROM s WHERE c1 IS NOT NULL AND c2 IS NOT NULL AND other IS NOT NULL
         ORDER BY lego_id OFFSET 200 LIMIT 12) x ORDER BY lego_id;
\echo == 2. clips whose STORED text_normalized is stale (only the indexed second disjunct can find them), re-cased + '?'
WITH st AS (
  SELECT a.id, a.text, a.role FROM public.course_audio a
   WHERE a.course_code = 'ita_for_eng' AND a.role IN ('known','target1','target2') AND a.s3_key IS NOT NULL
     AND a.text_normalized IS DISTINCT FROM public.normalize_text(a.text)
   ORDER BY a.id LIMIT 10
)
SELECT id, role, public.audio_id_for_text_same_voice('ita_for_eng', upper(text) || '?', role, id) AS found
  FROM st ORDER BY id;
\echo == 3. the trigger end to end on 3 LEGOs, rolled back: resulting links after a text edit
BEGIN;
WITH s AS (
  SELECT l.id, lead(l.target_text) OVER (ORDER BY l.seed_number, l.lego_id) AS other, l.lego_id,
         l.target1_audio_id, l.target2_audio_id
    FROM public.course_legos l WHERE l.course_code = 'ita_for_eng'
), pick AS (
  SELECT * FROM s WHERE target1_audio_id IS NOT NULL AND other IS NOT NULL ORDER BY lego_id OFFSET 200 LIMIT 3
)
UPDATE public.course_legos l SET target_text = p.other FROM pick p WHERE l.id = p.id
RETURNING l.lego_id, l.target1_audio_id, l.target2_audio_id, l.presentation_audio_id;
ROLLBACK;
