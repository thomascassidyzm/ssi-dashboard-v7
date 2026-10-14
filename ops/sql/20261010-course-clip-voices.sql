-- Cast gate v2 leg (b) (Tom 2026-10-10, r-2026-10-10-new-phrase-audio-may-render-only): "is this course's
-- audio in a language all Azure?" needs the course's (role, language, voice) set on every phase8 plan.
-- course_voice_census() answers it but canonicalises and takes a percentile per row and hit PostgREST's
-- statement timeout on the 90k-clip courses; this is the bare GROUP BY (~1s on ita_for_eng), and the gate
-- canonicalises in JS. Read-only, additive. Rollback: 20261010-course-clip-voices.ROLLBACK.sql
CREATE OR REPLACE FUNCTION public.course_clip_voices(p_course text)
RETURNS TABLE(role text, language text, voice_id text, clips bigint)
LANGUAGE sql STABLE
SET statement_timeout = '30s'
AS $$
  SELECT ca.role, ca.language, ca.voice_id, count(*) AS clips
  FROM course_audio ca
  WHERE ca.course_code = p_course
  GROUP BY 1, 2, 3
$$;
REVOKE ALL ON FUNCTION public.course_clip_voices(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.course_clip_voices(text) TO service_role;
