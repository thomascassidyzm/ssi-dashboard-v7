-- HUMAN TAKE LOCK — Tom's HARD RULE, 2026-10-13 (r-2026-10-13-hard-rule-a-human-recorded-clip):
--
--   A human-recorded clip is NEVER replaced automatically by a cloned or synthetic voice, in any course.
--
-- WHY A TRIGGER. Job #609 put the rule into services/shared/human-take-guard.cjs and every pointer-writing tool
-- that calls resolve-voice. A code guard cannot stop the next script that goes straight to the database (raw SQL,
-- psql, a tool that skips resolve-voice). This is the chokepoint every writer passes through. Tom GO 2026-10-13.
--
-- SAME RULE AS THE CODE GUARD (human-take-guard.cjs checkReplacement), column for column:
--   * HUMAN = the course_audio row has origin 'human' (any case) OR a voice_id beginning 'human_' (Welsh legacy takes
--     are origin 'legacy_import'/'tts' with voice human_aran_cym_n etc. — the voice id catches them).
--   * A slot whose CURRENT clip is human may only be repointed to another human clip.
--   * Pointing it at a synthetic clip is refused unless the session carries Tom's approval token, shaped exactly as
--     #609's: tom:YYYY-MM-DD:<what he approved>   e.g.
--         SET LOCAL popty.tom_human_take_approval = 'tom:2026-10-13:recast cym_n known side';
--   * FAILS CLOSED: if the new clip id cannot be found in course_audio, the repoint off a human take is refused.
--   * Setting a slot to NULL (unlinking) always passes; an empty slot or a non-human/unknown current clip passes.
-- INSERTs are not checked (a new row has no current clip to protect).
--
-- Slot columns: known/target1/target2/presentation _audio_id on course_seeds, course_legos, course_practice_phrases,
-- lego_introductions (whichever exist on the table; course_legos.presentation_audio_id is text, the rest uuid).
-- Rollback: 20261013_human_take_lock.ROLLBACK.sql. Test: tools/audio/human-take-lock-check.cjs (rolls itself back).

CREATE OR REPLACE FUNCTION refuse_human_take_replacement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  col text;
  old_id text;
  new_id text;
  cur record;
  nxt record;
  approval text := current_setting('popty.tom_human_take_approval', true);
  uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  FOREACH col IN ARRAY ARRAY['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'] LOOP
    old_id := to_jsonb(OLD) ->> col;
    new_id := to_jsonb(NEW) ->> col;
    CONTINUE WHEN old_id IS NULL OR new_id IS NULL OR old_id = new_id OR old_id !~ uuid_re;

    SELECT id, origin, voice_id INTO cur FROM course_audio WHERE id = old_id::uuid;
    CONTINUE WHEN NOT FOUND;
    CONTINUE WHEN NOT (lower(coalesce(cur.origin, '')) = 'human' OR coalesce(cur.voice_id, '') ~* '^human_');

    IF new_id ~ uuid_re THEN
      SELECT id, origin, voice_id INTO nxt FROM course_audio WHERE id = new_id::uuid;
    END IF;
    IF new_id !~ uuid_re OR NOT FOUND THEN
      RAISE EXCEPTION 'HUMAN TAKE LOCK: %.% on row % holds human take % — the clip it would point at (%) cannot be read; refusing (not knowing is not permission)',
        TG_TABLE_NAME, col, NEW.id, old_id, new_id USING ERRCODE = 'P0403';
    END IF;
    CONTINUE WHEN lower(coalesce(nxt.origin, '')) = 'human' OR coalesce(nxt.voice_id, '') ~* '^human_';

    IF approval ~ '^tom:\d{4}-\d{2}-\d{2}:\S.{6,}$' THEN
      RAISE NOTICE 'HUMAN TAKE REPLACED under Tom''s approval (%): %.% row % % -> %', approval, TG_TABLE_NAME, col, NEW.id, old_id, new_id;
      CONTINUE;
    END IF;
    RAISE EXCEPTION 'HUMAN TAKE LOCK: %.% on row % holds a HUMAN take (%, voice %); clip % is synthetic (%). A human take is never replaced by a synthetic voice (Tom''s HARD RULE 2026-10-13). With his explicit go: SET LOCAL popty.tom_human_take_approval = ''tom:YYYY-MM-DD:<what he approved>''',
      TG_TABLE_NAME, col, NEW.id, old_id, cur.voice_id, new_id, nxt.voice_id USING ERRCODE = 'P0403';
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS human_take_lock ON course_seeds;
CREATE TRIGGER human_take_lock BEFORE UPDATE OF known_audio_id, target1_audio_id, target2_audio_id ON course_seeds
  FOR EACH ROW EXECUTE FUNCTION refuse_human_take_replacement();

DROP TRIGGER IF EXISTS human_take_lock ON course_legos;
CREATE TRIGGER human_take_lock BEFORE UPDATE OF known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id ON course_legos
  FOR EACH ROW EXECUTE FUNCTION refuse_human_take_replacement();

DROP TRIGGER IF EXISTS human_take_lock ON course_practice_phrases;
CREATE TRIGGER human_take_lock BEFORE UPDATE OF known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id ON course_practice_phrases
  FOR EACH ROW EXECUTE FUNCTION refuse_human_take_replacement();

DROP TRIGGER IF EXISTS human_take_lock ON lego_introductions;
CREATE TRIGGER human_take_lock BEFORE UPDATE OF presentation_audio_id ON lego_introductions
  FOR EACH ROW EXECUTE FUNCTION refuse_human_take_replacement();
