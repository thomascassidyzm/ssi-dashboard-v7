-- 20260804_link_all_audio_ids_skip_no_op_updates.sql
--
-- Why: link_all_audio_ids(p_course_code) was the #2 consumer of database time
-- (5,011 calls, 2,241 ms mean, 11,230 s total, 4.56% of ALL DB time;
-- pg_stat_statements window from 2026-06-23).
--
-- The function runs nine UPDATEs of the shape
--
--   UPDATE course_practice_phrases cpp
--      SET target1_audio_id = (SELECT ca.id FROM course_audio ca WHERE ... LIMIT 1)
--    WHERE cpp.course_code = p_course_code AND cpp.target1_audio_id IS NULL;
--
-- When no matching audio row exists the scalar subquery returns NULL, so the
-- statement writes NULL over NULL. Postgres still creates a new row version and
-- still fires every AFTER trigger on the table. Measured (EXPLAIN ANALYZE inside
-- a rolled-back transaction) for the single target1 UPDATE on hak_for_eng, a
-- course with 24,563 phrases and zero target1 audio:
--
--   Execution Time: 20241.726 ms
--   rows updated: 24,563 -- every one of them NULL -> NULL, i.e. zero effect
--   Buffers: shared hit=1190794 read=23052 dirtied=14499
--   Trigger course_practice_phrases_audit:               2300.694 ms
--   Trigger course_practice_phrases_touch_content_stamp:  810.347 ms
--   Trigger course_practice_phrases_version_trigger:      109.938 ms
--   Trigger course_practice_phrases_pull_duration:        123.346 ms
--   Trigger trg_null_phrase_audio_on_text_change:          67.956 ms
--
-- The per-row SubPlan against course_audio is already fast (0.008 ms, served by
-- idx_course_audio_text_lookup). All the cost is write amplification from rows
-- that were never going to change.
--
-- The fix is an EXISTS guard with the identical predicate on each UPDATE, so a
-- row is only written when there is genuinely an audio row to link it to.
--
-- SEMANTIC NOTE, read before rolling this forward or back. The final table
-- state is bit-identical either way -- a NULL -> NULL write leaves the same
-- value. One thing does change: GET DIAGNOSTICS ROW_COUNT, and therefore the
-- counts in the returned jsonb, now report rows ACTUALLY LINKED rather than
-- rows examined. Previously the hak_for_eng call above returned
-- phrases.target1 = 24563 having linked nothing. Nothing branches on those
-- counts: the two call sites are
--   services/voice-engine/db.cjs:185       -- returns the blob to its caller
--   services/phases/phase8-audio-v13.cjs:1137
-- and phase8 reads them as result.phrases_known / result.legos_target1 etc,
-- flat keys the function has never returned (it returns nested
-- {"phrases":{"known":...}}), so its rpcTotal was already always 0 and only
-- reaches a log line. That pre-existing key mismatch is NOT fixed here -- it is
-- a separate, behaviour-visible change and belongs to Tom.
--
-- Also adds three partial indexes so the "IS NULL" side of the scan stops
-- BitmapAnd-ing the wide idx_practice_phrases_audio composite (measured 5,805 ms
-- / 8,446 blocks read for that bitmap index scan alone).
--
-- Applied to the live DB 2026-08-04. Rollback: the original function body is in
-- git history at the commit that added this file, and can be restored with
--   git show <sha>:database/migrations/20260804_link_all_audio_ids_skip_no_op_updates.sql
-- (see the ROLLBACK block at the foot of this file).
--
-- CONCURRENTLY cannot run inside a transaction block, so there is deliberately
-- no BEGIN/COMMIT here. Run the statements one at a time. A failed concurrent
-- build leaves an INVALID index:
--   SELECT c.relname FROM pg_class c JOIN pg_index i ON i.indexrelid = c.oid
--    WHERE NOT i.indisvalid;
--   DROP INDEX CONCURRENTLY <name>;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpp_unlinked_known_audio
  ON public.course_practice_phrases (course_code) WHERE known_audio_id IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpp_unlinked_target1_audio
  ON public.course_practice_phrases (course_code) WHERE target1_audio_id IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cpp_unlinked_target2_audio
  ON public.course_practice_phrases (course_code) WHERE target2_audio_id IS NULL;

CREATE OR REPLACE FUNCTION public.link_all_audio_ids(p_course_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
  DECLARE
    v_course RECORD;
    v_linked_legos_known INT := 0;
    v_linked_legos_t1 INT := 0;
    v_linked_legos_t2 INT := 0;
    v_linked_phrases_known INT := 0;
    v_linked_phrases_t1 INT := 0;
    v_linked_phrases_t2 INT := 0;
    v_linked_seeds_known INT := 0;
    v_linked_seeds_t1 INT := 0;
    v_linked_seeds_t2 INT := 0;
  BEGIN
    SELECT * INTO v_course FROM courses WHERE course_code = p_course_code;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Course not found: %', p_course_code;
    END IF;

    UPDATE course_legos cl SET known_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cl.course_code
        AND ca.text_normalized = normalize_text(cl.known_text)
        AND ca.role IN ('known', 'source')
      LIMIT 1
    )
    WHERE cl.course_code = p_course_code AND cl.known_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cl.course_code
          AND ca.text_normalized = normalize_text(cl.known_text)
          AND ca.role IN ('known', 'source')
      );
    GET DIAGNOSTICS v_linked_legos_known = ROW_COUNT;

    UPDATE course_legos cl SET target1_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cl.course_code
        AND ca.text_normalized = normalize_text(cl.target_text)
        AND ca.role = 'target1'
      LIMIT 1
    )
    WHERE cl.course_code = p_course_code AND cl.target1_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cl.course_code
          AND ca.text_normalized = normalize_text(cl.target_text)
          AND ca.role = 'target1'
      );
    GET DIAGNOSTICS v_linked_legos_t1 = ROW_COUNT;

    UPDATE course_legos cl SET target2_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cl.course_code
        AND ca.text_normalized = normalize_text(cl.target_text)
        AND ca.role = 'target2'
      LIMIT 1
    )
    WHERE cl.course_code = p_course_code AND cl.target2_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cl.course_code
          AND ca.text_normalized = normalize_text(cl.target_text)
          AND ca.role = 'target2'
      );
    GET DIAGNOSTICS v_linked_legos_t2 = ROW_COUNT;

    UPDATE course_practice_phrases cpp SET known_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cpp.course_code
        AND ca.text_normalized = normalize_text(cpp.known_text)
        AND ca.role IN ('known', 'source')
      LIMIT 1
    )
    WHERE cpp.course_code = p_course_code AND cpp.known_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cpp.course_code
          AND ca.text_normalized = normalize_text(cpp.known_text)
          AND ca.role IN ('known', 'source')
      );
    GET DIAGNOSTICS v_linked_phrases_known = ROW_COUNT;

    UPDATE course_practice_phrases cpp SET target1_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cpp.course_code
        AND ca.text_normalized = normalize_text(cpp.target_text)
        AND ca.role = 'target1'
      LIMIT 1
    )
    WHERE cpp.course_code = p_course_code AND cpp.target1_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cpp.course_code
          AND ca.text_normalized = normalize_text(cpp.target_text)
          AND ca.role = 'target1'
      );
    GET DIAGNOSTICS v_linked_phrases_t1 = ROW_COUNT;

    UPDATE course_practice_phrases cpp SET target2_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cpp.course_code
        AND ca.text_normalized = normalize_text(cpp.target_text)
        AND ca.role = 'target2'
      LIMIT 1
    )
    WHERE cpp.course_code = p_course_code AND cpp.target2_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cpp.course_code
          AND ca.text_normalized = normalize_text(cpp.target_text)
          AND ca.role = 'target2'
      );
    GET DIAGNOSTICS v_linked_phrases_t2 = ROW_COUNT;

    UPDATE course_seeds cs SET known_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cs.course_code
        AND ca.text_normalized = normalize_text(cs.known_text)
        AND ca.role IN ('known', 'source')
      LIMIT 1
    )
    WHERE cs.course_code = p_course_code AND cs.known_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cs.course_code
          AND ca.text_normalized = normalize_text(cs.known_text)
          AND ca.role IN ('known', 'source')
      );
    GET DIAGNOSTICS v_linked_seeds_known = ROW_COUNT;

    UPDATE course_seeds cs SET target1_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cs.course_code
        AND ca.text_normalized = normalize_text(cs.target_text)
        AND ca.role = 'target1'
      LIMIT 1
    )
    WHERE cs.course_code = p_course_code AND cs.target1_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cs.course_code
          AND ca.text_normalized = normalize_text(cs.target_text)
          AND ca.role = 'target1'
      );
    GET DIAGNOSTICS v_linked_seeds_t1 = ROW_COUNT;

    UPDATE course_seeds cs SET target2_audio_id = (
      SELECT ca.id FROM course_audio ca
      WHERE ca.course_code = cs.course_code
        AND ca.text_normalized = normalize_text(cs.target_text)
        AND ca.role = 'target2'
      LIMIT 1
    )
    WHERE cs.course_code = p_course_code AND cs.target2_audio_id IS NULL
      AND EXISTS (
        SELECT 1 FROM course_audio ca
        WHERE ca.course_code = cs.course_code
          AND ca.text_normalized = normalize_text(cs.target_text)
          AND ca.role = 'target2'
      );
    GET DIAGNOSTICS v_linked_seeds_t2 = ROW_COUNT;

    RETURN jsonb_build_object(
      'course_code', p_course_code,
      'legos', jsonb_build_object('known', v_linked_legos_known, 'target1', v_linked_legos_t1, 'target2', v_linked_legos_t2),
      'phrases', jsonb_build_object('known', v_linked_phrases_known, 'target1', v_linked_phrases_t1, 'target2', v_linked_phrases_t2),
      'seeds', jsonb_build_object('known', v_linked_seeds_known, 'target1', v_linked_seeds_t1, 'target2', v_linked_seeds_t2)
    );
  END;
  $function$;

-- ---------------------------------------------------------------------------
-- ROLLBACK (the pre-2026-08-04 body, verbatim from pg_get_functiondef).
-- Re-apply by uncommenting and running.
-- ---------------------------------------------------------------------------
-- CREATE OR REPLACE FUNCTION public.link_all_audio_ids(p_course_code text)
--  RETURNS jsonb
--  LANGUAGE plpgsql
-- AS $function$
--   ... identical to the above but with every
--       "AND EXISTS ( ... )" clause removed from the nine UPDATE statements.
--       Nothing else differed.
-- $function$;
--
-- DROP INDEX CONCURRENTLY IF EXISTS idx_cpp_unlinked_known_audio;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_cpp_unlinked_target1_audio;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_cpp_unlinked_target2_audio;
