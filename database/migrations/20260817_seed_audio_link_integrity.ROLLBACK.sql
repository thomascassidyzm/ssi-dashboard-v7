-- Rollback for 20260817_seed_audio_link_integrity.sql
--
-- Drops the trigger and both new functions, returning course_seeds to the state
-- it was in before: NO audio rule at all, so a seed text edit once again leaves
-- known_audio_id / target1_audio_id / target2_audio_id pointing at a clip that
-- speaks the OLD sentence, silently. That is a real regression, not a neutral
-- undo — run this only to unblock, and re-apply.
--
-- The report table is KEPT on purpose. Its rows are the record of which links
-- were dropped and what they used to point at; dropping the table destroys the
-- only copy of that and makes the drops irreversible. Drop it by hand, after
-- reading it, if you truly want it gone:
--
--   DROP TABLE public.content_audio_link_drops;
--
-- Nothing here touches course_audio, S3, or any link value already written.

BEGIN;

DROP TRIGGER IF EXISTS trg_null_seed_audio_on_text_change ON public.course_seeds;
DROP FUNCTION IF EXISTS public.null_seed_audio_on_text_change();
DROP FUNCTION IF EXISTS public.audio_id_for_text_same_voice(text, text, text, uuid);

NOTIFY pgrst, 'reload schema';

COMMIT;
