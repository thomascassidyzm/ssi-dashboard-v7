-- =============================================================================
-- Add precomputed DISPLAY TILING to course_practice_phrases.
--
-- Why: for scripts without whitespace word boundaries (Japanese, Thai, Chinese)
-- the learning app can't reliably align the romanisation to the native text at
-- render time — the native has no word spaces and the romaji's boundaries don't
-- map 1:1 to native characters. Doing the alignment at build time — when we can
-- hand a tokeniser BOTH the native text and its already-correct romanisation —
-- produces a stable, editable list of {native, roman} display tiles that the
-- runtime renders directly (native glyph primary, romanisation as a ruby).
--
-- This is DISPLAY-ONLY. It does NOT touch audio, the audio<->text matching
-- (which is whole-phrase, by audio id), `target_text_roman` (kept verbatim —
-- display_tiling's roman pieces concatenate back to it), or the pedagogical
-- `decomposition` (LEGO/ghost/salient). It is purely additive.
--
-- Columns:
--   - display_tiling jsonb (nullable)
--       Ordered array of tiles: [{ "n": <native piece>, "r": <roman piece>,
--       "salient": <bool> }, ...]. Concatenated "n" == target_text;
--       concatenated "r" (spaces ignored) == target_text_roman. `salient`
--       marks tiles inside the phrase's salient LEGO (for bold emphasis).
--       Nullable: NULL = not computed yet, runtime falls back to its own
--       segmentation (Intl.Segmenter + aligner).
--
--   - display_tiling_version integer (nullable)
--       Snapshot of courses.version at compute time, for staleness audits —
--       same pattern as decomposition_course_version.
--
-- No data backfill here — a separate one-shot job populates these.
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_course_practice_phrases_tiling_version;
--   ALTER TABLE course_practice_phrases DROP COLUMN IF EXISTS display_tiling_version;
--   ALTER TABLE course_practice_phrases DROP COLUMN IF EXISTS display_tiling;
-- =============================================================================

ALTER TABLE course_practice_phrases
  ADD COLUMN IF NOT EXISTS display_tiling jsonb;

ALTER TABLE course_practice_phrases
  ADD COLUMN IF NOT EXISTS display_tiling_version integer;

COMMENT ON COLUMN course_practice_phrases.display_tiling IS
  'Ordered array of display tiles: [{n: native, r: roman, salient: bool}]. Concatenated n == target_text; concatenated r (spaces ignored) == target_text_roman. Display-only (native-primary + romanisation ruby); does not affect audio. NULL = not computed (runtime falls back to its own segmentation).';

COMMENT ON COLUMN course_practice_phrases.display_tiling_version IS
  'Snapshot of courses.version at display-tiling compute time. If less than courses.version the tiling may be stale (salient LEGO changed) and a recompute should be considered.';

-- Cheap "find phrases whose tiling is stale / uncomputed" lookups.
CREATE INDEX IF NOT EXISTS idx_course_practice_phrases_tiling_version
  ON course_practice_phrases (course_code, display_tiling_version)
  WHERE display_tiling_version IS NOT NULL;

-- Reload PostgREST schema cache so the new columns are visible to API clients.
NOTIFY pgrst, 'reload schema';
