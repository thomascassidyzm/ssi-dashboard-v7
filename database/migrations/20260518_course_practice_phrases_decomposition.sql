-- =============================================================================
-- Add precomputed phrase-decomposition storage to course_practice_phrases.
-- See new_vision/PHRASE_DECOMPOSITION_SPEC.md for the full design.
--
-- Why: runtime LEGO alignment in LegoAssembly.vue falls back to per-character
-- ghost tiles for scripts without whitespace word boundaries (Chinese being
-- the worst offender). Doing decomposition at phrase-construction time —
-- when the full seed -> LEGO graph is visible — produces a stable, editable
-- block list that the runtime can render directly. Runtime alignment stays as
-- the safety-net path; the new column is the fast path.
--
-- Columns:
--   - decomposition jsonb (nullable)
--       Ordered array of blocks: [{legoId, target, known, isGhost}, ...].
--       Nullable because old rows have no decomposition yet and the backfill
--       is a separate one-shot job (not in this migration).
--
--   - decomposition_course_version integer (nullable)
--       Snapshot of courses.version at the moment the decomposition was
--       computed. A phrase whose stored value is less than the course's
--       current version is "stale" — its decomposition may be improvable by
--       a newly-added LEGO. The auditing endpoint and lazy-recompute job key
--       off this column.
--
-- No data backfill here. A future one-shot job walks existing phrases and
-- populates these columns.
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_course_practice_phrases_decomp_version;
--   ALTER TABLE course_practice_phrases DROP COLUMN IF EXISTS decomposition_course_version;
--   ALTER TABLE course_practice_phrases DROP COLUMN IF EXISTS decomposition;
-- =============================================================================

ALTER TABLE course_practice_phrases
  ADD COLUMN IF NOT EXISTS decomposition jsonb;

ALTER TABLE course_practice_phrases
  ADD COLUMN IF NOT EXISTS decomposition_course_version integer;

COMMENT ON COLUMN course_practice_phrases.decomposition IS
  'Ordered array of LEGO/ghost blocks: [{legoId, target, known, isGhost}]. Concatenated targets must equal target_text. NULL = not yet computed (runtime falls back to alignment).';

COMMENT ON COLUMN course_practice_phrases.decomposition_course_version IS
  'Snapshot of courses.version at decomposition time. If less than courses.version, this phrase decomposition is stale and a recompute should be considered.';

-- Index to make "find phrases whose decomposition is stale" cheap.
-- Indexing only non-null values keeps the index small — NULL rows are
-- "never computed" and are handled by the schema-default scan path, not by
-- this index.
CREATE INDEX IF NOT EXISTS idx_course_practice_phrases_decomp_version
  ON course_practice_phrases (course_code, decomposition_course_version)
  WHERE decomposition_course_version IS NOT NULL;

-- Reload PostgREST schema cache so the new columns are visible to API clients.
NOTIFY pgrst, 'reload schema';
