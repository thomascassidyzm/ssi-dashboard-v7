-- =============================================================================
-- RELINKING AUDIO MUST ONLY EVER RELINK A CLIP WHOSE VOICE MATCHES THE COURSE
-- VOICE CONFIG.  — Kai's ruling, 2026-08-19
-- =============================================================================
--
-- WHY. A zho_for_eng repair pass relinked 206 mislinked known-side prompts to
-- clips whose text matched. 164 of them silently changed voice — Sonia (the
-- configured known voice) to a clone — because the relink matched on
-- text x language x role and NOTHING else. The two relink paths that live IN
-- THE DATABASE are the ones that actually ran:
--
--   1. link_audio_to_content()  — trigger `audio_autolink`, AFTER INSERT ON
--      course_audio. Every newly inserted clip claims any NULL slot in the same
--      course whose normalised text matches. Voice never consulted.
--   2. link_all_audio_ids(p_course_code) — the bulk RPC phase8 calls. Picks a
--      matching clip with a bare `LIMIT 1`: no ORDER BY, no voice, so which
--      voice wins is literally whatever the planner returns first.
--
-- WHAT THIS MIGRATION DOES. Adds the voice test to both, using the same voice
-- identity rule as services/shared/relink-voice-guard.cjs, and makes every
-- refusal LOUD by recording it in `relink_refusals` (Kai's standing principle:
-- convert silent to loud). A refused slot is LEFT EXACTLY AS IT WAS — never
-- unlinked, never deleted, never filled with the wrong speaker. It is then
-- regenerated in the configured voice by a later audio pass.
--
-- FAILING CLOSED ON A MISSING CONFIG IS DELIBERATE. If a course has no voice
-- configured for a role we cannot tell a right clip from a wrong one, and the
-- whole point of the ruling is that a relink must never be a guess. Those
-- courses stop auto-linking that role and log reason 'no-configured-voice',
-- which is a fixable config gap rather than silent voice drift.
--
-- REVERSIBLE: 20260819_relink_must_match_voice_config.ROLLBACK.sql restores the
-- previous voice-blind bodies verbatim.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Voice identity, in SQL, matching the JS guard exactly.
-- -----------------------------------------------------------------------------

-- The bare voice id, with any provider-era prefix removed. Tom's ruling,
-- 2026-08-07: `eve` and `xai_eve` are ONE voice under two id conventions — the
-- prefix dates the render era, not the speaker.
CREATE OR REPLACE FUNCTION audio_bare_voice_id(p_voice_id text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_voice_id IS NULL THEN NULL
    ELSE regexp_replace(p_voice_id, '^(xai|azure|elevenlabs|google)_', '')
  END;
$$;

-- Do two voice_id strings name the same voice? Locale is deliberately NOT
-- merged: en-GB-Sonia and en-US-Jenny are different voices, and so are fr-FR
-- and fr-CA renders — an accent change IS a voice change.
CREATE OR REPLACE FUNCTION audio_voice_matches(p_wanted text, p_candidate text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_wanted IS NOT NULL
     AND p_candidate IS NOT NULL
     AND audio_bare_voice_id(p_wanted) = audio_bare_voice_id(p_candidate);
$$;

-- The voice_id string phase8 would WRITE for a role, from courses.voice_config.
-- Mirrors phase8-audio-v13.cjs getVoiceForRole and the JS resolveVoices:
-- `provider_voiceId` when a provider is set, bare voiceId otherwise.
-- Role 'source' is the legacy alias for 'known' and resolves to the same slot.
CREATE OR REPLACE FUNCTION audio_configured_voice(p_course_code text, p_role text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN v->>'provider' IS NOT NULL AND v->>'voiceId' IS NOT NULL
      THEN (v->>'provider') || '_' || (v->>'voiceId')
    ELSE v->>'voiceId'
  END
  FROM (
    SELECT c.voice_config->'voices'->(CASE WHEN p_role = 'source' THEN 'known' ELSE p_role END) AS v
    FROM courses c WHERE c.course_code = p_course_code
  ) s;
$$;

-- -----------------------------------------------------------------------------
-- 2. The refusal ledger — the LOUD half of the ruling.
-- -----------------------------------------------------------------------------
-- Every slot a relink declines to fill lands here. A refusal that is not
-- counted is a silent failure wearing a safety label, which is the exact
-- failure mode this change exists to end. Read it with:
--   SELECT course_code, role, reason, count(*) FROM relink_refusals
--   GROUP BY 1,2,3 ORDER BY 4 DESC;
CREATE TABLE IF NOT EXISTS relink_refusals (
  id              bigserial PRIMARY KEY,
  course_code     text NOT NULL,
  content_table   text NOT NULL,
  slot_id         text,
  role            text NOT NULL,
  reason          text NOT NULL,          -- voice-mismatch | no-configured-voice
  wanted_voice    text,
  candidate_voice text,
  candidate_audio_id uuid,
  refused_by      text NOT NULL,          -- which relink path refused
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS relink_refusals_course_idx ON relink_refusals (course_code, created_at DESC);

COMMENT ON TABLE relink_refusals IS
  'Slots a relink path declined to fill because no clip in the configured voice existed (Kai''s ruling 2026-08-19). The slot was LEFT AS IT WAS and needs regeneration in the configured voice. Never a delete, never a bare unlink.';

-- -----------------------------------------------------------------------------
-- 3. link_audio_to_content() — the audio_autolink AFTER-INSERT trigger.
-- -----------------------------------------------------------------------------
-- Unchanged in shape: it still only fills NULL slots (`<col> IS NULL`), and it
-- still matches on normalised text. It now ALSO requires the arriving clip's
-- voice to be the configured voice for its role; when it is not, the clip binds
-- to nothing and one refusal row is written per content table that would have
-- taken it.
CREATE OR REPLACE FUNCTION link_audio_to_content()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE
  v_wanted text;
  v_n      int;
BEGIN
  v_wanted := audio_configured_voice(NEW.course_code, NEW.role);

  -- VOICE GATE. No configured voice, or a clip in the wrong voice: link nothing
  -- and say so, once per content table whose text this clip matched.
  IF NOT audio_voice_matches(v_wanted, NEW.voice_id) THEN
    INSERT INTO relink_refusals (
      course_code, content_table, slot_id, role, reason,
      wanted_voice, candidate_voice, candidate_audio_id, refused_by)
    SELECT NEW.course_code, t.tbl, t.slot, NEW.role,
           CASE WHEN v_wanted IS NULL THEN 'no-configured-voice' ELSE 'voice-mismatch' END,
           v_wanted, NEW.voice_id, NEW.id, 'audio_autolink trigger'
    FROM (
      SELECT 'course_legos' AS tbl, l.lego_id::text AS slot FROM course_legos l
        WHERE l.course_code = NEW.course_code
          AND normalize_text(CASE WHEN NEW.role = 'known' THEN l.known_text ELSE l.target_text END) = NEW.text_normalized
          AND (CASE NEW.role
                 WHEN 'known' THEN l.known_audio_id IS NULL
                 WHEN 'target1' THEN l.target1_audio_id IS NULL
                 WHEN 'target2' THEN l.target2_audio_id IS NULL
                 WHEN 'presentation' THEN l.presentation_audio_id IS NULL
                 ELSE false END)
      UNION ALL
      SELECT 'course_practice_phrases', p.id::text FROM course_practice_phrases p
        WHERE p.course_code = NEW.course_code
          AND normalize_text(CASE WHEN NEW.role = 'known' THEN p.known_text ELSE p.target_text END) = NEW.text_normalized
          AND (CASE NEW.role
                 WHEN 'known' THEN p.known_audio_id IS NULL
                 WHEN 'target1' THEN p.target1_audio_id IS NULL
                 WHEN 'target2' THEN p.target2_audio_id IS NULL
                 WHEN 'presentation' THEN p.presentation_audio_id IS NULL
                 ELSE false END)
      UNION ALL
      SELECT 'course_seeds', s.id::text FROM course_seeds s
        WHERE s.course_code = NEW.course_code
          AND normalize_text(CASE WHEN NEW.role = 'known' THEN s.known_text ELSE s.target_text END) = NEW.text_normalized
          AND (CASE NEW.role
                 WHEN 'known' THEN s.known_audio_id IS NULL
                 WHEN 'target1' THEN s.target1_audio_id IS NULL
                 WHEN 'target2' THEN s.target2_audio_id IS NULL
                 ELSE false END)
    ) t
    LIMIT 500;   -- a bulk import must not write a million refusal rows

    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN
      RAISE WARNING 'audio_autolink REFUSED % slot(s) for clip % in %: voice % is not the configured % for role %',
        v_n, NEW.id, NEW.course_code, NEW.voice_id, COALESCE(v_wanted, '(none configured)'), NEW.role;
    END IF;
    RETURN NEW;
  END IF;

  -- Voice is correct — original behaviour, unchanged.
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
    -- course_legos.presentation_audio_id is a TEXT column, hence the cast;
    -- course_practice_phrases' is uuid.
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

-- -----------------------------------------------------------------------------
-- 4. link_all_audio_ids() — the bulk RPC.
-- -----------------------------------------------------------------------------
-- Each of the nine UPDATEs gains `AND audio_voice_matches(<configured>, ca.voice_id)`
-- in BOTH the sub-select and the EXISTS guard, so a wrong-voice clip is simply
-- not visible to the query. The bare `LIMIT 1` is now safe in the sense that
-- matters: every candidate it could return is in the right voice. Refused slots
-- (text matched, voice did not) are counted, written to relink_refusals, and
-- returned as `refused` in the result JSON so the caller cannot miss them.
CREATE OR REPLACE FUNCTION link_all_audio_ids(p_course_code text)
RETURNS jsonb LANGUAGE plpgsql AS $function$
DECLARE
  v_course RECORD;
  v_vk text; v_v1 text; v_v2 text;
  v_linked_legos_known INT := 0;
  v_linked_legos_t1 INT := 0;
  v_linked_legos_t2 INT := 0;
  v_linked_phrases_known INT := 0;
  v_linked_phrases_t1 INT := 0;
  v_linked_phrases_t2 INT := 0;
  v_linked_seeds_known INT := 0;
  v_linked_seeds_t1 INT := 0;
  v_linked_seeds_t2 INT := 0;
  v_refused INT := 0;
BEGIN
  SELECT * INTO v_course FROM courses WHERE course_code = p_course_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found: %', p_course_code;
  END IF;

  v_vk := audio_configured_voice(p_course_code, 'known');
  v_v1 := audio_configured_voice(p_course_code, 'target1');
  v_v2 := audio_configured_voice(p_course_code, 'target2');

  -- REFUSAL LEDGER FIRST, while the slots are still NULL. Every NULL slot whose
  -- text matches a clip that is NOT in the configured voice is a refusal: we
  -- could have filled it the old way and we are deliberately not going to.
  WITH refusals AS (
    SELECT 'course_legos' AS tbl, l.lego_id::text AS slot, 'known' AS role, v_vk AS wanted, ca.voice_id AS cand, ca.id AS aid
      FROM course_legos l JOIN course_audio ca
        ON ca.course_code = l.course_code AND ca.text_normalized = normalize_text(l.known_text)
       AND ca.role IN ('known','source')
     WHERE l.course_code = p_course_code AND l.known_audio_id IS NULL
       AND NOT audio_voice_matches(v_vk, ca.voice_id)
    UNION ALL
    SELECT 'course_legos', l.lego_id::text, 'target1', v_v1, ca.voice_id, ca.id
      FROM course_legos l JOIN course_audio ca
        ON ca.course_code = l.course_code AND ca.text_normalized = normalize_text(l.target_text) AND ca.role = 'target1'
     WHERE l.course_code = p_course_code AND l.target1_audio_id IS NULL
       AND NOT audio_voice_matches(v_v1, ca.voice_id)
    UNION ALL
    SELECT 'course_legos', l.lego_id::text, 'target2', v_v2, ca.voice_id, ca.id
      FROM course_legos l JOIN course_audio ca
        ON ca.course_code = l.course_code AND ca.text_normalized = normalize_text(l.target_text) AND ca.role = 'target2'
     WHERE l.course_code = p_course_code AND l.target2_audio_id IS NULL
       AND NOT audio_voice_matches(v_v2, ca.voice_id)
    UNION ALL
    SELECT 'course_practice_phrases', p.id::text, 'known', v_vk, ca.voice_id, ca.id
      FROM course_practice_phrases p JOIN course_audio ca
        ON ca.course_code = p.course_code AND ca.text_normalized = normalize_text(p.known_text)
       AND ca.role IN ('known','source')
     WHERE p.course_code = p_course_code AND p.known_audio_id IS NULL
       AND NOT audio_voice_matches(v_vk, ca.voice_id)
    UNION ALL
    SELECT 'course_practice_phrases', p.id::text, 'target1', v_v1, ca.voice_id, ca.id
      FROM course_practice_phrases p JOIN course_audio ca
        ON ca.course_code = p.course_code AND ca.text_normalized = normalize_text(p.target_text) AND ca.role = 'target1'
     WHERE p.course_code = p_course_code AND p.target1_audio_id IS NULL
       AND NOT audio_voice_matches(v_v1, ca.voice_id)
    UNION ALL
    SELECT 'course_practice_phrases', p.id::text, 'target2', v_v2, ca.voice_id, ca.id
      FROM course_practice_phrases p JOIN course_audio ca
        ON ca.course_code = p.course_code AND ca.text_normalized = normalize_text(p.target_text) AND ca.role = 'target2'
     WHERE p.course_code = p_course_code AND p.target2_audio_id IS NULL
       AND NOT audio_voice_matches(v_v2, ca.voice_id)
    UNION ALL
    SELECT 'course_seeds', s.id::text, 'known', v_vk, ca.voice_id, ca.id
      FROM course_seeds s JOIN course_audio ca
        ON ca.course_code = s.course_code AND ca.text_normalized = normalize_text(s.known_text)
       AND ca.role IN ('known','source')
     WHERE s.course_code = p_course_code AND s.known_audio_id IS NULL
       AND NOT audio_voice_matches(v_vk, ca.voice_id)
    UNION ALL
    SELECT 'course_seeds', s.id::text, 'target1', v_v1, ca.voice_id, ca.id
      FROM course_seeds s JOIN course_audio ca
        ON ca.course_code = s.course_code AND ca.text_normalized = normalize_text(s.target_text) AND ca.role = 'target1'
     WHERE s.course_code = p_course_code AND s.target1_audio_id IS NULL
       AND NOT audio_voice_matches(v_v1, ca.voice_id)
    UNION ALL
    SELECT 'course_seeds', s.id::text, 'target2', v_v2, ca.voice_id, ca.id
      FROM course_seeds s JOIN course_audio ca
        ON ca.course_code = s.course_code AND ca.text_normalized = normalize_text(s.target_text) AND ca.role = 'target2'
     WHERE s.course_code = p_course_code AND s.target2_audio_id IS NULL
       AND NOT audio_voice_matches(v_v2, ca.voice_id)
  ), deduped AS (
    SELECT DISTINCT ON (tbl, slot, role) * FROM refusals ORDER BY tbl, slot, role
  )
  INSERT INTO relink_refusals (
    course_code, content_table, slot_id, role, reason,
    wanted_voice, candidate_voice, candidate_audio_id, refused_by)
  SELECT p_course_code, tbl, slot, role,
         CASE WHEN wanted IS NULL THEN 'no-configured-voice' ELSE 'voice-mismatch' END,
         wanted, cand, aid, 'link_all_audio_ids'
  FROM deduped;
  GET DIAGNOSTICS v_refused = ROW_COUNT;

  UPDATE course_legos cl SET known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND ca.text_normalized = normalize_text(cl.known_text)
      AND ca.role IN ('known', 'source')
      AND audio_voice_matches(v_vk, ca.voice_id)
    LIMIT 1
  )
  WHERE cl.course_code = p_course_code AND cl.known_audio_id IS NULL
    AND EXISTS (
      SELECT 1 FROM course_audio ca
      WHERE ca.course_code = cl.course_code
        AND ca.text_normalized = normalize_text(cl.known_text)
        AND ca.role IN ('known', 'source')
        AND audio_voice_matches(v_vk, ca.voice_id)
    );
  GET DIAGNOSTICS v_linked_legos_known = ROW_COUNT;

  UPDATE course_legos cl SET target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND ca.text_normalized = normalize_text(cl.target_text)
      AND ca.role = 'target1'
      AND audio_voice_matches(v_v1, ca.voice_id)
    LIMIT 1
  )
  WHERE cl.course_code = p_course_code AND cl.target1_audio_id IS NULL
    AND EXISTS (
      SELECT 1 FROM course_audio ca
      WHERE ca.course_code = cl.course_code
        AND ca.text_normalized = normalize_text(cl.target_text)
        AND ca.role = 'target1'
        AND audio_voice_matches(v_v1, ca.voice_id)
    );
  GET DIAGNOSTICS v_linked_legos_t1 = ROW_COUNT;

  UPDATE course_legos cl SET target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cl.course_code
      AND ca.text_normalized = normalize_text(cl.target_text)
      AND ca.role = 'target2'
      AND audio_voice_matches(v_v2, ca.voice_id)
    LIMIT 1
  )
  WHERE cl.course_code = p_course_code AND cl.target2_audio_id IS NULL
    AND EXISTS (
      SELECT 1 FROM course_audio ca
      WHERE ca.course_code = cl.course_code
        AND ca.text_normalized = normalize_text(cl.target_text)
        AND ca.role = 'target2'
        AND audio_voice_matches(v_v2, ca.voice_id)
    );
  GET DIAGNOSTICS v_linked_legos_t2 = ROW_COUNT;

  UPDATE course_practice_phrases cpp SET known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND ca.text_normalized = normalize_text(cpp.known_text)
      AND ca.role IN ('known', 'source')
      AND audio_voice_matches(v_vk, ca.voice_id)
    LIMIT 1
  )
  WHERE cpp.course_code = p_course_code AND cpp.known_audio_id IS NULL
    AND EXISTS (
      SELECT 1 FROM course_audio ca
      WHERE ca.course_code = cpp.course_code
        AND ca.text_normalized = normalize_text(cpp.known_text)
        AND ca.role IN ('known', 'source')
        AND audio_voice_matches(v_vk, ca.voice_id)
    );
  GET DIAGNOSTICS v_linked_phrases_known = ROW_COUNT;

  UPDATE course_practice_phrases cpp SET target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND ca.text_normalized = normalize_text(cpp.target_text)
      AND ca.role = 'target1'
      AND audio_voice_matches(v_v1, ca.voice_id)
    LIMIT 1
  )
  WHERE cpp.course_code = p_course_code AND cpp.target1_audio_id IS NULL
    AND EXISTS (
      SELECT 1 FROM course_audio ca
      WHERE ca.course_code = cpp.course_code
        AND ca.text_normalized = normalize_text(cpp.target_text)
        AND ca.role = 'target1'
        AND audio_voice_matches(v_v1, ca.voice_id)
    );
  GET DIAGNOSTICS v_linked_phrases_t1 = ROW_COUNT;

  UPDATE course_practice_phrases cpp SET target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cpp.course_code
      AND ca.text_normalized = normalize_text(cpp.target_text)
      AND ca.role = 'target2'
      AND audio_voice_matches(v_v2, ca.voice_id)
    LIMIT 1
  )
  WHERE cpp.course_code = p_course_code AND cpp.target2_audio_id IS NULL
    AND EXISTS (
      SELECT 1 FROM course_audio ca
      WHERE ca.course_code = cpp.course_code
        AND ca.text_normalized = normalize_text(cpp.target_text)
        AND ca.role = 'target2'
        AND audio_voice_matches(v_v2, ca.voice_id)
    );
  GET DIAGNOSTICS v_linked_phrases_t2 = ROW_COUNT;

  UPDATE course_seeds cs SET known_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cs.course_code
      AND ca.text_normalized = normalize_text(cs.known_text)
      AND ca.role IN ('known', 'source')
      AND audio_voice_matches(v_vk, ca.voice_id)
    LIMIT 1
  )
  WHERE cs.course_code = p_course_code AND cs.known_audio_id IS NULL
    AND EXISTS (
      SELECT 1 FROM course_audio ca
      WHERE ca.course_code = cs.course_code
        AND ca.text_normalized = normalize_text(cs.known_text)
        AND ca.role IN ('known', 'source')
        AND audio_voice_matches(v_vk, ca.voice_id)
    );
  GET DIAGNOSTICS v_linked_seeds_known = ROW_COUNT;

  UPDATE course_seeds cs SET target1_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cs.course_code
      AND ca.text_normalized = normalize_text(cs.target_text)
      AND ca.role = 'target1'
      AND audio_voice_matches(v_v1, ca.voice_id)
    LIMIT 1
  )
  WHERE cs.course_code = p_course_code AND cs.target1_audio_id IS NULL
    AND EXISTS (
      SELECT 1 FROM course_audio ca
      WHERE ca.course_code = cs.course_code
        AND ca.text_normalized = normalize_text(cs.target_text)
        AND ca.role = 'target1'
        AND audio_voice_matches(v_v1, ca.voice_id)
    );
  GET DIAGNOSTICS v_linked_seeds_t1 = ROW_COUNT;

  UPDATE course_seeds cs SET target2_audio_id = (
    SELECT ca.id FROM course_audio ca
    WHERE ca.course_code = cs.course_code
      AND ca.text_normalized = normalize_text(cs.target_text)
      AND ca.role = 'target2'
      AND audio_voice_matches(v_v2, ca.voice_id)
    LIMIT 1
  )
  WHERE cs.course_code = p_course_code AND cs.target2_audio_id IS NULL
    AND EXISTS (
      SELECT 1 FROM course_audio ca
      WHERE ca.course_code = cs.course_code
        AND ca.text_normalized = normalize_text(cs.target_text)
        AND ca.role = 'target2'
        AND audio_voice_matches(v_v2, ca.voice_id)
    );
  GET DIAGNOSTICS v_linked_seeds_t2 = ROW_COUNT;

  IF v_refused > 0 THEN
    RAISE WARNING 'link_all_audio_ids REFUSED % slot(s) in % on the voice-match rule — left as they were, need regeneration in the configured voice',
      v_refused, p_course_code;
  END IF;

  RETURN jsonb_build_object(
    'course_code', p_course_code,
    'legos', jsonb_build_object('known', v_linked_legos_known, 'target1', v_linked_legos_t1, 'target2', v_linked_legos_t2),
    'phrases', jsonb_build_object('known', v_linked_phrases_known, 'target1', v_linked_phrases_t1, 'target2', v_linked_phrases_t2),
    'seeds', jsonb_build_object('known', v_linked_seeds_known, 'target1', v_linked_seeds_t1, 'target2', v_linked_seeds_t2),
    'refused', v_refused,
    'refused_note', CASE WHEN v_refused > 0
      THEN 'slots left as they were because no clip in the configured voice existed — see relink_refusals'
      ELSE NULL END
  );
END;
$function$;

COMMIT;
