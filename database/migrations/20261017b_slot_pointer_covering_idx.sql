-- Job #845: tools/audio/voice-audit.cjs pointerIds() (the clip census / course-audio-report) reads every audio pointer of one
-- course. The pointer indexes that exist lead on the audio id, not course_code, so the course's rows come from the heap (the
-- ~855k-row phrases table is wide). These indexes are (course_code) INCLUDE (the pointer columns), so each of the three scans is
-- an INDEX-ONLY scan of one course. Built CONCURRENTLY (outside a transaction); no GRANTs, no NOTIFY pgrst. Safe to drop:
-- the tool works without them, just slower.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_seeds_course_audio_ptrs
  ON public.course_seeds (course_code) INCLUDE (known_audio_id, target1_audio_id, target2_audio_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_legos_course_audio_ptrs
  ON public.course_legos (course_code) INCLUDE (known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpp_course_audio_ptrs
  ON public.course_practice_phrases (course_code) INCLUDE (known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id);
