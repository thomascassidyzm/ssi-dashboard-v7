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
