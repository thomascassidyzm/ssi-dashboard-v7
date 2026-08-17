-- Lego audio link integrity — a lego text edit must not silently move the slot
-- onto a different voice, and must not destroy a link without writing it down.
--
-- Kai, 2026-08-17: the explicitly-queued third and last table of the audio-link
-- unification. 20260817_seed_audio_link_integrity.sql did course_seeds;
-- 20260817b_phrase_audio_link_integrity.sql did course_practice_phrases; this
-- does course_legos, reusing their machinery rather than growing a third
-- implementation. After this, all three content tables share ONE rule.
--
-- ── THE NAME IS A LIE, AND IT IS KEPT ───────────────────────────────────────
--
-- `trg_null_lego_audio_on_text_change` DOES NOT NULL ANYTHING. It has not since
-- 20260806_audio_link_integrity.sql redefined its body to RE-RESOLVE every link
-- through audio_id_for_text(). The name is deliberately NOT changed, for the
-- same reason 20260817b kept the phrase trigger's name: pg_trigger queries,
-- canaries and tools/edit-impact-check.cjs (TABLES.nullingTrigger) match on the
-- literal string, and a rename would silently turn every one of them into "no
-- trigger found" — the exact failure mode this work exists to remove. The lie is
-- corrected in the COMMENT ON FUNCTION below, which is what \df+ and any schema
-- dump show.
--
-- ── FOUR THINGS VERIFIED LIVE, THREE OF WHICH CONTRADICT THE BRIEF ──────────
--
-- Everything below was read out of the running database on 2026-08-17, not out
-- of a document. The briefing for this migration said course_legos "nulls
-- presentation_audio_id and re-resolves its other three columns". That is wrong
-- in the letter and right only by accident:
--
--   1. The live trigger RE-RESOLVES ALL FOUR columns, presentation included:
--        NEW.presentation_audio_id :=
--          audio_id_for_text(NEW.course_code, NEW.target_text, 'presentation')::text
--      It does not null it. It assigns whatever that lookup returns.
--
--   2. It only LOOKS like nulling because the lookup can never hit. A
--      presentation clip does not speak the lego's target text — it speaks a
--      composed introduction that quotes it, e.g.
--        "ඉංග්‍රීසිෙන්. 'දැන්'. 'මමට දැන් කතා කරන්න ඕනේ' ඉතින්. :"
--      for a lego whose target_text is "now". Measured over the whole estate:
--      of 72,062 legos with a presentation link, the number whose clip text
--      normalises to the row's target_text is ZERO. Not few — zero. So
--      audio_id_for_text(..., 'presentation') returns NULL every time and the
--      assignment nulls the column as a side effect.
--
--   3. That nulling is PERMANENT AND UNRECORDED. link_audio_to_content — the
--      AFTER INSERT ON course_audio trigger that refills NULL slots when audio
--      lands — matches presentation on the same never-true predicate
--      (normalize_text(target_text) = NEW.text_normalized). So a NULLed lego
--      presentation link is never refilled by anything, by any route, ever. The
--      clip survives in course_audio, fully paid for, permanently unreachable.
--      This is the bleed: an ordinary lego text edit silently and irreversibly
--      severs a presentation slot, and nothing anywhere writes down that it did.
--
--   4. course_legos.presentation_audio_id is TEXT, not uuid, and carries NO
--      foreign key (course_practice_phrases' is uuid). Today all 72,062 values
--      are uuid-shaped and none dangles — verified, not assumed — but nothing in
--      the schema enforces either property, so this migration must not assume
--      them. A trigger that blew up on a non-uuid value would BLOCK a legitimate
--      edit, which is worse than the bug being fixed.
--
-- The hazard the other two migrations removed is here too, and provable:
-- audio_id_for_text() constrains course_code, role, s3_key and text_normalized.
-- It does NOT constrain voice_id and it does NOT constrain language. So an
-- ordinary lego text edit can land a slot on a clip spoken by a DIFFERENT VOICE
-- with no NULL, no orphan and no alarm. The phrase canary reproduced exactly
-- that on live data (Ryan -> Sonia); the BASELINE control in this migration's
-- canary reproduces it on course_legos.
--
-- ── The rule, identical to course_seeds and course_practice_phrases ─────────
--
--   1. the new text normalises to the same words the linked clip already speaks
--      -> KEEP IT (the cosmetic-edit case 20260806 existed to protect; still
--         protected).
--   2. otherwise, if we already own a clip for the NEW text in the SAME VOICE
--      and the SAME LANGUAGE -> re-point at it, and WRITE THE MOVE DOWN.
--   3. otherwise -> NULL the link and WRITE THE DROP DOWN, keeping the clip id,
--      the voice, and the words that clip actually speaks.
--
-- Null-and-report, never a silent relink. Nothing here deletes or modifies a
-- single course_audio row in any branch (make-before-break,
-- docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b). No TTS is generated,
-- requested or implied.
--
-- ── Scope: all four columns, and what changes for each ──────────────────────
--
-- known_audio_id, target1_audio_id, target2_audio_id — as for the other two
-- tables. Rule 1 and rule 2 behave exactly as they do there.
--
-- presentation_audio_id IS INCLUDED, deliberately, unlike the phrase migration
-- which excluded it. The phrase migration's two reasons for excluding it were
-- (a) no evidence that widening the scope was wanted and (b) 17,480 phrase rows
-- already dangling on that column. Neither holds for course_legos: the scope is
-- not being widened at all (the live trigger already assigns this column on
-- every text edit — finding 1), and nothing dangles (finding 4). What changes
-- for presentation is only the honesty:
--
--   * a purely cosmetic edit — one where neither side's text changes after
--     normalisation — now KEEPS the presentation link instead of destroying it.
--     This is new protection, and it is the same cosmetic-keep rule the other
--     three columns get; it just has to be expressed against the ROW's text
--     rather than the clip's, because a presentation clip never speaks the row's
--     text (finding 2) and so the clip-text test can never be the one that saves
--     it.
--   * a genuine edit still nulls the link — as it does today — but now writes a
--     content_audio_link_drops row naming the clip, its voice and its words, so
--     the severed slot is countable and the link is restorable. Today it is
--     neither.
--
-- The invalidation scope for presentation is preserved EXACTLY as 20260806 set
-- it: a presentation clip can embed both sides, so a known_text change
-- invalidates it just as a target_text change does.
--
-- Rule 2 is applied to presentation for uniformity, not because it is expected
-- to fire: audio_id_for_text_same_voice(..., 'presentation') is measured to
-- match nothing today, for the same reason audio_id_for_text does not. It costs
-- one lookup per genuinely-edited lego that has a presentation link, and it
-- means that if a future generator ever mints presentation clips whose text IS
-- the target text, this table behaves like the other two with no further change.
--
-- ── What this migration does NOT fix, recorded rather than papered over ─────
--
-- * The presentation slot still cannot be REFILLED automatically once dropped,
--   because link_audio_to_content matches it on the same never-true predicate
--   (finding 3). This migration makes every drop recorded and therefore
--   reversible by hand; it does not touch link_audio_to_content, which is a
--   different trigger on a different table with a much larger blast radius.
--   Recorded as the next open item.
-- * 31 known, 103 target1 and 103 target2 lego links are ALREADY stale today —
--   the clip does not speak the row's text. Under the new rule a cosmetic edit
--   to one of those rows drops the link instead of re-resolving it. That is the
--   ruling working as intended: the link was already pointing at the wrong
--   words, and a recorded NULL is more honest than a silent re-resolve to a
--   possibly-different voice. Counted here so the drops are expected, not a
--   surprise.
-- * course_legos_pull_duration is a BEFORE trigger that sorts alphabetically
--   ahead of this one, so target1_duration_ms / target2_duration_ms are not
--   refreshed when this function moves or nulls a target link. That is
--   pre-existing and identical on course_practice_phrases; not changed here.


BEGIN;

-- ── 0. Hard dependency on the seed migration ─────────────────────────────────
-- This migration deliberately owns NO matcher and NO report table of its own —
-- that is the whole point, so the three content tables can never disagree about
-- which clip wins. Fail loudly rather than half-apply.
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
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name='content_audio_link_drops'
         AND column_name='row_id') <> 'text' THEN
    RAISE EXCEPTION USING
      MESSAGE = 'content_audio_link_drops.row_id is not text',
      HINT    = 'Apply 20260817b_phrase_audio_link_integrity.sql first — it widens the column.';
  END IF;
END
$dep$;


-- ── 0b. One new nullable column, so a presentation drop stays reversible ─────
-- old_audio_id is uuid, and course_legos.presentation_audio_id is text with no
-- FK. If a value that is not uuid-shaped ever appears there, the drop still has
-- to be recordable — otherwise the trigger's only options are to lose the value
-- or to raise, and raising would block a legitimate edit. Additive and nullable:
-- the seed and phrase triggers do not write it and are unaffected.
ALTER TABLE public.content_audio_link_drops
  ADD COLUMN IF NOT EXISTS old_link_raw text;

COMMENT ON COLUMN public.content_audio_link_drops.old_link_raw IS
  'The raw, uncast value of the link column when it was not uuid-shaped and therefore could not be recorded in old_audio_id. Only course_legos.presentation_audio_id can produce this (text column, no FK). NULL in every ordinary drop.';


-- ── 1. The trigger function ──────────────────────────────────────────────────
-- SECURITY DEFINER with a pinned search_path, matching the seed and phrase
-- functions: content_audio_link_drops is RLS-protected and grants INSERT to
-- nobody, so the report write comes from the function's own privileges, not the
-- caller's. The 20260806 version was neither, because it wrote nothing; it does
-- now.
CREATE OR REPLACE FUNCTION public.null_lego_audio_on_text_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_prev            course_audio%ROWTYPE;
  v_found           boolean;
  v_sub             uuid;
  v_new_text        text;
  v_cur             uuid;
  v_raw             text;
  v_col             text;
  v_role            text;
  v_roles           text[] := ARRAY['known','target1','target2','presentation'];
  v_reason          text;
  v_known_changed   boolean;
  v_target_changed  boolean;
BEGIN
  -- Did the words actually change, or only the punctuation and whitespace?
  -- IS DISTINCT FROM, not =, because course_legos.known_text is NULLABLE (521
  -- rows are NULL today) and normalize_text(NULL) is NULL.
  v_known_changed  := normalize_text(NEW.known_text)  IS DISTINCT FROM normalize_text(OLD.known_text);
  v_target_changed := normalize_text(NEW.target_text) IS DISTINCT FROM normalize_text(OLD.target_text);

  FOREACH v_role IN ARRAY v_roles LOOP
    v_raw := NULL;
    v_cur := NULL;

    IF v_role = 'known' THEN
      CONTINUE WHEN NEW.known_text IS NOT DISTINCT FROM OLD.known_text;
      v_col := 'known_audio_id'; v_new_text := NEW.known_text; v_cur := OLD.known_audio_id;

    ELSIF v_role = 'presentation' THEN
      -- Invalidation scope preserved verbatim from 20260806: a presentation clip
      -- can embed BOTH sides, so either side moving puts it in question.
      CONTINUE WHEN NEW.known_text  IS NOT DISTINCT FROM OLD.known_text
                AND NEW.target_text IS NOT DISTINCT FROM OLD.target_text;
      v_col := 'presentation_audio_id'; v_new_text := NEW.target_text;
      v_raw := OLD.presentation_audio_id;
      CONTINUE WHEN v_raw IS NULL;

      -- The cosmetic-keep rule, expressed against the ROW's text rather than the
      -- clip's. It has to be: a presentation clip speaks a composed introduction
      -- that quotes the lego, never the lego's own text (0 of 72,062 match), so
      -- the clip-text test below can never be the thing that saves it. Without
      -- this, a trailing-space edit destroys a good presentation clip forever —
      -- which is what happens today.
      CONTINUE WHEN NOT v_known_changed AND NOT v_target_changed;

      -- text column, no FK: a value that is not uuid-shaped must be recorded and
      -- dropped, never allowed to raise. Raising would block the edit.
      IF v_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_cur := v_raw::uuid;
      ELSE
        NEW.presentation_audio_id := NULL;
        INSERT INTO content_audio_link_drops (
          table_name, row_id, course_code, seed_number, column_name, role,
          old_audio_id, new_audio_id, old_text, new_text, old_voice_id,
          old_link_raw, reason
        ) VALUES (
          'course_legos', NEW.id, NEW.course_code, NEW.seed_number, v_col, v_role,
          NULL, NULL, NULL, v_new_text, NULL, v_raw, 'nulled-unparseable-link'
        );
        CONTINUE;
      END IF;

    ELSE
      CONTINUE WHEN NEW.target_text IS NOT DISTINCT FROM OLD.target_text;
      v_col := v_role || '_audio_id'; v_new_text := NEW.target_text;
      v_cur := CASE v_role WHEN 'target1' THEN OLD.target1_audio_id
                           ELSE OLD.target2_audio_id END;
    END IF;

    -- Nothing linked: nothing can be stale. link_audio_to_content (AFTER INSERT
    -- ON course_audio) already fills NULL known/target slots when matching audio
    -- lands. (It cannot fill a presentation slot — see the header, finding 3.)
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

    IF v_col = 'known_audio_id'          THEN NEW.known_audio_id        := v_sub;
    ELSIF v_col = 'target1_audio_id'     THEN NEW.target1_audio_id      := v_sub;
    ELSIF v_col = 'target2_audio_id'     THEN NEW.target2_audio_id      := v_sub;
    ELSE                                      NEW.presentation_audio_id := v_sub::text;
    END IF;

    INSERT INTO content_audio_link_drops (
      table_name, row_id, course_code, seed_number, column_name, role,
      old_audio_id, new_audio_id, old_text, new_text, old_voice_id, reason
    ) VALUES (
      'course_legos', NEW.id, NEW.course_code, NEW.seed_number, v_col, v_role,
      v_cur, v_sub, v_prev.text, v_new_text, v_prev.voice_id, v_reason
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- The name says "null". Correct the record where a reader will actually find it.
COMMENT ON FUNCTION public.null_lego_audio_on_text_change() IS
  'MISNAMED, and deliberately not renamed (a rename would silently break every pg_trigger match on the name). It does NOT simply null. On a known_text/target_text edit it: keeps the link if the clip still speaks the new words; else re-points to a clip we already own for the new text IN THE SAME VOICE AND LANGUAGE (audio_id_for_text_same_voice); else NULLs it. Covers all four link columns including presentation_audio_id, whose cosmetic-keep test is against the row text because a presentation clip never speaks it. Every move and every drop is recorded in content_audio_link_drops. Between 2026-08-06 and 2026-08-17 this function RE-RESOLVED via audio_id_for_text(), which constrains neither voice nor language and could therefore swap the voice a learner hears with no NULL and no alarm — and which, for presentation, always resolved to NULL and severed the slot permanently and unrecorded.';

REVOKE ALL ON FUNCTION public.null_lego_audio_on_text_change() FROM PUBLIC;


-- ── 2. The trigger ───────────────────────────────────────────────────────────
-- Name preserved exactly (see the header). The WHEN clause is new and matches
-- the seed and phrase triggers: course_legos is written constantly for audio
-- ids, durations, components and status, none of which can move a link. It
-- changes no outcome — the function's own first act is the same IS DISTINCT
-- FROM test — it just keeps the function off the hot path.
DROP TRIGGER IF EXISTS trg_null_lego_audio_on_text_change ON public.course_legos;
CREATE TRIGGER trg_null_lego_audio_on_text_change
  BEFORE UPDATE ON public.course_legos
  FOR EACH ROW
  WHEN (OLD.known_text  IS DISTINCT FROM NEW.known_text
     OR OLD.target_text IS DISTINCT FROM NEW.target_text)
  EXECUTE FUNCTION public.null_lego_audio_on_text_change();


-- ── 3. Tell PostgREST about the new column ───────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;
