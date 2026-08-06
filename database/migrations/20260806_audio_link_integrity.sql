-- Audio link integrity — stop usable clips becoming silently unlinked.
--
-- Tom, 2026-08-05: "audio can get unlinked from time to time - not sure why -
-- maybe we could find out ... but the audio is still there ... it's probably
-- better to have a system that plays Azure until better voices are available
-- in lieu of nothing!!!!"
--
-- The forensics (docs/audio-unlink-root-cause-2026-08-06.md) found the estate
-- had an UNLINK path that fires constantly and a RELINK path that almost never
-- fires, and the two did not even agree on how to compare text:
--
--   * null_lego_audio_on_text_change / null_phrase_audio_on_text_change
--     (BEFORE UPDATE) null the audio links on ANY text change — including a
--     change that only touches whitespace, casing or trailing punctuation, and
--     including a change that is later reverted. Nothing re-links afterwards.
--
--   * link_audio_to_content (AFTER INSERT ON course_audio) is the ONLY relink
--     path, so a link is only restored when brand-new audio is generated — the
--     clip we already own sits unlinked indefinitely.
--
--   * That relink path then matched on `lower(trim(content_text))`, while
--     course_audio.text_normalized is written by normalize_text(), which is
--     `rtrim(lower(trim(t)), '.?!¿¡。？！')`. So every row whose text ends in
--     . ? or ! could NEVER match and NEVER autolink. 154,257 course_audio rows
--     carry that mismatch.
--
--   * lego_introductions.presentation_audio_id was ON DELETE CASCADE, so
--     deleting an audio row deleted the whole authored introduction ROW — text
--     loss, not merely a lost link.
--
-- This migration is deliberately MONOTONE: it only ever FILLS a link that is
-- NULL and only ever REDUCES deletion. It never deletes audio, never overwrites
-- a link that already points at a live clip, and never unlinks anything
-- (make-before-break, docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b).
--
-- NOT done here, deliberately: normalize_text() is NOT redefined. It feeds the
-- UNIQUE (course_code, text_normalized, language, role, voice_id) constraint, so
-- changing it would recompute text_normalized on the next write to each of the
-- 154,257 affected rows and could collide with an existing row — turning a
-- matching bug into write failures. Matching is made tolerant instead; the
-- normaliser split is recorded as an open item for a planned backfill.


-- 1. RELINK PATH: match on the same normaliser that writes text_normalized,
--    and cover course_seeds and phrase presentation slots, which it missed.
CREATE OR REPLACE FUNCTION public.link_audio_to_content()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.role = 'known' THEN
    UPDATE course_legos SET known_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND known_audio_id IS NULL
        AND normalize_text(known_text) = NEW.text_normalized;
    UPDATE course_practice_phrases SET known_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND known_audio_id IS NULL
        AND normalize_text(known_text) = NEW.text_normalized;
    UPDATE course_seeds SET known_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND known_audio_id IS NULL
        AND normalize_text(known_text) = NEW.text_normalized;

  ELSIF NEW.role = 'target1' THEN
    UPDATE course_legos
      SET target1_audio_id = NEW.id, target1_duration_ms = NEW.duration_ms
      WHERE course_code = NEW.course_code AND target1_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
    UPDATE course_practice_phrases
      SET target1_audio_id = NEW.id, target1_duration_ms = NEW.duration_ms
      WHERE course_code = NEW.course_code AND target1_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
    UPDATE course_seeds SET target1_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND target1_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;

  ELSIF NEW.role = 'target2' THEN
    UPDATE course_legos
      SET target2_audio_id = NEW.id, target2_duration_ms = NEW.duration_ms
      WHERE course_code = NEW.course_code AND target2_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
    UPDATE course_practice_phrases
      SET target2_audio_id = NEW.id, target2_duration_ms = NEW.duration_ms
      WHERE course_code = NEW.course_code AND target2_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
    UPDATE course_seeds SET target2_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND target2_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;

  ELSIF NEW.role = 'presentation' THEN
    -- course_legos.presentation_audio_id is a TEXT column (see note 4 below),
    -- hence the cast; course_practice_phrases' is uuid.
    UPDATE course_legos SET presentation_audio_id = NEW.id::text
      WHERE course_code = NEW.course_code AND presentation_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
    UPDATE course_practice_phrases SET presentation_audio_id = NEW.id
      WHERE course_code = NEW.course_code AND presentation_audio_id IS NULL
        AND normalize_text(target_text) = NEW.text_normalized;
  END IF;

  RETURN NEW;
END;
$function$;


-- 2. PLAY WHAT WE HAVE, at the write path. When a text edit invalidates a link,
--    immediately re-link to a clip we ALREADY own for the NEW text, if one
--    exists. Preference order mirrors pickPreferredAudioRow
--    (services/shared/audio-link-preference.cjs) exactly: human recordings beat
--    TTS, then newest, then larger id as a deterministic tiebreak — so the
--    trigger and the JS link passes can never disagree about which row wins.
--
--    Only a clip with a live s3_key is eligible: a row with no file is not
--    "audio we have".
CREATE OR REPLACE FUNCTION public.audio_id_for_text(
  p_course text, p_text text, p_role text
) RETURNS uuid
LANGUAGE sql STABLE
AS $function$
  SELECT a.id FROM course_audio a
   WHERE a.course_code = p_course
     AND a.role = p_role
     AND a.s3_key IS NOT NULL
     AND a.text_normalized = normalize_text(p_text)
   ORDER BY (a.origin = 'human') DESC, a.created_at DESC, a.id::text DESC
   LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.null_lego_audio_on_text_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.known_text IS DISTINCT FROM OLD.known_text THEN
    NEW.known_audio_id := audio_id_for_text(NEW.course_code, NEW.known_text, 'known');
  END IF;
  IF NEW.target_text IS DISTINCT FROM OLD.target_text THEN
    NEW.target1_audio_id := audio_id_for_text(NEW.course_code, NEW.target_text, 'target1');
    NEW.target2_audio_id := audio_id_for_text(NEW.course_code, NEW.target_text, 'target2');
  END IF;
  -- A presentation clip can embed BOTH sides, so the original invalidated it on
  -- a known_text change as well as a target_text one. That invalidation scope is
  -- preserved exactly; only the "and then relink if we already have it" is new.
  IF NEW.known_text IS DISTINCT FROM OLD.known_text
     OR NEW.target_text IS DISTINCT FROM OLD.target_text THEN
    NEW.presentation_audio_id :=
      audio_id_for_text(NEW.course_code, NEW.target_text, 'presentation')::text;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.null_phrase_audio_on_text_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.known_text IS DISTINCT FROM OLD.known_text THEN
    NEW.known_audio_id := audio_id_for_text(NEW.course_code, NEW.known_text, 'known');
  END IF;
  IF NEW.target_text IS DISTINCT FROM OLD.target_text THEN
    NEW.target1_audio_id := audio_id_for_text(NEW.course_code, NEW.target_text, 'target1');
    NEW.target2_audio_id := audio_id_for_text(NEW.course_code, NEW.target_text, 'target2');
  END IF;
  -- presentation_audio_id is deliberately untouched here: the original phrase
  -- trigger never invalidated it, and widening the scope would be a behaviour
  -- change this migration has no evidence for.
  RETURN NEW;
END;
$function$;

-- Note the behaviour change is strictly safe in both directions:
--   * no matching clip  -> audio_id_for_text returns NULL -> identical to the
--     old nulling behaviour;
--   * a cosmetic edit (whitespace/casing/trailing '.') -> normalize_text is
--     unchanged -> the SAME clip is re-selected -> the spurious unlink that
--     used to strand it no longer happens;
--   * a genuine text change with a clip already rendered for the new text ->
--     that clip is linked, which is the "play what we have" doctrine.


-- 3. Stop audio deletion destroying AUTHORED CONTENT. lego_introductions rows
--    carry the authored introduction text; CASCADE deleted the whole row when
--    its audio went. The link may go; the text must not.
ALTER TABLE lego_introductions
  DROP CONSTRAINT IF EXISTS lego_introductions_presentation_audio_id_fkey;
ALTER TABLE lego_introductions
  ADD CONSTRAINT lego_introductions_presentation_audio_id_fkey
  FOREIGN KEY (presentation_audio_id) REFERENCES course_audio(id) ON DELETE SET NULL;


-- 4. NOT done here — needs a data repair first, tracked in docs/DECISIONS.md:
--    course_practice_phrases.presentation_audio_id has NO foreign key, and
--    17,480 rows already point at a course_audio row that no longer exists.
--    Adding the FK requires healing/nulling those first (the reconciliation
--    tool's job, make-before-break: try to re-link each to a live clip for the
--    same text, and only null what genuinely has nothing). course_legos
--    .presentation_audio_id additionally has the WRONG TYPE (text, not uuid),
--    which is why it never had an FK; 9 of its links dangle.
