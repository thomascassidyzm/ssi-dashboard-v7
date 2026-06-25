-- 20260603_course_audio_fk_indexes.sql
-- Add the 4 missing indexes backing course_audio's foreign-key columns.
--
-- Why: Postgres enforces deletes on course_audio by scanning every child row that
-- might reference the deleted audio id. course_seeds (3 audio FKs) and
-- lego_introductions (presentation_audio_id) had NO index on those columns, so each
-- `DELETE FROM course_audio` full-scanned them (27.5bn+ tuple reads in pg_stat;
-- audio-delete mean ~2634ms). The sibling tables (course_legos,
-- course_practice_phrases) already had equivalents. Partial (WHERE NOT NULL) since
-- most rows have null audio FKs.
--
-- Status: ALREADY APPLIED to the live shared DB on 2026-06-03 via CONCURRENTLY.
-- This file is the migration-history record. IF NOT EXISTS makes it a safe no-op
-- against the live DB and recreates the indexes on a from-scratch rebuild.
--
-- IMPORTANT: CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- Run these statements OUTSIDE a transaction (plain psql is fine — it does not wrap
-- by default; if your runner wraps everything in BEGIN/COMMIT, run them directly).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_seeds_known_audio
  ON public.course_seeds (known_audio_id)   WHERE known_audio_id   IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_seeds_target1_audio
  ON public.course_seeds (target1_audio_id) WHERE target1_audio_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_seeds_target2_audio
  ON public.course_seeds (target2_audio_id) WHERE target2_audio_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lego_introductions_presentation_audio
  ON public.lego_introductions (presentation_audio_id) WHERE presentation_audio_id IS NOT NULL;
