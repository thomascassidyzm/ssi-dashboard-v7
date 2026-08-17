-- Rollback for 20260817c_lego_audio_link_integrity.sql
--
-- Restores course_legos to its 20260806_audio_link_integrity.sql state: the
-- trigger function RE-RESOLVES every link through audio_id_for_text(), which
-- constrains course_code, role, s3_key and text_normalized — NOT voice_id and
-- NOT language. Running this puts back a rule under which:
--
--   * an ordinary lego text edit can silently move a slot onto a different
--     voice, with no NULL and no alarm; and
--   * ANY lego text edit — including a trailing-space one — permanently and
--     unrecordedly severs the row's presentation_audio_id, because
--     audio_id_for_text(..., 'presentation') matches nothing (0 of 72,062 lego
--     presentation clips speak the row's target_text) and link_audio_to_content
--     can never refill the slot afterwards.
--
-- That is a real regression, not a neutral undo. Run it only to unblock, and
-- re-apply.
--
-- The function body below is VERBATIM the definition read out of the live
-- database with pg_get_functiondef() on 2026-08-17, before this work touched
-- it — not reconstructed from the 20260806 migration file.
--
-- KEPT ON PURPOSE:
--   * content_audio_link_drops, and every row already written to it. Those rows
--     are the only record of which lego links moved or were severed, and they
--     must outlive the rule that wrote them:
--       SELECT * FROM content_audio_link_drops WHERE table_name='course_legos';
--   * content_audio_link_drops.old_link_raw. Dropping a column that already
--     holds recorded values would destroy evidence; it is nullable and nothing
--     else writes it, so leaving it costs nothing.
--   * content_audio_link_drops.row_id stays text (the phrase migration's
--     widening). Narrowing it would destroy every phrase row already written.
--
-- The WHEN clause is dropped with the trigger, restoring the original
-- unconditional BEFORE UPDATE. That is behaviour-neutral — the restored function
-- opens with the same IS DISTINCT FROM tests — and only costs a function call on
-- every non-text lego write.
--
-- Nothing here touches course_audio, S3, or any link value already written.

BEGIN;

CREATE OR REPLACE FUNCTION public.null_lego_audio_on_text_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.known_text IS DISTINCT FROM OLD.known_text THEN
    NEW.known_audio_id := audio_id_for_text(NEW.course_code, NEW.known_text, 'known');
  END IF;
  IF NEW.target_text IS DISTINCT FROM OLD.target_text THEN
    NEW.target1_audio_id := audio_id_for_text(NEW.course_code, NEW.target_text, 'target1');
    NEW.target2_audio_id := audio_id_for_text(NEW.course_code, NEW.target_text, 'target2');
  END IF;
  -- A presentation clip can embed BOTH sides, so the original invalidated it on
  -- a known_text change as well as a target_text one. That invalidation scope is
  -- preserved exactly; only the "and then relink if we already have it" is new.
  IF NEW.known_text IS DISTINCT FROM OLD.known_text
     OR NEW.target_text IS DISTINCT FROM OLD.target_text THEN
    NEW.presentation_audio_id :=
      audio_id_for_text(NEW.course_code, NEW.target_text, 'presentation')::text;
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.null_lego_audio_on_text_change() IS
  'MISNAMED: it does not null, it re-resolves via audio_id_for_text(), which constrains neither voice nor language — a text edit can therefore swap the voice a learner hears with no NULL and no alarm. For presentation_audio_id that lookup never matches, so any text edit severs the slot permanently and unrecorded. Restored by 20260817c_lego_audio_link_integrity.ROLLBACK.sql.';

DROP TRIGGER IF EXISTS trg_null_lego_audio_on_text_change ON public.course_legos;
CREATE TRIGGER trg_null_lego_audio_on_text_change
  BEFORE UPDATE ON public.course_legos
  FOR EACH ROW
  EXECUTE FUNCTION public.null_lego_audio_on_text_change();

NOTIFY pgrst, 'reload schema';

COMMIT;
