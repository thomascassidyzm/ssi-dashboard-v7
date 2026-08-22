-- COURSE VOICE CENSUS — "has this side stayed one person?", as one query.
--
-- Job 4 of VOICELAB (docs/architecture/AUDIO_PIPELINE_PROVIDERS_FIDELITY_LABS-2026-08-06.md
-- §3) is drift detection, and the cheapest, sharpest leg of it is simply counting: how many
-- distinct canonical voices does this course side actually carry, and how many clips on
-- each. Nothing in the estate asks that question today, which is how deu_for_eng came to
-- carry ten voice ids on its German side with no gate saying a word — and this query would
-- have caught it in January.
--
-- CANONICAL, not raw. It groups on canonical_voice_id()/canonical_language() (landed
-- 2026-08-06), so `ara` and `xai_ara` are one voice and `de`, `de-DE` and `deu` are one
-- language. Grouping on the raw columns is what made a third of the estate's apparent
-- voice drift a string-formatting artefact.
--
-- Read-only. It defines two functions and touches no row.

-- ---------------------------------------------------------------------------
-- Per (role, canonical voice): how many clips, over what window.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION course_voice_census(p_course text)
RETURNS TABLE (
  role            text,
  voice_id        text,
  voice_canonical boolean,
  language        text,
  clips           bigint,
  first_clip      timestamptz,
  last_clip       timestamptz,
  veracity_passed bigint,
  veracity_failed bigint,
  veracity_unchecked bigint,
  median_duration_ms integer
)
LANGUAGE sql STABLE AS $$
  SELECT
    ca.role,
    -- COALESCE, deliberately: try_canonical_* returns NULL for a value it does not
    -- recognise, and grouping every unrecognised voice into one NULL bucket would hide
    -- exactly the rows worth looking at — the four June clone ids on the German target
    -- side collapse into a single blank row without this. Fall back to the raw value and
    -- say which happened.
    coalesce(try_canonical_voice_id(ca.voice_id), ca.voice_id) AS voice_id,
    try_canonical_voice_id(ca.voice_id) IS NOT NULL            AS voice_canonical,
    coalesce(try_canonical_language(ca.language), ca.language)  AS language,
    count(*)                              AS clips,
    min(ca.created_at)                    AS first_clip,
    max(ca.created_at)                    AS last_clip,
    count(*) FILTER (WHERE ca.veracity_pass IS TRUE)  AS veracity_passed,
    count(*) FILTER (WHERE ca.veracity_pass IS FALSE) AS veracity_failed,
    count(*) FILTER (WHERE ca.veracity_pass IS NULL)  AS veracity_unchecked,
    (percentile_cont(0.5) WITHIN GROUP (ORDER BY ca.duration_ms))::int AS median_duration_ms
  FROM course_audio ca
  WHERE ca.course_code = p_course
  GROUP BY 1, 2, 3, 4
  ORDER BY 1, 5 DESC;
$$;

COMMENT ON FUNCTION course_voice_census(text) IS
  'VOICELAB job 4: distinct canonical voices per course side, with clip counts and veracity coverage. Read-only.';

-- ---------------------------------------------------------------------------
-- The ambiguous slots: one text, one role, more than one row.
--
-- unique_course_audio_per_voice is (course_code, text_normalized, language, role,
-- voice_id) — so two voices for one slot is PERMITTED and something downstream picks.
-- Every "the store looked right but the app played the old one" bug lives in that gap.
-- This function names the slots; the course's declared voice says which row wins, and
-- the loser is left in place, unlinked. Nothing here deletes anything.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION course_ambiguous_slots(p_course text, p_limit int DEFAULT 200)
RETURNS TABLE (
  role            text,
  text_normalized text,
  voices          text[],
  clips           bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    ca.role,
    ca.text_normalized,
    array_agg(DISTINCT coalesce(try_canonical_voice_id(ca.voice_id), ca.voice_id)) AS voices,
    count(*) AS clips
  FROM course_audio ca
  WHERE ca.course_code = p_course
  GROUP BY 1, 2
  HAVING count(DISTINCT coalesce(try_canonical_voice_id(ca.voice_id), ca.voice_id)) > 1
  ORDER BY count(*) DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION course_ambiguous_slots(text, int) IS
  'VOICELAB job 4: texts carrying more than one canonical voice at the same role. Read-only, capped by p_limit.';

GRANT EXECUTE ON FUNCTION course_voice_census(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION course_ambiguous_slots(text, int) TO anon, authenticated, service_role;
