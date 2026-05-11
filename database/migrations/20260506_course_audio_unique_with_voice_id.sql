-- Migration: include voice_id in course_audio's unique constraint.
-- Date: 2026-05-06
--
-- Problem: the existing constraint UNIQUE (course_code, text_normalized,
-- language, role) collapses multi-voice rows to one. Pod audio needs distinct
-- rows per voice (Ana → Olivia, Konobar → Henry, both saying "Good morning."
-- in the known track). Without voice_id in the key, concurrent upserts
-- overwrite each other and the final voice on the row is whichever worker
-- happened to write last.
--
-- Fix: replace the constraint with one that includes voice_id.
--
-- Safe: existing rows already have voice_id populated; no per-row dedup needed
-- because today's data has at most one row per (course, text, lang, role) so
-- no collisions arise when widening the key.

ALTER TABLE course_audio
  DROP CONSTRAINT IF EXISTS unique_course_audio;

ALTER TABLE course_audio
  ADD CONSTRAINT unique_course_audio_per_voice
  UNIQUE (course_code, text_normalized, language, role, voice_id);
