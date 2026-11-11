-- Rollback for 20261111_human_authored_presentations_soft_guard.sql.
-- Soft marks are DELETED first (they would otherwise become hard marks and start refusing writes),
-- then the column goes and the trigger function returns to its 2026-09-21 body.
BEGIN;
DELETE FROM public.human_authored_presentations WHERE guard = 'soft';
CREATE OR REPLACE FUNCTION public.guard_human_authored_presentation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE v_mark public.human_authored_presentations%ROWTYPE;
BEGIN
  IF NEW.role <> 'presentation' OR NEW.lego_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_mark FROM public.human_authored_presentations WHERE course_code = NEW.course_code AND lego_id = NEW.lego_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF public.normalize_text(NEW.text) IS DISTINCT FROM public.normalize_text(v_mark.text) THEN
    RAISE EXCEPTION USING ERRCODE = 'check_violation',
      MESSAGE = format('REFUSED: the presentation line of %s/%s is human-authored (by %s) and this write would replace its words. '
        'Its wording is kept in human_authored_presentations; to change it, record the new wording there first '
        'through services/shared/human-authored-presentations.cjs (recordWordingEdit / reconcileMark), which logs who changed it and why. '
        'Attempted: %s', NEW.course_code, NEW.lego_id, v_mark.author, left(NEW.text, 160)),
      HINT = 'A course-wide regeneration must not template-overwrite a human-authored presentation (Kai, 2026-09-21).';
  END IF;
  RETURN NEW;
END; $$;
ALTER TABLE public.human_authored_presentations DROP CONSTRAINT IF EXISTS human_authored_presentations_guard_check;
ALTER TABLE public.human_authored_presentations DROP COLUMN IF EXISTS guard;
COMMIT;
NOTIFY pgrst, 'reload schema';
