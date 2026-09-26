-- Supabase linter 0010 security_definer_view (5 ERRORs, Tom 2026-09-26 21:39Z).
-- These five views ran with their owner's (postgres) rights, and anon/authenticated
-- held full grants on them, so the public anon key could read past RLS — e.g. anon
-- saw all 68 serving_pod rows, including pods whose visibility is not 'live'.
--
-- Every real reader is server-side on the service role or postgres (both BYPASSRLS):
--   voice_guide_in_use          services/voicelab/registry.cjs, human-recorded-roles.cjs
--   human_clip_speakers         services/voicelab/speakers.cjs
--   course_human_recorded_roles services/shared/human-recorded-roles.cjs,
--                               tools/voice/verify-human-voice-cast-guard.cjs (pg)
--   serving_pod                 public.estate_map() -> production-api /api/estate-map
--   pod_text_divergence         tools/pods/pod-one-text-per-language.test.cjs (pg)
-- ssi-learning-app (main/dev/staging/red) reads none of them; its pod listing
-- reads listening_pods directly under that table's own RLS.
--
-- So: REVOKE from anon/authenticated (they are server-only views), and also run
-- them as the invoker so no future grant can reopen the RLS bypass. For the
-- BYPASSRLS readers above neither change alters a single row they see.
BEGIN;
ALTER VIEW public.voice_guide_in_use SET (security_invoker = on);
REVOKE ALL ON public.voice_guide_in_use FROM anon, authenticated;
ALTER VIEW public.pod_text_divergence SET (security_invoker = on);
REVOKE ALL ON public.pod_text_divergence FROM anon, authenticated;
ALTER VIEW public.serving_pod SET (security_invoker = on);
REVOKE ALL ON public.serving_pod FROM anon, authenticated;
ALTER VIEW public.human_clip_speakers SET (security_invoker = on);
REVOKE ALL ON public.human_clip_speakers FROM anon, authenticated;
ALTER VIEW public.course_human_recorded_roles SET (security_invoker = on);
REVOKE ALL ON public.course_human_recorded_roles FROM anon, authenticated;
COMMIT;
