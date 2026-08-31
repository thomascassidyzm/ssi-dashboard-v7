-- Reverses 20260831_courses_known_dialect.sql. Drops the column and every value
-- in it; the nine *_for_cym backfills are re-derivable from the course text by
-- tools/dialect-entity-gaps-2026-08-31.cjs, so nothing is lost that cannot be
-- recomputed.
ALTER TABLE courses DROP COLUMN IF EXISTS known_dialect;
