-- 2026-09-04: a course pod can carry a continuation, and an attach point is a
-- COLUMN rather than a sentence of prose.
--
-- TOM'S RULINGS, 2026-09-04:
--   "A pod is A BRANCH POINT WITH ITS CONTINUATIONS ATTACHED, the same
--    structure as a question and its foils."
--   "A RECOVERY ATTACHES, IT DOES NOT APPEND."
--   "Structure living in a string is this estate's recurring defect and it
--    should not be the thing a player parses."  (— hence attach_sentence_number)
--
-- WHAT CAME BEFORE. Job #408 put the six CORE recovery halves onto `pod-1` in
-- `canonical_pod_scenarios`, where a `variant_key` and the unique key
--   UNIQUE (pod_slug, scene_number, sentence_number, variant_key)
-- already let a continuation sit at the SAME coordinate as the base row rather
-- than after it. The per-course layer the player actually reads,
-- `listening_pod_sentences`, had no variant column at all — so a recovery was
-- attached in canon and unreachable by a learner. This closes that half.
--
-- WHAT THIS ADDS.
--   1. listening_pod_sentences.variant_key   — NULL means "this is the walk".
--   2. listening_pod_sentences.attach_sentence_number
--      and canonical_pod_scenarios.attach_sentence_number
--      — the base walk's sentence_number, within the row's own scene_number,
--        that a continuation branches from. NULL on every base row, always.
--   3. The unique key on listening_pod_sentences widened to include
--      variant_key — WITHOUT weakening the base-row guarantee.
--
-- THE NULLS TRAP, AND WHY `NULLS NOT DISTINCT`. Simply replacing
--   UNIQUE (pod_id, scene_number, sentence_number)
-- with the four-column version would SILENTLY WEAKEN it: Postgres treats NULLs
-- as distinct in a unique index by default, so two base rows could then both
-- occupy scene 2 sentence 5 with nothing to stop them. `NULLS NOT DISTINCT`
-- (PostgreSQL 15+; this database is 17.6) treats NULL = NULL for uniqueness,
-- which is exactly the guarantee wanted: two base rows at one coordinate stay
-- forbidden, two rows of the same flow at one coordinate stay forbidden, and a
-- base row plus a differently-keyed continuation is allowed. One index, one
-- rule, no partial-index pair to keep in step.
--
-- UNIQUE (pod_id, global_order) IS DELIBERATELY UNTOUCHED. Continuations take
-- global_order out of band (10001+), so even a reader that knows nothing about
-- variants sorts them AFTER their scene rather than into it. That is a safety
-- net, not the mechanism.
--
-- BLAST RADIUS AT WRITE TIME: 24,744 existing listening_pod_sentences rows and
-- 622 canonical_pod_scenarios rows, every one of which gets NULL in both new
-- columns and is otherwise untouched. No row's text, order, audio or slot id
-- changes. Nothing becomes visible to a learner by running this file alone.

BEGIN;

-- 1. The per-course layer learns to say "this is a continuation".
ALTER TABLE listening_pod_sentences
  ADD COLUMN IF NOT EXISTS variant_key text,
  ADD COLUMN IF NOT EXISTS attach_sentence_number integer;

COMMENT ON COLUMN listening_pod_sentences.variant_key IS
  'NULL = this row is part of the pod''s linear walk. Non-NULL = a continuation '
  'attached at (scene_number, attach_sentence_number), never appended to the walk. '
  'Mirrors canonical_pod_scenarios.variant_key. Readers: services/shared/canonical-slate.cjs '
  '(server) and packages/player-vue/src/composables/podSlate.ts (client).';

COMMENT ON COLUMN listening_pod_sentences.attach_sentence_number IS
  'For a continuation: the sentence_number of the BASE walk row, within this row''s own '
  'scene_number, that the flow branches from. NULL on every base row.';

-- 2. The same coordinate on the canonical layer, so the promotion path can
--    carry it rather than re-parsing scene_subtitle prose.
ALTER TABLE canonical_pod_scenarios
  ADD COLUMN IF NOT EXISTS attach_sentence_number integer;

COMMENT ON COLUMN canonical_pod_scenarios.attach_sentence_number IS
  'For a variant row: the sentence_number of the base walk row, within this row''s own '
  'scene_number, that the flow branches from. NULL on every base row. Supersedes the '
  'attach point recorded in scene_subtitle prose ("attaches to POD 1 scene 2 at g8-g9"), '
  'which is deliberately left intact.';

-- 3. Widen the coordinate key without loosening it.
ALTER TABLE listening_pod_sentences
  DROP CONSTRAINT IF EXISTS listening_pod_sentences_pod_id_scene_number_sentence_number_key;

ALTER TABLE listening_pod_sentences
  ADD CONSTRAINT listening_pod_sentences_pod_scene_sent_variant_key
  UNIQUE NULLS NOT DISTINCT (pod_id, scene_number, sentence_number, variant_key);

COMMIT;
