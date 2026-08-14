-- Make the recording queue CONTENT-TYPE-AGNOSTIC.
--
-- Tom's ruling, 2026-08-14: the 18 failing LEGO-narration clips should "just ride
-- the new queue's existing design, since it's content-type-agnostic by language
-- and voice role" — explicitly NOT a bespoke path bolted onto the old system.
--
-- The old re-record flag, `listening_pod_sentences.rerecord_wanted`, can only ever
-- describe POD DIALOGUE. The 18 clips are LEGO presentation narration
-- (role='presentation'), so under the old shape there was no way to ask for them
-- to be re-recorded at all — which is exactly why they had sat unqueueable.
--
-- The generic home is `course_audio`, because EVERY clip of EVERY content type is
-- a course_audio row: pod dialogue, presentation narration, encouragement,
-- instruction, seed and lego audio. One flag here reaches all of them, and a new
-- content type needs no new mechanism. That is the cheaper and simpler leg of the
-- decision as well as the better one.
--
-- Shape of the value (all optional except reason):
--   {
--     "reason":       "why this take needs redoing, in a human's words",
--     "voice_gender": "m" | "f",   -- WHICH QUEUE it belongs in
--     "wanted_at":    "ISO-8601",
--     "wanted_by":    "who asked",
--     "evidence":     { ... free-form, e.g. the detector's verdict }
--   }
--
-- voice_gender is what routes the item, per Tom: attribution to a named person is
-- often unknown, but the REQUIRED VOICE always is — Aran takes the male queue,
-- Catrin the female one. Routing on the requirement rather than on a guess at
-- authorship is what lets these 18 be queued at all.
--
-- NON-DESTRUCTIVE, deliberately. Flagging a clip changes nothing about the clip:
-- the row keeps its s3_key, the object stays on S3, and every learner path keeps
-- serving the existing audio until a NEW take has been recorded and verified.
-- Make-before-break is not weakened by this column; it is what makes the column
-- safe (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md section 6b).

ALTER TABLE course_audio
  ADD COLUMN IF NOT EXISTS rerecord_wanted jsonb;

COMMENT ON COLUMN course_audio.rerecord_wanted IS
  'Non-destructive "this take needs redoing" flag, any content type. Routed to a recordist queue by voice_gender. NULL = nothing wanted. Never mutates the existing clip (Tom 2026-08-14).';

-- Partial index: the queue only ever asks for the flagged rows, which are a tiny
-- minority of ~2.5M. A full index would cost far more than it returns.
CREATE INDEX IF NOT EXISTS idx_course_audio_rerecord_wanted
  ON course_audio (course_code, role)
  WHERE rerecord_wanted IS NOT NULL;
