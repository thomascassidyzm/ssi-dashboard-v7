-- Text change must not override an audio link set in the same UPDATE (job #893).
-- Phrase trigger lost three clips in job #886 this way; the seed trigger has the same gap.
-- Text-only UPDATEs behave exactly as before. Rollback: the ROLLBACK.sql sibling.

CREATE OR REPLACE FUNCTION public.null_phrase_audio_on_text_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
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
      -- The writer set this link EXPLICITLY in the same UPDATE as the text:
      -- respect it (same rule as null_lego_audio_on_text_change). Without this the
      -- function reads OLD, resolves a substitute, and overwrites the value the
      -- writer just supplied — an audio-first repair (render the new clip, then
      -- swap text and link together) silently loses its clip.
      CONTINUE WHEN NEW.known_audio_id IS DISTINCT FROM OLD.known_audio_id;
    ELSE
      CONTINUE WHEN NEW.target_text IS NOT DISTINCT FROM OLD.target_text;
      v_col := v_role || '_audio_id'; v_new_text := NEW.target_text;
      v_cur := CASE v_role WHEN 'target1' THEN OLD.target1_audio_id
                           ELSE OLD.target2_audio_id END;
      -- Writer-set link in the same UPDATE: respect it (see the known branch).
      CONTINUE WHEN CASE v_role WHEN 'target1' THEN NEW.target1_audio_id
                                ELSE NEW.target2_audio_id END
                    IS DISTINCT FROM v_cur;
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

CREATE OR REPLACE FUNCTION public.null_seed_audio_on_text_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
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
      -- The writer set this link EXPLICITLY in the same UPDATE as the text:
      -- respect it (same rule as null_lego_audio_on_text_change). Without this the
      -- function reads OLD, resolves a substitute, and overwrites the value the
      -- writer just supplied — an audio-first repair (render the new clip, then
      -- swap text and link together) silently loses its clip.
      CONTINUE WHEN NEW.known_audio_id IS DISTINCT FROM OLD.known_audio_id;
    ELSE
      CONTINUE WHEN NEW.target_text IS NOT DISTINCT FROM OLD.target_text;
      v_col := v_role || '_audio_id'; v_new_text := NEW.target_text;
      v_cur := CASE v_role WHEN 'target1' THEN OLD.target1_audio_id
                           ELSE OLD.target2_audio_id END;
      -- Writer-set link in the same UPDATE: respect it (see the known branch).
      CONTINUE WHEN CASE v_role WHEN 'target1' THEN NEW.target1_audio_id
                                ELSE NEW.target2_audio_id END
                    IS DISTINCT FROM v_cur;
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
    --
    -- normalize_text(v_prev.text) — the clip's REAL text, re-normalised now —
    -- not v_prev.text_normalized. On the 41,900 rows whose stored column predates
    -- the normaliser's redefinition the stored value still carries the trailing
    -- '?', so testing it would call a clip that speaks the exact right words
    -- "stale" and drop a good link. The stored column is kept as a fast first
    -- disjunct; it is never the sole authority.
    CONTINUE WHEN v_found AND (v_prev.text_normalized = normalize_text(v_new_text)
                            OR normalize_text(v_prev.text) = normalize_text(v_new_text));

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
