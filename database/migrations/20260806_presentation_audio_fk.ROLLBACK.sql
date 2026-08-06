-- ROLLBACK for 20260806_presentation_audio_fk.sql
--
-- Drops the constraint only. It does NOT restore the 17,480 dangling pointers,
-- because restoring them would deliberately re-break production: every one of
-- them points at a course_audio row that no longer exists, and a dangling id
-- 404s and hard-stalls the player where a NULL falls back cleanly.
--
-- If the pointers genuinely must be restored (forensics, or to re-derive which
-- clip a row once used), the per-row snapshot is in the command-surface repo at
--   ops/a22-dangling-presentation-ids-backup-2026-08-06.json      (17,480 rows)
--   ops/a22-dangling-lego-presentation-ids-backup-2026-08-06.json (9 rows)
-- each carrying the phrase id, course, seed/lego position and the old audio id.
-- Note the FK below must be dropped BEFORE any such restore, or the write will
-- be rejected by the constraint.

ALTER TABLE course_practice_phrases
  DROP CONSTRAINT IF EXISTS course_practice_phrases_presentation_audio_id_fkey;
