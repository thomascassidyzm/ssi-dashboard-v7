-- =============================================================================
-- Backfill missing target1_duration_ms / target2_duration_ms on
-- course_practice_phrases AND course_legos from course_audio.duration_ms
-- =============================================================================
--
-- Context (audit 2026-05-12):
--   - course_practice_phrases: 592,834 missing duration cells across 57 of 71
--     courses. Many courses (Turkish, Japanese variants, Greek, Polish, Croatian
--     and more) are 100% missing. Italian's 25% gap was actually one of the
--     better cases.
--   - course_legos: 33,376 of 47,079 rows (71%) missing both target durations.
--   - course_audio (source of truth) is intact — duration_ms is populated.
--
-- Impact: learning-app's CourseDataProvider substitutes a fake 2.5s duration
-- when target1_duration_ms is missing on the dependent row. The pause formula
-- then returns a flat ~5.75s regardless of actual phrase length — long phrases
-- become unanswerable in the speak-from-prompt loop. Fleet-wide bug.
--
-- Likely cause: Phase 8 audio-generation paths that wrote to course_audio
-- without backporting duration_ms to course_practice_phrases / course_legos.
-- The data is not lost; it just needs copying from the canonical source.
--
-- This migration:
--   1. Reports affected counts before, per table per course
--   2. Backfills target1_duration_ms on course_practice_phrases
--   3. Backfills target2_duration_ms on course_practice_phrases
--   4. Backfills target1_duration_ms on course_legos
--   5. Backfills target2_duration_ms on course_legos
--   6. Reports counts after
--
-- All operations are idempotent and scoped to rows where the audio_id column
-- is non-null (i.e., audio exists) but the duration column is null or zero.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ====================================================================
-- BEFORE: counts per course, per table
-- ====================================================================
\echo '=== BEFORE: course_practice_phrases ==='
SELECT
  course_code,
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) AS missing_t1,
  COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) AS missing_t2,
  COUNT(*) AS total
FROM course_practice_phrases
GROUP BY course_code
HAVING
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) > 0
  OR COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) > 0
ORDER BY missing_t1 + missing_t2 DESC;

\echo '=== BEFORE: course_legos ==='
SELECT
  course_code,
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) AS missing_t1,
  COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) AS missing_t2,
  COUNT(*) AS total
FROM course_legos
GROUP BY course_code
HAVING
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) > 0
  OR COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) > 0
ORDER BY missing_t1 + missing_t2 DESC;

-- ====================================================================
-- BACKFILL course_practice_phrases
-- ====================================================================
UPDATE course_practice_phrases AS p
SET target1_duration_ms = a.duration_ms
FROM course_audio AS a
WHERE p.target1_audio_id = a.id
  AND a.duration_ms IS NOT NULL
  AND a.duration_ms > 0
  AND (p.target1_duration_ms IS NULL OR p.target1_duration_ms = 0);

\echo '=== practice_phrases target1_duration_ms backfilled ==='

UPDATE course_practice_phrases AS p
SET target2_duration_ms = a.duration_ms
FROM course_audio AS a
WHERE p.target2_audio_id = a.id
  AND a.duration_ms IS NOT NULL
  AND a.duration_ms > 0
  AND (p.target2_duration_ms IS NULL OR p.target2_duration_ms = 0);

\echo '=== practice_phrases target2_duration_ms backfilled ==='

-- ====================================================================
-- BACKFILL course_legos
-- ====================================================================
UPDATE course_legos AS l
SET target1_duration_ms = a.duration_ms
FROM course_audio AS a
WHERE l.target1_audio_id = a.id
  AND a.duration_ms IS NOT NULL
  AND a.duration_ms > 0
  AND (l.target1_duration_ms IS NULL OR l.target1_duration_ms = 0);

\echo '=== legos target1_duration_ms backfilled ==='

UPDATE course_legos AS l
SET target2_duration_ms = a.duration_ms
FROM course_audio AS a
WHERE l.target2_audio_id = a.id
  AND a.duration_ms IS NOT NULL
  AND a.duration_ms > 0
  AND (l.target2_duration_ms IS NULL OR l.target2_duration_ms = 0);

\echo '=== legos target2_duration_ms backfilled ==='

-- ====================================================================
-- AFTER: same reports
-- ====================================================================
\echo '=== AFTER: course_practice_phrases ==='
SELECT
  course_code,
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) AS still_missing_t1,
  COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) AS still_missing_t2,
  COUNT(*) AS total
FROM course_practice_phrases
GROUP BY course_code
HAVING
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) > 0
  OR COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) > 0
ORDER BY course_code;

\echo '=== AFTER: course_legos ==='
SELECT
  course_code,
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) AS still_missing_t1,
  COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) AS still_missing_t2,
  COUNT(*) AS total
FROM course_legos
GROUP BY course_code
HAVING
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) > 0
  OR COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) > 0
ORDER BY course_code;

-- Sanity check: any remaining missing-with-audio_id rows mean course_audio
-- itself is missing duration_ms for those audio rows (separate problem).
\echo '=== SANITY: remaining gaps in course_audio source-of-truth ==='
SELECT
  course_code,
  role,
  COUNT(*) AS rows_with_null_or_zero_duration
FROM course_audio
WHERE duration_ms IS NULL OR duration_ms = 0
GROUP BY course_code, role
ORDER BY rows_with_null_or_zero_duration DESC
LIMIT 20;

COMMIT;
