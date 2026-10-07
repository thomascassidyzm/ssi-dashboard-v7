-- highest_completed_lego_id follows a course's running order when it has one (job #949).
--
-- The ratchet lifted highest_completed_lego_id by TEXT compare ("S1001L01" > "S0138L01"), so in a
-- woven course (course_seed_weave) a learner who reached the block at position 138 would have
-- their high-water mark stuck on S1xxx for ever. lego_id_is_later() is the one rule:
--   * course WITHOUT a weave row  -> a > b, the exact expression the trigger always used;
--   * woven course -> compare (running-order position of the LEGO's seed, LEGO index); if either
--     id cannot be placed (unparsable, or a dropped seed) it falls back to a > b.
-- The rest of the trigger function is unchanged, byte for byte.
--   ROLLBACK: database/changes/20261007_ratchet_follows_weave.ROLLBACK.sql
BEGIN;

CREATE OR REPLACE FUNCTION lego_id_is_later(p_course text, a text, b text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $fn$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM course_seed_weave w WHERE w.course_code = p_course) THEN a > b
    ELSE coalesce(
      (SELECT (oa.position, substring(a FROM 'L([0-9]{2})$')::int) > (ob.position, substring(b FROM 'L([0-9]{2})$')::int)
       FROM course_running_order oa, course_running_order ob
       WHERE oa.course_code = p_course AND oa.seed_number = substring(a FROM 'S([0-9]{4})L[0-9]{2}$')::int
         AND ob.course_code = p_course AND ob.seed_number = substring(b FROM 'S([0-9]{4})L[0-9]{2}$')::int),
      a > b)
  END
$fn$;
COMMENT ON FUNCTION lego_id_is_later(text, text, text) IS
  'Is LEGO a later than LEGO b in this course? Running-order position when the course has a course_seed_weave row, else plain text compare (job #949).';

CREATE OR REPLACE FUNCTION public.ratchet_highest_completed_round()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  prev_high_round INTEGER;
  prev_high_lego TEXT;
  explicit_round_reset BOOLEAN;
  explicit_lego_reset BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    prev_high_round := NULL;
    prev_high_lego := NULL;
    explicit_round_reset := FALSE;
    explicit_lego_reset := FALSE;
  ELSE
    prev_high_round := OLD.highest_completed_round_index;
    prev_high_lego  := OLD.highest_completed_lego_id;
    -- Captured before any assignment below touches NEW.highest_*.
    explicit_round_reset := (NEW.highest_completed_round_index IS NULL);
    explicit_lego_reset  := (NEW.highest_completed_lego_id IS NULL);
  END IF;

  -- round_index: lift if the cursor moved forward, or honor an explicit reset.
  IF explicit_round_reset THEN
    NEW.highest_completed_round_index := NULL;
  ELSIF NEW.last_completed_round_index IS NOT NULL AND
     (prev_high_round IS NULL OR NEW.last_completed_round_index > prev_high_round) THEN
    NEW.highest_completed_round_index := NEW.last_completed_round_index;
  ELSE
    NEW.highest_completed_round_index := prev_high_round;
  END IF;

  -- lego_id: lift INDEPENDENTLY of round_index, or honor an explicit reset.
  -- Lexicographic on the zero-padded SNNNNLNN format, via lego_id_is_later(), which is
  -- exactly that for every course without a running order (job #949). A "backwards"
  -- lego_id cursor write (e.g. an infinite-play round whose primaryLegoKey
  -- is an earlier LEGO) no longer drags the ceiling down with it.
  IF explicit_lego_reset THEN
    NEW.highest_completed_lego_id := NULL;
  ELSIF NEW.last_completed_lego_id IS NOT NULL AND
     (prev_high_lego IS NULL OR lego_id_is_later(NEW.course_id, NEW.last_completed_lego_id, prev_high_lego)) THEN
    NEW.highest_completed_lego_id := NEW.last_completed_lego_id;
  ELSE
    NEW.highest_completed_lego_id := prev_high_lego;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;
