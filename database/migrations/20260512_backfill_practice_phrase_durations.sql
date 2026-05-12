-- =============================================================================
-- Backfill missing target1_duration_ms / target2_duration_ms on
-- course_practice_phrases from course_audio.duration_ms
-- =============================================================================
--
-- Context: 25% of ita_for_eng phrases (1,540 rows) have target1_audio_id and
-- target2_audio_id populated, audio plays fine, but target1_duration_ms /
-- target2_duration_ms are NULL or 0 on the practice-phrase row. This breaks
-- the learning-app pause calculation: CourseDataProvider substitutes a fake
-- 2.5s duration when these are missing, so pauseDurationMs falls back to a
-- flat ~5.75s regardless of the actual phrase length — long phrases become
-- unanswerable.
--
-- Likely cause: Phase 8 audio-generation paths that wrote to course_audio
-- without backporting duration_ms to course_practice_phrases. The data is
-- not lost — it just needs to be copied from the canonical source.
--
-- This migration:
--   1. Reports counts before
--   2. Backfills target1_duration_ms from course_audio for all courses
--   3. Backfills target2_duration_ms from course_audio for all courses
--   4. Reports counts after
--
-- All operations are idempotent and scoped to phrases where the audio_id
-- column is non-null (i.e., audio exists) but the duration column is
-- null or zero.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Before: count affected rows per course
\echo '=== BEFORE BACKFILL ==='
SELECT
  course_code,
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) AS missing_t1,
  COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) AS missing_t2,
  COUNT(*) AS total_phrases
FROM course_practice_phrases
GROUP BY course_code
HAVING
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) > 0
  OR COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) > 0
ORDER BY missing_t1 + missing_t2 DESC;

-- Backfill target1_duration_ms
UPDATE course_practice_phrases AS p
SET target1_duration_ms = a.duration_ms
FROM course_audio AS a
WHERE p.target1_audio_id = a.id
  AND a.duration_ms IS NOT NULL
  AND a.duration_ms > 0
  AND (p.target1_duration_ms IS NULL OR p.target1_duration_ms = 0);

\echo '=== target1_duration_ms backfill complete ==='

-- Backfill target2_duration_ms
UPDATE course_practice_phrases AS p
SET target2_duration_ms = a.duration_ms
FROM course_audio AS a
WHERE p.target2_audio_id = a.id
  AND a.duration_ms IS NOT NULL
  AND a.duration_ms > 0
  AND (p.target2_duration_ms IS NULL OR p.target2_duration_ms = 0);

\echo '=== target2_duration_ms backfill complete ==='

-- After: same per-course report
\echo '=== AFTER BACKFILL ==='
SELECT
  course_code,
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) AS missing_t1,
  COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) AS missing_t2,
  COUNT(*) AS total_phrases
FROM course_practice_phrases
GROUP BY course_code
ORDER BY course_code;

-- Sanity check: any remaining missing rows should be rows where the audio_id
-- itself is missing (no audio recorded yet), not where audio exists but the
-- duration was skipped.
\echo '=== REMAINING MISSING (should be only where audio_id IS NULL) ==='
SELECT
  course_code,
  COUNT(*) FILTER (WHERE target1_audio_id IS NULL) AS no_target1_audio,
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) AS leak_t1,
  COUNT(*) FILTER (WHERE target2_audio_id IS NULL) AS no_target2_audio,
  COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) AS leak_t2
FROM course_practice_phrases
GROUP BY course_code
HAVING
  COUNT(*) FILTER (WHERE target1_audio_id IS NOT NULL AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)) > 0
  OR COUNT(*) FILTER (WHERE target2_audio_id IS NOT NULL AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)) > 0
ORDER BY course_code;

COMMIT;
