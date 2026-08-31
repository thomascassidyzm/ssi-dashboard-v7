-- voices.consent_declaration_* — THE WORDS THEMSELVES, AND WHAT WAS HEARD.
--
-- Tom, 2026-09-01, closing the hole left open by 20260831_voices_consent.sql:
--
--   "when someone records a voice in the browser to clone it, they must READ A
--    REQUIRED PHRASE ALOUD as part of that recording. It does two jobs at once
--    — it proves the speaker is the person consenting, and it IS the consent
--    record. A clone must not be creatable from a browser recording where the
--    phrase was not read."
--
-- ── WHY THIS IS A SEPARATE MIGRATION AND NOT AN EDIT ────────────────────────
-- The 2026-08-31 columns answer WHO said yes, HOW and WHEN. They do not hold
-- WHAT WAS SAID. That was survivable while consent was something Tom obtained
-- off-system and typed in afterwards — his own memory was the record. It stops
-- being survivable the moment the consent event happens INSIDE the tool: if the
-- browser asks somebody to agree to a form of words, the estate must be able to
-- produce those exact words, months later, without anyone having to remember
-- which version of the wording was on screen that day. Wording drifts. Tom will
-- redline the sentence on the live thing and it will change again. So the text
-- is stored VERBATIM on each voice, per voice, at the moment of consent —
-- never looked up from the code that happened to be deployed at the time.
--
-- ── THE THREE COLUMNS, AND WHY THE THIRD ONE EXISTS ─────────────────────────
--   consent_declaration       the exact words read aloud or agreed to. The
--                             record itself. Produced later, as evidence, by
--                             reading this column and nothing else.
--   consent_declaration_kind  'spoken' or 'attested' — two genuinely different
--                             strengths of evidence, kept apart because
--                             collapsing them would let the weaker one be
--                             reported as the stronger. 'spoken' means the
--                             person's own voice, on the recording being
--                             cloned, saying the line: the speaker and the
--                             consenter are demonstrably the same body.
--                             'attested' means a human ticked a box next to
--                             the wording. That is a real, named, dated
--                             commitment and it is what the upload route can
--                             honestly obtain — you cannot get a spoken
--                             declaration out of a file somebody else made —
--                             but it is not proof of who spoke.
--   consent_declaration_heard WHAT WHISPER ACTUALLY HEARD on the recording,
--                             for the spoken kind. The evidence, not the
--                             verdict. Kept because a stored "we checked" with
--                             nothing behind it is unfalsifiable: this column
--                             is what lets a future human disagree with the
--                             machine's reading of a clip. NULL for 'attested',
--                             where there was nothing to listen to.
--
-- ── WHAT THIS MIGRATION DOES NOT DO ─────────────────────────────────────────
-- It back-fills NOTHING. Every voice that exists today was cloned before there
-- was a phrase to read, so every one of them has a NULL declaration, and that
-- is the honest answer for them. Inventing a declaration for a voice whose
-- speaker never read one would be manufacturing the exact evidence this
-- feature exists to produce truthfully. It also adds no NOT NULL and no
-- dependency between these columns and consent_status: cloning from recordings
-- the estate already holds is unchanged, has no live speaker, and keeps being
-- born awaiting_authorisation with no declaration at all.

ALTER TABLE voices
  -- The exact words, stored per voice at the moment of consent. Never a
  -- foreign key to a wording table and never a version number: the point is
  -- that this row can be read on its own, years later, by somebody who has no
  -- access to the code that was deployed today.
  ADD COLUMN IF NOT EXISTS consent_declaration      text,
  -- 'spoken' | 'attested'. Two different strengths of evidence — see above.
  ADD COLUMN IF NOT EXISTS consent_declaration_kind text,
  -- What the machine heard. Evidence for the spoken kind, so a human can
  -- disagree with the check rather than having to trust it.
  ADD COLUMN IF NOT EXISTS consent_declaration_heard text;

-- The one constraint. Not "a declaration must have a kind" and not "authorised
-- must have a declaration" — both would be false for the estate-clone path,
-- which is deliberately unchanged. Only this: if a kind is recorded at all, it
-- is one of the two the code knows how to mean.
ALTER TABLE voices DROP CONSTRAINT IF EXISTS voices_consent_declaration_kind_known;
ALTER TABLE voices
  ADD CONSTRAINT voices_consent_declaration_kind_known
  CHECK (consent_declaration_kind IS NULL OR consent_declaration_kind IN ('spoken', 'attested'));

COMMENT ON COLUMN voices.consent_declaration IS
  'The exact words the person read aloud or agreed to, stored verbatim at the moment of consent so they can be produced later. Never looked up from code — the wording changes, this record must not.';
COMMENT ON COLUMN voices.consent_declaration_kind IS
  'spoken | attested. spoken = the person said the line on the recording being cloned, so speaker and consenter are the same body. attested = a named human agreed to the wording when uploading. Kept apart so the weaker evidence is never reported as the stronger.';
COMMENT ON COLUMN voices.consent_declaration_heard IS
  'What whisper actually heard on the recording, for the spoken kind. The evidence behind the check, not its verdict — it is what lets a human disagree with the machine later. NULL for attested, where there was nothing to listen to.';
