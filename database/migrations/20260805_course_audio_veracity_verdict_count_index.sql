-- 20260805_course_audio_veracity_verdict_count_index.sql
--
-- Follow-up to 20260805_course_audio_veracity_verdict.sql, forced by the live
-- run rather than predicted: the audio-preview page 500'd with "canceling
-- statement due to statement timeout" the moment it asked for its verdict
-- split on fra_for_eng (49,098 clips).
--
-- Two lessons are baked into the shape below, both measured on the live table.
--
-- 1. THE WORST CASE IS "NONE". The page's list query filters on the verdict and
--    orders by created_at DESC. With no matching row — the state EVERY course
--    is in the day this ships — the planner walks the created_at index over the
--    whole course and finds nothing, having read all of it. The index therefore
--    carries created_at, so "none" is answered from the index in microseconds
--    instead of by reading the course to prove a negative.
--
-- 2. THE PREDICATE MUST MATCH THE QUERY EXACTLY. A single partial index on
--    `WHERE veracity_pass IS NOT NULL` was measurably NOT used for
--    `veracity_pass IS TRUE` — the planner fell back to a bitmap heap scan over
--    50,918 rows. Two indexes whose predicates are the two queries verbatim are
--    both chosen, and both answer in ~0.03 ms.
--
-- Neither index covers the unchecked population, and neither ever will: that
-- predicate matches nearly all 2.5M rows, and the router states it as
-- total - passed - failed rather than counting it. Both indexes are 8 KB today
-- and grow only with clips that carry a verdict.
--
-- Requires ANALYZE afterwards — the columns were added minutes earlier and the
-- planner had no statistics for them, which is half of why the first plan was
-- so bad.
--
-- Applied to production 2026-08-05.

DROP INDEX IF EXISTS idx_course_audio_veracity_pass;  -- the IS NOT NULL attempt

CREATE INDEX IF NOT EXISTS idx_course_audio_veracity_passed
  ON course_audio (course_code, created_at DESC)
  WHERE veracity_pass IS TRUE;

CREATE INDEX IF NOT EXISTS idx_course_audio_veracity_failed
  ON course_audio (course_code, created_at DESC)
  WHERE veracity_pass IS FALSE;

ANALYZE course_audio;
