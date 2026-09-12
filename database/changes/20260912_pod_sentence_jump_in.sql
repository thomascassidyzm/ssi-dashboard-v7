-- 20260912_pod_sentence_jump_in.sql
--
-- Tom, 2026-09-12, listening to the Italian method pod on staging: "The
-- changeovers between speakers need to be different depending on whether the
-- speakers are jumping in — in which there should be no gap, in fact it should
-- be overlap if possible … Whereas genuine turn taking — asking or answering
-- questions etc. — should be as they are now, with whatever gap they currently
-- have. So it's more like a proper conversation."
--
-- ONE nullable boolean on the pod line row, nothing else. The learner app reads
-- listening_pod_sentences straight from Supabase and maps this column to
-- `jumpIn` on the clip it schedules (job #470); the Popty pod page shows and
-- toggles it (job #471). Three states on purpose: NULL = never annotated
-- (plays as a turn, exactly as today), false = annotated as a genuine turn,
-- true = this line jumps in on the previous speaker. The rule that decides
-- which is which lives once, in services/shared/pod-jump-in-rule.cjs.
ALTER TABLE public.listening_pod_sentences ADD COLUMN IF NOT EXISTS jump_in boolean;
COMMENT ON COLUMN public.listening_pod_sentences.jump_in IS
  'true = this line jumps in on the previous speaker (no gap / overlap); false = a genuine turn; NULL = not yet annotated, plays as a turn. Rule: services/shared/pod-jump-in-rule.cjs (Tom, 2026-09-12).';
