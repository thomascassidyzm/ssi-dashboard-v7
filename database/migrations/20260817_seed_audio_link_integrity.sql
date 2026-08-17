-- Seed audio link integrity — a seed text edit must not leave the seed's audio
-- pointing at a recording of the OLD sentence.
--
-- Kai, 2026-08-17, on the edit-impact-check findings: give course_seeds "the
-- same audio rule course_legos and course_practice_phrases already have", and
-- while doing it, do NOT import the hazard those two carry.
--
-- ── What is true today (verified live against the database, not from a doc) ──
--
--   course_legos          BEFORE UPDATE  trg_null_lego_audio_on_text_change
--   course_practice_phrases BEFORE UPDATE trg_null_phrase_audio_on_text_change
--   course_seeds          (nothing)
--
-- So editing a lego or a phrase re-points its audio; editing a SEED does
-- nothing at all. The link stays on the clip that speaks the old sentence, with
-- no error, no silent slot and no missing-audio warning — the failure is
-- invisible to every sweep we own. The read-only reporter
-- (tools/edit-impact-check.cjs) rediscovered this 32 times unaided while
-- replaying the eng_for_sin repairs of 2026-08-17.
--
-- ── The hazard we are deliberately NOT copying ──────────────────────────────
--
-- 20260806_audio_link_integrity.sql turned the lego/phrase triggers from
-- "null the link" into "re-point the link at audio_id_for_text(...)". That was
-- right for its own problem (a cosmetic edit used to strand a perfectly good
-- clip) but audio_id_for_text constrains only course_code, role, s3_key and
-- text_normalized. It does not constrain voice_id and it does not constrain
-- language. So a genuine text edit can silently move a slot onto a DIFFERENT
-- VOICE, and nothing is written down anywhere when it does.
--
-- Copying that onto seeds would spread a silent voice swap into the one table
-- where nobody is currently watching for it. So this trigger takes the same
-- SHAPE (BEFORE UPDATE, per-column, driven by IS DISTINCT FROM, reusing the
-- estate's own normalize_text) and a narrower RULE:
--
--   1. new text normalises to the SAME text_normalized as the linked clip
--      -> the clip still speaks the right words. KEEP IT. This is the cosmetic
--         edit case the 08-06 migration existed to fix; it is preserved.
--   2. otherwise, if we already own a clip for the NEW text in the SAME VOICE
--      and the SAME LANGUAGE as the clip that is being replaced
--      -> re-point at it, and WRITE THE MOVE DOWN. "Play what we have"
--         (AUDIO_PIPELINE_ARCHITECTURE.md §6b) without changing who is speaking.
--   3. otherwise
--      -> NULL the link and WRITE THE DROP DOWN.
--
-- Rule 3 is the ruling: null-and-report, never silent relink. A NULL is a
-- visible hole that every missing-audio sweep already finds, and the report row
-- keeps the clip id and the old text so the drop is reversible and countable.
-- Nothing here deletes audio; the clip itself is untouched in every branch
-- (make-before-break).
--
-- A slot that is ALREADY NULL is left NULL. There is nothing stale about it,
-- and link_audio_to_content (AFTER INSERT ON course_audio) already fills NULL
-- seed slots when matching audio arrives.
--
-- course_seeds has no presentation_audio_id column, so unlike the lego trigger
-- there is no presentation branch. Its columns are known_audio_id,
-- target1_audio_id, target2_audio_id and that is the whole scope.
--
-- No TTS is generated, requested or implied by this migration. Expect it to
-- SURFACE a backlog of missing seed audio that is currently hiding behind a
-- stale link — that is the point of it, and it will not look tidy on day one.


BEGIN;

-- ── 1. Where a dropped or moved link is written down ─────────────────────────
-- Deliberately NOT foreign-keyed to course_audio: the whole value of this row is
-- that it survives the clip being deleted later. It is an append-only record.
CREATE TABLE IF NOT EXISTS public.content_audio_link_drops (
  id             bigserial PRIMARY KEY,
  dropped_at     timestamptz NOT NULL DEFAULT now(),
  table_name     text        NOT NULL,
  row_id         uuid        NOT NULL,
  course_code    text        NOT NULL,
  seed_number    integer,
  column_name    text        NOT NULL,
  role           text        NOT NULL,
  old_audio_id   uuid,
  new_audio_id   uuid,
  old_text       text,   -- what the dropped clip actually speaks
  new_text       text,   -- what the row says after the edit
  old_voice_id   text,
  reason         text        NOT NULL
);

COMMENT ON TABLE public.content_audio_link_drops IS
  'Append-only record of every audio link a text edit dropped or moved. Written by null_seed_audio_on_text_change. No FK to course_audio on purpose: the row must outlive the clip.';

CREATE INDEX IF NOT EXISTS idx_content_audio_link_drops_course
  ON public.content_audio_link_drops (course_code, dropped_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_audio_link_drops_row
  ON public.content_audio_link_drops (row_id);

ALTER TABLE public.content_audio_link_drops ENABLE ROW LEVEL SECURITY;

-- Mirrors content_audit_log exactly: RLS on, admin-read, and the trigger writes
-- through SECURITY DEFINER rather than by granting INSERT to anybody.
DROP POLICY IF EXISTS "ssi_admin reads content_audio_link_drops"
  ON public.content_audio_link_drops;
CREATE POLICY "ssi_admin reads content_audio_link_drops"
  ON public.content_audio_link_drops FOR SELECT USING (is_ssi_admin());

GRANT SELECT ON public.content_audio_link_drops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_audio_link_drops TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.content_audio_link_drops_id_seq TO service_role;


-- ── 2. "Play what we have" — but only in the same voice ──────────────────────
-- audio_id_for_text() with two extra constraints: the substitute must be the
-- same canonical voice and the same canonical language as the clip it replaces.
-- audio_canon_voice() is the estate's own total, deterministic voice key — it
-- folds `si-LK-SameeraNeural` and `azure_si-LK-SameeraNeural` (and a bare vs an
-- `xai_`-prefixed id) onto one value, so this does not reject a substitute over
-- a tagging artefact. Ordering is identical to audio_id_for_text so the two can
-- never disagree about which of several eligible rows wins.
CREATE OR REPLACE FUNCTION public.audio_id_for_text_same_voice(
  p_course text, p_text text, p_role text, p_like uuid
) RETURNS uuid
LANGUAGE sql STABLE
AS $function$
  SELECT a.id
    FROM course_audio a
    JOIN course_audio prev ON prev.id = p_like
   WHERE a.course_code = p_course
     AND a.role        = p_role
     AND a.s3_key IS NOT NULL
     AND a.text_normalized = normalize_text(p_text)
     AND audio_canon_voice(a.voice_id) = audio_canon_voice(prev.voice_id)
     AND a.language IS NOT DISTINCT FROM prev.language
   ORDER BY (a.origin = 'human') DESC, a.created_at DESC, a.id::text DESC
   LIMIT 1;
$function$;


-- ── 3. The trigger function ──────────────────────────────────────────────────
-- SECURITY DEFINER with a pinned search_path, matching audit_content_change():
-- the report table is RLS-protected and grants INSERT to nobody, so the write
-- has to come from the function's own privileges, not the caller's.
CREATE OR REPLACE FUNCTION public.null_seed_audio_on_text_change()
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
      -- The known side moves only when known_text moves.
      CONTINUE WHEN NEW.known_text IS NOT DISTINCT FROM OLD.known_text;
      v_col := 'known_audio_id'; v_new_text := NEW.known_text; v_cur := OLD.known_audio_id;
    ELSE
      CONTINUE WHEN NEW.target_text IS NOT DISTINCT FROM OLD.target_text;
      v_col := v_role || '_audio_id'; v_new_text := NEW.target_text;
      v_cur := CASE v_role WHEN 'target1' THEN OLD.target1_audio_id
                           ELSE OLD.target2_audio_id END;
    END IF;

    -- Nothing linked: nothing can be stale. Leave it for link_audio_to_content.
    CONTINUE WHEN v_cur IS NULL;

    -- v_prev is reused across loop iterations, so it MUST be cleared before the
    -- lookup: a SELECT INTO that finds nothing leaves the previous iteration's
    -- row in place, and the report row would then name another role's clip.
    v_prev := NULL;
    SELECT * INTO v_prev FROM course_audio WHERE id = v_cur;
    v_found := FOUND;

    -- The clip still speaks the new text (whitespace / casing / trailing
    -- punctuation only): keep it. This is the case the 2026-08-06 migration
    -- existed to stop breaking, and it stays unbroken here.
    CONTINUE WHEN v_found AND v_prev.text_normalized = normalize_text(v_new_text);

    IF v_found THEN
      v_sub := audio_id_for_text_same_voice(NEW.course_code, v_new_text, v_role, v_cur);
    ELSE
      -- The link points at a course_audio row that no longer exists. There is no
      -- voice to preserve, so there is no substitute we are willing to pick.
      --
      -- All three of course_seeds' audio FKs are ON DELETE SET NULL, so today
      -- this branch is unreachable — the canary confirms it cannot be provoked.
      -- It is kept because that is a property of three constraints that a future
      -- migration could change, and the cost of keeping it is one NULL check.
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

    IF v_col = 'known_audio_id'   THEN NEW.known_audio_id   := v_sub;
    ELSIF v_col = 'target1_audio_id' THEN NEW.target1_audio_id := v_sub;
    ELSE                                 NEW.target2_audio_id := v_sub;
    END IF;

    INSERT INTO content_audio_link_drops (
      table_name, row_id, course_code, seed_number, column_name, role,
      old_audio_id, new_audio_id, old_text, new_text, old_voice_id, reason
    ) VALUES (
      'course_seeds', NEW.id, NEW.course_code, NEW.seed_number, v_col, v_role,
      v_cur, v_sub, v_prev.text, v_new_text, v_prev.voice_id, v_reason
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.null_seed_audio_on_text_change() FROM PUBLIC;


-- ── 4. The trigger ───────────────────────────────────────────────────────────
-- The WHEN clause is a deliberate deviation from the lego/phrase triggers, which
-- have none: course_seeds is updated constantly for status, approved_at and
-- flagged_at, and none of those can move an audio link. Gating in the trigger
-- definition keeps the function off the hot path entirely. It changes no
-- outcome — the function's own first act is the same IS DISTINCT FROM test.
DROP TRIGGER IF EXISTS trg_null_seed_audio_on_text_change ON public.course_seeds;
CREATE TRIGGER trg_null_seed_audio_on_text_change
  BEFORE UPDATE ON public.course_seeds
  FOR EACH ROW
  WHEN (OLD.known_text  IS DISTINCT FROM NEW.known_text
     OR OLD.target_text IS DISTINCT FROM NEW.target_text)
  EXECUTE FUNCTION public.null_seed_audio_on_text_change();


-- ── 5. Tell PostgREST about the new table ────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;
