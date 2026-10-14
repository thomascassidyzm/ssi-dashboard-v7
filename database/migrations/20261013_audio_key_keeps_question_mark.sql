-- 20261013_audio_key_keeps_question_mark.sql   (job #586)
--
-- Tom, 2026-10-13: capitalisation does not distinguish a recording, a question
-- mark does. "Onde era?" and "onde era" are separate recordings.
--
-- Until now normalize_text() was rtrim(lower(trim(t)), '.?!¿¡。？！'), so the
-- BEFORE INSERT OR UPDATE trigger gave "Onde era?" and "onde era" the SAME
-- text_normalized, and UNIQUE (course_code, text_normalized, language, role,
-- voice_id) made rendering one overwrite the other (#408/#409).
--
-- New rule, byte-identical to normalizeForDb() in services/shared/text-normalize.cjs:
--   * a trailing run of [.!?。？！] that contains a ? or ？ is collapsed to ONE
--     ASCII '?', whitespace before it dropped ("tu viens ?" = "tu viens?");
--   * otherwise the trailing stops are stripped exactly as before.
--
-- audio_normalize_text(), audio_canon_text(), audio_id_for_text(), link_*,
-- get_missing_audio(), null_*_on_text_change() and the guard all call
-- normalize_text(), so this one function is the whole rule.
--
-- !! DO NOT RUN THIS FILE ALONE. Replacing the function without re-keying the
-- stored rows makes every existing question-ending row unreachable by the new
-- key. It is applied by tools/audio-question-key-backfill.cjs --apply, which
-- runs this function swap and the backfill of course_audio / audio_clips /
-- clip_index / shared_audio in ONE transaction with a self-check, and which
-- prints a dry-run (ROLLBACK) first. See docs/DECISIONS.md 2026-10-13.

CREATE OR REPLACE FUNCTION public.normalize_text(input_text text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  t text := lower(trim(input_text));
BEGIN
  IF t ~ '[?？][.!?。？！]*$' THEN
    RETURN regexp_replace(t, '[[:space:]]*[.!?。？！¡]*[?？][.!?。？！]*$', '?');
  END IF;
  RETURN rtrim(t, '.?!¿¡。？！');
END;
$$;

COMMENT ON FUNCTION public.normalize_text(text) IS
  'Clip key text. Lowercase, trimmed; a trailing ?/？ is KEPT as one ASCII ? (Tom 2026-10-13: a question mark distinguishes a recording); other trailing . ! stops stripped. Mirror: services/shared/text-normalize.cjs normalizeForDb.';
