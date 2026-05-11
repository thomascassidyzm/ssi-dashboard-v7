-- Migration: Re-link audio FKs across all non-empty courses (Lever 2)
-- Date: 2026-05-02
-- Author: Tom + Claude
--
-- Purpose
-- -------
-- One-shot recovery for accumulated FK link drift.
--
-- The text-edit trigger added in 20260206_null_audio_on_text_change.sql
-- NULLs the audio_id FK columns on course_legos / course_practice_phrases
-- whenever text changes, but there is no inverse trigger to re-link them
-- when fresh audio later lands in course_audio. Result: ~29 courses across
-- the catalogue have NULL FKs even though the audio they need exists.
--
-- This migration calls the existing link_all_audio_ids(course_code) RPC for
-- every non-placeholder course. The function only updates rows where the
-- FK is already NULL, so the operation is idempotent and safe to re-run.
--
-- Scope
-- -----
-- - In:  every course with at least one row in course_legos, course_practice_phrases,
--        or course_seeds (real content, regardless of completion stage).
-- - Out: placeholder courses with no rows in any of the three text tables
--        (per Tom's audit on 2026-05-02 there are ~29 of these — the
--        catalogue's "EMPTY" bucket).
--
-- How to run
-- ----------
-- 1. Open Supabase SQL editor for the dashboard project
-- 2. Paste this whole file and run
-- 3. Watch the NOTICE output for per-course re-link counts
--
-- To dry-run first, wrap the DO block in:
--   BEGIN;
--   <paste DO block>;
--   ROLLBACK;
-- Then run the same thing again without BEGIN/ROLLBACK to commit.
--
-- Re-runnable: yes — idempotent (only touches NULL FKs).

DO $relink_all$
DECLARE
  v_course RECORD;
  v_result JSONB;
  v_total_courses INT := 0;
  v_courses_with_links INT := 0;
  v_total_links INT := 0;
  v_course_links INT;
  v_skipped_empty INT;
  v_failed INT := 0;
BEGIN
  RAISE NOTICE '── Lever 2: audio FK re-link across non-empty courses ──';
  RAISE NOTICE '';

  FOR v_course IN
    SELECT c.course_code
    FROM courses c
    WHERE EXISTS (SELECT 1 FROM course_legos WHERE course_code = c.course_code)
       OR EXISTS (SELECT 1 FROM course_practice_phrases WHERE course_code = c.course_code)
       OR EXISTS (SELECT 1 FROM course_seeds WHERE course_code = c.course_code)
    ORDER BY c.course_code
  LOOP
    v_total_courses := v_total_courses + 1;

    BEGIN
      v_result := link_all_audio_ids(v_course.course_code);

      v_course_links := COALESCE((v_result->'legos'->>'known')::INT, 0)
                      + COALESCE((v_result->'legos'->>'target1')::INT, 0)
                      + COALESCE((v_result->'legos'->>'target2')::INT, 0)
                      + COALESCE((v_result->'phrases'->>'known')::INT, 0)
                      + COALESCE((v_result->'phrases'->>'target1')::INT, 0)
                      + COALESCE((v_result->'phrases'->>'target2')::INT, 0)
                      + COALESCE((v_result->'seeds'->>'known')::INT, 0)
                      + COALESCE((v_result->'seeds'->>'target1')::INT, 0)
                      + COALESCE((v_result->'seeds'->>'target2')::INT, 0);

      v_total_links := v_total_links + v_course_links;

      IF v_course_links > 0 THEN
        v_courses_with_links := v_courses_with_links + 1;
        RAISE NOTICE '  % → relinked % FKs  legos=%  phrases=%  seeds=%',
          v_course.course_code,
          v_course_links,
          v_result->'legos',
          v_result->'phrases',
          v_result->'seeds';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      RAISE WARNING '  % → ERROR: %', v_course.course_code, SQLERRM;
    END;
  END LOOP;

  -- Count placeholder courses we deliberately skipped
  SELECT COUNT(*) INTO v_skipped_empty
  FROM courses c
  WHERE NOT EXISTS (SELECT 1 FROM course_legos WHERE course_code = c.course_code)
    AND NOT EXISTS (SELECT 1 FROM course_practice_phrases WHERE course_code = c.course_code)
    AND NOT EXISTS (SELECT 1 FROM course_seeds WHERE course_code = c.course_code);

  RAISE NOTICE '';
  RAISE NOTICE '── Summary ──';
  RAISE NOTICE '  Non-empty courses processed:    %', v_total_courses;
  RAISE NOTICE '  Placeholder courses skipped:    %', v_skipped_empty;
  RAISE NOTICE '  Courses with at least one link: %', v_courses_with_links;
  RAISE NOTICE '  Total FKs re-linked:            %', v_total_links;
  IF v_failed > 0 THEN
    RAISE NOTICE '  Courses that errored:           %  (see WARNING lines above)', v_failed;
  END IF;
END $relink_all$;
