-- 20260806_pod_sentence_target_text_draft.sql
--
-- Mark a pod sentence's target_text as DRAFT — machine-written, awaiting a human
-- proofread — so a recorder is never handed drafted words believing they are the
-- course's finished text.
--
-- Written for the Welsh pod-0 job (Tom's ruling 2026-08-06: "opus drafts, Aran
-- proofreads"): 109 Northern and 104 Southern canonical lines had no Welsh at all
-- after the 2026-08-06 canonical alignment, blocking the recording job. The drafts
-- go into target_text so the record room renders them and Aran can amend inline;
-- this flag is what stops them reading as finished.
--
-- Additive and defaulted: every existing row becomes false, nothing that reads this
-- table today looks at the column, so nothing that exists today breaks.
--
-- Cleared automatically when a human PATCHes the line's target_text
-- (services/voice-engine/pods-router.cjs, PATCH /sentence/:sentenceId) — that edit
-- IS the proofread.

ALTER TABLE listening_pod_sentences
  ADD COLUMN IF NOT EXISTS target_text_draft boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN listening_pod_sentences.target_text_draft IS
  'true = target_text is a machine-written draft awaiting a human proofread. The '
  'recording plan carries it through and the record room badges the line DRAFT — '
  'AWAITING PROOFREAD. Cleared when a human edits target_text.';

-- Partial index: the interesting set is always the small "still a draft" one.
CREATE INDEX IF NOT EXISTS listening_pod_sentences_draft_idx
  ON listening_pod_sentences (pod_id)
  WHERE target_text_draft;
