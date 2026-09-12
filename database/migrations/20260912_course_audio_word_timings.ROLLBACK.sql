-- Rollback for 20260912_course_audio_word_timings.sql. Drops the column and the
-- timings on it; no other object depends on it (no view, no trigger, no index).
ALTER TABLE public.course_audio DROP COLUMN IF EXISTS word_timings;
