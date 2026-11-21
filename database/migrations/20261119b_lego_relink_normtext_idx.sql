-- cs #950 — the LEGO text-edit audio re-link lookup, made indexable. Tom's go via Watson (relay of #945·AI), 2026-11-19.
-- WHY: trg_null_lego_audio_on_text_change -> null_lego_audio_on_text_change() -> audio_id_for_text_same_voice()
-- matches   a.course_code = p_course AND a.role = p_role
--           AND (a.text_normalized = normalize_text(p_text) OR normalize_text(a.text) = normalize_text(p_text))
-- The second disjunct is an expression on the KEY, so no index serves it and the OR makes the planner read
-- every clip of that course and role and run plpgsql normalize_text() on each: the 5-10 s per LEGO text edit.
-- FIX: an expression index matching that disjunct exactly. NO function is changed, so no result can change;
-- the planner can now BitmapOr idx_course_audio_text_lookup (first disjunct) with this one (second).
-- normalize_text is IMMUTABLE, which an expression index requires. Built CONCURRENTLY: no write is blocked.
-- ANALYZE so the planner has statistics on the new expression (else it guesses its selectivity).
-- Rollback: 20261119b_lego_relink_normtext_idx.ROLLBACK.sql (drops the index; nothing else to undo).
SET lock_timeout = '10s';
SET statement_timeout = '60min';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_audio_course_role_normtext
  ON public.course_audio (course_code, role, public.normalize_text(text));
SELECT c.relname AS index, i.indisvalid AS valid, pg_size_pretty(pg_relation_size(c.oid)) AS size
  FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
 WHERE c.relname = 'idx_course_audio_course_role_normtext';
ANALYZE public.course_audio;
