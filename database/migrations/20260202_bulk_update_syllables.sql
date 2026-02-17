-- Migration: 20260202_bulk_update_syllables.sql
-- Purpose: Add bulk_update_syllables RPC function for efficient syllable count updates

-- Create the bulk_update_syllables function
CREATE OR REPLACE FUNCTION public.bulk_update_syllables(
  p_ids UUID[],
  p_syllables INTEGER[]
)
RETURNS void AS $$
DECLARE
  i INTEGER;
BEGIN
  -- Validate arrays are same length
  IF array_length(p_ids, 1) != array_length(p_syllables, 1) THEN
    RAISE EXCEPTION 'Arrays must be same length: % vs %',
      array_length(p_ids, 1), array_length(p_syllables, 1);
  END IF;

  -- Update each phrase with its syllable count
  FOR i IN 1 .. array_length(p_ids, 1)
  LOOP
    UPDATE course_practice_phrases
    SET target_syllable_count = p_syllables[i]
    WHERE id = p_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.bulk_update_syllables(UUID[], INTEGER[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_syllables(UUID[], INTEGER[]) TO service_role;
