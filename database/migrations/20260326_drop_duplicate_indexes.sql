-- Migration: Drop duplicate and dead indexes
-- Date: 2026-03-26
-- Frees ~140MB and speeds up all writes to the four main content tables.
--
-- Duplicates removed:
--   course_legos: idx_course_legos_course_code (duplicate of idx_course_legos_course)
--   course_legos: idx_legos_known/target1/target2_audio (duplicates of idx_course_legos_*)
--   course_practice_phrases: idx_course_practice_phrases_course_code (duplicate of _course)
--   course_practice_phrases: idx_course_practice_phrases_position (duplicate of unique key)
--   course_seeds: idx_course_seeds_course_code (duplicate of idx_course_seeds_course)
--
-- Dead index removed:
--   course_audio: idx_course_audio_text_stripped (101MB, text_stripped column unused)

DROP INDEX IF EXISTS idx_course_legos_course_code;
DROP INDEX IF EXISTS idx_course_practice_phrases_course_code;
DROP INDEX IF EXISTS idx_course_seeds_course_code;
DROP INDEX IF EXISTS idx_legos_known_audio;
DROP INDEX IF EXISTS idx_legos_target1_audio;
DROP INDEX IF EXISTS idx_legos_target2_audio;
DROP INDEX IF EXISTS idx_course_practice_phrases_position;
DROP INDEX IF EXISTS idx_course_audio_text_stripped;
