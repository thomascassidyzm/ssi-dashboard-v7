-- Add glue_to_next to listening_pod_sentences.
--
-- Per Aran's 2026-05-05 spec, listening pod sentences are now atomic
-- chunks of natural utterances rather than full sentences. Multiple
-- chunks of one natural utterance carry glue_to_next = true; the last
-- chunk of an utterance has glue_to_next = false.
--
-- The runtime player uses this to choose inter-chunk gap timing:
--   glued chunk → next chunk        : 300ms (stage 7: 0ms — sews them together)
--   non-glued chunk → next chunk    : 1000ms (Aran's "between phrases" pause)
--
-- Existing un-chunked content stays valid: every existing row defaults
-- to glue_to_next = false, which gives the 1000ms inter-utterance gap.
-- That matches today's behaviour (one row = one full utterance, always
-- a "between phrases" boundary), so nothing breaks until chunked
-- content is ingested.

ALTER TABLE listening_pod_sentences
  ADD COLUMN IF NOT EXISTS glue_to_next BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN listening_pod_sentences.glue_to_next IS
  'When true, the next sentence in global_order belongs to the same '
  'natural utterance and the player should use a tight (or zero at '
  'stage 7) gap rather than the standard inter-utterance pause.';
