-- ROLLBACK for 20260906_estate_map_serving_pod.sql
--
-- Restores estate_map() to the definition live on 2026-09-06 — the one that
-- hardcoded WHERE p.slug = 'pod-0' — and drops the public.serving_pod view.
--
-- Restoring this REINSTATES the defect: 22 pod-1 courses report
-- pod_0:{exists:false}, their live pods are counted as staging, and
-- pods_by_language drops back to 6,631 of 11,748 serving lines. Only run it if
-- the new function is itself wrong.
--
-- Nothing here touches learner data either way.

CREATE OR REPLACE FUNCTION public.estate_map()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
WITH voice_rows AS (
  -- One row per (course, voice, origin). The unit of "voices of record": the voice
  -- ids actually carrying clips, read from course_audio and never from
  -- listening_pods.speakers — the stored cast and the real clip voices are known to
  -- diverge badly (16 of 119 spa pod clips on the stored cast; 0 of 110 on cym_n).
  SELECT
    ca.course_code,
    ca.voice_id,
    ca.origin,
    count(*) AS clips
  FROM public.course_audio ca
  GROUP BY 1, 2, 3
),
veracity AS (
  -- Two separate scans on purpose: each arm matches one of the existing partial
  -- indexes (WHERE veracity_pass IS TRUE / IS FALSE). A single `IS NOT NULL`
  -- predicate matches neither and falls back to a full scan of course_audio.
  SELECT course_code, count(*) AS veracity_passed, 0::bigint AS veracity_failed
  FROM public.course_audio WHERE veracity_pass IS TRUE GROUP BY 1
  UNION ALL
  SELECT course_code, 0::bigint, count(*)
  FROM public.course_audio WHERE veracity_pass IS FALSE GROUP BY 1
),
veracity_agg AS (
  SELECT course_code, sum(veracity_passed) AS veracity_passed,
         sum(veracity_failed) AS veracity_failed
  FROM veracity GROUP BY 1
),
audio AS (
  SELECT
    course_code,
    sum(clips)                                 AS clips,
    sum(clips) FILTER (WHERE origin = 'tts')   AS tts_clips,
    sum(clips) FILTER (WHERE origin = 'human') AS human_clips,
    jsonb_agg(
      jsonb_build_object('voice_id', voice_id, 'origin', origin, 'clips', clips)
      ORDER BY clips DESC
    )                                          AS voices_of_record
  FROM voice_rows
  GROUP BY 1
),
-- Linked-but-dead clips: the 834-byte stubs on the Welsh English track from the bad
-- write of 2026-06-15 are linked rows pointing at bytes that will not play. There
-- are 26 such rows in the whole estate, so the cheap question is "which ids are
-- dead", asked once against a partial index — never "how big is this clip", asked
-- once per pod sentence against a 1.9GB heap.
dead_stubs AS (
  SELECT id FROM public.course_audio WHERE file_size_bytes < 2000
),
pod0 AS (
  -- pod-0 as the LEARNER sees it. player-vue reads the exact id `<course>:pod-0`
  -- (useListeningPods.ts), so sibling slugs (pod-0-unrecorded, pod-0-gated-*) are
  -- invisible to learners and are counted separately as staging pods, not as pod 0.
  SELECT
    p.course_code,
    p.id                                                            AS pod_id,
    count(s.id)                                                     AS slots,
    count(s.target_audio_id)                                        AS target_linked,
    count(s.known_audio_id)                                         AS known_linked,
    count(*) FILTER (WHERE s.target_text_draft)                     AS draft_lines,
    count(*) FILTER (WHERE s.known_audio_id
                       IN (SELECT id FROM dead_stubs))              AS known_dead_stubs,
    count(*) FILTER (WHERE s.target_audio_id
                       IN (SELECT id FROM dead_stubs))              AS target_dead_stubs
  FROM public.listening_pods p
  LEFT JOIN public.listening_pod_sentences s ON s.pod_id = p.id
  WHERE p.slug = 'pod-0'
  GROUP BY 1, 2
),
staging_pods AS (
  SELECT course_code, count(*) AS staging_pods
  FROM public.listening_pods
  WHERE slug <> 'pod-0'
  GROUP BY 1
),
pass_requests AS (
  SELECT course_code, count(*) AS pending_audio_passes, min(created_at) AS oldest_pending
  FROM public.audio_pass_requests
  WHERE status = 'pending'
  GROUP BY 1
),
-- ---------------------------------------------------------------------------
-- PODS PER LANGUAGE — the unit Tom's 2026-08-13 ruling puts pods in.
-- Both sides of every pod-0 line, keyed by the language that side is IN: target
-- text by the course's target_lang, known text by its known_lang. Case-folded and
-- trimmed, which is the same identity two courses' copies of a line share.
-- ---------------------------------------------------------------------------
pod_lines AS (
  SELECT c.target_lang AS lang, 'target'::text AS side,
         lower(btrim(s.target_text)) AS line, p.course_code
  FROM public.listening_pods p
  JOIN public.listening_pod_sentences s ON s.pod_id = p.id
  JOIN public.courses c ON c.course_code = p.course_code
  WHERE p.slug = 'pod-0' AND btrim(s.target_text) <> ''
  UNION ALL
  SELECT c.known_lang, 'known',
         lower(btrim(s.known_text)), p.course_code
  FROM public.listening_pods p
  JOIN public.listening_pod_sentences s ON s.pod_id = p.id
  JOIN public.courses c ON c.course_code = p.course_code
  WHERE p.slug = 'pod-0' AND btrim(s.known_text) <> ''
),
pod_lang_side AS (
  SELECT lang, side,
         count(DISTINCT course_code) AS courses,
         count(*)                    AS slots_per_course_counting,
         count(DISTINCT line)        AS distinct_lines
  FROM pod_lines
  GROUP BY 1, 2
),
pod_lang AS (
  SELECT
    lang,
    max(courses)                                                  AS courses,
    sum(slots_per_course_counting)                                AS slots_per_course_counting,
    sum(distinct_lines)                                           AS distinct_lines_per_language,
    jsonb_object_agg(side, jsonb_build_object(
      'slots_per_course_counting', slots_per_course_counting,
      'distinct_lines',            distinct_lines
    ))                                                            AS by_side
  FROM pod_lang_side
  GROUP BY 1
),
courses_json AS (
  SELECT jsonb_agg(row ORDER BY row->>'course_code') AS courses
  FROM (
    SELECT jsonb_build_object(
      'course_code',       c.course_code,
      'display_name',      c.display_name,
      'known_lang',        c.known_lang,
      'target_lang',       c.target_lang,
      -- Tom, 2026-08-13: "Live + Beta = released in the DB status." The raw values sit
      -- next to the derived boolean so nobody has to trust the arithmetic.
      'released',          (c.new_app_status IN ('live', 'beta')),
      'new_app_status',    c.new_app_status,
      'legacy_app_status', c.legacy_app_status,
      'build_status',      c.status,
      'seed_count',        c.seed_count,
      'audio', jsonb_build_object(
        'clips',            coalesce(a.clips, 0),
        'tts_clips',        coalesce(a.tts_clips, 0),
        'human_clips',      coalesce(a.human_clips, 0),
        -- NOT a quality signal, and NOT a coverage target. See the `veracity_checked`
        -- and `render_qa_policy` entries in the endpoint's semantics block: the
        -- standing QA model is graduated sampling, so a low figure here is the
        -- policy working, not a backlog.
        'veracity_checked', coalesce(v.veracity_passed, 0) + coalesce(v.veracity_failed, 0),
        'veracity_failed',  coalesce(v.veracity_failed, 0),
        'voice_mode', CASE
          WHEN coalesce(a.clips, 0) = 0       THEN 'unknown'
          WHEN coalesce(a.human_clips, 0) = 0 THEN 'tts'
          WHEN coalesce(a.tts_clips, 0) = 0   THEN 'human'
          ELSE 'mixed'
        END
      ),
      'voices_of_record',  coalesce(a.voices_of_record, '[]'::jsonb),
      -- Per-course pod state: still the right unit for "can a learner play THIS
      -- course's pod 0", and the WRONG unit for costing a render. See pods_by_language.
      'pod_0', CASE WHEN p.pod_id IS NULL THEN jsonb_build_object('exists', false)
        ELSE jsonb_build_object(
          'exists',            true,
          'pod_id',            p.pod_id,
          'slots',             p.slots,
          'target_linked',     p.target_linked,
          'target_empty',      p.slots - p.target_linked,
          'target_dead_stubs', p.target_dead_stubs,
          'known_linked',      p.known_linked,
          'known_empty',       p.slots - p.known_linked,
          'known_dead_stubs',  p.known_dead_stubs,
          'draft_lines',       p.draft_lines
        ) END,
      'staging_pods',          coalesce(sp.staging_pods, 0),
      'pending_audio_passes',  coalesce(pr.pending_audio_passes, 0),
      'oldest_pending_audio_pass', pr.oldest_pending
    ) AS row
    FROM public.courses c
    LEFT JOIN audio         a  ON a.course_code  = c.course_code
    LEFT JOIN veracity_agg  v  ON v.course_code  = c.course_code
    LEFT JOIN pod0          p  ON p.course_code  = c.course_code
    LEFT JOIN staging_pods  sp ON sp.course_code = c.course_code
    LEFT JOIN pass_requests pr ON pr.course_code = c.course_code
  ) q
),
pods_json AS (
  SELECT jsonb_agg(jsonb_build_object(
    'lang',                      lang,
    'courses_with_pod_0',        courses,
    'slots_per_course_counting', slots_per_course_counting,
    'distinct_lines',            distinct_lines_per_language,
    'collapse_factor',           round(
      slots_per_course_counting::numeric
      / nullif(distinct_lines_per_language, 0), 2),
    'by_side',                   by_side
  ) ORDER BY slots_per_course_counting DESC) AS pods_by_language
  FROM pod_lang
)
SELECT jsonb_build_object(
  'courses',          coalesce((SELECT courses FROM courses_json), '[]'::jsonb),
  'pods_by_language', coalesce((SELECT pods_by_language FROM pods_json), '[]'::jsonb)
);
$function$;

DROP VIEW IF EXISTS public.serving_pod;
