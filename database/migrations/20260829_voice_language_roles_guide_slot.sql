-- voice_language_roles.slot — THE GUIDE VOICE, CAST PER KNOWN LANGUAGE.
--
-- Tom, 2026-08-29:
--   "each language can be known or target, depending on the course, and the
--    course role determines what text is said, so these won't be the same - but
--    they are the same voices, well the can be
--    the instructions and the encouragements - are currently mostly done in
--    Aran's Eleven Labs voice
--    these are not linked to a course per se - they are linked to every course
--    with the same known language, because these are messages to the learner,
--    encouragements and so on"
--
-- WHY A THIRD KIND OF AUDIO NEEDS A THIRD KIND OF SLOT
-- The male/female slots this table already carries are PHRASE voices: they
-- speak course material, and a course needs one of each so the two sides of a
-- pair are not the same person. Instructions and encouragements are not course
-- material. They are the app talking to the learner, they are bound to the
-- KNOWN language, and they are one voice — Aran speaks to every English-known
-- learner across every course. A male/female pair is the wrong shape for that:
-- a guide is one voice, optionally with a backup, and its gender is a fact
-- about the voice rather than a slot to be filled.
--
-- The asymmetry is the reason this matters at all: the estate teaches 68 target
-- languages but reads instructions in only TWELVE known languages. Casting a
-- guide is a dozen decisions, not seventy.
--
-- WHY A COLUMN AND NOT A SECOND TABLE
-- The table holds ZERO rows today, so widening the primary key is free, and one
-- casting table means the registry, the router, the panel and the render-path
-- reader (services/shared/language-voice-cast.cjs) all EXTEND rather than fork.
-- Two tables would mean two readers, two writers and two chances for the screen
-- to disagree with the render.
--
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
-- It casts NOTHING. Every known language already has exactly one instruction
-- voice in practice — that uniformity is measured, not assumed — but Tom asked
-- for the existing behaviour to be preserved where nothing is cast, and a
-- migration that quietly casts twelve languages is not that. The table stays
-- empty until a human clicks. With no rows, the render path resolves the
-- course's stored voice_config exactly as it does today, byte for byte.

ALTER TABLE voice_language_roles
  ADD COLUMN IF NOT EXISTS slot text NOT NULL DEFAULT 'phrase'
  CHECK (slot IN ('phrase', 'guide'));

-- The slot joins the key. 'phrase' is the default, so every existing row (there
-- are none) and every existing INSERT that names no slot keeps meaning exactly
-- what it meant before.
ALTER TABLE voice_language_roles DROP CONSTRAINT IF EXISTS voice_language_roles_pkey;
ALTER TABLE voice_language_roles ADD PRIMARY KEY (slot, language, gender, rank);

-- The no-self-backup index has to widen with the key: a voice may hold at most
-- one rank per (slot, language, gender), or you can cast a voice as its own
-- backup and the language reads as covered when it is not.
DROP INDEX IF EXISTS voice_language_roles_no_self_backup;
CREATE UNIQUE INDEX IF NOT EXISTS voice_language_roles_no_self_backup
  ON voice_language_roles (slot, language, gender, voice_id);

-- A guide is ONE voice per language, not a pair, so gender carries no pairing
-- meaning in a guide row — it simply records the guide voice's own gender
-- (Aran is male) and the reader ignores it, taking the lowest-rank active guide
-- row for the language whatever its gender. This index is what makes that read
-- a single ordered scan.
CREATE INDEX IF NOT EXISTS voice_language_roles_slot_lang_rank_idx
  ON voice_language_roles (slot, language, rank);

COMMENT ON COLUMN voice_language_roles.slot IS
  'phrase = the male/female course-material voices. guide = the instruction and '
  'encouragement voice, cast against the KNOWN language, one per language, '
  'gender informational only (Tom, 2026-08-29).';

-- ONE GUIDE PER LANGUAGE PER RANK, ENFORCED.
--
-- A guide row records the guide voice's own gender (Aran is male) purely as a
-- fact about the voice — it carries no pairing meaning and the render-path
-- reader ignores it, taking the lowest-rank active guide row for the language
-- whatever its gender. But because `gender` is in the primary key, that on its
-- own would let a language hold BOTH a male rank-0 guide and a female rank-0
-- guide, i.e. two primaries and no way to say which speaks. This partial index
-- closes that: for the guide slot, (language, rank) is the real key.
CREATE UNIQUE INDEX IF NOT EXISTS voice_language_roles_one_guide_per_rank
  ON voice_language_roles (language, rank) WHERE slot = 'guide';
