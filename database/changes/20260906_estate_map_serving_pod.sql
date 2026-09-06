-- 20260906_estate_map_serving_pod.sql
--
-- estate_map() decided "does this course have a pod at all?" with the literal
-- WHERE p.slug = 'pod-0'. Tom's 1-based ruling of 2026-08-22 moved 22 courses
-- onto `pod-1`, so measured against the live database on 2026-09-06 the estate
-- map — the estate's declared source of truth (CLAUDE.md) — was reporting:
--
--   * pod_0: {exists:false} for all 22 pod-1 courses, hrv_for_eng and
--     zho_for_eng among them, both of which carry real learner progress
--     (269 and 389 rows in learner_pod_state);
--   * those same 22 live pods counted as `staging_pods`, i.e. as parked
--     content, because staging was `slug <> 'pod-0'`;
--   * pods_by_language built from 6,631 of the estate's 11,748 serving pod
--     lines — a 44% undercount of the number Tom's 2026-08-13 per-language
--     ruling is costed from.
--
-- A hardcoded slug standing in for a derivation is the recurring bug shape on
-- this estate; the reader half of it was taken out of /api/pod-scripts on
-- 2026-09-03 (86c2ecdbe) and this is the same fault in SQL.
--
-- THE RULE NOW LIVES IN ONE PLACE IN THE DATABASE: the view
-- public.serving_pod. Same slug list and same preference order as
-- src/lib/servingPod.js, tools/pods/serving-slug.cjs, api/pod-content.js and
-- the learner's packages/player-vue/src/composables/servedPod.ts, so a future
-- pod-2 is one view, not a grep.
--
-- visibility is deliberately NOT consulted — Tom, 2026-09-02: "do not let
-- visibility stand in for a guard anywhere." A held pod on a serving slug is
-- still the pod that course has, and the estate map is a back-office read.
--
-- NO LEARNER PROGRESS IS TOUCHED. This is a read-only view plus a STABLE
-- function; learner_pod_state is not referenced anywhere in it.
--
-- Rollback: database/changes/20260906_estate_map_serving_pod.ROLLBACK.sql

-- ---------------------------------------------------------------------------
-- The one SQL statement of "which pod does this course actually serve?".
-- An explicit allowlist in preference order, never a prefix match: an archived
-- `pod-0-retired-…` keeps pod_type='core' through the rename and must never win.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.serving_pod AS
SELECT DISTINCT ON (p.course_code)
  p.course_code,
  p.slug,
  p.id AS pod_id
FROM public.listening_pods p
WHERE p.slug IN ('pod-1', 'pod-0')
  AND (p.pod_type IS NULL OR p.pod_type = 'core')
ORDER BY p.course_code, array_position(ARRAY['pod-1', 'pod-0'], p.slug);

COMMENT ON VIEW public.serving_pod IS
  'Which listening pod each course serves, resolved — pod-1 first, else pod-0, core pods only. '
  'The SQL half of the rule that lives in src/lib/servingPod.js and player-vue servedPod.ts. '
  'Never hardcode a slug against listening_pods; join this.';

GRANT SELECT ON public.serving_pod TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- estate_map(), rebuilt on that view. Everything outside the pod CTEs is
-- unchanged from the live definition dumped on 2026-09-06.
-- ---------------------------------------------------------------------------
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
served AS (
  -- The pod each course actually SERVES, as the learner path resolves it:
  -- pod-1 first, else pod-0 (public.serving_pod). It used to be the literal
  -- `pod-0`, which reported the 22 courses moved across by Tom's 1-based ruling
  -- of 2026-08-22 as having no pod at all. Sibling slugs (pod-0-unrecorded,
  -- pod-0-gated-*, every retired pod) are invisible to learners and are still
  -- counted separately, as staging pods.
  SELECT
    p.course_code,
    p.id                                                            AS pod_id,
    sp.slug                                                         AS slug,
    count(s.id)                                                     AS slots,
    count(s.target_audio_id)                                        AS target_linked,
    count(s.known_audio_id)                                         AS known_linked,
    count(*) FILTER (WHERE s.target_text_draft)                     AS draft_lines,
    count(*) FILTER (WHERE s.known_audio_id
                       IN (SELECT id FROM dead_stubs))              AS known_dead_stubs,
    count(*) FILTER (WHERE s.target_audio_id
                       IN (SELECT id FROM dead_stubs))              AS target_dead_stubs
  FROM public.serving_pod sp
  JOIN public.listening_pods p ON p.id = sp.pod_id
  LEFT JOIN public.listening_pod_sentences s ON s.pod_id = p.id
  GROUP BY 1, 2, 3
),
staging_pods AS (
  -- Every pod that is NOT the one this course serves: the working copies, the
  -- gated ones, the retired ones — and, before this was derived, 22 live pod-1s.
  SELECT p.course_code, count(*) AS staging_pods
  FROM public.listening_pods p
  LEFT JOIN public.serving_pod sp ON sp.pod_id = p.id
  WHERE sp.pod_id IS NULL
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
-- Both sides of every SERVED pod line, keyed by the language that side is IN: target
-- text by the course's target_lang, known text by its known_lang. Case-folded and
-- trimmed, which is the same identity two courses' copies of a line share.
-- ---------------------------------------------------------------------------
pod_lines AS (
  SELECT c.target_lang AS lang, 'target'::text AS side,
         lower(btrim(s.target_text)) AS line, p.course_code
  FROM public.serving_pod p
  JOIN public.listening_pod_sentences s ON s.pod_id = p.pod_id
  JOIN public.courses c ON c.course_code = p.course_code
  WHERE btrim(s.target_text) <> ''
  UNION ALL
  SELECT c.known_lang, 'known',
         lower(btrim(s.known_text)), p.course_code
  FROM public.serving_pod p
  JOIN public.listening_pod_sentences s ON s.pod_id = p.pod_id
  JOIN public.courses c ON c.course_code = p.course_code
  WHERE btrim(s.known_text) <> ''
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
      -- course's pod", and the WRONG unit for costing a render. See pods_by_language.
      -- `pod_0` is the ORIGINAL KEY AND STILL LIVE — every reader of it keeps
      -- working and now gets the right answer for a pod-1 course instead of
      -- {exists:false}. `serving_pod` is the same object under the name that is
      -- true after Tom's 1-based ruling, and it alone carries the slug.
      'serving_pod', CASE WHEN p.pod_id IS NULL THEN jsonb_build_object('exists', false)
        ELSE jsonb_build_object(
          'exists',            true,
          'pod_id',            p.pod_id,
          'slug',              p.slug,
          'slots',             p.slots,
          'target_linked',     p.target_linked,
          'target_empty',      p.slots - p.target_linked,
          'target_dead_stubs', p.target_dead_stubs,
          'known_linked',      p.known_linked,
          'known_empty',       p.slots - p.known_linked,
          'known_dead_stubs',  p.known_dead_stubs,
          'draft_lines',       p.draft_lines
        ) END,
      'pod_0', CASE WHEN p.pod_id IS NULL THEN jsonb_build_object('exists', false)
        ELSE jsonb_build_object(
          'exists',            true,
          'pod_id',            p.pod_id,
          'slug',              p.slug,
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
    LEFT JOIN served        p  ON p.course_code  = c.course_code
    LEFT JOIN staging_pods  sp ON sp.course_code = c.course_code
    LEFT JOIN pass_requests pr ON pr.course_code = c.course_code
  ) q
),
pods_json AS (
  SELECT jsonb_agg(jsonb_build_object(
    'lang',                      lang,
    'courses_with_serving_pod',  courses,
    'courses_with_pod_0',        courses,   -- original key, kept live

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
