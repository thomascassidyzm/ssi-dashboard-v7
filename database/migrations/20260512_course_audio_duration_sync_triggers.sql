-- =============================================================================
-- Bidirectional triggers to keep target1_duration_ms / target2_duration_ms
-- on course_practice_phrases and course_legos in sync with the canonical
-- duration_ms on course_audio.
-- =============================================================================
--
-- Context: course_audio.duration_ms is the source of truth for audio length.
-- course_practice_phrases and course_legos each carry denormalised cache
-- columns (target1_duration_ms, target2_duration_ms) to avoid a JOIN at
-- read time. Historically Phase 8 has written duration_ms to course_audio
-- without backporting to those cache columns, so the cache went stale (or
-- was never populated) across most of the fleet. Audit 2026-05-12: 57 of
-- 71 courses affected on practice_phrases; 71% of all LEGO rows missing.
--
-- The companion migration `20260512_backfill_practice_phrase_durations.sql`
-- backfills the historical data. This migration prevents the gap from
-- reopening by enforcing the cache invariant at the database level.
--
-- Two triggers, covering both write directions:
--
--   1. UPSTREAM: on course_audio INSERT or duration_ms UPDATE, propagate the
--      new duration to every dependent row that references this audio_id.
--      Handles the case where audio is generated / regenerated and the
--      duration changes — caches downstream update automatically.
--
--   2. DOWNSTREAM: on course_practice_phrases / course_legos INSERT or
--      target{1,2}_audio_id UPDATE, pull the current duration from
--      course_audio. Handles the case where a row is linked to (or relinked
--      to) an audio file — cache is filled at link time.
--
-- Together, the cache is consistent regardless of write order.
-- Idempotent: DROP IF EXISTS, CREATE OR REPLACE.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. UPSTREAM trigger: course_audio → dependents
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_audio_duration_to_dependents()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip if there's no meaningful duration to propagate.
  IF NEW.duration_ms IS NULL OR NEW.duration_ms = 0 THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only fire if duration_ms actually changed.
  IF TG_OP = 'UPDATE' AND NEW.duration_ms IS NOT DISTINCT FROM OLD.duration_ms THEN
    RETURN NEW;
  END IF;

  -- Propagate to course_practice_phrases (target1 + target2 slots)
  UPDATE course_practice_phrases
  SET target1_duration_ms = NEW.duration_ms
  WHERE target1_audio_id = NEW.id
    AND target1_duration_ms IS DISTINCT FROM NEW.duration_ms;

  UPDATE course_practice_phrases
  SET target2_duration_ms = NEW.duration_ms
  WHERE target2_audio_id = NEW.id
    AND target2_duration_ms IS DISTINCT FROM NEW.duration_ms;

  -- Propagate to course_legos (target1 + target2 slots)
  UPDATE course_legos
  SET target1_duration_ms = NEW.duration_ms
  WHERE target1_audio_id = NEW.id
    AND target1_duration_ms IS DISTINCT FROM NEW.duration_ms;

  UPDATE course_legos
  SET target2_duration_ms = NEW.duration_ms
  WHERE target2_audio_id = NEW.id
    AND target2_duration_ms IS DISTINCT FROM NEW.duration_ms;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_audio_sync_duration ON course_audio;

CREATE TRIGGER course_audio_sync_duration
AFTER INSERT OR UPDATE OF duration_ms ON course_audio
FOR EACH ROW
EXECUTE FUNCTION sync_audio_duration_to_dependents();

COMMENT ON FUNCTION sync_audio_duration_to_dependents() IS
  'When course_audio.duration_ms is set or changed, propagate to the cache columns on course_practice_phrases and course_legos. Pair: pull_audio_duration_on_link().';

-- =============================================================================
-- 2. DOWNSTREAM trigger function (shared by both dependent tables)
-- =============================================================================

CREATE OR REPLACE FUNCTION pull_audio_duration_on_link()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_duration INTEGER;
BEGIN
  -- target1: fill duration when audio_id is set on INSERT, or relinked on UPDATE.
  IF NEW.target1_audio_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.target1_audio_id IS DISTINCT FROM OLD.target1_audio_id) THEN
    SELECT duration_ms INTO v_duration
    FROM course_audio
    WHERE id = NEW.target1_audio_id;

    -- Only overwrite if course_audio has a meaningful value. If course_audio
    -- itself doesn't yet have duration_ms (rare), leave the cache as-is so the
    -- upstream trigger can populate it later when course_audio is updated.
    IF v_duration IS NOT NULL AND v_duration > 0 THEN
      NEW.target1_duration_ms := v_duration;
    END IF;
  END IF;

  -- target2: same pattern.
  IF NEW.target2_audio_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.target2_audio_id IS DISTINCT FROM OLD.target2_audio_id) THEN
    SELECT duration_ms INTO v_duration
    FROM course_audio
    WHERE id = NEW.target2_audio_id;

    IF v_duration IS NOT NULL AND v_duration > 0 THEN
      NEW.target2_duration_ms := v_duration;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_practice_phrases_pull_duration ON course_practice_phrases;
DROP TRIGGER IF EXISTS course_legos_pull_duration ON course_legos;

CREATE TRIGGER course_practice_phrases_pull_duration
BEFORE INSERT OR UPDATE OF target1_audio_id, target2_audio_id ON course_practice_phrases
FOR EACH ROW
EXECUTE FUNCTION pull_audio_duration_on_link();

CREATE TRIGGER course_legos_pull_duration
BEFORE INSERT OR UPDATE OF target1_audio_id, target2_audio_id ON course_legos
FOR EACH ROW
EXECUTE FUNCTION pull_audio_duration_on_link();

COMMENT ON FUNCTION pull_audio_duration_on_link() IS
  'When target1_audio_id or target2_audio_id is set or changed on course_practice_phrases or course_legos, pull the canonical duration_ms from course_audio into the cache column. Pair: sync_audio_duration_to_dependents().';

COMMIT;

-- =============================================================================
-- Verification: all three triggers should appear, AFTER on course_audio and
-- BEFORE on the two dependent tables.
-- =============================================================================

SELECT
  event_object_table AS table_name,
  trigger_name,
  action_timing,
  string_agg(event_manipulation, ', ' ORDER BY event_manipulation) AS events
FROM information_schema.triggers
WHERE trigger_name IN (
  'course_audio_sync_duration',
  'course_practice_phrases_pull_duration',
  'course_legos_pull_duration'
)
GROUP BY event_object_table, trigger_name, action_timing
ORDER BY table_name, trigger_name;

-- =============================================================================
-- Notes on operational behaviour
-- =============================================================================
--
-- Performance:
--   - Upstream trigger does up to 4 UPDATEs per audio row touched, each
--     scoped by indexed audio_id lookups. Fast.
--   - Downstream trigger does up to 2 SELECTs per phrase/lego row written.
--     Indexed primary-key lookups on course_audio. Fast.
--   - The IS DISTINCT FROM guards prevent no-op writes, keeping bulk
--     operations cheap.
--
-- Idempotency:
--   - All operations use IS DISTINCT FROM checks. Re-running the migration
--     after install is a no-op for the trigger creation (DROP IF EXISTS) and
--     a no-op for any propagated data (already in sync).
--
-- Edge cases handled:
--   - INSERT a course_audio row that no dependents yet reference: trigger
--     fires but UPDATEs match 0 rows. Cheap.
--   - INSERT a phrase/lego with audio_id pointing at a row whose duration_ms
--     is null: cache stays null; upstream trigger populates it when audio_id's
--     duration_ms is later updated.
--   - Relink (UPDATE target1_audio_id from X to Y): downstream trigger
--     refreshes the duration from Y's current value.
--   - Bulk imports that set audio_id and duration_ms in the same INSERT:
--     downstream trigger overwrites the provided duration with course_audio's
--     value, which is correct (course_audio is source of truth).
--
-- Not handled:
--   - DELETE of course_audio: dependent rows still hold the cached duration.
--     The FK constraint should prevent orphans; if FK is missing, this would
--     leave stale data. Out of scope for this migration.
-- =============================================================================
