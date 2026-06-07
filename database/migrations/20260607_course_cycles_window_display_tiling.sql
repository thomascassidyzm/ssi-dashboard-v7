-- =============================================================================
-- get_course_cycles_window: add display_tiling to the phrases payload
--
-- course_practice_phrases.display_tiling carries the authored display tiles
-- ({n: native, r: roman, salient} per tile) built and validated in Popty
-- (jpn_for_eng backfill, June 2026). The learning app's instant-playback
-- cycles endpoint reads phrases exclusively through this function, so the
-- column has to ride along here for first-session cycles to render authored
-- tiles. NULL stays NULL — the player falls back to its runtime segmenter.
--
-- Identical to 20260518_course_cycles_window_fn.sql except for the added
-- p.display_tiling column in the phrases CTE.
--
-- Rollback: re-run 20260518_course_cycles_window_fn.sql.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_course_cycles_window(
  p_course_code text,
  p_from_lego_id text,
  p_round_limit int
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH
  course AS (
    SELECT c.course_code, c.version
    FROM courses c
    WHERE c.course_code = p_course_code
    LIMIT 1
  ),
  start_round AS (
    SELECT r.round_index
    FROM course_round_index r
    WHERE r.course_code = p_course_code
      AND r.lego_id = p_from_lego_id
    LIMIT 1
  ),
  rounds AS (
    SELECT r.round_index, r.lego_id, r.seed_number, r.lego_index
    FROM course_round_index r
    WHERE r.course_code = p_course_code
      AND r.round_index >= (SELECT round_index FROM start_round)
    ORDER BY r.round_index ASC
    LIMIT p_round_limit
  ),
  legos AS (
    SELECT
      l.seed_number, l.lego_index, l.lego_id, l.type,
      l.known_text, l.target_text, l.target_text_roman, l.components,
      l.is_new,
      l.known_audio_id, l.target1_audio_id, l.target2_audio_id, l.presentation_audio_id,
      l.target1_duration_ms, l.target2_duration_ms
    FROM course_legos l
    JOIN rounds r ON r.lego_id = l.lego_id
    WHERE l.course_code = p_course_code
  ),
  phrases AS (
    SELECT
      p.seed_number, p.lego_index, p.position, p.phrase_role,
      p.known_text, p.target_text, p.target_text_roman,
      p.decomposition,
      p.display_tiling,
      p.known_audio_id, p.target1_audio_id, p.target2_audio_id,
      p.target1_duration_ms, p.target2_duration_ms
    FROM course_practice_phrases p
    WHERE p.course_code = p_course_code
      AND (p.seed_number, p.lego_index) IN (SELECT r.seed_number, r.lego_index FROM rounds r)
    ORDER BY p.position ASC NULLS LAST
  )
SELECT jsonb_build_object(
  'course',  (SELECT to_jsonb(c) FROM course c),
  'rounds',  (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.round_index), '[]'::jsonb) FROM rounds r),
  'legos',   (SELECT coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) FROM legos l),
  'phrases', (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.position NULLS LAST), '[]'::jsonb) FROM phrases p)
);
$$;

COMMENT ON FUNCTION get_course_cycles_window(text, text, int) IS
  'Single-roundtrip data source for the instant-playback cycles endpoint. Returns {course, rounds, legos, phrases} as jsonb (phrases include display_tiling). Read-only.';

GRANT EXECUTE ON FUNCTION get_course_cycles_window(text, text, int) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
