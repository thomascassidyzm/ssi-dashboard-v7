-- =============================================================================
-- THE CONFIGURED VOICE MUST NOT DOUBLE A PROVIDER PREFIX.
-- Kai's approval, 2026-08-25. Bug found and evidenced by job #581.
-- =============================================================================
--
-- THE BUG. `audio_configured_voice()` (20260819_relink_must_match_voice_config.sql)
-- built the wanted voice string as `provider || '_' || voiceId`, unconditionally.
-- A human voice artist's voiceId ALREADY carries its provider prefix — Sasha's
-- is `human_sasha_wanasky_deu_at` with provider `human` — so the wanted string
-- came out as:
--
--     human_human_sasha_wanasky_deu_at
--
-- while every clip Sasha actually recorded is filed as `human_sasha_wanasky_deu_at`.
-- `audio_voice_matches()` therefore said NO to the artist's own recordings, and
-- the autolinker refused to bind them. `relink_refusals` held 319 rows for
-- deu_at_for_eng target2 and 44 for fin_for_eng target1, dated 19–23 Aug, that
-- are exactly this and nothing else. Job #581 restored Sasha's 319 links by
-- direct SQL, bypassing the linker; this migration disarms the trap so the next
-- linker run cannot undo that.
--
-- WHY THE FIX IS HERE AND NOT IN audio_bare_voice_id(). The obvious-looking
-- patch — add `human` to the prefix list audio_bare_voice_id() strips — DOES NOT
-- WORK, and it is worth writing down why. regexp_replace strips ONE leading
-- prefix, so it would take the doubled wanted string down to
-- `human_sasha_wanasky_deu_at` and the (correct) candidate down to
-- `sasha_wanasky_deu_at`. Still unequal, still refused. The doubling is the
-- defect; the stripper is fine. One root cause, fixed at the root.
--
-- WHAT THE CORRECT RULE IS. Not invented here — it is already live in
-- services/shared/clip-identity.cjs `canonicalVoiceId`, which phase 8 uses to
-- decide the voice_id string it WRITES: **the id's own provider prefix always
-- wins**, and the `provider` key is only a hint for an id that carries no
-- prefix. `audio_configured_voice()` claimed to mirror phase 8 and had drifted
-- from it. This restores the mirror, including the provider aliases
-- clip-identity.cjs accepts (ms/microsoft → azure, eleven/11labs → elevenlabs,
-- gcp → google).
--
-- BLAST RADIUS, measured on the live DB before applying: of the 1,847-line
-- census of every (course, role) voice_config entry in the estate, exactly TWO
-- carry a voiceId with its own provider prefix — deu_at_for_eng target2 and
-- fin_for_eng target1, both `human`. Every synthetic voice (xai/azure/
-- elevenlabs/google) resolves to a byte-identical string before and after.
--
-- REVERSIBLE: restore the previous body from
-- 20260819_relink_must_match_voice_config.sql §1.
-- =============================================================================

BEGIN;

-- The canonical provider name for a spelling seen in the estate, or NULL when
-- the token is not a provider at all. Mirrors PROVIDER_ALIASES in
-- services/shared/clip-identity.cjs. 'comp:' is deliberately absent there and
-- here — a composite is a splice recipe, not a provider.
CREATE OR REPLACE FUNCTION audio_provider_alias(p_token text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(p_token)
    WHEN 'azure'      THEN 'azure'
    WHEN 'ms'         THEN 'azure'
    WHEN 'microsoft'  THEN 'azure'
    WHEN 'xai'        THEN 'xai'
    WHEN 'elevenlabs' THEN 'elevenlabs'
    WHEN 'eleven'     THEN 'elevenlabs'
    WHEN '11labs'     THEN 'elevenlabs'
    WHEN 'google'     THEN 'google'
    WHEN 'gcp'        THEN 'google'
    WHEN 'narakeet'   THEN 'narakeet'
    WHEN 'human'      THEN 'human'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION audio_provider_alias(text) IS
  'Canonical provider name for a voice-id prefix token, or NULL if the token is not a provider. Mirrors PROVIDER_ALIASES in services/shared/clip-identity.cjs.';

-- The voice_id string phase 8 would WRITE for a role, from courses.voice_config.
-- Mirrors services/shared/clip-identity.cjs canonicalVoiceId as phase 8 calls it
-- (phase8-audio-v13.cjs canonicalClipVoiceId): the id's own prefix wins, the
-- `provider` key is only a hint for an unprefixed id. Role 'source' is the
-- legacy alias for 'known' and resolves to the same slot.
CREATE OR REPLACE FUNCTION audio_configured_voice(p_course_code text, p_role text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN vid IS NULL THEN NULL
    -- The id already names its provider: keep it, normalising the alias only.
    -- This is the branch that was doubling `human_`.
    WHEN audio_provider_alias(substring(vid from '^([A-Za-z0-9]+)[_:]')) IS NOT NULL
      THEN audio_provider_alias(substring(vid from '^([A-Za-z0-9]+)[_:]'))
           || '_' || substring(vid from '^[A-Za-z0-9]+[_:](.*)$')
    -- No prefix on the id: the provider key supplies one, as before.
    WHEN prov IS NOT NULL
      THEN COALESCE(audio_provider_alias(prov), prov) || '_' || vid
    ELSE vid
  END
  FROM (
    SELECT v->>'voiceId' AS vid, v->>'provider' AS prov
    FROM (
      SELECT c.voice_config->'voices'->(CASE WHEN p_role = 'source' THEN 'known' ELSE p_role END) AS v
      FROM courses c WHERE c.course_code = p_course_code
    ) s
  ) t;
$$;

COMMENT ON FUNCTION audio_configured_voice(text, text) IS
  'The voice_id string phase 8 would write for a role. The id''s own provider prefix wins over the provider key — a human artist''s id already carries human_, and doubling it made the autolinker refuse the artist''s own clips (fixed 2026-08-25).';

COMMIT;
