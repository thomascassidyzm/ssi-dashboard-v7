-- Job #949 test: the high-water-mark ratchet follows the running order in a woven course and is
-- unchanged everywhere else. Touches NO real row: the live trigger function is attached to a TEMP
-- copy of course_enrollments, and the whole thing runs in a transaction that is rolled back.
-- Before 20261007_ratchet_follows_weave.sql: FAILS (woven case). After: PASSES.
\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE te (LIKE course_enrollments INCLUDING DEFAULTS);
CREATE TRIGGER te_ratchet BEFORE INSERT OR UPDATE ON te FOR EACH ROW EXECUTE FUNCTION ratchet_highest_completed_round();

-- Woven course: reach the block (S1001L01, position 138) then old S0138L01 (now after the block).
INSERT INTO te (learner_id, course_id, last_completed_lego_id, last_completed_round_index)
VALUES (gen_random_uuid(), 'cym_nv2_for_eng', 'S0137L01', 10);
UPDATE te SET last_completed_lego_id = 'S1001L01' WHERE course_id = 'cym_nv2_for_eng';
UPDATE te SET last_completed_lego_id = 'S0138L01' WHERE course_id = 'cym_nv2_for_eng';
-- Non-woven course: identical text-compare behaviour, including an earlier LEGO NOT lowering it.
INSERT INTO te (learner_id, course_id, last_completed_lego_id) VALUES (gen_random_uuid(), 'cym_n_for_eng', 'S0137L01');
UPDATE te SET last_completed_lego_id = 'S0200L02' WHERE course_id = 'cym_n_for_eng';
UPDATE te SET last_completed_lego_id = 'S0150L01' WHERE course_id = 'cym_n_for_eng';

DO $$
DECLARE w text; n text; bad bigint;
BEGIN
  SELECT highest_completed_lego_id INTO w FROM te WHERE course_id = 'cym_nv2_for_eng';
  SELECT highest_completed_lego_id INTO n FROM te WHERE course_id = 'cym_n_for_eng';
  IF n IS DISTINCT FROM 'S0200L02' THEN RAISE EXCEPTION 'FAIL: non-woven ratchet changed (got %)', n; END IF;
  IF w IS DISTINCT FROM 'S0138L01' THEN RAISE EXCEPTION 'FAIL: woven ratchet stuck on % (expected S0138L01)', w; END IF;
  -- Every pair of real cursor ids in every non-woven course: same answer as plain text compare.
  SELECT count(*) INTO bad FROM
    (SELECT DISTINCT course_id, last_completed_lego_id a FROM course_enrollments WHERE last_completed_lego_id IS NOT NULL) x
    JOIN (SELECT DISTINCT course_id, highest_completed_lego_id b FROM course_enrollments WHERE highest_completed_lego_id IS NOT NULL) y USING (course_id)
    WHERE course_id NOT IN (SELECT course_code FROM course_seed_weave)
      AND lego_id_is_later(course_id, a, b) IS DISTINCT FROM (a > b);
  IF bad <> 0 THEN RAISE EXCEPTION 'FAIL: % non-woven pairs disagree with text compare', bad; END IF;
  RAISE NOTICE 'PASS: woven ratchet follows running order; non-woven identical to text compare';
END $$;
ROLLBACK;
