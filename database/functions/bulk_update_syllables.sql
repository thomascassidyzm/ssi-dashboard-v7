-- Create PostgreSQL function for bulk syllable updates
-- This enables fast bulk updates via unnest() instead of individual UPDATE statements

CREATE OR REPLACE FUNCTION public.bulk_update_syllables(
  p_ids UUID[],
  p_syllables INTEGER[]
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Validate array lengths match
  IF array_length(p_ids, 1) != array_length(p_syllables, 1) THEN
    RAISE EXCEPTION 'Array lengths must match';
  END IF;

  -- Bulk update using unnest
  UPDATE course_practice_phrases AS cpp
  SET target_syllable_count = data.syllables
  FROM (
    SELECT
      unnest(p_ids) AS id,
      unnest(p_syllables) AS syllables
  ) AS data
  WHERE cpp.id = data.id;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.bulk_update_syllables(UUID[], INTEGER[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_syllables(UUID[], INTEGER[]) TO service_role;

-- Test the function (optional)
-- SELECT bulk_update_syllables(
--   ARRAY['uuid1'::UUID, 'uuid2'::UUID],
--   ARRAY[10, 12]
-- );
