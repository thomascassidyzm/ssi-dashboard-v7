-- Rollback for 20260812_known_gloss_segments.sql
--
-- Dropping these columns loses every human-made segmentation and nothing else:
-- the columns are additive and nothing outside the mapping viewer reads them,
-- so the learner path, the tiling and every audio pointer are unaffected.
-- Readers fall back to deriving alignment from `decomposition` / `components`.

ALTER TABLE course_practice_phrases DROP COLUMN IF EXISTS known_gloss_segments;
ALTER TABLE course_legos DROP COLUMN IF EXISTS known_gloss_segments;
