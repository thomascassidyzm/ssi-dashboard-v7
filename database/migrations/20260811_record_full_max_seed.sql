-- Record-everything cutoff, per course.
--
-- Kai's blind listening test (2026-08-11): joins between glued LEGO pieces are
-- audible on real human recordings, and get MORE obvious deeper into a course.
-- Fix: seeds 1..N are recorded as complete whole utterances (nothing cut, nothing
-- glued); seeds past N keep the existing fast-and-slow covering-subset flow.
--
-- 0 = off, which is every existing course. Fast-and-slow stays the default for
-- anyone who does not deliberately set a cutoff.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS record_full_max_seed integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.courses.record_full_max_seed IS
  'Record-everything seed cutoff: seeds 1..N are recorded as whole utterances (no LEGO splicing); seeds beyond N use the fast-and-slow covering-subset flow. 0 = off (default).';

ALTER TABLE public.courses
  ADD CONSTRAINT courses_record_full_max_seed_nonneg
  CHECK (record_full_max_seed >= 0);
