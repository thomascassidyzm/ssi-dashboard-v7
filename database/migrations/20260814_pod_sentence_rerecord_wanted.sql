-- 20260814_pod_sentence_rerecord_wanted.sql
--
-- RE-RECORD WANTED — a pod line can be pending for a named recordist WITHOUT
-- unlinking its existing audio.
--
-- Before this column the only lever for "record this again" was setting
-- {kind}_audio_id to NULL. That works for a dead stub, whose audio is silence
-- anyway, but it breaks make-before-break for the 81 cym_n_for_eng pod-0 lines
-- whose takes are real, playable audio that happens to be clipped: nulling the
-- FK takes working audio off the learner's path before a replacement exists.
--
-- Shape: {"target":"<voiceId>","known":"<voiceId>"} — either key optional.
-- Meaning: this track is wanted, freshly recorded, by that voiceId. The
-- recording plan emits the line for that voice (even when the cast says
-- someone else holds the character, and even for a known line whose voice
-- would otherwise route to __explainer__) and counts the track as NOT
-- recorded, whatever its audio says — so the line is outstanding while its old
-- audio stays linked and playable.
--
-- Cleared per-key when a human take is registered for that sentence+track
-- (services/voice-engine/pods-registration.cjs, commitPodRegistration) — the
-- same write path that re-points the audio FK.
--
-- Additive and nullable: NULL = nothing wanted, which is every existing row.

ALTER TABLE listening_pod_sentences
  ADD COLUMN IF NOT EXISTS rerecord_wanted jsonb;

COMMENT ON COLUMN listening_pod_sentences.rerecord_wanted IS
  'Per-track re-record request: {"target":"<voiceId>","known":"<voiceId>"}, either '
  'key optional. That track is wanted freshly recorded by that voice — it appears '
  'in that voice''s recording plan and reads as outstanding while its existing '
  'audio stays linked. Cleared per-key on human take registration.';

-- Partial index: the interesting set is always the small "something is wanted" one.
CREATE INDEX IF NOT EXISTS listening_pod_sentences_rerecord_wanted_idx
  ON listening_pod_sentences (pod_id)
  WHERE rerecord_wanted IS NOT NULL;
