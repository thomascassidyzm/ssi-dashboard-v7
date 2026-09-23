-- PROPOSAL — NOT APPLIED (job #883·H, Kai's gendered-known design, 2026-09-23).
--
-- Gendered known languages give the 'known' role TWO voices in voice_config
-- (voices.known.byGender.m / .f). link_all_audio_ids compares every known clip
-- against audio_configured_voice(course, 'known') — ONE voice — so on such a
-- course it would refuse every clip in the second voice. phase8 already routes
-- gendered courses around the RPC to the per-text JS batch
-- (services/phases/phase8-audio-v13.cjs linkAudioIds), so this SQL change is
-- NOT required for the mechanism to work. It is offered so the SQL twin of the
-- voice rule stops contradicting the JS one, and so anything else that calls
-- the RPC on a gendered course does not silently refuse the male voice.
--
-- What it does: audio_configured_voices(course, role) returns the SET of voices
-- a role may render in (default + byGender), and audio_voice_matches_any() is
-- the set form of audio_voice_matches(). It is COARSER than the JS rule: it
-- accepts a clip in either configured voice for a known text, whereas the JS
-- rule accepts only the voice the TEXT resolves to. The JS batch is therefore
-- still the path a gendered course should link through; this only stops the
-- RPC refusing the second voice outright. A precise SQL twin would need the
-- FNV-1a hash of services/shared/known-voice-gender.cjs reimplemented in
-- plpgsql over UTF-16 code units — deliberately not attempted here.
--
-- Shared schema with the learning app and Popty: Tom's call whether to apply.

CREATE OR REPLACE FUNCTION public.audio_configured_voices(p_course_code text, p_role text) RETURNS text[]
    LANGUAGE sql STABLE
    AS $$
  WITH r AS (
    SELECT c.voice_config->'voices'->(CASE WHEN p_role = 'source' THEN 'known' ELSE p_role END) AS v
    FROM courses c WHERE c.course_code = p_course_code
  ), ids AS (
    SELECT CASE WHEN v->>'provider' IS NOT NULL AND v->>'voiceId' IS NOT NULL
                THEN (v->>'provider') || '_' || (v->>'voiceId') ELSE v->>'voiceId' END AS id FROM r
    UNION ALL
    SELECT CASE WHEN v->'byGender'->g->>'provider' IS NOT NULL AND v->'byGender'->g->>'voiceId' IS NOT NULL
                THEN (v->'byGender'->g->>'provider') || '_' || (v->'byGender'->g->>'voiceId')
                ELSE v->'byGender'->g->>'voiceId' END
    FROM r, unnest(ARRAY['m','f']) AS g
    WHERE v->'byGender'->g IS NOT NULL
  )
  SELECT coalesce(array_agg(DISTINCT id) FILTER (WHERE id IS NOT NULL), ARRAY[]::text[]) FROM ids;
$$;

CREATE OR REPLACE FUNCTION public.audio_voice_matches_any(p_wanted text[], p_candidate text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT p_candidate IS NOT NULL
     AND EXISTS (SELECT 1 FROM unnest(coalesce(p_wanted, ARRAY[]::text[])) w WHERE audio_voice_matches(w, p_candidate));
$$;

-- To adopt: in link_all_audio_ids, replace
--   v_vk := audio_configured_voice(p_course_code, 'known');  …  audio_voice_matches(v_vk, ca.voice_id)
-- with
--   v_vks := audio_configured_voices(p_course_code, 'known'); …  audio_voice_matches_any(v_vks, ca.voice_id)
-- for the 'known' role only; target1/target2 keep the single-voice rule.
