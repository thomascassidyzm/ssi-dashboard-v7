-- Voice aliases belong to the LANGUAGE, not to a course.
--
-- Aran's Welsh takes are stored under three spellings of one voice:
-- human_aran_cym_n, human_aran_cym_n_2 and human_aranv3_cym_n. Catrin's under
-- two: human_catrinlliar_cym_n and human_catrinv2_cym_n. If the queue does not
-- resolve those together, Aran's 68 already-recorded lines read as 0 and he gets
-- asked to record his own work again.
--
-- Today that alias map lives in courses.voice_config.podCastAliases — on
-- cym_n_for_eng only. That was fine when a queue was per-course. It is not fine
-- now: the queue is per LANGUAGE and spans four Welsh courses, so a queue built
-- for 'cym' would be silently depending on which course happened to carry the
-- map. Delete or re-cast cym_n_for_eng and Aran's history detaches.
--
-- So the aliases move up to the language, next to the voice they belong to, in
-- the one place the per-language decision already lives. The per-course
-- podCastAliases are LEFT IN PLACE and untouched — other read paths still use
-- them, and removing them is not this job's call.

UPDATE language_recording_policy
   SET voices = jsonb_set(
         jsonb_set(voices, '{m,aliases}', '["human_aran_cym_n_2", "human_aranv3_cym_n"]'::jsonb, true),
         '{f,aliases}', '["human_catrinv2_cym_n"]'::jsonb, true)
 WHERE language = 'cym';

-- The test language has no history, so both queues start with no aliases. The
-- key is still written so every voice object has the same shape and readers do
-- not have to special-case its absence.
UPDATE language_recording_policy
   SET voices = jsonb_set(
         jsonb_set(voices, '{m,aliases}', '[]'::jsonb, true),
         '{f,aliases}', '[]'::jsonb, true)
 WHERE language = 'zzz';
