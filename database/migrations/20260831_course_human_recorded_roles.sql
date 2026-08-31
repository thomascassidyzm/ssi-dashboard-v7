-- course_human_recorded_roles — WHICH (course, role) SLOTS HOLD REAL RECORDINGS.
--
-- Tom's ruling, 2026-08-31: the Voice Lab must label a human-recorded language
-- before a cast is tapped, and a language-level Cartesia cast must never
-- silently override the per-course config those recordings depend on.
--
-- services/shared/human-voice-courses.cjs already carries the POLICY half of
-- that signal (cym_*, pdc_*, bre_for_fra are human-voiced by ruling). This view
-- is the MEASURED half, and it is the reason the policy list is not enough:
-- deu_at_for_eng holds 225 human target2 clips and fin_for_eng 44 human target1
-- clips, and neither course is on any human-voice list. A language cast on
-- 'deu' or 'fin' would resolve those slots to a synthetic voice with nothing
-- anywhere to stop it.
--
-- Shaped after voice_guide_in_use: a small grouped read (tens of rows over
-- 42,388 human clips), read softly so a missing view degrades the Voice Lab to
-- the policy signal rather than breaking it.
CREATE OR REPLACE VIEW course_human_recorded_roles AS
SELECT
  a.course_code,
  a.role,
  c.target_lang,
  c.known_lang,
  count(*)                                     AS clips,
  count(DISTINCT a.voice_id)                   AS voices,
  (array_agg(DISTINCT a.voice_id))[1]          AS a_voice_id,
  max(a.created_at)                            AS last_recorded_at
FROM course_audio a
JOIN courses c ON c.course_code = a.course_code
WHERE a.origin = 'human' AND a.role IS NOT NULL
GROUP BY a.course_code, a.role, c.target_lang, c.known_lang;

COMMENT ON VIEW course_human_recorded_roles IS
  'Per (course, role): how many clips are real human recordings. The measured half of the human-voice signal the Voice Lab casting guard reads (Tom 2026-08-31); services/shared/human-voice-courses.cjs is the policy half.';
