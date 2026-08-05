-- 20260805_course_audio_veracity_verdict_count_index.sql
--
-- Follow-up to 20260805_course_audio_veracity_verdict.sql, forced by the live
-- run rather than predicted: the audio-preview page 500'd with "canceling
-- statement due to statement timeout" the moment it asked for its verdict
-- split.
--
-- The first migration indexed veracity_checked_at, which answers "which clips
-- have a verdict". The page's actual question is "how many passed, how many
-- failed" — a count over veracity_pass — and on a 1.2M-row course with no
-- index for it that is an exact count over a sequential scan.
--
-- Partial on `veracity_pass IS NOT NULL`, so it covers only rows that carry a
-- verdict at all. That is a few thousand rows today against 2.5M, and it never
-- grows to cover the unchecked backlog: the router does NOT count the
-- unchecked population, it subtracts (total - passed - failed), because the
-- one number that cannot be indexed cheaply is also the one already implied by
-- the other three.
--
-- Applied to production 2026-08-05.

CREATE INDEX IF NOT EXISTS idx_course_audio_veracity_pass
  ON course_audio (course_code, veracity_pass)
  WHERE veracity_pass IS NOT NULL;
