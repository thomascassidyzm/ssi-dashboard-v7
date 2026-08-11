-- Voices carry the provider's OWN metadata, so gender is a fact we can read
-- rather than a guess from a display name.
--
-- Why (2026-08-11): the pod-0 pool audit could check every Azure entry against
-- Azure's /voices/list and found a live miscast (tur.f[0] was a Male voice),
-- but reported all 48 xAI entries as UNVERIFIABLE — the belief being that our
-- opaque ids (`f331ee80`) appear in no catalogue xAI serves. That belief came
-- from comparing ids against the /v1/tts/voices LIST by name. xAI does serve
-- them, by id: GET /v1/tts/voices/{voice_id} returns
-- {voice_id, name, language, gender, age} for exactly these ids.
--
-- These columns are where that answer lands, so no tool ever has to ask the
-- provider (or a human's ears) the same question twice.
--   gender             'f' | 'm' — the provider's word, normalised
--   age                the provider's band ('young', 'middle-aged', 'old')
--   metadata_source    how we learnt it: 'xai:GET /v1/tts/voices/{id}',
--                      'azure:voices/list', 'human-listen', …
--   metadata_checked_at when that read happened

ALTER TABLE voices ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE voices ADD COLUMN IF NOT EXISTS age TEXT;
ALTER TABLE voices ADD COLUMN IF NOT EXISTS metadata_source TEXT;
ALTER TABLE voices ADD COLUMN IF NOT EXISTS metadata_checked_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE voices ADD CONSTRAINT voices_gender_check CHECK (gender IN ('f', 'm'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN voices.gender IS 'f|m as the PROVIDER states it — never inferred from the display name; NULL means genuinely unknown, not "probably".';
COMMENT ON COLUMN voices.metadata_source IS 'Provenance of gender/age/locale, e.g. "xai:GET /v1/tts/voices/{id}".';
