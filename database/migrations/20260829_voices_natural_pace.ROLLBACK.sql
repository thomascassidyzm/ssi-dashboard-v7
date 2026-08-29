-- Rollback for 20260829_voices_natural_pace.sql.
--
-- Dropping these columns discards any human nudge that has been entered, which
-- is a real loss of judgement rather than of data — read natural_pace_nudge and
-- natural_pace_nudge_note out somewhere before running this.
DROP INDEX IF EXISTS voices_natural_pace_measured;
ALTER TABLE voices DROP CONSTRAINT IF EXISTS voices_natural_pace_ratio_sane;
ALTER TABLE voices DROP CONSTRAINT IF EXISTS voices_natural_pace_nudge_sane;
ALTER TABLE voices
  DROP COLUMN IF EXISTS natural_pace_ratio,
  DROP COLUMN IF EXISTS natural_pace_cps,
  DROP COLUMN IF EXISTS natural_pace_samples,
  DROP COLUMN IF EXISTS natural_pace_measured_at,
  DROP COLUMN IF EXISTS natural_pace_method,
  DROP COLUMN IF EXISTS natural_pace_nudge,
  DROP COLUMN IF EXISTS natural_pace_nudge_note;
