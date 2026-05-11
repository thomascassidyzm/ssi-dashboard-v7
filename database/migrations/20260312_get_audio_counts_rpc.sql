-- DEPRECATED 2026-04-29 — superseded by phase8 getAudioNeeds() / GET /needs/:courseCode
-- The function is left in place for any external callers and as a fallback,
-- but production code now goes through getAudioNeeds() (services/phases/phase8-audio-v13.cjs)
-- so all dashboard counts agree with what /generate actually does. Known issues with this
-- RPC: (a) doesn't count legos.target2_audio_id, (b) doesn't know about linkable-vs-needs-TTS,
-- (c) doesn't enumerate pending presentation rows. Drop this RPC in a future migration
-- once we're confident no external callers remain.
--
-- get_audio_counts: NULL-based audio counting via audio_id columns
-- Returns missing counts per table (phrases, legos, seeds) in one DB round-trip.
-- Used by the plan endpoint instead of text-matching counting.

CREATE OR REPLACE FUNCTION get_audio_counts(p_course_code TEXT, p_release_target INT)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'phrases', (SELECT jsonb_build_object(
      'total', count(*),
      'missing_known', count(*) FILTER (WHERE known_audio_id IS NULL),
      'missing_target1', count(*) FILTER (WHERE target1_audio_id IS NULL),
      'missing_target2', count(*) FILTER (WHERE target2_audio_id IS NULL)
    ) FROM course_practice_phrases WHERE course_code = p_course_code AND seed_number <= p_release_target),
    'legos', (SELECT jsonb_build_object(
      'total', count(*),
      'total_new', count(*) FILTER (WHERE is_new),
      'missing_known', count(*) FILTER (WHERE known_audio_id IS NULL),
      'missing_target1', count(*) FILTER (WHERE target1_audio_id IS NULL),
      'missing_presentation', count(*) FILTER (WHERE is_new AND presentation_audio_id IS NULL)
    ) FROM course_legos WHERE course_code = p_course_code AND seed_number <= p_release_target),
    'seeds', (SELECT jsonb_build_object(
      'total', count(*),
      'missing_known', count(*) FILTER (WHERE known_audio_id IS NULL),
      'missing_target1', count(*) FILTER (WHERE target1_audio_id IS NULL),
      'missing_target2', count(*) FILTER (WHERE target2_audio_id IS NULL)
    ) FROM course_seeds WHERE course_code = p_course_code AND seed_number <= p_release_target AND status = 'released')
  ) INTO v_result;
  RETURN v_result;
END;
$function$;
