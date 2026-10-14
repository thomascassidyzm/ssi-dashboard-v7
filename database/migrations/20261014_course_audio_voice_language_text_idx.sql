-- Job #367: recordedTextKeys (services/voice-engine/recordist-queue.cjs) reads
--   WHERE language = $1 AND voice_id IN (<spellings>) ORDER BY text_normalized
-- With no index leading on voice_id it rode idx_course_audio_estate_map
-- (course_code, voice_id, origin) -- course_code unconstrained -- and a cold read
-- took 3s warm-ish to ~17s (statement timeout) => "Couldn't load your lines (500)".
-- Index-only, narrow, built CONCURRENTLY (run outside a transaction). No GRANTs
-- or NOTIFY pgrst needed: an index changes no API surface.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_course_audio_voice_language_text
  ON public.course_audio (voice_id, language, text_normalized);
