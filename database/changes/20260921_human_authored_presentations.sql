-- 20260921_human_authored_presentations.sql
--
-- Kai's ruling, 2026-09-21 (job #506): a presentation line a HUMAN wrote — today
-- the two German separable-verb lines on deu_for_eng seeds 83 and 92, Kai's own
-- words — must never be template-overwritten by a course-wide regeneration, and
-- must never be silently skipped either. It is NOT immutable: when the LEGO under
-- it moves, an agent may reword it to keep it accurate (maintenance, no approval
-- gate); only a concept-level break goes to Kai, through course_qa_flags.
--
-- THE MARK IS KEYED TO THE LEGO, NOT TO THE ROW. Presentation rows in
-- course_audio are disposable in this codebase: /regenerate-presentations adds a
-- pending row beside the old one, /generate purges stale pending rows, the
-- text-change trigger on course_legos nulls the FK, repair tools insert a new row
-- and delete the old, and edit-cascade deletes and re-inserts the LEGO rows
-- themselves (job #497 unlinked a row and inserted a fresh one; #501 repaired it
-- by hand). A mark on a row dies with the row. (course_code, lego_id) is the one
-- identity that survives all of that — lego_id is generated from seed_number and
-- lego_index — so the mark lives in its own table under that key, with no FK to
-- course_legos, precisely so a delete-and-reinsert of the LEGO cannot cascade it
-- away.
--
-- THE TRIGGER IS THE LAST LINE OF DEFENCE. Every path that writes a presentation
-- row — services, tools, a psql session months from now — goes through this
-- table, so this is the one chokepoint at which "a regeneration ate Kai's words
-- and reported success" can be made impossible rather than merely unlikely. A
-- write of DIFFERENT words to a marked LEGO's presentation is REFUSED with a
-- plain-English error naming the LEGO and the module that knows how to do it
-- properly (update the mark first, through services/shared/
-- human-authored-presentations.cjs, which records who changed the wording and
-- why). A refused write is an error the caller sees — loud, never silent.
--
-- Reader/writer: services/shared/human-authored-presentations.cjs.
-- Escalation reader: src/views/production/QAReview.vue via GET /qa/flags/:courseCode.
BEGIN;

CREATE TABLE IF NOT EXISTS public.human_authored_presentations (
  course_code             text NOT NULL REFERENCES public.courses(course_code),
  lego_id                 text NOT NULL,
  -- The wording as it stands. The single source of truth for what the
  -- presentation of this LEGO says; course_audio rows carry copies of it.
  text                    text NOT NULL,
  author                  text NOT NULL,
  authored_on             date,
  -- Where the wording came from (a ruling, a job, a file that records it).
  source                  text,
  -- The LEGO revision the wording was last reconciled against. Texts, not a
  -- version number: edit-cascade deletes and re-inserts course_legos, which
  -- resets course_legos.version, and the texts are what the wording describes.
  reconciled_known_text   text,
  reconciled_target_text  text,
  reconciled_at           timestamptz,
  reconciled_by           text,
  -- The course_qa_flags row raised for a concept-level break, while it is open.
  open_flag_id            uuid REFERENCES public.course_qa_flags(id) ON DELETE SET NULL,
  -- Append-only record of every decision taken about this line: marked, edited,
  -- kept, rewritten, escalated — each with who, when, why, and the old and new
  -- LEGO and wording. A human reads this to see what was decided and why.
  decisions               jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_code, lego_id)
);

COMMENT ON TABLE public.human_authored_presentations IS
  'Presentation lines a human wrote (Kai''s ruling 2026-09-21, job #506). Keyed to the LEGO, not the course_audio row, so row replacement cannot lose the mark. Writer: services/shared/human-authored-presentations.cjs.';

-- The guard. BEFORE INSERT, and BEFORE UPDATE OF text: a byte swap (new S3 key,
-- new voice, veracity columns) on an existing row is not a wording change and
-- must not be blocked — make-before-break relies on those updates.
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
  IF NOT FOUND THEN
    RETURN NEW;
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

DROP TRIGGER IF EXISTS trg_guard_human_authored_presentation ON public.course_audio;
CREATE TRIGGER trg_guard_human_authored_presentation
  BEFORE INSERT OR UPDATE OF text ON public.course_audio
  FOR EACH ROW EXECUTE FUNCTION public.guard_human_authored_presentation();

-- The escalation goes through the existing QA-flags path, as a check_type of its own.
ALTER TABLE public.course_qa_flags DROP CONSTRAINT IF EXISTS course_qa_flags_check_type_check;
ALTER TABLE public.course_qa_flags ADD CONSTRAINT course_qa_flags_check_type_check
  CHECK (check_type = ANY (ARRAY[
    'grammar'::text, 'semantic'::text, 'naturalness'::text, 'lego_frequency'::text,
    'lego_spread'::text, 'variety'::text, 'vocabulary'::text,
    'structural_feature'::text, 'human_authored_presentation'::text
  ]));

-- Canary, inside the transaction: the guard refuses different words, admits the
-- same words (whitespace/case/terminal punctuation aside), ignores unmarked LEGOs
-- and non-presentation roles, and the new check_type is admitted. All canary rows
-- are removed before COMMIT.
DO $$
DECLARE c text; v_id uuid;
BEGIN
  SELECT course_code INTO c FROM public.courses ORDER BY course_code LIMIT 1;
  INSERT INTO public.human_authored_presentations (course_code, lego_id, text, author, source)
    VALUES (c, 'S9999L99', 'Canary words, written by a human.', 'canary', '__canary_20260921_hap__');

  -- 1. different words → refused
  BEGIN
    INSERT INTO public.course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, lego_id)
      VALUES (c, 'The template for: canary, is:', 'the template for: canary, is:', 'eng', 'presentation', 'azure_en-GB-CanaryNeural', 'tts', 'pending/__CANARY_HAP_1__.mp3', 'S9999L99');
    RAISE EXCEPTION 'canary: a template overwrite of a human-authored presentation was admitted';
  EXCEPTION WHEN check_violation THEN
    NULL; -- refused, as it must be
  END;

  -- 2. the same words → admitted; a byte swap on that row → admitted; a wording change on it → refused
  INSERT INTO public.course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, lego_id)
    VALUES (c, 'Canary words, written by a human.', 'canary words, written by a human', 'eng', 'presentation', 'azure_en-GB-CanaryNeural', 'tts', 'pending/__CANARY_HAP_2__.mp3', 'S9999L99')
    RETURNING id INTO v_id;
  UPDATE public.course_audio SET s3_key = 'mastered/__CANARY_HAP_2__.mp3', duration_ms = 1234 WHERE id = v_id;
  BEGIN
    UPDATE public.course_audio SET text = 'Different words.' WHERE id = v_id;
    RAISE EXCEPTION 'canary: a wording change on a human-authored presentation row was admitted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- 3. an unmarked LEGO, and a non-presentation role on the marked LEGO → untouched
  INSERT INTO public.course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, lego_id)
    VALUES (c, 'The template for: other, is:', 'the template for: other, is:', 'eng', 'presentation', 'azure_en-GB-CanaryNeural', 'tts', 'pending/__CANARY_HAP_3__.mp3', 'S9999L98');
  INSERT INTO public.course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, lego_id)
    VALUES (c, 'zustimmen-canary', 'zustimmen-canary', 'deu', 'target1', 'azure_en-GB-CanaryNeural', 'tts', 'pending/__CANARY_HAP_4__.mp3', 'S9999L99');

  -- 4. the new check_type is admitted
  INSERT INTO public.course_qa_flags (course_code, check_type, severity, issue, details, status)
    VALUES (c, 'human_authored_presentation', 'error', '__canary_20260921_hap__', '{"kind":"canary"}', 'ignored');

  DELETE FROM public.course_qa_flags WHERE issue = '__canary_20260921_hap__';
  DELETE FROM public.course_audio WHERE voice_id = 'azure_en-GB-CanaryNeural' AND s3_key LIKE '%__CANARY_HAP_%';
  DELETE FROM public.human_authored_presentations WHERE source = '__canary_20260921_hap__';
END $$;

COMMIT;
