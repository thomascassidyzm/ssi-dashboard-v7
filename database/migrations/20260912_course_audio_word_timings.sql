-- course_audio.word_timings — per-word timings on the clip the pod plays.
--
-- Tom, 2026-09-12 (RBF room): pod IMMERSION display in the learning app should
-- keep pace within a sentence like a podcast transcript. "Pods are never cut
-- below the sentence… so we'd have to use the timings within the sentence…
-- Cartesia will be great for this because xAI didn't do timestamps at the word
-- level… from now on we're doing Cartesia for all TTS."
--
-- ONE nullable jsonb column, nothing else. Shape (fixed; the learning app
-- builds its display to it — services/shared/word-timings.cjs is the writer's
-- contract):
--
--   { "source": "cartesia",
--     "words":  ["Ciao", "a", "tutti"],
--     "starts": [0.00, 0.31, 0.42],
--     "ends":   [0.28, 0.40, 0.71] }
--
-- Seconds, floats, arrays of equal length, in playback order. NULL for every
-- xAI, human or otherwise untimed clip. No backfill: Pod-1 / xAI / human audio
-- stays NULL until a later alignment pass, deliberately.
--
-- Why course_audio and not audio_clips: the pod sentence links a course_audio
-- row (listening_pod_sentences.target_audio_id / sentence_audio_ids) and the
-- player fetches that row directly over Supabase, so this column is the
-- payload. The canonical-clip trigger is untouched; the writer withdraws the
-- timings itself when a row is deduped onto canonical bytes it did not render.
--
-- Existing table-level SELECT grants for anon/authenticated cover the new
-- column (verified against information_schema.table_privileges before this
-- was written), so the player can read it with no grant change.

ALTER TABLE public.course_audio
  ADD COLUMN IF NOT EXISTS word_timings jsonb;

COMMENT ON COLUMN public.course_audio.word_timings IS
  'Per-word timings for the clip, seconds: {source, words[], starts[], ends[]} of equal length in playback order. Written at Cartesia pod mint (Tom, 2026-09-12); NULL for xAI/human/untimed clips. Served to the player as wordTimings.';
