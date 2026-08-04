-- 20260804_audio_link_trigger_indexes.sql
--
-- Why: the course_audio single-row UPSERT arriving over PostgREST was measured
-- at 50.2% of ALL database time (988,656 calls, 125.07 ms mean, 7.94 s max,
-- 123,649 s total; pg_stat_statements window from 2026-06-23).
--
-- The cost is NOT the ON CONFLICT index, NOT RLS (all course_audio policies are
-- literal `true`) and NOT IO (cache hit rate is 100%). It is the AFTER INSERT
-- trigger link_audio_to_content(), which for every inserted row runs
--
--   UPDATE course_practice_phrases
--      SET targetN_audio_id = NEW.id, ...
--    WHERE course_code = NEW.course_code
--      AND targetN_audio_id IS NULL
--      AND lower(trim(target_text)) = NEW.text_normalized;
--
-- plus the matching UPDATE on course_legos. No index covers the
-- lower(trim(...)) expression, so each one bitmap-scans the whole course's
-- phrase set and filters in the heap. Measured on fra_for_eng:
--   Bitmap Heap Scan, Rows Removed by Filter: 15894, Heap Blocks: exact=12507,
--   shared hit=12769, actual time 43.9 ms  -- for ONE of the two UPDATEs.
--
-- These expression indexes make each of those UPDATEs an index lookup.
--
-- Also: SELECT EXTRACT(... FROM (now()-max(created_at))) FROM course_audio was
-- 625 calls at 5777 ms mean / 10.1% cache hit -- a parallel seq scan of a
-- 1.5 GB table (179,877 blocks read). An index on created_at turns it into an
-- index-only max() lookup.
--
-- All builds are CONCURRENTLY: this database serves live learners and must not
-- take an exclusive lock. CONCURRENTLY cannot run inside a transaction block,
-- so there is deliberately no BEGIN/COMMIT in this file. Run the statements one
-- at a time. A failed concurrent build leaves an INVALID index behind:
--
--   SELECT c.relname FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
--    WHERE NOT i.indisvalid;
--   DROP INDEX CONCURRENTLY <name>;   -- then re-run
--
-- Purely a speed change: no behaviour, no ordering, and nothing written
-- differs. Applied to the live DB 2026-08-04.

-- Thread 2: the course_audio freshness probe.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_audio_created_at
  ON public.course_audio (created_at);

-- Thread 1: link_audio_to_content() lookups.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpp_course_target_text_norm
  ON public.course_practice_phrases (course_code, lower(trim(target_text)));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpp_course_known_text_norm
  ON public.course_practice_phrases (course_code, lower(trim(known_text)));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_legos_course_target_text_norm
  ON public.course_legos (course_code, lower(trim(target_text)));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_legos_course_known_text_norm
  ON public.course_legos (course_code, lower(trim(known_text)));
