-- human_clip_speakers — WHOSE RECORDINGS THE ESTATE ALREADY HOLDS, AND HOW MUCH.
--
-- Tom, 2026-08-31, inverting the Voice Lab's cloning flow:
--
--   "We do NOT need to ask anyone to record a fresh sample first. We already
--    hold clean studio audio of the people we want to clone, and cloning FROM
--    OUR OWN EXISTING RECORDINGS is the main route, not a fallback."
--
-- and, on what the screen has to say:
--
--   "The tool finds and lists their clips — how many, and how much total audio.
--    Say both numbers on screen; 'we have some Aran' is not an answer an
--    operator can act on."
--
-- Those two numbers are this view. It exists for the same reason
-- voice_guide_in_use does (20260829): the aggregate is over ~2.5 million
-- course_audio rows, and doing it in application code would mean paging the
-- whole table on every page load.
--
-- ── WHY DISTINCT s3_key ─────────────────────────────────────────────────────
-- One recording is filed against every course that plays it. The English
-- instruction set is 48 files and 17 course_audio rows apiece; counting rows
-- would tell an operator the estate holds 816 clips when it holds 48. The inner
-- DISTINCT ON collapses a file to itself before anything is counted, so `clips`
-- and `total_ms` are facts about the ARCHIVE rather than about the catalogue.
--
-- ── WHAT `origin = 'human'` IS AND IS NOT ───────────────────────────────────
-- It is a LABEL somebody wrote, not a measurement. On 2026-08-27 a clone built
-- from clips carrying origin='human' turned out to be built from TTS output —
-- Tom identified it by ear — and the write-up of that failure says it plainly:
-- "that column records an intention, not a fact, and it cannot distinguish a
-- real recording from a good clone" (docs/tts-bakeoff/aran-welcome-source-candidates-2026-08-27.md).
-- So this view is a SHORTLIST TO LISTEN TO, never a provenance claim, and the
-- Voice Lab says so on screen beside every row it draws from here.
--
-- READ-ONLY. Nothing writes through this view, and nothing in the cloning path
-- may write, move, re-encode or re-point a course_audio row — Welsh recordings
-- above all (services/shared/human-voice-courses.cjs, Tom 2026-08-13).

CREATE OR REPLACE VIEW human_clip_speakers AS
SELECT
  voice_id,
  language,
  count(*)                              AS clips,
  sum(duration_ms)                      AS total_ms,
  min(duration_ms)                      AS shortest_ms,
  max(duration_ms)                      AS longest_ms,
  array_agg(DISTINCT role ORDER BY role) AS roles,
  count(DISTINCT course_code)           AS courses,
  min(created_at)                       AS first_seen,
  max(created_at)                       AS last_seen
FROM (
  SELECT DISTINCT ON (s3_key)
    s3_key, voice_id, language, role, duration_ms, course_code, created_at
  FROM course_audio
  WHERE origin = 'human'
    AND s3_key IS NOT NULL
    AND s3_key NOT LIKE 'pending/%'
    AND voice_id IS NOT NULL
  ORDER BY s3_key, created_at
) files
GROUP BY voice_id, language;

COMMENT ON VIEW human_clip_speakers IS
  'Speakers the estate already holds recordings of, one row per (voice_id, language), counted by DISTINCT s3_key so a file shared by seventeen courses counts once. origin=human is a LABEL, not proof of a human — always listen before cloning.';
