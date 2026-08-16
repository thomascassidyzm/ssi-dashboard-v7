-- 20260816_pod_sentence_target_text_approval.sql
--
-- Mark a pod sentence's DRAFTED target_text as approved to generate audio, so a
-- bulk render can never spend money turning words nobody has checked into audio
-- a learner will hear.
--
-- Tom's ruling, 2026-08-16 (A-109), verbatim:
--   "we're not going to manually read all text for all courses - that's lunacy -
--    we state an acceptable risk policy: maybe we ask a verifier agent to check
--    all translations for reasonableness - as distinct from the agent that did
--    the translating - and then we mark text as approved to generate audio"
--
-- So there are exactly two ways a drafted line becomes renderable:
--   1. a human edits target_text, which clears target_text_draft (the proofread
--      that the 20260806 migration already models); or
--   2. an independent verifier agent judges the drafted line reasonable and
--      stamps it here.
-- Everything else stays unrenderable, which is the safe failure direction.
--
-- Approved is target_text_approved_at IS NOT NULL. Deliberately no separate
-- boolean: one source of truth, no way for a flag and a timestamp to disagree.
--
-- target_text_approved_by records WHO or WHAT approved — 'verifier:claude-opus-5'
-- or a human's name. That column is what makes Tom's "distinct from the agent
-- that did the translating" auditable after the fact rather than a claim in a
-- report.
--
-- target_text_review holds the verifier's own words, including the two texts as
-- they stood at check time:
--   { verdict, reason, model, checked_at, known_text_at_check, target_text_at_check }
-- An approval is bound to the words it approved: a later edit to target_text
-- clears the approval (services/voice-engine/pods-cast.cjs#buildSentenceEditPatch),
-- and the stored texts let anyone audit that binding by eye.
--
-- Additive and defaulted: every existing row gets NULL, and nothing that reads
-- this table today looks at these columns, so nothing that exists today breaks.

ALTER TABLE listening_pod_sentences
  ADD COLUMN IF NOT EXISTS target_text_approved_at  timestamptz,
  ADD COLUMN IF NOT EXISTS target_text_approved_by  text,
  ADD COLUMN IF NOT EXISTS target_text_review       jsonb;

COMMENT ON COLUMN listening_pod_sentences.target_text_approved_at IS
  'Non-NULL = this drafted target_text is approved to generate audio (Tom''s '
  'A-109 ruling, 2026-08-16). Only consulted when target_text_draft is true; a '
  'non-draft line is renderable on its own. Cleared when target_text is edited.';

COMMENT ON COLUMN listening_pod_sentences.target_text_approved_by IS
  'Who or what approved: a verifier model id ("verifier:claude-opus-5") or a '
  'human name. The audit trail for "the verifier must not be the translator".';

COMMENT ON COLUMN listening_pod_sentences.target_text_review IS
  'The verifier''s verdict in its own words: { verdict, reason, model, '
  'checked_at, known_text_at_check, target_text_at_check }. Written for flagged '
  'lines too — a flagged line carries its reason and stays unapproved.';

-- No new index. The gate's query is "drafts of this pod that are not approved",
-- and listening_pod_sentences_draft_idx (pod_id) WHERE target_text_draft already
-- narrows that to at most a few hundred rows per pod; the approval test is a
-- cheap filter on top. Adding a second partial index would buy nothing and cost
-- a write on every draft update.
