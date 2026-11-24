-- HAND-EDIT LOCK — Aran's fine-tuning edits can never be overwritten by a regeneration (job #128·AL, 2026-11-24).
--
-- Aran's ruling (2026-11-24, he leads the method): his direct hand edits ALWAYS take priority over seed-derived
-- generation and must NEVER be overwritten by regeneration or extrapolation. Design settled as "Option A" of the
-- design note (watson /d/bbf8a5b7): a lock ON THE ROW, recording editor and time, ENFORCED HERE IN THE DATABASE, so a
-- writer that forgets to check cannot get round it. Revised the same day after Tom's Watson's impact check (#129·AL):
--
--   * THE LOCK COVERS TEXT AND POSITION COLUMNS ONLY, never the whole row. Audio-id columns stay writable on a locked row,
--     so link-clip, re-render and re-voice keep working. The one exception is the intro's clip: see INTRO below.
--   * A POSITION CHANGE IS NEVER QUIET. Moving a hand-edited / hand-placed row (seed_number, lego_index) is REFUSED unless
--     the transaction declares a named override — today only lego.reorder (services/shared/lego-reorder.cjs, via
--     course-edit-ops runPlans) does — and every override is logged on the row it moved (hand_lock_overrides).
--     A quiet hold was the first draft and was wrong: lego.reorder parks and lands a whole seed in two statements, and
--     one held row would have left the seed half-moved.
--   * Gender expansion needs no override: it writes course_gender_expansions (keyed by text), never these columns.
--
-- WHO MAY WRITE A LOCKED ROW: a transaction that declares itself the fine-tuning editor, with
--     SELECT set_config('popty.fine_tune_editor', '<editor email>', true)     -- transaction-local
-- which Popty's course editor does inside the edit door's own transaction (services/shared/course-edit-ops.cjs runPlans,
-- option handEditor; services/course-editor/course-editor-router.cjs). Everybody else:
--   UPDATE  of a guarded TEXT column on a locked row is HELD, not applied: the text keeps its locked value, the rest of
--           the row (audio links, durations, flags…) is written as asked, and the row records the attempt in
--           hand_edit_held {at, by, wanted} — the quiet "the seed moved on under your line" flag the editor shows Aran.
--           Quiet on purpose (Aran's default, 2026-11-24): a cascade over a seed still lands everywhere else.
--   UPDATE  of a POSITION column on a locked or hand-placed row is REFUSED (HAND_EDIT_LOCKED) unless
--           popty.hand_lock_override names the path and its reason; then it is applied and logged.
--   DELETE  of a locked row (or of a phrase placed by hand, or of a LEGO whose round order is hand-set) is REFUSED
--           with HAND_EDIT_LOCKED — a deletion is never quiet.
--   INSERT  can never be born locked: the lock columns are cleared on a non-editor insert.
-- An editor write that changes a guarded column stamps the lock (hand_edited_by/at) — unless it sets those columns
-- itself, which is how the editor's Undo puts the previous lock state back.
--
-- INTRO. The words of a LEGO's spoken introduction live in ONE place: the text of its presentation clip
-- (course_audio.text, pointed at by course_legos.presentation_audio_id). There is no intro-text column and this
-- migration adds none. Aran's intro edit is a NEW presentation clip linked by the editor, which stamps intro_hand_by/at.
-- On such a LEGO, a non-editor write that points presentation_audio_id at a clip with DIFFERENT words (compared on
-- course_audio.text_stripped: case and punctuation do not count, as the re-record rule says) is HELD; a clip with the
-- same words — a re-voice or re-render of Aran's wording — is linked as asked.
--
-- COLUMNS
--   course_legos.hand_edited_by/at        the lock (intro item edited by hand)
--   course_legos.intro_hand_by/at         the intro's words were set by hand (its clip is Aran's wording)
--   course_legos.phrase_order_hand_by/at  the round's "order set by hand" marker the learner app obeys (practice only)
--   course_practice_phrases.hand_edited_by/at  the lock (phrase edited, copied or added by hand)
--   course_practice_phrases.hand_order    the place Aran gave the phrase in its round's practice block (null = none)
--   *.hand_edit_held                      last write held back by the lock (jsonb), null when nothing was
--   *.hand_lock_overrides                 the declared overrides that moved this row (jsonb array, newest last, last 20)
--
-- Fires FIRST of the BEFORE-row triggers ('a0_' sorts ahead of human_take_lock and trg_null_*_audio_on_text_change),
-- so a held text change never reaches the trigger that would empty the row's audio slots.
--
-- Rollback: database/migrations/20261124_hand_edit_lock.ROLLBACK.sql (drops triggers, function and columns — the
-- columns hold Aran's lock record, so read them out first if any edits have been made; the edits themselves stay).

-- One transaction; ADD COLUMN with no default is a catalogue change, but it needs a moment's exclusive lock on two
-- busy tables, so give up rather than queue behind a long reader.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.course_legos
  ADD COLUMN IF NOT EXISTS hand_edited_by text,
  ADD COLUMN IF NOT EXISTS hand_edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS intro_hand_by text,
  ADD COLUMN IF NOT EXISTS intro_hand_at timestamptz,
  ADD COLUMN IF NOT EXISTS phrase_order_hand_by text,
  ADD COLUMN IF NOT EXISTS phrase_order_hand_at timestamptz,
  ADD COLUMN IF NOT EXISTS hand_edit_held jsonb,
  ADD COLUMN IF NOT EXISTS hand_lock_overrides jsonb;

ALTER TABLE public.course_practice_phrases
  ADD COLUMN IF NOT EXISTS hand_edited_by text,
  ADD COLUMN IF NOT EXISTS hand_edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS hand_order smallint,
  ADD COLUMN IF NOT EXISTS hand_edit_held jsonb,
  ADD COLUMN IF NOT EXISTS hand_lock_overrides jsonb;

COMMENT ON COLUMN public.course_legos.hand_edited_at IS 'Hand-edit lock (Popty fine-tuning editor). Non-editor text writes are held, position writes refused without a declared override, deletes refused. See hand_edit_lock().';
COMMENT ON COLUMN public.course_legos.intro_hand_at IS 'The presentation clip carries Aran''s hand-set intro wording: a non-editor relink to a clip with different words is held.';
COMMENT ON COLUMN public.course_legos.phrase_order_hand_at IS 'Round practice order set by hand: the player plays this LEGO''s practice phrases by hand_order (within BUILD, within USE) instead of shortest-first.';
COMMENT ON COLUMN public.course_practice_phrases.hand_edited_at IS 'Hand-edit lock (Popty fine-tuning editor). See hand_edit_lock().';
COMMENT ON COLUMN public.course_practice_phrases.hand_order IS 'Place in its round''s hand-set practice order (only read when the LEGO has phrase_order_hand_at).';

CREATE OR REPLACE FUNCTION public.hand_edit_lock() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  editor text := nullif(current_setting('popty.fine_tune_editor', true), '');
  override text := nullif(current_setting('popty.hand_lock_override', true), '');
  is_lego boolean := TG_TABLE_NAME = 'course_legos';
  who text := session_user || coalesce('/' || nullif(current_setting('application_name', true), ''), '');
  wanted jsonb := '{}'::jsonb;
  locked boolean;
  placed boolean;
  old_words text;
  new_words text;
BEGIN
  -- INSERT ------------------------------------------------------------------------------------------------------
  IF TG_OP = 'INSERT' THEN
    IF editor IS NOT NULL THEN
      NEW.hand_edited_by := coalesce(NEW.hand_edited_by, editor);   -- a copy / an added line is born locked
      NEW.hand_edited_at := coalesce(NEW.hand_edited_at, now());
    ELSE
      NEW.hand_edited_by := NULL; NEW.hand_edited_at := NULL; NEW.hand_edit_held := NULL; NEW.hand_lock_overrides := NULL;
      IF is_lego THEN NEW.intro_hand_by := NULL; NEW.intro_hand_at := NULL; NEW.phrase_order_hand_by := NULL; NEW.phrase_order_hand_at := NULL;
      ELSE NEW.hand_order := NULL; END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Each table's own columns are read in its own branch: a PL/pgSQL expression naming a field the row type lacks
  -- fails when planned, whatever the AND around it says.
  locked := OLD.hand_edited_at IS NOT NULL;
  IF is_lego THEN
    placed := locked OR OLD.phrase_order_hand_at IS NOT NULL OR OLD.intro_hand_at IS NOT NULL;
  ELSE
    placed := locked OR OLD.hand_order IS NOT NULL;
  END IF;

  -- DELETE ------------------------------------------------------------------------------------------------------
  IF TG_OP = 'DELETE' THEN
    IF editor IS NULL AND placed THEN
      RAISE EXCEPTION 'HAND_EDIT_LOCKED: DELETE on % refused — the row was set by hand in the fine-tuning editor (%); only that editor may delete it',
        TG_TABLE_NAME, coalesce(OLD.hand_edited_by, 'order set by hand')
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE by the fine-tuning editor: stamp the lock when a guarded column moved ---------------------------------
  IF editor IS NOT NULL THEN
    IF (NEW.known_text IS DISTINCT FROM OLD.known_text OR NEW.target_text IS DISTINCT FROM OLD.target_text
        OR NEW.target_text_roman IS DISTINCT FROM OLD.target_text_roman)
       AND NEW.hand_edited_at IS NOT DISTINCT FROM OLD.hand_edited_at AND NEW.hand_edited_by IS NOT DISTINCT FROM OLD.hand_edited_by THEN
      NEW.hand_edited_by := editor;
      NEW.hand_edited_at := now();
    END IF;
    IF is_lego THEN
      -- The editor linking a different intro clip IS an intro edit: it locks the intro, and the LEGO's words with it
      -- (the intro speaks them). An Undo sets these columns itself and is left alone.
      IF NEW.presentation_audio_id IS DISTINCT FROM OLD.presentation_audio_id
         AND NEW.intro_hand_at IS NOT DISTINCT FROM OLD.intro_hand_at AND NEW.intro_hand_by IS NOT DISTINCT FROM OLD.intro_hand_by THEN
        NEW.intro_hand_by := editor;
        NEW.intro_hand_at := now();
        IF NEW.hand_edited_at IS NOT DISTINCT FROM OLD.hand_edited_at AND NEW.hand_edited_by IS NOT DISTINCT FROM OLD.hand_edited_by THEN
          NEW.hand_edited_by := coalesce(OLD.hand_edited_by, editor);
          NEW.hand_edited_at := coalesce(OLD.hand_edited_at, now());
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE by anybody else ---------------------------------------------------------------------------------------
  -- Editor-only columns never move.
  NEW.hand_edited_by := OLD.hand_edited_by;
  NEW.hand_edited_at := OLD.hand_edited_at;
  IF is_lego THEN
    NEW.intro_hand_by := OLD.intro_hand_by; NEW.intro_hand_at := OLD.intro_hand_at;
    IF NEW.phrase_order_hand_at IS DISTINCT FROM OLD.phrase_order_hand_at OR NEW.phrase_order_hand_by IS DISTINCT FROM OLD.phrase_order_hand_by THEN
      wanted := wanted || jsonb_build_object('phrase_order_hand_at', NEW.phrase_order_hand_at);
      NEW.phrase_order_hand_at := OLD.phrase_order_hand_at; NEW.phrase_order_hand_by := OLD.phrase_order_hand_by;
    END IF;
  ELSE
    IF NEW.hand_order IS DISTINCT FROM OLD.hand_order THEN wanted := wanted || jsonb_build_object('hand_order', NEW.hand_order); NEW.hand_order := OLD.hand_order; END IF;
  END IF;
  NEW.hand_lock_overrides := OLD.hand_lock_overrides;

  -- POSITION: refused, or applied under a declared override and logged on the row.
  IF placed AND (NEW.seed_number IS DISTINCT FROM OLD.seed_number OR NEW.lego_index IS DISTINCT FROM OLD.lego_index) THEN
    IF override IS NULL THEN
      RAISE EXCEPTION 'HAND_EDIT_LOCKED: moving % % (seed % LEGO %) refused — it was set or placed by hand in the fine-tuning editor (%). A path that must move it declares itself: set_config(''popty.hand_lock_override'', ''<path>: <reason>'', true)',
        TG_TABLE_NAME, coalesce(OLD.lego_id, ''), OLD.seed_number, OLD.lego_index, coalesce(OLD.hand_edited_by, 'order set by hand')
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.hand_lock_overrides := (
      SELECT coalesce(jsonb_agg(e ORDER BY n), '[]'::jsonb) FROM (
        SELECT e, n FROM jsonb_array_elements(coalesce(OLD.hand_lock_overrides, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'at', now(), 'by', who, 'override', override,
          'from', jsonb_build_object('seed_number', OLD.seed_number, 'lego_index', OLD.lego_index),
          'to', jsonb_build_object('seed_number', NEW.seed_number, 'lego_index', NEW.lego_index)))) WITH ORDINALITY AS a(e, n)
        ORDER BY n DESC LIMIT 20) last20);
    RAISE NOTICE 'HAND_EDIT_OVERRIDE: % % moved (seed %→%, LEGO %→%) under "%"', TG_TABLE_NAME, coalesce(OLD.lego_id, ''),
      OLD.seed_number, NEW.seed_number, OLD.lego_index, NEW.lego_index, override;
  END IF;

  -- TEXT: held quietly on a locked row.
  IF locked THEN
    IF NEW.known_text IS DISTINCT FROM OLD.known_text THEN wanted := wanted || jsonb_build_object('known_text', NEW.known_text); NEW.known_text := OLD.known_text; END IF;
    IF NEW.target_text IS DISTINCT FROM OLD.target_text THEN wanted := wanted || jsonb_build_object('target_text', NEW.target_text); NEW.target_text := OLD.target_text; END IF;
    IF NEW.target_text_roman IS DISTINCT FROM OLD.target_text_roman THEN wanted := wanted || jsonb_build_object('target_text_roman', NEW.target_text_roman); NEW.target_text_roman := OLD.target_text_roman; END IF;
    IF is_lego THEN
      IF NEW.is_new IS DISTINCT FROM OLD.is_new THEN wanted := wanted || jsonb_build_object('is_new', NEW.is_new); NEW.is_new := OLD.is_new; END IF;
      IF NEW.components IS DISTINCT FROM OLD.components THEN wanted := wanted || jsonb_build_object('components', NEW.components); NEW.components := OLD.components; END IF;
    ELSE
      IF NEW.phrase_role IS DISTINCT FROM OLD.phrase_role THEN wanted := wanted || jsonb_build_object('phrase_role', NEW.phrase_role); NEW.phrase_role := OLD.phrase_role; END IF;
    END IF;
  END IF;

  -- INTRO: a hand-set intro keeps its words. Same words on another clip (re-voice, re-render) link as asked.
  IF is_lego THEN
    IF OLD.intro_hand_at IS NOT NULL AND NEW.presentation_audio_id IS DISTINCT FROM OLD.presentation_audio_id THEN
      SELECT text_stripped INTO old_words FROM public.course_audio WHERE id = OLD.presentation_audio_id;
      SELECT text_stripped INTO new_words FROM public.course_audio WHERE id = NEW.presentation_audio_id;
      IF NEW.presentation_audio_id IS NULL OR new_words IS DISTINCT FROM old_words THEN
        wanted := wanted || jsonb_build_object('presentation_audio_id', NEW.presentation_audio_id);
        NEW.presentation_audio_id := OLD.presentation_audio_id;
      END IF;
    END IF;
  END IF;

  IF wanted <> '{}'::jsonb THEN
    NEW.hand_edit_held := jsonb_build_object('at', now(), 'by', who, 'wanted', wanted);
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
