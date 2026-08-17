-- Phrase audio link integrity — a practice-phrase text edit must not silently
-- move the slot onto a different voice.
--
-- Kai, 2026-08-17: put all three content tables on ONE safe, voice-aware rule.
-- 20260817_seed_audio_link_integrity.sql did course_seeds. This does
-- course_practice_phrases, reusing that migration's machinery rather than
-- growing a second implementation.
--
-- ── THE TRIGGER'S NAME IS A LIE, AND IT IS KEPT ─────────────────────────────
--
-- `trg_null_phrase_audio_on_text_change` DOES NOT NULL ANYTHING. It has not
-- since 20260806_audio_link_integrity.sql redefined its function body to
-- RE-RESOLVE the link via audio_id_for_text(). Everything briefed off the name
-- — including, until 2026-08-17, our own briefings — has been wrong about what
-- this table does on a text edit.
--
-- The name is DELIBERATELY NOT CHANGED here. A rename is a bigger blast radius
-- than this migration wants: the name is a stable identifier that pg_trigger
-- queries, canaries and tools/edit-impact-check.cjs (TABLES.nullingTrigger)
-- match on literally, and renaming it would silently turn every one of those
-- into "no trigger found" — the exact failure mode this whole job exists to
-- remove. The lie is corrected where it can be read instead: in the COMMENT ON
-- FUNCTION below, which is what psql \df+ and any schema dump show.
--
-- ── What re-resolving actually costs ────────────────────────────────────────
--
-- audio_id_for_text(course, text, role) constrains course_code, role, s3_key and
-- text_normalized. It does NOT constrain voice_id and it does NOT constrain
-- language. So an innocuous phrase text edit can land the slot on a clip spoken
-- by a DIFFERENT VOICE, with no NULL, no orphan and no alarm anywhere. That is
-- worse than nulling: a NULL is a hole every missing-audio sweep already finds,
-- while a wrong-voice relink is audible only to a learner. The worker that built
-- the seed trigger refused to copy this rule onto course_seeds for exactly that
-- reason; this migration removes it from the table it came from.
--
-- ── The rule, identical to course_seeds ─────────────────────────────────────
--
--   1. the new text normalises to the same words the linked clip already speaks
--      -> KEEP IT. (The cosmetic-edit case 20260806 existed to protect. It stays
--         protected — this migration does not reintroduce the spurious unlink.)
--   2. otherwise, if we already own a clip for the NEW text in the SAME VOICE
--      and the SAME LANGUAGE -> re-point at it, and WRITE THE MOVE DOWN.
--   3. otherwise -> NULL the link and WRITE THE DROP DOWN, keeping the clip id,
--      the voice, and the words that clip actually speaks.
--
-- Null-and-report, never a silent relink. Nothing here deletes or modifies a
-- single course_audio row in any branch (make-before-break,
-- docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b).
--
-- ── Scope ───────────────────────────────────────────────────────────────────
--
-- known_audio_id, target1_audio_id, target2_audio_id — the three columns the
-- 20260806 trigger body touches, read from that body rather than assumed.
--
-- presentation_audio_id is DELIBERATELY still untouched. The original phrase
-- trigger never invalidated it, 20260806 explicitly declined to widen the scope
-- for want of evidence, and that reasoning has not changed. Widening it would
-- also be unsafe today: course_practice_phrases.presentation_audio_id has NO
-- foreign key and 17,480 of its rows already point at a course_audio row that no
-- longer exists (20260806 note 4), so a trigger that resolved it would be
-- operating on a column that is already broken in bulk. Recorded, not fixed.
--
-- course_legos is NOT touched by this migration. Its trigger nulls
-- presentation_audio_id and re-resolves the other three — the nulling half is
-- already the safe direction, and the re-resolving half carries the same hazard
-- fixed here. Moving it to this rule is recommended as a follow-up, deliberately
-- out of scope, and left as Kai's call.
--
-- No TTS is generated, requested or implied. Expect this to SURFACE missing
-- phrase audio that is currently hidden behind a wrong-voice relink.


BEGIN;

-- ── 0. Hard dependency on the seed migration ─────────────────────────────────
-- This migration deliberately owns NO matcher and NO report table of its own —
-- that is the whole point, so course_seeds and course_practice_phrases can never
-- disagree about which clip wins. Fail loudly rather than half-apply.
DO $dep$
BEGIN
  IF to_regclass('public.content_audio_link_drops') IS NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'content_audio_link_drops does not exist',
      HINT    = 'Apply 20260817_seed_audio_link_integrity.sql first: node database/canary/canary_seed_audio_link_integrity.cjs --commit';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'audio_id_for_text_same_voice'
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'audio_id_for_text_same_voice() does not exist',
      HINT    = 'Apply 20260817_seed_audio_link_integrity.sql first: node database/canary/canary_seed_audio_link_integrity.cjs --commit';
  END IF;
END
$dep$;


-- ── 0b. content_audio_link_drops.row_id must widen to text ───────────────────
-- The seed migration typed row_id as `uuid` because course_seeds.id IS a uuid.
-- course_practice_phrases.id is NOT: it is a deterministic TEXT key of the shape
-- 'eng_for_sin:S0007L01U01', assigned by makePhraseId
-- (services/course-builder/routes/seed-translate.cjs). Left as uuid, this table
-- could not record a single phrase drop — every phrase text edit would abort
-- with a type error, which is worse than the bug being fixed: it would BLOCK
-- legitimate edits rather than merely mis-link them.
--
-- (Correction, verified against information_schema on 2026-08-17: course_legos.id
-- is a `uuid` with a gen_random_uuid() default, NOT a text key — an earlier draft
-- of this comment said otherwise. It does not change anything here: text accepts a
-- uuid by assignment cast, so a future lego migration still needs row_id to be
-- text, and this widening still serves it. Only the reason is different — text is
-- required by course_practice_phrases alone, and merely tolerated by the other two.)
--
-- Widening uuid -> text is lossless and index-preserving-by-rebuild. The seed
-- trigger's own INSERT is unchanged and still correct: a cast from any type TO a
-- string type is an assignment cast in Postgres, so passing a uuid into a text
-- column needs no source change (asserted for real by the canary, which replays
-- a SEED edit after this ALTER and checks the seed's report row still lands).
ALTER TABLE public.content_audio_link_drops
  ALTER COLUMN row_id TYPE text USING row_id::text;

COMMENT ON COLUMN public.content_audio_link_drops.row_id IS
  'Primary key of the edited content row, as text. uuid for course_seeds; a deterministic text key like ''eng_for_sin:S0007L01U01'' for course_practice_phrases and course_legos. Read it together with table_name — it is not unique across tables on its own.';


-- ── 1. The trigger function ──────────────────────────────────────────────────
-- SECURITY DEFINER with a pinned search_path, matching null_seed_audio_on_text_change:
-- content_audio_link_drops is RLS-protected and grants INSERT to nobody, so the
-- report write comes from the function's own privileges, not the caller's. The
-- 20260806 version was neither SECURITY DEFINER nor search_path-pinned because it
-- wrote nothing; it does now.
CREATE OR REPLACE FUNCTION public.null_phrase_audio_on_text_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_prev      course_audio%ROWTYPE;
  v_found     boolean;
  v_sub       uuid;
  v_new_text  text;
  v_cur       uuid;
  v_col       text;
  v_role      text;
  v_roles     text[] := ARRAY['known','target1','target2'];
  v_reason    text;
BEGIN
  FOREACH v_role IN ARRAY v_roles LOOP
    IF v_role = 'known' THEN
      CONTINUE WHEN NEW.known_text IS NOT DISTINCT FROM OLD.known_text;
      v_col := 'known_audio_id'; v_new_text := NEW.known_text; v_cur := OLD.known_audio_id;
    ELSE
      CONTINUE WHEN NEW.target_text IS NOT DISTINCT FROM OLD.target_text;
      v_col := v_role || '_audio_id'; v_new_text := NEW.target_text;
      v_cur := CASE v_role WHEN 'target1' THEN OLD.target1_audio_id
                           ELSE OLD.target2_audio_id END;
    END IF;

    -- Nothing linked: nothing can be stale. link_audio_to_content (AFTER INSERT
    -- ON course_audio) already fills NULL phrase slots when matching audio lands.
    CONTINUE WHEN v_cur IS NULL;

    -- v_prev is reused across loop iterations, so it MUST be cleared: a SELECT
    -- INTO that finds nothing leaves the previous iteration's row in place, and
    -- the report row would then name another role's clip.
    v_prev := NULL;
    SELECT * INTO v_prev FROM course_audio WHERE id = v_cur;
    v_found := FOUND;

    -- The clip still speaks the new text (whitespace / casing / trailing
    -- punctuation only): keep it. normalize_text(v_prev.text) — the clip's REAL
    -- text re-normalised now — is tested as well as the stored text_normalized,
    -- because tens of thousands of course_audio rows hold a stored value the
    -- current normaliser would not produce. Testing the stored column alone would
    -- call a clip that speaks the exact right words "stale" and drop a good link.
    CONTINUE WHEN v_found AND (v_prev.text_normalized = normalize_text(v_new_text)
                            OR normalize_text(v_prev.text) = normalize_text(v_new_text));

    IF v_found THEN
      v_sub := audio_id_for_text_same_voice(NEW.course_code, v_new_text, v_role, v_cur);
    ELSE
      -- The link points at a course_audio row that no longer exists: there is no
      -- voice to preserve, so there is no substitute we are willing to pick.
      v_sub := NULL;
    END IF;

    IF v_sub IS NOT NULL AND v_sub <> v_cur THEN
      v_reason := 'relinked-same-voice';
    ELSIF v_sub IS NOT NULL THEN
      CONTINUE;  -- resolved back to the same clip; nothing happened
    ELSIF NOT v_found THEN
      v_reason := 'nulled-dangling-link';
    ELSE
      v_reason := 'nulled-no-same-voice-clip-for-new-text';
    END IF;

    IF v_col = 'known_audio_id'      THEN NEW.known_audio_id   := v_sub;
    ELSIF v_col = 'target1_audio_id' THEN NEW.target1_audio_id := v_sub;
    ELSE                                  NEW.target2_audio_id := v_sub;
    END IF;

    INSERT INTO content_audio_link_drops (
      table_name, row_id, course_code, seed_number, column_name, role,
      old_audio_id, new_audio_id, old_text, new_text, old_voice_id, reason
    ) VALUES (
      'course_practice_phrases', NEW.id, NEW.course_code, NEW.seed_number, v_col, v_role,
      v_cur, v_sub, v_prev.text, v_new_text, v_prev.voice_id, v_reason
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- The name says "null". Correct the record where a reader will actually find it.
COMMENT ON FUNCTION public.null_phrase_audio_on_text_change() IS
  'MISNAMED, and deliberately not renamed (a rename would silently break every pg_trigger match on the name). It does NOT simply null. On a known_text/target_text edit it: keeps the link if the clip still speaks the new words; else re-points to a clip we already own for the new text IN THE SAME VOICE AND LANGUAGE (audio_id_for_text_same_voice); else NULLs it. Every move and every drop is recorded in content_audio_link_drops. Between 2026-08-06 and 2026-08-17 this function RE-RESOLVED via audio_id_for_text(), which constrains neither voice nor language and could therefore swap the voice a learner hears with no NULL and no alarm.';

REVOKE ALL ON FUNCTION public.null_phrase_audio_on_text_change() FROM PUBLIC;


-- ── 2. The trigger ───────────────────────────────────────────────────────────
-- Name preserved exactly (see the header). The WHEN clause is new and matches
-- the seed trigger: course_practice_phrases is written constantly for audio ids,
-- durations and decomposition, none of which can move a link. It changes no
-- outcome — the function's own first act is the same IS DISTINCT FROM test — it
-- just keeps the function off the hot path.
DROP TRIGGER IF EXISTS trg_null_phrase_audio_on_text_change ON public.course_practice_phrases;
CREATE TRIGGER trg_null_phrase_audio_on_text_change
  BEFORE UPDATE ON public.course_practice_phrases
  FOR EACH ROW
  WHEN (OLD.known_text  IS DISTINCT FROM NEW.known_text
     OR OLD.target_text IS DISTINCT FROM NEW.target_text)
  EXECUTE FUNCTION public.null_phrase_audio_on_text_change();

COMMIT;
