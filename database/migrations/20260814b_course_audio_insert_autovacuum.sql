-- 20260814b_course_audio_insert_autovacuum.sql
--
-- Keeps course_audio's visibility map fresh after bulk renders, which is what keeps
-- estate_map()'s voice_rows an index-only scan instead of a heap crawl.
--
-- Measured on the live estate, 2026-08-14, on the same query minutes apart:
--
--   799,102 heap fetches   28,057ms    (visibility map stale, table under bulk write)
--         0 heap fetches    1,311ms    (immediately after VACUUM)
--
-- Same 2.56M rows, same 32MB index, same plan. The whole difference is whether
-- Postgres trusts the visibility map. estate_map() as a whole: 47s -> 1.04s.
--
-- course_audio already carried autovacuum_vacuum_scale_factor=0.05, which governs
-- vacuums triggered by DEAD tuples — updates and deletes. The way this table
-- actually grows is INSERTs: renders land tens of thousands of clips at a time and
-- produce no dead tuples at all, so the dead-tuple trigger never fires and the newly
-- written pages simply stay not-all-visible. That path is governed by
-- autovacuum_vacuum_insert_scale_factor, which was still at the 0.2 default —
-- ~513,000 inserted rows before a vacuum. Every render batch smaller than that left
-- the visibility map degraded until something else happened to vacuum the table.
--
-- 0.02 + a 20,000-row floor puts the trigger at roughly one render batch. A vacuum
-- of this table costs about 7.6s when it is not far behind; a stale visibility map
-- costs the estate map its entire 8s budget.
--
-- Reversible: ALTER TABLE public.course_audio RESET
--   (autovacuum_vacuum_insert_scale_factor, autovacuum_vacuum_insert_threshold);

ALTER TABLE public.course_audio SET (
  autovacuum_vacuum_insert_scale_factor = 0.02,
  autovacuum_vacuum_insert_threshold    = 20000
);
