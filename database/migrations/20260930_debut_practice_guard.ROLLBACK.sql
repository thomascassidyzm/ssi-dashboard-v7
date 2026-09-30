-- Rollback for 20260930_debut_practice_guard.sql (job #912). Removes the guard; the JS wipe paths keep
-- working because wipe_seed_teaching() is left in place only if you skip its DROP below — drop it only
-- after reverting the callers (services/shared/wipe-seed-teaching.cjs).
DROP TRIGGER IF EXISTS debut_keeps_practice ON public.course_practice_phrases;
DROP TRIGGER IF EXISTS debut_keeps_practice ON public.course_legos;
DROP FUNCTION IF EXISTS public.debut_guard_phrase();
DROP FUNCTION IF EXISTS public.debut_guard_lego();
DROP FUNCTION IF EXISTS public.debut_guard_assert(text, int, int, text);
DROP FUNCTION IF EXISTS public.debut_practice_gaps(text[]);
DROP FUNCTION IF EXISTS public.debut_is_practised(text, int, int, text);
DROP FUNCTION IF EXISTS public.debut_norm(text);
-- DROP FUNCTION IF EXISTS public.wipe_seed_teaching(text, int[]);
