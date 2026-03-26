-- Migration: Remove audio count from get_all_course_stats
-- Date: 2026-03-26
-- Problem: course_audio count (783k rows) took 12.4s of the 13.6s total.
--          Course browser doesn't need audio counts — available per-course
--          in the Production Suite. Also drops 9 dead link_*_audio functions.
-- Result: 13.6s → 635ms (21x faster)

DROP FUNCTION IF EXISTS get_all_course_stats();

CREATE OR REPLACE FUNCTION get_all_course_stats()
RETURNS TABLE(course_code text, seeds bigint, completed_seeds bigint, legos bigint, phrases bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.course_code,
    COALESCE(s.cnt, 0) AS seeds,
    COALESCE(cs.cnt, 0) AS completed_seeds,
    COALESCE(l.cnt, 0) AS legos,
    COALESCE(p.cnt, 0) AS phrases
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
  ) p ON true;
$$;

DROP FUNCTION IF EXISTS link_lego_known_audio(text, text);
DROP FUNCTION IF EXISTS link_lego_target1_audio(text, text);
DROP FUNCTION IF EXISTS link_lego_target2_audio(text, text);
DROP FUNCTION IF EXISTS link_practice_phrase_known_audio(text, text);
DROP FUNCTION IF EXISTS link_practice_phrase_target1_audio(text, text);
DROP FUNCTION IF EXISTS link_practice_phrase_target2_audio(text, text);
DROP FUNCTION IF EXISTS link_seed_known_audio(text, text);
DROP FUNCTION IF EXISTS link_seed_target1_audio(text, text);
DROP FUNCTION IF EXISTS link_seed_target2_audio(text, text);
