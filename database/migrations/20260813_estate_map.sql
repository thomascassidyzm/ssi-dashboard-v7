-- 20260813_estate_map.sql
--
-- The DERIVED estate map. Backs GET /api/estate-map on the Production API.
--
-- WHY THIS IS A FUNCTION AND NOT A VIEW, A TABLE OR A DOCUMENT.
-- Tom's ruling, 2026-08-13: "Code >> Doctrine - we basically moved to deprecate
-- doctrine docs as much as possible because of our speed of iteration."  The estate
-- map is the same principle applied to itself: it is a query, computed fresh on every
-- read, so it cannot rot.  There is deliberately NO materialised view, no refresh
-- job, no cron, and no cached snapshot anywhere in this path.
--
-- The one thing that IS stored is the covering index below: without it the per-voice
-- aggregate over ~2.5M course_audio rows is a ~9.6s sequential scan; with it the whole
-- estate aggregates in ~0.7s, which is the difference between an endpoint a worker
-- reads and one they infer around instead.
--
-- Read-only against content: this migration creates one index and one STABLE
-- function.  It changes no course data, no audio, no status, no classification.
--
-- Rollback: DROP FUNCTION public.estate_map(); DROP INDEX CONCURRENTLY idx_course_audio_estate_map;

-- Covering index for the per-course, per-voice aggregate. (course_code, voice_id,
-- origin) is exactly the GROUP BY key, so this is an index-only scan.
--
-- Deliberately NOT `INCLUDE (veracity_pass)`: that also works and shaves the query
-- from ~7s to ~1.4s, but it defeats btree suffix dedup and the index goes 18MB ->
-- 164MB, which is write amplification on every clip this estate ever renders. The
-- veracity counts come instead from the two existing partial indexes
-- (idx_course_audio_veracity_passed / _failed), which are tiny because only ~0.06%
-- of clips have ever been checked.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_audio_estate_map
  ON public.course_audio (course_code, voice_id, origin);

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
    count(*)                                              AS clips
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
    sum(clips)                                              AS clips,
    sum(clips) FILTER (WHERE origin = 'tts')                AS tts_clips,
    sum(clips) FILTER (WHERE origin = 'human')              AS human_clips,
    jsonb_agg(
      jsonb_build_object('voice_id', voice_id, 'origin', origin, 'clips', clips)
      ORDER BY clips DESC
    )                                                       AS voices_of_record
  FROM voice_rows
  GROUP BY 1
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
    -- Linked-but-dead clips: the 23 x 834-byte stubs on the Welsh English track from
    -- the bad write of 2026-06-15 are linked rows pointing at bytes that will not play.
    count(*) FILTER (WHERE kca.file_size_bytes IS NOT NULL
                       AND kca.file_size_bytes < 2000)              AS known_dead_stubs,
    count(*) FILTER (WHERE tca.file_size_bytes IS NOT NULL
                       AND tca.file_size_bytes < 2000)              AS target_dead_stubs
  FROM public.listening_pods p
  LEFT JOIN public.listening_pod_sentences s ON s.pod_id = p.id
  LEFT JOIN public.course_audio kca         ON kca.id = s.known_audio_id
  LEFT JOIN public.course_audio tca         ON tca.id = s.target_audio_id
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
)
SELECT jsonb_agg(row ORDER BY row->>'course_code')
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
      -- NOT a quality signal. See the `veracity_pass` entry in the endpoint's
      -- semantics block: this is coverage of an unapplied QA process.
      'veracity_checked', coalesce(v.veracity_passed, 0) + coalesce(v.veracity_failed, 0),
      'veracity_failed',  coalesce(v.veracity_failed, 0),
      'voice_mode', CASE
        WHEN coalesce(a.clips, 0) = 0                                    THEN 'unknown'
        WHEN coalesce(a.human_clips, 0) = 0                              THEN 'tts'
        WHEN coalesce(a.tts_clips, 0) = 0                                THEN 'human'
        ELSE 'mixed'
      END
    ),
    'voices_of_record',  coalesce(a.voices_of_record, '[]'::jsonb),
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
) q;
$function$;
