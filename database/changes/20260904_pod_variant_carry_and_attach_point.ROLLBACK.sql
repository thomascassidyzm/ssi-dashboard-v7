-- Rollback for 20260904_pod_variant_carry_and_attach_point.sql.
--
-- WARNING, READ BEFORE RUNNING. Dropping listening_pod_sentences.variant_key
-- turns every continuation row in every course pod into an ORDINARY LINE OF THE
-- WALK, because the readers that exclude continuations do so by that column.
-- A learner's walk would lengthen silently. Delete the continuation rows FIRST,
-- or do not run part 2 at all:
--
--   SELECT pod_id, count(*) FROM listening_pod_sentences
--    WHERE variant_key IS NOT NULL GROUP BY 1;
--   DELETE FROM listening_pod_sentences WHERE variant_key IS NOT NULL;
--
-- Part 1 (the attach-point columns) is safe to run on its own at any time: the
-- attach point is still recorded in canonical_pod_scenarios.scene_subtitle
-- prose, which this change deliberately never destroyed.

BEGIN;

-- Part 1 — the attach point goes back to living only in prose.
ALTER TABLE canonical_pod_scenarios  DROP COLUMN IF EXISTS attach_sentence_number;
ALTER TABLE listening_pod_sentences  DROP COLUMN IF EXISTS attach_sentence_number;

-- Part 2 — the variant column and the widened key. See the warning above.
ALTER TABLE listening_pod_sentences
  DROP CONSTRAINT IF EXISTS listening_pod_sentences_pod_scene_sent_variant_key;

ALTER TABLE listening_pod_sentences
  ADD CONSTRAINT listening_pod_sentences_pod_id_scene_number_sentence_number_key
  UNIQUE (pod_id, scene_number, sentence_number);

ALTER TABLE listening_pod_sentences DROP COLUMN IF EXISTS variant_key;

COMMIT;
