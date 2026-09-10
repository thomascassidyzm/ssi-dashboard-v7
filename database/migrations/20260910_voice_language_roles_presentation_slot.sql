-- voice_language_roles.slot gains 'presentation' — THE COURSE NARRATOR,
-- CAST PER KNOWN LANGUAGE, AND TOM'S CLONE GOES IN IT.
--
-- Tom, 2026-09-10, on a branch that would have made the render path obey the
-- casting table and, in doing so, moved ~50 eng_for_* courses off his Cartesia
-- clone onto the stock Azure voice their voice_config was scaffolded with:
--   "no way - that's insane - why would a worker suggest replacing my voice
--    clone with Azure???"
-- The rule was right and the DATA was wrong. Voice Lab was built as "two
-- standard voices plus backups per language", and his clone is a PERSON rather
-- than a language slot, so there was nowhere to put it and it was never in the
-- table to be cast. Asked whether the clone should go in as the English
-- presentation voice — "then the principle stands and nothing touches your
-- voice" — he answered "yes".
--
-- WHY THE NARRATOR IS THE GUIDE'S SHAPE AND NOT THE PHRASE PAIR'S
-- A presentation is the intro line: "French for 'I want' is:". It is spoken in
-- the learner's KNOWN language, so it is cast against the known side, it is ONE
-- voice per language rather than a male/female pair, and — like the guide — it
-- must never count toward a language's completeness: only about twelve of the
-- estate's sixty-eight languages are ever a known language, and counting it
-- would turn every other row amber and stop the screen saying anything.
--
-- WHY IT IS A SLOT OF ITS OWN AND NOT A THIRD GUIDE ROLE
-- The guide is the app talking to the learner; the presentation is the course
-- narrating a LEGO. Two decisions Kai must be able to make apart from each
-- other, on one screen, per language.
--
-- WHAT THIS MIGRATION DOES NOT DO
-- It casts nothing. The row for English is written through the Voice Lab cast
-- route, so the consent gate, the human-voice guard and the assigned_by
-- attribution all do their normal work. Every other known language gets a slot
-- that exists and is castable and is left EMPTY, so its narrator resolves
-- exactly as it does today, byte for byte
-- (services/shared/language-voice-cast.cjs).

ALTER TABLE voice_language_roles DROP CONSTRAINT IF EXISTS voice_language_roles_slot_check;
ALTER TABLE voice_language_roles
  ADD CONSTRAINT voice_language_roles_slot_check
  CHECK (slot IN ('phrase', 'guide', 'presentation'));

-- ONE NARRATOR PER LANGUAGE PER RANK, ENFORCED — the exact twin of
-- voice_language_roles_one_guide_per_rank, and for the same reason. `gender` is
-- in the primary key, so without this a language could hold both a male rank-0
-- narrator and a female rank-0 narrator: two primaries and no way to say which
-- speaks. A presentation row's gender records the voice's own gender as a fact
-- and the reader ignores it.
CREATE UNIQUE INDEX IF NOT EXISTS voice_language_roles_one_presentation_per_rank
  ON voice_language_roles (language, rank) WHERE slot = 'presentation';

COMMENT ON COLUMN voice_language_roles.slot IS
  'phrase = the male/female course-material voices. guide = the instruction and '
  'encouragement voice, cast against the KNOWN language, one per language, '
  'gender informational only (Tom, 2026-08-29). presentation = the course '
  'narrator (the LEGO intro), also cast against the KNOWN language, also one '
  'per language and gender-informational, and also outside the completeness '
  'count (Tom, 2026-09-10).';
