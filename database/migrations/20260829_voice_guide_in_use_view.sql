-- voice_guide_in_use — WHICH VOICE ACTUALLY SPEAKS THE INSTRUCTIONS TODAY,
-- per KNOWN language.
--
-- Tom, 2026-08-29: "the instructions and the encouragements - are currently
-- mostly done in Aran's Eleven Labs voice … they are linked to every course
-- with the same known language."
--
-- WHY THE VOICE LAB NEEDS THIS AND WHY IT IS A VIEW
-- The Languages page is about to grow an empty GUIDE slot per language. An
-- empty slot beside nothing is an archaeology exercise: to cast English you
-- would have to go and find out who speaks English instructions today. Showing
-- "currently Aran, uncast" beside the empty slot turns casting twelve languages
-- into a few minutes.
--
-- The measurement is a GROUP BY over ~6,300 course_audio rows. Doing it in the
-- registry would mean paging all 6,300 rows through PostgREST on every load of
-- the screen; doing it here returns about a dozen. Same answer, two orders of
-- magnitude less traffic, and the aggregation is written once where the data
-- is rather than once per reader.
--
-- A PLAIN VIEW, NOT MATERIALISED: it is read by one screen a human looks at,
-- it must never be stale (a re-render changes it), and there is nothing to
-- schedule a refresh from.
--
-- `human_recording` appears here as a voice like any other and MUST keep doing
-- so: 765 English instruction clips are human-recorded, and a screen that hid
-- them would invite somebody to cast over a human recording.

CREATE OR REPLACE VIEW voice_guide_in_use AS
SELECT
  c.known_lang            AS known_lang,
  a.role                  AS role,
  a.voice_id              AS voice_id,
  count(*)::bigint        AS clips,
  count(DISTINCT a.course_code)::bigint AS courses
FROM course_audio a
JOIN courses c ON c.course_code = a.course_code
WHERE a.role IN ('instruction', 'encouragement')
  AND a.voice_id IS NOT NULL
  AND c.known_lang IS NOT NULL
GROUP BY c.known_lang, a.role, a.voice_id;

COMMENT ON VIEW voice_guide_in_use IS
  'What the estate ACTUALLY speaks instructions and encouragements in today, '
  'grouped by the course''s KNOWN language — the fact the Voice Lab shows beside '
  'the (empty) guide slot so casting is a click rather than an investigation. '
  'Read-only, never written, never a source of truth for a render (Tom, 2026-08-29).';
