-- =============================================================================
-- get_course_cycles_window(course_code, from_lego_id, round_limit)
--
-- Single-roundtrip data source for the instant-playback cycles endpoint.
-- Returns the course version, the window of rounds starting at `from_lego_id`,
-- the LEGO rows for those rounds, and the practice phrases for the same seeds —
-- all in one jsonb payload.
--
-- Why this exists:
--   The cycles endpoint (`api/courses/[code]/cycles.ts` in ssi-learning-app)
--   previously did four sequential Supabase round-trips:
--     1. courses (version)
--     2. course_round_index (start row)
--     3. course_round_index (window)
--     4. course_legos + course_practice_phrases in parallel
--   Each Vercel→Supabase round-trip is ~100-150ms of physics, so the endpoint
--   floor was ~700ms. This function collapses all four into one rpc call —
--   the data is small (one course's window) so Postgres does the joins
--   internally for free. Expected endpoint floor: ~150-250ms.
--
-- Function semantics:
--   - All filtering is per-course_code (cheap, indexed).
--   - Window is `round_limit` rounds starting at the from_lego_id's round_index.
--     The caller (Node) is responsible for converting cycle-limit to a
--     round-limit using the same "limit+2" generosity rule that lived in
--     the old endpoint.
--   - When the course doesn't exist OR the from lego_id isn't in the
--     round map, `course` and/or `rounds` come back empty — the caller
--     surfaces the right 404.
--   - Read-only, STABLE — PostgREST will cache plan, no row-level locks.
--
-- Indexes used (all pre-existing):
--   courses(course_code) — PK
--   course_round_index(course_code, lego_id) — unique
--   course_round_index(course_code, round_index)
--   course_legos(course_code, lego_id) — for the lego window join
--   course_practice_phrases(course_code, seed_number, lego_index) — for the
--     phrase window scan
--
-- Rollback:
--   DROP FUNCTION IF EXISTS get_course_cycles_window(text, text, int);
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
  'Single-roundtrip data source for the instant-playback cycles endpoint. Returns {course, rounds, legos, phrases} as jsonb. Read-only.';

-- Grant execute to the roles PostgREST exposes (anon + authenticated). The
-- function is STABLE / SECURITY INVOKER so it respects whatever RLS the
-- caller's role would normally see — currently the cycles endpoint runs as
-- service_role, so this is a no-op, but explicit grant lets us tighten the
-- endpoint to anon/auth later if we want.
GRANT EXECUTE ON FUNCTION get_course_cycles_window(text, text, int) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
