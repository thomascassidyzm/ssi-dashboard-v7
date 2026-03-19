-- get_all_course_stats: Single RPC to get stats for ALL courses
-- Replaces N * 5 individual HEAD count queries from the frontend
-- Called by supabase.js getAllCourseStats()

CREATE OR REPLACE FUNCTION get_all_course_stats()
RETURNS TABLE (
  course_code TEXT,
  seeds BIGINT,
  completed_seeds BIGINT,
  legos BIGINT,
  phrases BIGINT,
  audio BIGINT
)
LANGUAGE sql
STABLE
AS $fn$
  SELECT
    c.course_code,
    COALESCE(s.cnt, 0) AS seeds,
    COALESCE(cs.cnt, 0) AS completed_seeds,
    COALESCE(l.cnt, 0) AS legos,
    COALESCE(p.cnt, 0) AS phrases,
    COALESCE(a.cnt, 0) AS audio
  FROM courses c
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM course_seeds WHERE course_seeds.course_code = c.course_code
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT count(DISTINCT seed_number) AS cnt FROM course_legos WHERE course_legos.course_code = c.course_code
  ) cs ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM course_legos WHERE course_legos.course_code = c.course_code
  ) l ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM course_practice_phrases WHERE course_practice_phrases.course_code = c.course_code
  ) p ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM course_audio WHERE course_audio.course_code = c.course_code
  ) a ON true;
$fn$;
