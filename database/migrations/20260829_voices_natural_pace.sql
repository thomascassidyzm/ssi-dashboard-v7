-- voices.natural_pace_* — HOW FAST THIS VOICE ACTUALLY SPEAKS, MEASURED.
--
-- Tom, 2026-08-29, looking at the learner player's belt ramp:
--
--   "we're minting everything at 1.0x but the target languages are then played
--    at lower speeds for the first few belts on a kind of ramp-up process …
--    White belt = 0.8x, Y = 0.9, O = 0.95 and G = 1.0 … but that seems a bit
--    too blunt for my liking, intuitively"
--
-- He is right, and the reason is arithmetic. A fixed multiplier assumes every
-- voice has the same natural pace, so 0.8x of a brisk voice and 0.8x of a
-- measured voice land in completely different places for the learner. Measured
-- on 2026-08-29 over clips that were genuinely rendered at 1.0x, English
-- `known` voices span 0.78x to 1.41x of their own language's median — an 81%
-- spread inside ONE language and ONE role. A white belt on the fastest of them
-- is played faster than a green belt on the slowest.
--
-- The fix is to let the belt ladder express a TARGET PACE and have the player
-- derive the per-voice multiplier from (target ÷ this voice's natural pace).
-- That needs the natural pace to be a stored fact about the voice, which is
-- what these columns are.
--
-- ── WHY ON `voices` AND NOT A NEW TABLE ─────────────────────────────────────
-- Unlike casting — which is a per-(language,gender,rank) fact and therefore got
-- its own table on 2026-08-28 — pace is a property OF THE VOICE. It sits beside
-- gender/age/metadata_source from 20260811_voices_provider_metadata.sql and
-- answers the same kind of question: "what is this voice?"
--
-- ── WHY THE MEASUREMENT AND THE NUDGE ARE SEPARATE COLUMNS ──────────────────
-- Tom's ruling is that pace is MEASURED from existing rendered audio, never
-- asked of a human. But an ear beats an aggregate, and a human who listens and
-- says "no, that one still drags" must not have that correction silently
-- deleted the next time the measurement is re-run. So the measured figure and
-- the human's correction never share a column: re-measurement overwrites
-- natural_pace_* and NEVER touches natural_pace_nudge.
--
-- ── WHY A RATIO IS THE LOAD-BEARING NUMBER, NOT chars/sec ───────────────────
-- Characters per second is not comparable between Welsh and Japanese, or even
-- between two scripts. What the belt ramp needs is each voice's pace RELATIVE
-- to the other voices speaking the same language, which is exactly the
-- comparison a learner experiences. chars/sec is stored too, but only as the
-- evidence behind the ratio — never as the thing anything divides by.

ALTER TABLE voices
  -- The measured ratio of this voice's pace to the MEDIAN pace of the other
  -- voices in the same language and role. 1.0 = typical for its language.
  -- Above 1.0 = brisker than typical; below = more measured. NULL = never
  -- measured, and a NULL voice must resolve exactly as it does today.
  ADD COLUMN IF NOT EXISTS natural_pace_ratio      numeric(5,3),
  -- The raw evidence: characters of text_normalized per second of audio.
  -- Informational only. NEVER compare this across languages.
  ADD COLUMN IF NOT EXISTS natural_pace_cps        numeric(7,3),
  -- How many clips the figure was computed over. A ratio from 120 clips and a
  -- ratio from 34,000 clips are not the same claim, and a reader deserves to
  -- see which one they are looking at.
  ADD COLUMN IF NOT EXISTS natural_pace_samples    integer,
  -- When, so a stale figure is visible as stale rather than merely wrong.
  ADD COLUMN IF NOT EXISTS natural_pace_measured_at timestamptz,
  -- How. A re-measurement under a different rule (different tail guard,
  -- syllables instead of characters) must be legible as a different claim
  -- rather than quietly replacing the old one at the same name.
  ADD COLUMN IF NOT EXISTS natural_pace_method     text,
  -- THE HUMAN'S CORRECTION, multiplicative, applied on top of the measurement.
  -- 1.0 or NULL = no correction. Never written by the measurement tool.
  ADD COLUMN IF NOT EXISTS natural_pace_nudge      numeric(4,3),
  ADD COLUMN IF NOT EXISTS natural_pace_nudge_note text;

COMMENT ON COLUMN voices.natural_pace_ratio IS
  'Measured pace relative to the median voice of the same language+role. 1.0 = typical. NULL = unmeasured; an unmeasured voice must behave exactly as it did before per-voice pace existed.';
COMMENT ON COLUMN voices.natural_pace_cps IS
  'Characters of text_normalized per second of audio. Evidence for natural_pace_ratio only — never comparable across languages.';
COMMENT ON COLUMN voices.natural_pace_samples IS
  'Number of clips the measurement aggregated. Sample size is part of the claim.';
COMMENT ON COLUMN voices.natural_pace_measured_at IS
  'When natural_pace_ratio was last computed.';
COMMENT ON COLUMN voices.natural_pace_method IS
  'The rule used, so a re-measurement under different assumptions is legible as a different claim.';
COMMENT ON COLUMN voices.natural_pace_nudge IS
  'Human multiplicative correction on top of the measurement. NULL or 1.0 = none. A re-measurement must never overwrite this.';
COMMENT ON COLUMN voices.natural_pace_nudge_note IS
  'Why the human nudged it, in their own words.';

-- Sanity bounds, deliberately wide. These are not a taste call about what a
-- sensible pace is — that clamp lives in services/shared/voice-pace.cjs where
-- it can be changed without a migration. These only stop a decimal-point slip
-- from writing a ratio of 140 and silently making a course inaudible.
ALTER TABLE voices
  DROP CONSTRAINT IF EXISTS voices_natural_pace_ratio_sane;
ALTER TABLE voices
  ADD CONSTRAINT voices_natural_pace_ratio_sane
  CHECK (natural_pace_ratio IS NULL OR (natural_pace_ratio > 0.2 AND natural_pace_ratio < 5.0));

ALTER TABLE voices
  DROP CONSTRAINT IF EXISTS voices_natural_pace_nudge_sane;
ALTER TABLE voices
  ADD CONSTRAINT voices_natural_pace_nudge_sane
  CHECK (natural_pace_nudge IS NULL OR (natural_pace_nudge >= 0.5 AND natural_pace_nudge <= 2.0));

-- Partial index: the only query anything runs against these columns is "which
-- voices have a pace?", and the overwhelming majority will not, for a long time.
CREATE INDEX IF NOT EXISTS voices_natural_pace_measured
  ON voices (voice_id) WHERE natural_pace_ratio IS NOT NULL;
