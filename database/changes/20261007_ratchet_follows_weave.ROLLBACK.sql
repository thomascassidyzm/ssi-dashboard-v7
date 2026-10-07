-- Rollback for 20261007_ratchet_follows_weave.sql (job #949): the trigger function exactly as it was.
BEGIN;
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
  -- Lexicographic on the zero-padded SNNNNLNN format. A "backwards"
  -- lego_id cursor write (e.g. an infinite-play round whose primaryLegoKey
  -- is an earlier LEGO) no longer drags the ceiling down with it.
  IF explicit_lego_reset THEN
    NEW.highest_completed_lego_id := NULL;
  ELSIF NEW.last_completed_lego_id IS NOT NULL AND
     (prev_high_lego IS NULL OR NEW.last_completed_lego_id > prev_high_lego) THEN
    NEW.highest_completed_lego_id := NEW.last_completed_lego_id;
  ELSE
    NEW.highest_completed_lego_id := prev_high_lego;
  END IF;

  RETURN NEW;
END;
$function$;
DROP FUNCTION IF EXISTS lego_id_is_later(text, text, text);
COMMIT;
