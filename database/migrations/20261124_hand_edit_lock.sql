-- HAND-EDIT LOCK — Aran's fine-tuning edits can never be overwritten by a regeneration (job #128·AL, 2026-11-24).
--
-- Aran's ruling (2026-11-24, he leads the method): his direct hand edits ALWAYS take priority over seed-derived
-- generation and must NEVER be overwritten by regeneration or extrapolation. Design settled as "Option A" of the
-- design note (watson /d/bbf8a5b7): a lock ON THE ROW, recording editor and time, ENFORCED HERE IN THE DATABASE, so a
-- writer that forgets to check cannot get round it.
--
-- WHO MAY WRITE A LOCKED ROW: only a transaction that declares itself the fine-tuning editor, with
--     SELECT set_config('popty.fine_tune_editor', '<editor email>', true)     -- transaction-local
-- which Popty's course editor does inside the edit door's own transaction (services/shared/course-edit-ops.cjs runPlans,
-- option handEditor; services/course-editor/course-editor-router.cjs). Everybody else:
--   UPDATE  of a guarded column on a locked row is HELD, not applied: the guarded columns keep their locked values, the
--           rest of the row (audio links, durations, flags…) is written as asked, and the row records the attempt in
--           hand_edit_held {at, by, wanted} — the quiet "the seed moved on under your line" flag the editor shows Aran.
--           Quiet on purpose (Aran's default, 2026-11-24): a cascade over a seed still lands everywhere else.
--   DELETE  of a locked row (or of a phrase placed by hand, or of a LEGO whose round order is hand-set) is REFUSED
--           with HAND_EDIT_LOCKED — a deletion is never quiet.
--   INSERT  can never be born locked: the lock columns are cleared on a non-editor insert.
-- An editor write that changes a guarded text column stamps the lock (hand_edited_by/at) — unless it sets those
-- columns itself, which is how the editor's Undo puts the previous lock state back.
--
-- COLUMNS
--   course_legos.hand_edited_by/at        the lock (intro item edited by hand)
--   course_legos.intro_text               Aran's wording for the spoken introduction. Until now the intro's words lived
--                                         only on the presentation CLIP (course_audio.text), which the editor never
--                                         read; the clip stays linked until new audio replaces it (make-before-break).
--   course_legos.phrase_order_hand_by/at  the round's "order set by hand" marker the learner app obeys (practice only)
--   course_practice_phrases.hand_edited_by/at  the lock (phrase edited, copied or added by hand)
--   course_practice_phrases.hand_order    the place Aran gave the phrase in its round's practice block (null = none)
--   *.hand_edit_held                      last write held back by the lock (jsonb), null when nothing was
--
-- Fires FIRST of the BEFORE-row triggers ('a0_' sorts ahead of human_take_lock and trg_null_*_audio_on_text_change),
-- so a held text change never reaches the trigger that would empty the row's audio slots.
--
-- Rollback: database/migrations/20261124_hand_edit_lock.ROLLBACK.sql (drops triggers, function and columns — the
-- columns hold Aran's lock and intro wording, so read them out first if any edits have been made).

-- One transaction; ADD COLUMN with no default is a catalogue change, but it needs a moment's exclusive lock on two
-- busy tables, so give up rather than queue behind a long reader.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.course_legos
  ADD COLUMN IF NOT EXISTS hand_edited_by text,
  ADD COLUMN IF NOT EXISTS hand_edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS intro_text text,
  ADD COLUMN IF NOT EXISTS phrase_order_hand_by text,
  ADD COLUMN IF NOT EXISTS phrase_order_hand_at timestamptz,
  ADD COLUMN IF NOT EXISTS hand_edit_held jsonb;

ALTER TABLE public.course_practice_phrases
  ADD COLUMN IF NOT EXISTS hand_edited_by text,
  ADD COLUMN IF NOT EXISTS hand_edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS hand_order smallint,
  ADD COLUMN IF NOT EXISTS hand_edit_held jsonb;

COMMENT ON COLUMN public.course_legos.hand_edited_at IS 'Hand-edit lock (Popty fine-tuning editor). Non-editor writes to guarded columns are held; deletes refused. See hand_edit_lock().';
COMMENT ON COLUMN public.course_legos.intro_text IS 'Hand-set wording of the spoken introduction (fine-tuning editor). Null = the presentation clip''s own text.';
COMMENT ON COLUMN public.course_legos.phrase_order_hand_at IS 'Round practice order set by hand: the player plays this LEGO''s practice phrases by hand_order instead of shortest-first.';
COMMENT ON COLUMN public.course_practice_phrases.hand_edited_at IS 'Hand-edit lock (Popty fine-tuning editor). See hand_edit_lock().';
COMMENT ON COLUMN public.course_practice_phrases.hand_order IS 'Place in its round''s hand-set practice order (only read when the LEGO has phrase_order_hand_at).';

CREATE OR REPLACE FUNCTION public.hand_edit_lock() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  editor text := nullif(current_setting('popty.fine_tune_editor', true), '');
  is_lego boolean := TG_TABLE_NAME = 'course_legos';
  wanted jsonb := '{}'::jsonb;
  locked boolean;
BEGIN
  -- INSERT ------------------------------------------------------------------------------------------------------
  IF TG_OP = 'INSERT' THEN
    IF editor IS NOT NULL THEN
      NEW.hand_edited_by := coalesce(NEW.hand_edited_by, editor);   -- a copy / an added line is born locked
      NEW.hand_edited_at := coalesce(NEW.hand_edited_at, now());
    ELSE
      NEW.hand_edited_by := NULL; NEW.hand_edited_at := NULL; NEW.hand_edit_held := NULL;
      IF is_lego THEN NEW.intro_text := NULL; NEW.phrase_order_hand_by := NULL; NEW.phrase_order_hand_at := NULL;
      ELSE NEW.hand_order := NULL; END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- DELETE ------------------------------------------------------------------------------------------------------
  IF TG_OP = 'DELETE' THEN
    -- Each table's own columns are read in its own branch: a PL/pgSQL expression naming a field the row type lacks
    -- fails when planned, whatever the AND around it says.
    IF editor IS NULL THEN
      locked := OLD.hand_edited_at IS NOT NULL;
      IF is_lego THEN
        IF OLD.phrase_order_hand_at IS NOT NULL THEN locked := true; END IF;
      ELSE
        IF OLD.hand_order IS NOT NULL THEN locked := true; END IF;
      END IF;
      IF locked THEN
        RAISE EXCEPTION 'HAND_EDIT_LOCKED: DELETE on % refused — the row was set by hand in the fine-tuning editor (%); only that editor may delete it',
          TG_TABLE_NAME, coalesce(OLD.hand_edited_by, 'order set by hand')
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE by the fine-tuning editor: stamp the lock when guarded text moved -------------------------------------
  IF editor IS NOT NULL THEN
    locked := NEW.known_text IS DISTINCT FROM OLD.known_text OR NEW.target_text IS DISTINCT FROM OLD.target_text
              OR NEW.target_text_roman IS DISTINCT FROM OLD.target_text_roman;   -- here: "guarded text moved"
    IF is_lego THEN
      IF NEW.intro_text IS DISTINCT FROM OLD.intro_text THEN locked := true; END IF;
    END IF;
    IF locked AND NEW.hand_edited_at IS NOT DISTINCT FROM OLD.hand_edited_at AND NEW.hand_edited_by IS NOT DISTINCT FROM OLD.hand_edited_by THEN
      NEW.hand_edited_by := editor;
      NEW.hand_edited_at := now();
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE by anybody else: editor-only columns never move ------------------------------------------------------
  NEW.hand_edited_by := OLD.hand_edited_by;
  NEW.hand_edited_at := OLD.hand_edited_at;
  IF is_lego THEN
    IF NEW.intro_text IS DISTINCT FROM OLD.intro_text THEN wanted := wanted || jsonb_build_object('intro_text', NEW.intro_text); NEW.intro_text := OLD.intro_text; END IF;
    IF NEW.phrase_order_hand_at IS DISTINCT FROM OLD.phrase_order_hand_at OR NEW.phrase_order_hand_by IS DISTINCT FROM OLD.phrase_order_hand_by THEN
      wanted := wanted || jsonb_build_object('phrase_order_hand_at', NEW.phrase_order_hand_at);
      NEW.phrase_order_hand_at := OLD.phrase_order_hand_at; NEW.phrase_order_hand_by := OLD.phrase_order_hand_by;
    END IF;
  ELSE
    IF NEW.hand_order IS DISTINCT FROM OLD.hand_order THEN wanted := wanted || jsonb_build_object('hand_order', NEW.hand_order); NEW.hand_order := OLD.hand_order; END IF;
    -- a phrase placed by hand stays in its round
    IF OLD.hand_order IS NOT NULL AND (NEW.seed_number IS DISTINCT FROM OLD.seed_number OR NEW.lego_index IS DISTINCT FROM OLD.lego_index) THEN
      wanted := wanted || jsonb_build_object('seed_number', NEW.seed_number, 'lego_index', NEW.lego_index);
      NEW.seed_number := OLD.seed_number; NEW.lego_index := OLD.lego_index;
    END IF;
  END IF;

  locked := OLD.hand_edited_at IS NOT NULL;
  IF locked THEN
    IF NEW.known_text IS DISTINCT FROM OLD.known_text THEN wanted := wanted || jsonb_build_object('known_text', NEW.known_text); NEW.known_text := OLD.known_text; END IF;
    IF NEW.target_text IS DISTINCT FROM OLD.target_text THEN wanted := wanted || jsonb_build_object('target_text', NEW.target_text); NEW.target_text := OLD.target_text; END IF;
    IF NEW.target_text_roman IS DISTINCT FROM OLD.target_text_roman THEN wanted := wanted || jsonb_build_object('target_text_roman', NEW.target_text_roman); NEW.target_text_roman := OLD.target_text_roman; END IF;
    IF NEW.seed_number IS DISTINCT FROM OLD.seed_number OR NEW.lego_index IS DISTINCT FROM OLD.lego_index THEN
      wanted := wanted || jsonb_build_object('seed_number', NEW.seed_number, 'lego_index', NEW.lego_index);
      NEW.seed_number := OLD.seed_number; NEW.lego_index := OLD.lego_index;
    END IF;
    IF is_lego THEN
      IF NEW.is_new IS DISTINCT FROM OLD.is_new THEN wanted := wanted || jsonb_build_object('is_new', NEW.is_new); NEW.is_new := OLD.is_new; END IF;
      IF NEW.components IS DISTINCT FROM OLD.components THEN wanted := wanted || jsonb_build_object('components', NEW.components); NEW.components := OLD.components; END IF;
    ELSE
      IF NEW.phrase_role IS DISTINCT FROM OLD.phrase_role THEN wanted := wanted || jsonb_build_object('phrase_role', NEW.phrase_role); NEW.phrase_role := OLD.phrase_role; END IF;
    END IF;
  END IF;

  IF wanted <> '{}'::jsonb THEN
    NEW.hand_edit_held := jsonb_build_object('at', now(), 'by', session_user || coalesce('/' || nullif(current_setting('application_name', true), ''), ''), 'wanted', wanted);
  ELSE
    NEW.hand_edit_held := OLD.hand_edit_held;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.hand_edit_lock() FROM PUBLIC;

DROP TRIGGER IF EXISTS a0_hand_edit_lock ON public.course_legos;
CREATE TRIGGER a0_hand_edit_lock BEFORE INSERT OR UPDATE OR DELETE ON public.course_legos
  FOR EACH ROW EXECUTE FUNCTION public.hand_edit_lock();
DROP TRIGGER IF EXISTS a0_hand_edit_lock ON public.course_practice_phrases;
CREATE TRIGGER a0_hand_edit_lock BEFORE INSERT OR UPDATE OR DELETE ON public.course_practice_phrases
  FOR EACH ROW EXECUTE FUNCTION public.hand_edit_lock();

COMMIT;

-- PostgREST must see the new columns before Popty's editor reads them.
NOTIFY pgrst, 'reload schema';
