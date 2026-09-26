-- Rollback of 20260926_security_definer_views_locked.sql: restores the prior
-- (linter-flagged) state — owner-rights views, full grants to anon/authenticated.
BEGIN;
ALTER VIEW public.voice_guide_in_use RESET (security_invoker);
GRANT ALL ON public.voice_guide_in_use TO anon, authenticated;
ALTER VIEW public.pod_text_divergence RESET (security_invoker);
GRANT ALL ON public.pod_text_divergence TO anon, authenticated;
ALTER VIEW public.serving_pod RESET (security_invoker);
GRANT ALL ON public.serving_pod TO anon, authenticated;
ALTER VIEW public.human_clip_speakers RESET (security_invoker);
GRANT ALL ON public.human_clip_speakers TO anon, authenticated;
ALTER VIEW public.course_human_recorded_roles RESET (security_invoker);
GRANT ALL ON public.course_human_recorded_roles TO anon, authenticated;
COMMIT;
