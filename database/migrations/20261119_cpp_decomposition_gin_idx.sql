-- cs #945 — NOT RUN. Runs as popty on Tom's go (schema is Tom's): sudo -u popty -H <runner> this file.
-- The tile refresh (services/shared/decomposition-refresh.cjs refreshTilesForSlots) finds the phrases
-- naming a changed LEGO slot with  decomposition @> ANY('{[{"legoId":"S0100L01"}]}'::jsonb[]).
-- Without this index that is a scan of every phrase row in the course on each LEGO-changing batch;
-- with it, an index lookup. No code change needed: the query is already in the containment form.
-- Index-only, built CONCURRENTLY (run outside a transaction). No API surface changes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpp_decomposition_path
  ON public.course_practice_phrases USING gin (decomposition jsonb_path_ops);
