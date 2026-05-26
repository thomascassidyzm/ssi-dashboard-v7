-- =============================================================================
-- Backfill missing target1_duration_ms / target2_duration_ms on
-- course_practice_phrases AND course_legos from course_audio.duration_ms
-- =============================================================================
--
-- Context (audit 2026-05-12):
--   - course_practice_phrases: ~593K missing duration cells across 57 of 71
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
-- Cause: Phase 8 audio-generation paths that wrote to course_audio without
-- backporting duration_ms to course_practice_phrases / course_legos. The data
-- is not lost; it just needs copying from the canonical source. Companion
-- migration 20260512_course_audio_duration_sync_triggers.sql adds DB-level
-- triggers to prevent the gap from reopening.
--
-- All operations are idempotent and scoped to rows where the audio_id column
-- is non-null (i.e., audio exists) but the duration column is null or zero.
--
-- Portable: pure SQL, no psql-only meta-commands. Safe to paste into the
-- Supabase SQL editor, run via psql, pg_admin, or any standard Postgres client.
-- =============================================================================

BEGIN;

-- =============================================================================
-- Backfill + progress notices in a DO block.
-- RAISE NOTICE messages surface in any client that displays Postgres notices
-- (Supabase editor shows them in the Notices panel; psql shows them inline).
-- =============================================================================

DO $$
DECLARE
  v_phrases_t1_before  INTEGER;
  v_phrases_t2_before  INTEGER;
  v_legos_t1_before    INTEGER;
  v_legos_t2_before    INTEGER;
  v_phrases_t1_updated INTEGER;
  v_phrases_t2_updated INTEGER;
  v_legos_t1_updated   INTEGER;
  v_legos_t2_updated   INTEGER;
BEGIN
  -- BEFORE counts
  SELECT COUNT(*) INTO v_phrases_t1_before
  FROM course_practice_phrases
  WHERE target1_audio_id IS NOT NULL
    AND (target1_duration_ms IS NULL OR target1_duration_ms = 0);

  SELECT COUNT(*) INTO v_phrases_t2_before
  FROM course_practice_phrases
  WHERE target2_audio_id IS NOT NULL
    AND (target2_duration_ms IS NULL OR target2_duration_ms = 0);

  SELECT COUNT(*) INTO v_legos_t1_before
  FROM course_legos
  WHERE target1_audio_id IS NOT NULL
    AND (target1_duration_ms IS NULL OR target1_duration_ms = 0);

  SELECT COUNT(*) INTO v_legos_t2_before
  FROM course_legos
  WHERE target2_audio_id IS NOT NULL
    AND (target2_duration_ms IS NULL OR target2_duration_ms = 0);

  RAISE NOTICE 'BEFORE: course_practice_phrases missing t1=%, t2=%',
    v_phrases_t1_before, v_phrases_t2_before;
  RAISE NOTICE 'BEFORE: course_legos missing t1=%, t2=%',
    v_legos_t1_before, v_legos_t2_before;

  -- Backfill course_practice_phrases.target1_duration_ms
  UPDATE course_practice_phrases AS p
  SET target1_duration_ms = a.duration_ms
  FROM course_audio AS a
  WHERE p.target1_audio_id = a.id
    AND a.duration_ms IS NOT NULL
    AND a.duration_ms > 0
    AND (p.target1_duration_ms IS NULL OR p.target1_duration_ms = 0);
  GET DIAGNOSTICS v_phrases_t1_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % rows of course_practice_phrases.target1_duration_ms',
    v_phrases_t1_updated;

  -- Backfill course_practice_phrases.target2_duration_ms
  UPDATE course_practice_phrases AS p
  SET target2_duration_ms = a.duration_ms
  FROM course_audio AS a
  WHERE p.target2_audio_id = a.id
    AND a.duration_ms IS NOT NULL
    AND a.duration_ms > 0
    AND (p.target2_duration_ms IS NULL OR p.target2_duration_ms = 0);
  GET DIAGNOSTICS v_phrases_t2_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % rows of course_practice_phrases.target2_duration_ms',
    v_phrases_t2_updated;

  -- Backfill course_legos.target1_duration_ms
  UPDATE course_legos AS l
  SET target1_duration_ms = a.duration_ms
  FROM course_audio AS a
  WHERE l.target1_audio_id = a.id
    AND a.duration_ms IS NOT NULL
    AND a.duration_ms > 0
    AND (l.target1_duration_ms IS NULL OR l.target1_duration_ms = 0);
  GET DIAGNOSTICS v_legos_t1_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % rows of course_legos.target1_duration_ms',
    v_legos_t1_updated;

  -- Backfill course_legos.target2_duration_ms
  UPDATE course_legos AS l
  SET target2_duration_ms = a.duration_ms
  FROM course_audio AS a
  WHERE l.target2_audio_id = a.id
    AND a.duration_ms IS NOT NULL
    AND a.duration_ms > 0
    AND (l.target2_duration_ms IS NULL OR l.target2_duration_ms = 0);
  GET DIAGNOSTICS v_legos_t2_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % rows of course_legos.target2_duration_ms',
    v_legos_t2_updated;

  RAISE NOTICE 'BACKFILL TOTALS: % phrase rows updated, % lego rows updated',
    v_phrases_t1_updated + v_phrases_t2_updated,
    v_legos_t1_updated + v_legos_t2_updated;
END $$;

COMMIT;

-- =============================================================================
-- Final visible result: per-table per-course remaining-gap report.
-- After a clean run, any rows shown here should only be cases where audio
-- itself is missing (audio_id IS NULL) — not where audio exists but duration
-- wasn't propagated. If anything else surfaces, course_audio has its own
-- duration_ms gap for those rows (separate problem).
-- =============================================================================

SELECT
  'course_practice_phrases' AS table_name,
  course_code,
  COUNT(*) FILTER (
    WHERE target1_audio_id IS NOT NULL
      AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)
  ) AS still_missing_t1,
  COUNT(*) FILTER (
    WHERE target2_audio_id IS NOT NULL
      AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)
  ) AS still_missing_t2,
  COUNT(*) AS total_rows
FROM course_practice_phrases
GROUP BY course_code
HAVING
  COUNT(*) FILTER (
    WHERE target1_audio_id IS NOT NULL
      AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)
  ) > 0
  OR COUNT(*) FILTER (
    WHERE target2_audio_id IS NOT NULL
      AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)
  ) > 0

UNION ALL

SELECT
  'course_legos' AS table_name,
  course_code,
  COUNT(*) FILTER (
    WHERE target1_audio_id IS NOT NULL
      AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)
  ) AS still_missing_t1,
  COUNT(*) FILTER (
    WHERE target2_audio_id IS NOT NULL
      AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)
  ) AS still_missing_t2,
  COUNT(*) AS total_rows
FROM course_legos
GROUP BY course_code
HAVING
  COUNT(*) FILTER (
    WHERE target1_audio_id IS NOT NULL
      AND (target1_duration_ms IS NULL OR target1_duration_ms = 0)
  ) > 0
  OR COUNT(*) FILTER (
    WHERE target2_audio_id IS NOT NULL
      AND (target2_duration_ms IS NULL OR target2_duration_ms = 0)
  ) > 0

ORDER BY table_name, course_code;
