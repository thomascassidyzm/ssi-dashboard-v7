-- THE CLIP INDEX — Tom's audio model (2026-09-26 ~22:00Z): "we have text that
-- needs audio / what is the text - character by character / what language is
-- it / which voice is it … check to see if we have it … anywhere in the estate".
--
-- One row per CLIP = (language, text_key, voice_id). No role, no course
-- (Tom 21:45Z: "matched to the voice and the text and the language and NO
-- ROLE"). It points at ONE canonical course_audio row whose s3_key holds the
-- bytes; every other course that uses those words in that voice holds its own
-- course_audio row pointing at the same S3 object.
--
--   language  canonical, region-free database_code ('hin', 'eng', 'zho') —
--             clip-identity.cjs canonicalLanguage(). STORED, never inferred from
--             the text: "facile" in eng/ita/fra is three clips.
--   text_key  services/shared/clip-index.cjs clipTextKey() — the words exactly as
--             the pipeline stores them, with only the intake normalisation the
--             door already applies (see that function).
--   voice_id  canonical '<provider>_<id>' — clip-identity.cjs canonicalVoiceId().
--
-- Canonical key values are computed in JS (the language/voice alias tables live
-- there), so the index is written by the backfill tool, the TTS door's write-
-- through on every fallback hit, and phase8's render write — never by trigger.
-- A missing entry is therefore a cache miss, never a verdict: the lookup falls
-- back to course_audio (keyed, not scanned) and writes what it finds through.
--
-- Server-only: the learning app reads course_audio, never this. anon and
-- authenticated get nothing (new tables arrive grant-open to anon here).
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
CREATE TABLE public.clip_index (
  language    text        NOT NULL,
  text_key    text        NOT NULL,
  voice_id    text        NOT NULL,
  audio_id    uuid        NOT NULL REFERENCES public.course_audio(id) ON DELETE CASCADE,
  origin      text        NOT NULL CHECK (origin IN ('tts', 'human')),
  indexed_by  text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clip_index_pkey PRIMARY KEY (language, text_key, voice_id)
);
-- The PK is the O(1) lookup: (language, text_key) is its prefix, so "every voice
-- that has these words in this language" is one index range.
CREATE INDEX idx_clip_index_audio ON public.clip_index (audio_id);
COMMENT ON TABLE public.clip_index IS 'One canonical clip per (language, text_key, voice_id); points at course_audio. No role, no course. See database/changes/20260926_clip_index.sql and services/shared/clip-index.cjs.';
ALTER TABLE public.clip_index ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clip_index FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clip_index TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
