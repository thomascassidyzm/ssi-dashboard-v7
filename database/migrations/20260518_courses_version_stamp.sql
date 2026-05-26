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
--
-- The column-change check lives inside the function (not in a WHEN clause)
-- because Postgres disallows NEW references in WHEN when the trigger fires
-- on DELETE — and we want one trigger covering all three ops. TG_OP lets us
-- branch cleanly: INSERT and DELETE always bump; UPDATE bumps only when one
-- of the materially-relevant columns actually changed (no-op updates that
-- SET a column to its existing value are silently skipped).

CREATE OR REPLACE FUNCTION bump_course_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_course_code text;
  v_should_bump boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_course_code := OLD.course_code;
    v_should_bump := true;
  ELSIF TG_OP = 'INSERT' THEN
    v_course_code := NEW.course_code;
    v_should_bump := true;
  ELSE  -- UPDATE
    v_course_code := NEW.course_code;
    v_should_bump :=
         NEW.target_text  IS DISTINCT FROM OLD.target_text
      OR NEW.known_text   IS DISTINCT FROM OLD.known_text
      OR NEW.seed_number  IS DISTINCT FROM OLD.seed_number
      OR NEW.lego_index   IS DISTINCT FROM OLD.lego_index
      OR NEW.components   IS DISTINCT FROM OLD.components;
  END IF;

  IF v_should_bump AND v_course_code IS NOT NULL THEN
    UPDATE courses
    SET version = version + 1
    WHERE course_code = v_course_code;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION bump_course_version() IS
  'Increments courses.version for the affected course_code whenever course_legos sees a meaningful mutation. Used as cache-busting key for the round-map and decomposition-staleness checks.';

-- 3. Trigger --------------------------------------------------------------

DROP TRIGGER IF EXISTS course_legos_bump_course_version ON course_legos;

-- One trigger, three operations. The `UPDATE OF columns` clause keeps Postgres
-- from invoking the function on UPDATEs that don't touch any of the listed
-- columns (cheap pre-filter at the planner level). The function then handles
-- per-op logic and the no-op-update guard.
CREATE TRIGGER course_legos_bump_course_version
AFTER INSERT OR DELETE OR UPDATE OF target_text, known_text, seed_number, lego_index, components
ON course_legos
FOR EACH ROW
EXECUTE FUNCTION bump_course_version();

COMMIT;

-- Reload PostgREST schema cache so the new column is visible to API clients.
NOTIFY pgrst, 'reload schema';
