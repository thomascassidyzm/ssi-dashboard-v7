-- ============================================================================
-- Canonical audio identity — the backstop trigger. Run AFTER the backfill.
--
-- The code paths are being repointed to look a clip up before paying for a
-- render (phase8 `findAudioRowForClip`, `generatePodAudio`, the pod tools). This
-- trigger is what makes the rule structural rather than remembered: whatever
-- inserts into course_audio, from whatever service, the row leaves this
-- function pointing at the ONE canonical clip for its identity and carrying
-- that clip's bytes. "Did this path get the reuse fix?" stops being a question.
--
-- DELIBERATELY INSERT-ONLY.
--   An UPDATE of course_audio.s3_key is a re-render of one course's row, and
--   every regen/repair/relink path in the estate does exactly that. Having this
--   trigger reach into UPDATE would either neutralise those regens or propagate
--   one course's regen to every course sharing the clip — a large audible change
--   with no verification behind it yet. Phase 1 takes the whole "never pay for a
--   duplicate render again" win and leaves UPDATE semantics bit-for-bit as they
--   are. Propagating regens to the canon is phase 3, separately verified.
--
-- Trigger NAME matters: Postgres fires BEFORE row triggers in alphabetical
-- order, and this one must run after `trg_course_audio_normalize` (which sets
-- text_normalized) and `trg_course_audio_canonical_identity` (which canonicalises
-- language and voice_id). `trg_course_audio_zz_clip_link` sorts last.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION course_audio_link_canonical_clip()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  k_text  text;
  k_lang  text;
  k_voice text;
  c       audio_clips%ROWTYPE;
  incoming_rank int;
  canon_rank    int;
BEGIN
  -- Only a learner-serving object can be, or borrow from, canon.
  --
  -- `pending/%` are stubs written before the render exists. `repair-candidates/%`
  -- are takes PROPOSED for a human decision and never accepted — promoting one
  -- to canon is the human-outranks-canon doctrine violated from the other
  -- direction, and it happened to 623 identities before this was an allow-list.
  -- Anything off the serving prefix is left alone and unlinked.
  IF NEW.s3_key IS NULL OR NEW.s3_key = '' OR NEW.s3_key NOT LIKE 'mastered/%' THEN
    NEW.clip_id := NULL;
    RETURN NEW;
  END IF;

  k_text  := audio_canon_text(NEW.text_normalized);
  k_lang  := audio_canon_lang(NEW.language);
  k_voice := audio_canon_voice(NEW.voice_id);

  SELECT * INTO c FROM audio_clips
   WHERE text_key = k_text AND language = k_lang AND role = NEW.role AND voice_id = k_voice;

  IF NOT FOUND THEN
    -- First course to hold this line: its clip becomes the estate's canon.
    INSERT INTO audio_clips (
      text_key, language, role, voice_id, text, s3_key, duration_ms, file_size_bytes,
      word_boundaries, origin, veracity_checked_at, veracity_pass, veracity_reason,
      veracity_cer, veracity_attempts, veracity_checker, audio_revision, source_audio_id)
    VALUES (
      k_text, k_lang, NEW.role, k_voice, NEW.text, NEW.s3_key, NEW.duration_ms,
      NEW.file_size_bytes, NEW.word_boundaries, NEW.origin, NEW.veracity_checked_at,
      NEW.veracity_pass, NEW.veracity_reason, NEW.veracity_cer, NEW.veracity_attempts,
      NEW.veracity_checker, COALESCE(NEW.audio_revision, 1), NEW.id)
    ON CONFLICT ON CONSTRAINT audio_clips_identity DO NOTHING
    RETURNING * INTO c;

    -- Lost a race with a concurrent insert of the same line: re-read the winner.
    IF NOT FOUND THEN
      SELECT * INTO c FROM audio_clips
       WHERE text_key = k_text AND language = k_lang AND role = NEW.role AND voice_id = k_voice;
    END IF;

    NEW.clip_id := c.id;
    RETURN NEW;
  END IF;

  -- Canon exists. Is the arriving clip strictly better? Same ladder the backfill
  -- uses: human beats TTS, veracity-passed beats unchecked beats failed.
  incoming_rank := (CASE WHEN NEW.origin = 'human' THEN 0 ELSE 10 END)
                 + (CASE WHEN NEW.veracity_pass IS TRUE THEN 0
                         WHEN NEW.veracity_pass IS NULL THEN 1 ELSE 2 END);
  canon_rank    := (CASE WHEN c.origin = 'human' THEN 0 ELSE 10 END)
                 + (CASE WHEN c.veracity_pass IS TRUE THEN 0
                         WHEN c.veracity_pass IS NULL THEN 1 ELSE 2 END);

  IF incoming_rank < canon_rank AND NEW.s3_key IS DISTINCT FROM c.s3_key THEN
    -- PROMOTION. This upgrades the line for every course at once — that is what
    -- one-line-one-take means, and it is also an estate-wide audible change made
    -- by a single insert, so the superseded key is logged and reversible.
    INSERT INTO audio_clip_promotions (
      clip_id, old_s3_key, new_s3_key, old_origin, new_origin,
      old_revision, new_revision, reason, source_audio_id)
    VALUES (c.id, c.s3_key, NEW.s3_key, c.origin, NEW.origin,
            c.audio_revision, c.audio_revision + 1, 'better_clip_arrived', NEW.id);

    UPDATE audio_clips SET
      s3_key = NEW.s3_key, duration_ms = NEW.duration_ms,
      file_size_bytes = NEW.file_size_bytes, word_boundaries = NEW.word_boundaries,
      origin = NEW.origin, text = NEW.text,
      veracity_checked_at = NEW.veracity_checked_at, veracity_pass = NEW.veracity_pass,
      veracity_reason = NEW.veracity_reason, veracity_cer = NEW.veracity_cer,
      veracity_attempts = NEW.veracity_attempts, veracity_checker = NEW.veracity_checker,
      audio_revision = audio_revision + 1, source_audio_id = NEW.id, updated_at = now()
    WHERE id = c.id
    RETURNING * INTO c;

  ELSIF NEW.s3_key IS DISTINCT FROM c.s3_key THEN
    -- A duplicate render arrived for a line the estate already has. The row is
    -- pointed at the canonical bytes and the fresh object is left on S3
    -- untouched (deletion is a separate approved pass). Logged so the count of
    -- renders that SHOULD NOT have happened is measurable rather than invisible.
    INSERT INTO audio_clip_promotions (
      clip_id, old_s3_key, new_s3_key, old_origin, new_origin,
      old_revision, new_revision, reason, source_audio_id)
    VALUES (c.id, NEW.s3_key, c.s3_key, NEW.origin, c.origin,
            c.audio_revision, c.audio_revision, 'duplicate_render_deduped', NEW.id);
  END IF;

  -- Share the canonical bytes. This is the line that makes duplication
  -- unrepresentable rather than merely discouraged.
  NEW.clip_id         := c.id;
  NEW.s3_key          := c.s3_key;
  NEW.duration_ms     := c.duration_ms;
  NEW.file_size_bytes := c.file_size_bytes;
  NEW.word_boundaries := c.word_boundaries;
  NEW.origin          := c.origin;

  RETURN NEW;
END
$fn$;

COMMENT ON FUNCTION course_audio_link_canonical_clip() IS
  'BEFORE INSERT backstop for canonical audio identity: links every new course_audio row to the one canonical clip for (text, language, role, voice) and gives it that clip''s bytes. INSERT only — UPDATE keeps its existing per-course semantics.';

DROP TRIGGER IF EXISTS trg_course_audio_zz_clip_link ON course_audio;
CREATE TRIGGER trg_course_audio_zz_clip_link
  BEFORE INSERT ON course_audio
  FOR EACH ROW EXECUTE FUNCTION course_audio_link_canonical_clip();

COMMIT;

-- ============================================================================
-- DOWN:
--   DROP TRIGGER IF EXISTS trg_course_audio_zz_clip_link ON course_audio;
--   DROP FUNCTION IF EXISTS course_audio_link_canonical_clip();
-- Reverting the trigger restores pre-migration insert behaviour exactly; rows
-- already linked keep a correct clip_id and correct (shared) bytes.
-- ============================================================================
