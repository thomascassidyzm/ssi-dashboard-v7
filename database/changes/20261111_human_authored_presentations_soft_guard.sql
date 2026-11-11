-- 20261111_human_authored_presentations_soft_guard.sql
--
-- Kai, 2026-11-11 (job #247·AH): the human-authored mark becomes GENERAL (every course, every
-- known language) and gains a SOFT level. A soft mark records the hand-written wording of a LEGO
-- intro so that every rebuild path can WARN — old line vs new line, with a suggestion to carry
-- the old "as in" example where it still fits (services/shared/intro-authorship.cjs) — and never
-- refuses the write. The two existing HARD marks (Kai's 2026-09-21 ruling: the trigger refuses
-- different words, phase8 re-uses the mark's words) are unchanged: the column defaults to 'hard'.
--
-- Effect, precisely:
--   guard = 'hard'  (default; every existing row) — exactly today's behaviour.
--   guard = 'soft'  — the trigger lets any wording through; phase8 does NOT substitute the
--                     mark's words or run the maintenance judge (human-authored-presentations.cjs
--                     loadMarks filters soft marks out); rebuilds report a warning instead.
--
-- NOT APPLIED BY THE JOB THAT WROTE IT. A migration on the shared database is Tom's go
-- (CLAUDE.md: owner login, sudo -u popty). Until it is applied, soft marks cannot be written
-- (the mark route answers with this file's name) and everything else runs as before.
-- Rollback: 20261111_human_authored_presentations_soft_guard.ROLLBACK.sql
BEGIN;

ALTER TABLE public.human_authored_presentations
  ADD COLUMN IF NOT EXISTS guard text NOT NULL DEFAULT 'hard';
ALTER TABLE public.human_authored_presentations
  DROP CONSTRAINT IF EXISTS human_authored_presentations_guard_check;
ALTER TABLE public.human_authored_presentations
  ADD CONSTRAINT human_authored_presentations_guard_check CHECK (guard IN ('hard', 'soft'));
COMMENT ON COLUMN public.human_authored_presentations.guard IS
  'hard = the trigger refuses other words (Kai 2026-09-21); soft = rebuilds warn and suggest, never refuse (Kai 2026-11-11, job #247). Reader: services/shared/intro-authorship.cjs.';

CREATE OR REPLACE FUNCTION public.guard_human_authored_presentation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_mark public.human_authored_presentations%ROWTYPE;
BEGIN
  IF NEW.role <> 'presentation' OR NEW.lego_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_mark FROM public.human_authored_presentations
   WHERE course_code = NEW.course_code AND lego_id = NEW.lego_id;
  IF NOT FOUND OR v_mark.guard = 'soft' THEN
    RETURN NEW;  -- a soft mark warns in the application; it never refuses here
  END IF;
  IF public.normalize_text(NEW.text) IS DISTINCT FROM public.normalize_text(v_mark.text) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = format(
        'REFUSED: the presentation line of %s/%s is human-authored (by %s) and this write would replace its words. '
        'Its wording is kept in human_authored_presentations; to change it, record the new wording there first '
        'through services/shared/human-authored-presentations.cjs (recordWordingEdit / reconcileMark), which logs who changed it and why. '
        'Attempted: %s',
        NEW.course_code, NEW.lego_id, v_mark.author, left(NEW.text, 160)),
      HINT = 'A course-wide regeneration must not template-overwrite a human-authored presentation (Kai, 2026-09-21).';
  END IF;
  RETURN NEW;
END;
$$;

-- Canary: a soft mark admits different words; a hard mark still refuses them.
DO $$
DECLARE c text;
BEGIN
  SELECT course_code INTO c FROM public.courses ORDER BY course_code LIMIT 1;
  INSERT INTO public.human_authored_presentations (course_code, lego_id, text, author, source, guard)
    VALUES (c, 'S9999L97', 'Soft canary words.', 'canary', '__canary_20261111_soft__', 'soft'),
           (c, 'S9999L96', 'Hard canary words.', 'canary', '__canary_20261111_soft__', 'hard');
  INSERT INTO public.course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, lego_id)
    VALUES (c, 'The template for: soft canary, is:', 'the template for: soft canary, is:', 'eng', 'presentation', 'azure_en-GB-CanaryNeural', 'tts', 'pending/__CANARY_SOFT_1__.mp3', 'S9999L97');
  BEGIN
    INSERT INTO public.course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, lego_id)
      VALUES (c, 'The template for: hard canary, is:', 'the template for: hard canary, is:', 'eng', 'presentation', 'azure_en-GB-CanaryNeural', 'tts', 'pending/__CANARY_SOFT_2__.mp3', 'S9999L96');
    RAISE EXCEPTION 'canary: a hard mark admitted different words';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
  DELETE FROM public.course_audio WHERE voice_id = 'azure_en-GB-CanaryNeural' AND s3_key LIKE '%__CANARY_SOFT_%';
  DELETE FROM public.human_authored_presentations WHERE source = '__canary_20261111_soft__';
END $$;

COMMIT;
NOTIFY pgrst, 'reload schema';
