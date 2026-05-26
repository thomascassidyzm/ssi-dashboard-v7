-- =============================================================================
-- Round-index: the R -> LEGO map that powers the instant-playback critical
-- path (see new_vision/INSTANT_PLAYBACK_SPEC.md). For a given course, the
-- learner's position is stored as last_completed_lego_id; the player needs to
-- translate that to a round number (and look up neighbours for spaced-rep
-- math) without hitting the full course graph on every cold start.
--
-- Shape: one row per (course_code, round_index) where round_index is the
-- 1-based position in script order of LEGOs introduced fresh to the learner
-- (is_new = true), ordered by (seed_number, lego_index).
--
-- Implementation choice: MATERIALIZED VIEW rather than a real table with
-- maintenance triggers. Simpler (no INSERT/UPDATE/DELETE bookkeeping) and the
-- refresh cost is trivial (~700 rows for a finished course). Refresh strategy
-- is owned by the caller (see "When to refresh" below) — this migration only
-- creates the structure.
--
-- The CONCURRENTLY-eligible unique index on (course_code, round_index) lets
-- the course-builder pipeline refresh without locking out reads.
--
-- Rollback:
--   DROP MATERIALIZED VIEW IF EXISTS course_round_index;
-- =============================================================================

-- =============================================================================
-- When to refresh
-- -----------------------------------------------------------------------------
-- The view is a function of courses.version (bumped by the trigger added in
-- 20260518_courses_version_stamp.sql). Two reasonable refresh strategies:
--
--   1. Pipeline-hook (preferred for now): wherever the course-builder
--      currently writes course_legos rows in batch, call
--        REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
--      after the batch commits. Cheap; runs on the order of milliseconds.
--
--   2. Trigger-driven (later, if needed): an AFTER UPDATE trigger on
--      courses.version that schedules a refresh via pg_notify / pg_cron.
--      We don't do this yet because in-trigger DDL is awkward and the
--      pipeline already knows when LEGOs change.
--
-- For ad-hoc maintenance, the same command works from psql / Supabase SQL
-- editor. The unique index makes CONCURRENTLY safe; reads continue against
-- the previous snapshot during the rebuild.
-- =============================================================================

-- 1. Materialized view ----------------------------------------------------

-- DROP/CREATE is the idempotent shape for a materialized view definition
-- change. The DROP is conditional so first-run install is clean.
DROP MATERIALIZED VIEW IF EXISTS course_round_index;

CREATE MATERIALIZED VIEW course_round_index AS
SELECT
  course_code,
  row_number() OVER (
    PARTITION BY course_code
    ORDER BY seed_number, lego_index
  )::integer AS round_index,
  lego_id,
  seed_number,
  lego_index
FROM course_legos
WHERE is_new = true
  AND lego_id IS NOT NULL;

COMMENT ON MATERIALIZED VIEW course_round_index IS
  'R -> LEGO map for instant-playback. One row per fresh-introduction LEGO per course, ordered by (seed_number, lego_index). Refresh via REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index after course_legos mutations. Cache-busting key is courses.version.';

-- 2. Indexes --------------------------------------------------------------

-- Unique index on (course_code, round_index) doubles as the
-- CONCURRENTLY-eligibility key. Required for REFRESH ... CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_round_index_pk
  ON course_round_index (course_code, round_index);

-- Reverse lookup: given a lego_id, find its round_index in O(1).
-- The player uses this for "what round is the user on?" and "what's N-1?".
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_round_index_lego
  ON course_round_index (course_code, lego_id);

-- Initial population. Use plain REFRESH (not CONCURRENTLY) on first install:
-- CONCURRENTLY requires an existing populated copy.
REFRESH MATERIALIZED VIEW course_round_index;

-- Reload PostgREST schema cache so the view is exposed to API clients.
NOTIFY pgrst, 'reload schema';
