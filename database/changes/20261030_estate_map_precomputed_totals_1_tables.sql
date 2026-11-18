-- 20261030_estate_map_precomputed_totals_1_tables.sql  (step 1 of 2; step 2 = ..._2_swap.sql)
--
-- estate_map() re-grouped all of course_audio (~2.9M rows, 26 indexes, 4 GB box) on every call
-- and now exceeds the 8 s role statement limit, so GET /api/estate-map 500s. The role limit is
-- NOT raised (Tom). The course_audio-derived aggregates move into small summary tables that are
-- refreshed ONE COURSE PER STATEMENT (index-only group by (course_code, voice_id, origin) plus
-- the two partial veracity indexes), so no statement ever scans the whole table. Step 2 then
-- points estate_map() at the tables. Courses/pods/serving_pod joins stay live.
--
-- Step 1 is purely additive: new tables and functions; estate_map() is untouched, so applying
-- it changes nothing a reader can see. Populate (tools/estate-audio-summary.cjs populate) runs
-- between step 1 and step 2 so the swap never exposes an empty summary.
-- Rollback: 20261030_estate_map_precomputed_totals.ROLLBACK.sql (restores the 20260913 function,
-- drops everything here).

CREATE TABLE IF NOT EXISTS public.estate_audio_summary (
  course_code  text   NOT NULL,
  voice_id     text   NOT NULL,
  origin       text   NOT NULL,
  clips        bigint NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_code, voice_id, origin)
);

CREATE TABLE IF NOT EXISTS public.estate_audio_course_summary (
  course_code     text PRIMARY KEY,
  veracity_passed bigint NOT NULL DEFAULT 0,
  veracity_failed bigint NOT NULL DEFAULT 0,
  refreshed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.estate_audio_dead_stubs (
  id uuid PRIMARY KEY
);

-- Written only when a course's totals actually moved: the answer to "how often do the totals
-- change" is this table's rows per course per day.
CREATE TABLE IF NOT EXISTS public.estate_audio_refresh_log (
  id              bigserial PRIMARY KEY,
  course_code     text NOT NULL,
  refreshed_at    timestamptz NOT NULL DEFAULT now(),
  clips_before    bigint NOT NULL,
  clips_after     bigint NOT NULL,
  veracity_before bigint NOT NULL,
  veracity_after  bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS estate_audio_refresh_log_at ON public.estate_audio_refresh_log (refreshed_at);

ALTER TABLE public.estate_audio_summary        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_audio_course_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_audio_dead_stubs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_audio_refresh_log    ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.estate_audio_summary, public.estate_audio_course_summary,
              public.estate_audio_dead_stubs, public.estate_audio_refresh_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.estate_audio_summary, public.estate_audio_course_summary,
                public.estate_audio_dead_stubs, public.estate_audio_refresh_log TO service_role;

-- One course per call. SECURITY DEFINER so the table writes work for service_role, but the
-- caller's statement_timeout still bounds it -- a course too big for 8 s fails loudly.
CREATE OR REPLACE FUNCTION public.refresh_estate_audio_course(p_course text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  clips_before bigint; clips_after bigint; ver_before bigint; ver_after bigint;
  vp bigint; vf bigint;
BEGIN
  SELECT coalesce(sum(clips), 0) INTO clips_before FROM estate_audio_summary WHERE course_code = p_course;
  SELECT coalesce(veracity_passed + veracity_failed, 0) INTO ver_before
    FROM estate_audio_course_summary WHERE course_code = p_course;
  ver_before := coalesce(ver_before, 0);

  -- Veracity arms stay two separate scans on purpose, each matching one partial index.
  SELECT count(*) INTO vp FROM course_audio WHERE course_code = p_course AND veracity_pass IS TRUE;
  SELECT count(*) INTO vf FROM course_audio WHERE course_code = p_course AND veracity_pass IS FALSE;

  DELETE FROM estate_audio_summary WHERE course_code = p_course;
  INSERT INTO estate_audio_summary (course_code, voice_id, origin, clips)
    SELECT course_code, voice_id, origin, count(*)
    FROM course_audio WHERE course_code = p_course GROUP BY 1, 2, 3;

  INSERT INTO estate_audio_course_summary (course_code, veracity_passed, veracity_failed, refreshed_at)
    VALUES (p_course, vp, vf, now())
    ON CONFLICT (course_code) DO UPDATE
      SET veracity_passed = EXCLUDED.veracity_passed,
          veracity_failed = EXCLUDED.veracity_failed,
          refreshed_at    = EXCLUDED.refreshed_at;

  SELECT coalesce(sum(clips), 0) INTO clips_after FROM estate_audio_summary WHERE course_code = p_course;
  ver_after := vp + vf;

  IF clips_after <> clips_before OR ver_after <> ver_before THEN
    INSERT INTO estate_audio_refresh_log (course_code, clips_before, clips_after, veracity_before, veracity_after)
      VALUES (p_course, clips_before, clips_after, ver_before, ver_after);
  END IF;

  RETURN jsonb_build_object('course_code', p_course, 'clips_before', clips_before, 'clips_after', clips_after,
                            'veracity_before', ver_before, 'veracity_after', ver_after,
                            'changed', (clips_after <> clips_before OR ver_after <> ver_before));
END;
$function$;

-- The dead-stub id list (~26 rows, partial-index read).
CREATE OR REPLACE FUNCTION public.refresh_estate_audio_dead_stubs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE n integer;
BEGIN
  DELETE FROM estate_audio_dead_stubs;
  INSERT INTO estate_audio_dead_stubs (id) SELECT id FROM course_audio WHERE file_size_bytes < 2000;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_estate_audio_course(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_estate_audio_dead_stubs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_estate_audio_course(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_estate_audio_dead_stubs() TO service_role;
