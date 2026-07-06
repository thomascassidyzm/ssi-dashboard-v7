-- GATED: purge the pending/% presentation placeholder rows, suite-wide.
--
-- These are presentation TEXTS parked in course_audio with s3_key LIKE
-- 'pending/%' by the old two-stage pipeline ("Generate Missing Presentation
-- Text" → "Generate Missing Audio"). As of 2026-07-05 /generate authors
-- missing intro text itself (frozen frame + context judgment — see
-- docs/presentation-authoring-redesign.md), so these rows are recomputable
-- by construction and course_audio should only ever hold real audio.
--
-- Measured 2026-07-05 (11,124 rows across 7 courses): 7,443 are component
-- rows with lego_id=NULL (the orphan-prone class), 2,367 point at LEGOs that
-- ALREADY have real bound presentation audio (a queued re-rendering wave,
-- not missing work — deleting keeps the live audio exactly as-is). The
-- remainder cover genuinely-missing intros, which /generate now authors
-- fresh (better texts: judged context instead of the old 85% dice-roll).
--
-- ⚠️ APPLY ONLY AFTER the one-button /generate (commit fddc8c6b) is running
-- on every machine that hosts phase8 (Camberley + any local pm2) — the old
-- code needs these rows to produce presentation audio at all.
--
-- Pilot precedent: ben_for_eng seeds 4/9/139/143 rows deleted 2026-07-05,
-- new path authored + rendered + bound the genuinely-missing intros clean.
--
-- After this purge, per-course /needs recomputes truthfully: toAuthor shows
-- real intro work, the transition branches in getAudioNeeds go dead (can be
-- removed at leisure), and no course carries a phantom "Pending" count.

DELETE FROM public.course_audio
WHERE role = 'presentation'
  AND s3_key LIKE 'pending/%';

NOTIFY pgrst, 'reload schema';
