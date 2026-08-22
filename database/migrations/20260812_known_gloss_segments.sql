-- The literal gloss segmentation — known-language chunks aligned under TARGET
-- WORDS, in the target's own order.
--
-- Why (Tom, 2026-08-12): "Breakdowns should always be about helping the learner
-- see how the correct grammar of the target language maps to the known
-- language, so word order of target must be preserved and known language will
-- look wrong when the orders differ (cosa azul = blue thing maps literally to
-- thing blue)." Basque `hitz bat` therefore glosses `word` `a`, deliberately
-- ungrammatical in English, never reordered to "a word".
--
-- Why this is a NEW column and not a rewrite of `decomposition`:
-- `decomposition` is chunked by LEGO, not by word — `hitz bat esan nahi dut` is
-- 3 blocks over 5 target words, and only 2,615 of eus_for_eng's 6,380 decomposed
-- rows happen to have one block per word. The learner's player renders those
-- blocks as TILES and requires the salient LEGO to remain a single tile
-- (LearningPlayer.vue, "Strategy 0 (authoritative)"). Splitting them to
-- per-word columns would shatter that tiling and the salient highlight with it.
-- So the per-word alignment lives beside the tiling, and neither can break the
-- other.
--
-- Shape: an ordered array of chunks covering the target words left to right.
--   [{"span": 2, "known": "a word"}, {"span": 1, "known": ""}, ...]
--   span   how many consecutive target words this chunk sits under (>= 1)
--   known  the literal gloss shown under them (may be empty)
-- The spans always sum to the row's target word count. A chunk spanning several
-- words is many-to-one; an empty chunk beside a wide neighbour is one-to-many.
-- Both fall out of where the breaks are, with no special case (Tom: "sometimes
-- total word counts do not match and that is OK").
--
-- This is PRESENTATIONAL ONLY. It never carries target text or known text —
-- only how an existing gloss is cut and which target words each piece sits
-- under. Nothing here can invalidate an audio clip.
--
-- NULL means "not segmented by a human yet"; readers derive a faithful starting
-- segmentation from `decomposition` / `components` (each block's gloss spanning
-- exactly that block's target words) rather than guessing a per-word split.

ALTER TABLE course_practice_phrases ADD COLUMN IF NOT EXISTS known_gloss_segments JSONB;
ALTER TABLE course_legos ADD COLUMN IF NOT EXISTS known_gloss_segments JSONB;

COMMENT ON COLUMN course_practice_phrases.known_gloss_segments IS
  'Literal known-language gloss chunks aligned under target words, in target order. [{span,known}], spans sum to the target word count. Presentational only — never text, never audio-affecting. NULL = derive from decomposition.';
COMMENT ON COLUMN course_legos.known_gloss_segments IS
  'Literal known-language gloss chunks aligned under target words, in target order. [{span,known}], spans sum to the target word count. Presentational only. NULL = derive from components.';
