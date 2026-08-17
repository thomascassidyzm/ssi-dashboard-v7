-- Rollback for 20260817b_phrase_audio_link_integrity.sql
--
-- Restores course_practice_phrases to its 20260806_audio_link_integrity.sql
-- state: the trigger function RE-RESOLVES each link via audio_id_for_text(),
-- which constrains course_code, role, s3_key and text_normalized — NOT voice_id
-- and NOT language. So running this puts back a rule under which an innocuous
-- phrase text edit can silently move the slot onto a different voice, with no
-- NULL and no alarm. That is a real regression, not a neutral undo: run it only
-- to unblock, and re-apply.
--
-- The report table content_audio_link_drops is KEPT on purpose (it is the seed
-- migration's, and its rows are the only record of which links moved). The
-- rows this function wrote stay readable:
--
--   SELECT * FROM content_audio_link_drops WHERE table_name='course_practice_phrases';
--
-- The WHEN clause is dropped with the trigger, restoring the original
-- unconditional BEFORE UPDATE. That is behaviour-neutral — the restored function
-- opens with the same IS DISTINCT FROM tests — and only costs a function call on
-- every non-text phrase write.
--
-- Nothing here touches course_audio, S3, or any link value already written.

-- content_audio_link_drops.row_id is deliberately LEFT AS text. Narrowing it back
-- to uuid would destroy every phrase row already written (they are not uuids) and
-- the seed rows cast back cleanly either way, so the widening is kept. It is
-- harmless with the old function restored: nothing writes to the table then.

BEGIN;

-- Verbatim from 20260806_audio_link_integrity.sql §2.
CREATE OR REPLACE FUNCTION public.null_phrase_audio_on_text_change()
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
  -- presentation_audio_id is deliberately untouched here: the original phrase
  -- trigger never invalidated it, and widening the scope would be a behaviour
  -- change this migration has no evidence for.
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.null_phrase_audio_on_text_change() IS
  'MISNAMED: it does not null, it re-resolves via audio_id_for_text(), which constrains neither voice nor language — a text edit can therefore swap the voice a learner hears with no NULL and no alarm. Restored by 20260817b_phrase_audio_link_integrity.ROLLBACK.sql.';

DROP TRIGGER IF EXISTS trg_null_phrase_audio_on_text_change ON public.course_practice_phrases;
CREATE TRIGGER trg_null_phrase_audio_on_text_change
  BEFORE UPDATE ON public.course_practice_phrases
  FOR EACH ROW
  EXECUTE FUNCTION public.null_phrase_audio_on_text_change();

NOTIFY pgrst, 'reload schema';

COMMIT;
