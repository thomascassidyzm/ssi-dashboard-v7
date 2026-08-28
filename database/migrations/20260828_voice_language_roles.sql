-- voice_language_roles — WHICH VOICE SPEAKS WHICH LANGUAGE, AND IN WHICH SLOT.
--
-- Tom, 2026-08-28: "each language needs 2 voices, 1 male and 1 female as
-- standard, with backups in case for whatever reason there's a problem".
--
-- WHY A SEPARATE TABLE RATHER THAN COLUMNS ON `voices`
-- `voices` answers "what is this voice?" — one row per voice, with `languages
-- text[]` listing what it CAN speak. The question Tom is asking is a different
-- one: "for this language, who is the primary female?" That is a per-(language,
-- gender,rank) fact, and one voice can legitimately hold different slots in
-- different languages — primary female for Spanish, first backup for Italian.
-- A column on `voices` cannot express that without an array-of-structs, and
-- overloading `notes` would make the estate's casting unqueryable prose.
--
-- The rank convention: 0 = primary, 1 = first backup, 2 = second backup. A
-- language is "complete" at rank 0 and 1 for BOTH genders (four voices); the
-- completeness rule lives in services/voicelab/registry.cjs, not in a
-- constraint, because it is a taste call of Tom's that should be one number to
-- change rather than a migration.
--
-- `language` is ISO-639-3 as `courses.target_lang` stores it, so this table
-- joins to the estate without translation.

CREATE TABLE IF NOT EXISTS voice_language_roles (
  language    text    NOT NULL,
  -- Same domain as voices.gender, which carries CHECK (gender IN ('f','m')).
  gender      text    NOT NULL CHECK (gender IN ('f', 'm')),
  -- 0 = primary, 1 = first backup, 2 = second backup.
  rank        integer NOT NULL CHECK (rank >= 0 AND rank <= 5),
  -- ON DELETE CASCADE: a voice removed from the estate must not leave a slot
  -- pointing at nothing. The slot going empty is the correct outcome — it makes
  -- the language read as incomplete, which is exactly the alarm we want.
  voice_id    text    NOT NULL REFERENCES voices(voice_id) ON DELETE CASCADE,
  notes       text,
  assigned_by text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (language, gender, rank)
);

-- One voice may hold at most one rank per (language, gender): without this you
-- can cast the same voice as both primary and its own backup, which reads as
-- covered and is not.
CREATE UNIQUE INDEX IF NOT EXISTS voice_language_roles_no_self_backup
  ON voice_language_roles (language, gender, voice_id);

CREATE INDEX IF NOT EXISTS voice_language_roles_voice_idx
  ON voice_language_roles (voice_id);
