-- A-22: protect course_practice_phrases.presentation_audio_id with an FK.
--
-- Closes the open item recorded in 20260806_audio_link_integrity.sql section 4,
-- which correctly identified this column as unprotected and 17,480 rows as
-- dangling, and deferred the constraint until those rows were healed.
--
-- APPLIED TO PRODUCTION 2026-08-06 in this order (already done — this file is
-- the record, not a pending change):
--
--   1. Snapshot of all 17,480 dangling rows captured for reversibility, and of
--      the 9 dangling course_legos rows. Both live in the command-surface repo
--      at ops/a22-dangling-{presentation,lego-presentation}-ids-backup-2026-08-06.json
--   2. UPDATE ... SET presentation_audio_id = NULL for every row whose id had no
--      matching course_audio row. Exactly 17,480 rows, in one guarded
--      transaction that rolls back on any count drift. course_legos: 9 rows.
--   3. The constraint below.
--
-- Why NULL rather than leaving the id in place: cycles.ts:561 resolves
-- `presentation_audio_id || known_audio_id`. `||` tests for ABSENCE, so a NULL
-- falls back to the known-language clip exactly as designed, while a dangling
-- id is truthy, defeats the fallback, 404s, and hard-stalls the player. 16,339
-- component rows already carried a NULL here and caused no trouble at all.
--
-- Added NOT VALID first, then VALIDATE, so production never took a long
-- ACCESS EXCLUSIVE lock while the 2.5M-row course_audio table was scanned.
--
-- ON DELETE SET NULL matches the three sibling columns on this table
-- (known_audio_id, target1_audio_id, target2_audio_id) — this is the canonical
-- pattern the rest of the schema already uses, not a new one.

ALTER TABLE course_practice_phrases
  DROP CONSTRAINT IF EXISTS course_practice_phrases_presentation_audio_id_fkey;

ALTER TABLE course_practice_phrases
  ADD CONSTRAINT course_practice_phrases_presentation_audio_id_fkey
  FOREIGN KEY (presentation_audio_id) REFERENCES course_audio(id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE course_practice_phrases
  VALIDATE CONSTRAINT course_practice_phrases_presentation_audio_id_fkey;

-- STILL OPEN, deliberately not done here:
--   course_legos.presentation_audio_id is typed `text`, not `uuid`, so it cannot
--   take this constraint without a type change. All 71,989 of its non-null
--   values are valid uuids, so the conversion is mechanically safe, but it
--   rewrites the table and touches every reader of that column
--   (cycles.ts, bundle.ts, infplay-cycles.ts, generateLearningScript.ts), so it
--   wants its own change with those call sites checked. Until then the explicit
--   unlink in phase8-audio-v13.cjs is what protects it.
