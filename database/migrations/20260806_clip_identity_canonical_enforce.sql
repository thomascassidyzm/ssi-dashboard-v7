-- Clip identity, canonical forms — enforcement.
--
-- Part 2 of 3. Requires 20260806_clip_identity_canonical_functions.sql.
--
-- ⚠️ DO NOT APPLY UNTIL EVERY WRITER IS CONVERTED. Once this is on, a writer
-- still handing over 'auto', 'legacy_import' or an opaque voice id with no
-- provider gets an exception instead of a row. That is the point — but it is
-- also a live audio pipeline, so the order is: convert the writers, run
-- `node tools/audio-identity-lint.cjs` and confirm the unresolvable buckets are
-- empty for anything still being written, THEN apply this.
--
-- WHAT IT DOES
-- 1. A BEFORE trigger that canonicalises language and voice_id on the way in.
--    On INSERT, always. On UPDATE, only for a column the statement actually
--    changes — so an unrelated update never silently rewrites the identity of
--    an old row, and the back-fill stays the one thing that moves old rows.
-- The CHECK constraints are deliberately NOT here — they are part 3, and they
-- come AFTER the back-fill, not before it. Measured against the live schema on
-- 2026-08-06: a NOT VALID CHECK is still evaluated on every UPDATE of an
-- existing row, even an update that does not touch the checked column. So
-- adding the constraints while 158,153 drifted rows remain makes those rows
-- un-updatable — a duration_ms or veracity write on any of them would fail.
-- Order is therefore: converters -> this trigger -> back-fill -> part 3.
--
-- Rollback: 20260806_clip_identity_canonical_enforce.ROLLBACK.sql

BEGIN;

CREATE OR REPLACE FUNCTION course_audio_canonical_identity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.language IS DISTINCT FROM OLD.language THEN
    NEW.language := canonical_language(NEW.language);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.voice_id IS DISTINCT FROM OLD.voice_id THEN
    NEW.voice_id := canonical_voice_id(NEW.voice_id);
  END IF;
  RETURN NEW;
END $$;

COMMENT ON FUNCTION course_audio_canonical_identity() IS
  'Canonicalises the two identity columns on write. See services/shared/clip-identity.cjs.';

DROP TRIGGER IF EXISTS trg_course_audio_canonical_identity ON course_audio;
CREATE TRIGGER trg_course_audio_canonical_identity
  BEFORE INSERT OR UPDATE OF language, voice_id ON course_audio
  FOR EACH ROW EXECUTE FUNCTION course_audio_canonical_identity();

COMMIT;

