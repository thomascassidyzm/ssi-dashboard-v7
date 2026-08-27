-- Clip identity: teach the database that Cartesia is a provider.
--
-- 2026-08-27, with the forward-only Cartesia wiring.
--
-- WHY THIS IS NOT OPTIONAL, AND WHY IT IS NOT A CODE CHANGE'S FOOTNOTE
--
-- canonical_voice_id() is the declared mirror of canonicalVoiceId() in
-- services/shared/clip-identity.cjs, and it is not merely a query helper: the
-- live trigger
--
--     trg_course_audio_canonical_identity
--       BEFORE INSERT OR UPDATE OF language, voice_id ON course_audio
--
-- calls it on every write. It raises check_violation on any voice_id whose
-- provider prefix is not in its allowlist, and until 2026-08-27 that allowlist
-- was (azure|xai|elevenlabs|google|narakeet|human).
--
-- Probed against the LIVE database on 2026-08-27, before this migration:
--
--   canonical_voice_id('cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')
--     → ERROR: clip identity: voice_id … has no provider prefix and no
--       inferable provider — the writer must supply one
--   canonical_voice_id('xai_eve') → xai_eve
--
-- So with the application code wired and this migration not applied, the very
-- first Cartesia render succeeds, is uploaded to S3, and is then REFUSED by the
-- database on insert. The pipeline would fail at the last step, having paid for
-- the clip. The code side of the keystone is one line in PROVIDER_ALIASES; this
-- is the other half of the same line, and neither works alone.
--
-- WHAT IT DOES
-- Adds 'cartesia' to the provider-prefix branch. That is the whole change: one
-- alternation in one regex, in a CREATE OR REPLACE.
--
-- WHAT IT DOES NOT DO
-- It touches no data, no table, no constraint, and no existing row. It widens
-- what the function ACCEPTS and narrows nothing, so every id that canonicalised
-- before canonicalises identically after — including the ids it still refuses.
-- It is forward-only in the same sense the rest of this wiring is: it makes new
-- audio possible and leaves the catalogue untouched.
--
-- Rollback: replace the regex with the six-provider original. Safe at any time
-- provided no cartesia_* row has been written yet; after that, a rollback makes
-- those rows un-updatable, which is the same shape as part 3's back-fill order.

BEGIN;

CREATE OR REPLACE FUNCTION canonical_voice_id(v text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE part text; out_parts text[] := '{}';
BEGIN
  v := btrim(coalesce(v, ''));
  IF v = '' OR lower(v) IN ('legacy_import','legacy','human','human_recording','unknown','default','auto') THEN
    RAISE EXCEPTION 'clip identity: voice_id % is a placeholder, not a voice', coalesce(v,'<null>')
      USING ERRCODE = 'check_violation';
  END IF;
  IF v ~* '^comp:' THEN
    FOREACH part IN ARRAY string_to_array(substr(v, 6), '+') LOOP
      IF btrim(part) <> '' THEN
        out_parts := out_parts || canonical_voice_id(btrim(part));
      END IF;
    END LOOP;
    IF array_length(out_parts, 1) IS NULL THEN
      RAISE EXCEPTION 'clip identity: composite voice_id % has no parts', v USING ERRCODE = 'check_violation';
    END IF;
    RETURN 'comp:' || array_to_string(out_parts, '+');
  END IF;
  -- 'cartesia' added 2026-08-27. Cartesia voice ids are bare UUIDs with no
  -- shape of their own, so the prefix is the ONLY thing that identifies them.
  IF v ~ '^(azure|xai|elevenlabs|google|narakeet|human|cartesia)_.' THEN RETURN v; END IF;
  IF v ~ '^[a-z]{2,3}-[A-Za-z]{2,4}-[A-Za-z]+Neural$' THEN RETURN 'azure_' || v; END IF;
  IF lower(v) IN ('eve','leo','ara','sal','rex','gfzdpspr5fdp','bedd6226') THEN RETURN 'xai_' || v; END IF;
  RAISE EXCEPTION 'clip identity: voice_id % has no provider prefix and no inferable provider — the writer must supply one', v
    USING ERRCODE = 'check_violation';
END $$;

COMMIT;
</content>
</invoke>
