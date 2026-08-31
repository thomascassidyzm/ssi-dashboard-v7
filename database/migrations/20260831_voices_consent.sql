-- voices.consent_* — WHOSE VOICE THIS IS, WHO SAID YES, AND WHEN.
--
-- Tom, 2026-08-31, commissioning the human-voice-cloning path in the Voice Lab:
--
--   "consent must be explicit and recorded — who the voice belongs to, who
--    authorised it, when — shown on the voice itself, because these are real
--    people."
--
-- and, in the amendment that inverted the flow the same day:
--
--   "Consent still applies and is Tom to obtain, not you: build the consent
--    record and show it on the voice, but do NOT treat existing recordings as
--    implied permission — the voice starts marked as awaiting authorisation
--    until Tom says otherwise."
--
-- ── WHY COLUMNS AND NOT A NOTE ──────────────────────────────────────────────
-- `voices.notes` already exists and a sentence in it would have been cheaper.
-- It would also have been decorative: nobody can ask a free-text column "which
-- cloned voices has nobody authorised?", which is the one question that has to
-- be answerable before a clone of a real person's voice reaches a learner. So
-- consent is structured data on the voice, queryable in SQL, and the screen
-- renders the stored fact rather than a sentence somebody typed.
--
-- ── WHY AN EXPLICIT STATE AND NOT A NULLABLE TIMESTAMP ──────────────────────
-- A NULL authorised-at reads as "unknown", and "unknown" is exactly the word
-- Tom named as an embarrassment on screen. The four states are distinct claims
-- and are never collapsed:
--
--   not_recorded          — nobody has recorded anything about this voice.
--                           EVERY PRE-EXISTING ROW IS THIS, and it is the
--                           honest answer for them: consent that was never
--                           witnessed must never be backfilled.
--   awaiting_authorisation— a clone exists, whose voice it is has been NAMED,
--                           and the person has not been asked yet or has not
--                           answered. THE BIRTH STATE of every clone made from
--                           recordings the estate already holds. A recording
--                           existing is not permission to clone the speaker.
--   authorised            — a named person said yes, by a named means, on a
--                           named date, recorded by a named operator.
--   refused / withdrawn   — they said no, or said yes and then changed their
--                           mind. Kept apart from `not_recorded` because "we
--                           never asked" and "they said no" are opposite
--                           facts, and a voice must never drift from the
--                           second back to the first.
--
-- ── WHY THE CONSENTER AND THE OPERATOR ARE SEPARATE COLUMNS ─────────────────
-- Recording who ASKED is not the same as recording who CONSENTED. If one
-- column held both, an operator ticking a box would be indistinguishable from
-- the person themselves saying yes. `consent_authorised_by` is the human whose
-- voice it is (or their authorised representative); `consent_recorded_by` is
-- the dashboard user who wrote the record down. They are usually different
-- people and they carry different weight.
--
-- ── WHAT THIS MIGRATION DOES NOT DO ─────────────────────────────────────────
-- It does not block anything. Casting an unauthorised voice is still possible,
-- because a hard block is Tom's call and he has not made it; the page warns
-- plainly instead (Voice Lab, 2026-08-31). And it back-fills NOTHING: every
-- existing voice reads `not_recorded` until a human records otherwise.

ALTER TABLE voices
  -- The state itself. NOT NULL with a default, so a consent fact is never
  -- absent — "we have not recorded anything" is a value, not a missing one.
  ADD COLUMN IF NOT EXISTS consent_status         text NOT NULL DEFAULT 'not_recorded',
  -- WHOSE VOICE IT IS. The person the sample came from, named. Distinct from
  -- human_name, which on an existing row may be a role description ("Welsh
  -- Speaker 1") rather than a person — and a role description cannot consent.
  ADD COLUMN IF NOT EXISTS consent_person         text,
  ADD COLUMN IF NOT EXISTS consent_person_contact text,
  -- WHO SAID YES, HOW, AND WHEN. Three separate facts; a yes with no means and
  -- no date is a rumour.
  ADD COLUMN IF NOT EXISTS consent_authorised_by  text,
  ADD COLUMN IF NOT EXISTS consent_authorised_how text,
  ADD COLUMN IF NOT EXISTS consent_authorised_at  timestamptz,
  -- WHO WROTE IT DOWN, and when. The operator, never the consenter.
  ADD COLUMN IF NOT EXISTS consent_recorded_by    text,
  ADD COLUMN IF NOT EXISTS consent_recorded_at    timestamptz,
  -- WHERE THE SAMPLE CAME FROM, in one line: "3 estate clips of human_recording
  -- (48s)" or "uploaded file" or "recorded in the browser". Provenance of the
  -- audio, which is a different question from permission to use it.
  ADD COLUMN IF NOT EXISTS consent_source         text,
  ADD COLUMN IF NOT EXISTS consent_note           text;

ALTER TABLE voices DROP CONSTRAINT IF EXISTS voices_consent_status_known;
ALTER TABLE voices
  ADD CONSTRAINT voices_consent_status_known
  CHECK (consent_status IN ('not_recorded', 'awaiting_authorisation', 'authorised', 'refused', 'withdrawn'));

-- An `authorised` row that cannot say WHO said yes and WHEN is not a consent
-- record, it is a tick box. The database refuses it rather than trusting every
-- future caller to remember.
ALTER TABLE voices DROP CONSTRAINT IF EXISTS voices_consent_authorised_is_evidenced;
ALTER TABLE voices
  ADD CONSTRAINT voices_consent_authorised_is_evidenced
  CHECK (
    consent_status <> 'authorised'
    OR (consent_authorised_by IS NOT NULL AND btrim(consent_authorised_by) <> ''
        AND consent_authorised_at IS NOT NULL)
  );

-- Likewise a voice that is awaiting authorisation must at least be able to say
-- WHOSE voice it is — otherwise nobody can ever go and ask them.
ALTER TABLE voices DROP CONSTRAINT IF EXISTS voices_consent_awaiting_names_the_person;
ALTER TABLE voices
  ADD CONSTRAINT voices_consent_awaiting_names_the_person
  CHECK (
    consent_status <> 'awaiting_authorisation'
    OR (consent_person IS NOT NULL AND btrim(consent_person) <> '')
  );

COMMENT ON COLUMN voices.consent_status IS
  'not_recorded | awaiting_authorisation | authorised | refused | withdrawn. NOT NULL: "nobody has recorded anything" is a value, never a missing one. Pre-existing rows are not_recorded and must never be backfilled.';
COMMENT ON COLUMN voices.consent_person IS
  'Whose voice this is — the person the sample came from, named. A recording existing is not their permission to clone them.';
COMMENT ON COLUMN voices.consent_person_contact IS
  'How to reach that person, if known. Free text; email, phone or "via Tom".';
COMMENT ON COLUMN voices.consent_authorised_by IS
  'The human who actually said yes. NOT the operator who recorded it — see consent_recorded_by.';
COMMENT ON COLUMN voices.consent_authorised_how IS
  'How they said it: in person, by email, by message, on a call. A yes with no means is a rumour.';
COMMENT ON COLUMN voices.consent_authorised_at IS
  'When the AUTHORISATION was given — not when the clone was made.';
COMMENT ON COLUMN voices.consent_recorded_by IS
  'The dashboard user who wrote the record down.';
COMMENT ON COLUMN voices.consent_recorded_at IS
  'When the record was written down.';
COMMENT ON COLUMN voices.consent_source IS
  'Provenance of the cloning sample in one line. A different question from permission.';
COMMENT ON COLUMN voices.consent_note IS
  'Anything else a human needs to know about this permission, in their own words.';

-- The only query anything runs against these: "which voices are not authorised
-- yet?". Partial, because once the estate is tidy that set is small.
CREATE INDEX IF NOT EXISTS voices_consent_outstanding
  ON voices (voice_id) WHERE consent_status <> 'authorised';
