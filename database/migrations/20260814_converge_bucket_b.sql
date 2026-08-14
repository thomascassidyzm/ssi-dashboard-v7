\set ON_ERROR_STOP on
SET statement_timeout=0;
-- Triggers suppressed for the bulk write, on purpose and with the consequences
-- handled explicitly below:
--   * trg_course_audio_normalize would re-key legacy rows (already excluded, but
--     belt and braces);
--   * course_audio_touch_audio_stamp fires PER ROW and updates one of only 97
--     course rows, so 202,917 fires would mean 202,917 row versions of those 97
--     rows. audio_stamp is bumped ONCE per affected course after the write —
--     same cache-invalidation outcome, a fraction of the cost;
--   * content_audit_log is replaced by audio_convergence_log, which is strictly
--     better evidence: it names the pass, which content_audit_log cannot.
SET session_replication_role = replica;

DO $$
DECLARE b int := 0; max_b int; moved bigint; total bigint := 0;
BEGIN
  SELECT max(batch_no) INTO max_b FROM _converge_set;
  WHILE b <= max_b LOOP
    INSERT INTO audio_convergence_log
      (audio_id, course_code, old_s3_key, new_s3_key, old_duration_ms, new_duration_ms, bucket, pass)
    SELECT s.audio_id, s.course_code, ca.s3_key, s.canon_s3_key, ca.duration_ms, s.canon_duration_ms,
           'b_stale_duplicate', 'converge-2026-08-14'
    FROM _converge_set s JOIN course_audio ca ON ca.id = s.audio_id
    WHERE s.batch_no = b AND ca.s3_key <> s.canon_s3_key;

    UPDATE course_audio ca
    SET s3_key          = s.canon_s3_key,
        duration_ms     = s.canon_duration_ms,
        file_size_bytes = s.canon_file_size,
        word_boundaries = s.canon_word_boundaries,
        audio_revision  = ca.audio_revision + 1
    FROM _converge_set s
    WHERE s.batch_no = b AND ca.id = s.audio_id AND ca.s3_key <> s.canon_s3_key;

    GET DIAGNOSTICS moved = ROW_COUNT;
    total := total + moved;
    COMMIT;
    RAISE NOTICE 'batch %/% converged % (total %)', b, max_b, moved, total;
    b := b + 1;
  END LOOP;
  RAISE NOTICE 'CONVERGE DONE: % rows', total;
END $$;

RESET session_replication_role;

-- One stamp bump per affected course: what the per-row trigger would have
-- achieved, done once. This is the learner-facing cache invalidation.
UPDATE courses SET audio_stamp = now()
WHERE course_code IN (SELECT DISTINCT course_code FROM _converge_set);
