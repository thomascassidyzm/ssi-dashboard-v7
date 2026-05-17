-- =============================================================================
-- Add an integer `version` stamp to `courses`, bumped on any meaningful
-- mutation to `course_legos`. This is the cache-busting key for the
-- instant-playback round-map (see 20260518_course_round_index.sql) and the
-- staleness key for precomputed phrase decompositions
-- (see 20260518_course_practice_phrases_decomposition.sql).
--
-- Why integer (not the existing semver `content_version`):
--   content_version is editor-driven semver intended for human-facing release
--   notes. This `version` is machine-driven, monotonic, bumped automatically by
--   trigger on every LEGO mutation. Two different concepts, two columns.
--
-- Trigger semantics: AFTER INSERT/UPDATE/DELETE on course_legos, increment
-- courses.version for the affected course_code. UPDATE only fires when one of
-- the columns that actually affects the round-map or decomposition has
-- changed (target_text, known_text, seed_number, lego_index, components).
-- Irrelevant churn (e.g. updated_at, audio_id relinks) does NOT bump version.
--
-- Concurrent-safe: per-statement UPDATE on a single courses row uses row lock;
-- parallel writers serialise harmlessly on that lock. Idempotent install via
-- IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS course_legos_bump_course_version ON course_legos;
--   DROP FUNCTION IF EXISTS bump_course_version();
--   ALTER TABLE courses DROP COLUMN IF EXISTS version;
-- =============================================================================

BEGIN;

-- 1. Column ---------------------------------------------------------------

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- 2. Trigger function -----------------------------------------------------

CREATE OR REPLACE FUNCTION bump_course_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_code text;
BEGIN
  -- DELETE: OLD has the course_code. INSERT/UPDATE: NEW does.
  IF TG_OP = 'DELETE' THEN
    v_course_code := OLD.course_code;
  ELSE
    v_course_code := NEW.course_code;
  END IF;

  IF v_course_code IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE courses
  SET version = version + 1
  WHERE course_code = v_course_code;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION bump_course_version() IS
  'Increments courses.version for the affected course_code whenever course_legos sees a meaningful mutation. Used as cache-busting key for the round-map and decomposition-staleness checks.';

-- 3. Trigger --------------------------------------------------------------

DROP TRIGGER IF EXISTS course_legos_bump_course_version ON course_legos;

-- One trigger covers INSERT, DELETE, and the column-scoped UPDATE.
-- WHEN clause restricts UPDATE firings to columns that materially affect the
-- round-map or the decomposition vocabulary. INSERT and DELETE always fire.
CREATE TRIGGER course_legos_bump_course_version
AFTER INSERT OR DELETE OR UPDATE OF target_text, known_text, seed_number, lego_index, components
ON course_legos
FOR EACH ROW
WHEN (
  TG_OP <> 'UPDATE'
  OR NEW.target_text   IS DISTINCT FROM OLD.target_text
  OR NEW.known_text    IS DISTINCT FROM OLD.known_text
  OR NEW.seed_number   IS DISTINCT FROM OLD.seed_number
  OR NEW.lego_index    IS DISTINCT FROM OLD.lego_index
  OR NEW.components    IS DISTINCT FROM OLD.components
)
EXECUTE FUNCTION bump_course_version();

COMMIT;

-- Reload PostgREST schema cache so the new column is visible to API clients.
NOTIFY pgrst, 'reload schema';
