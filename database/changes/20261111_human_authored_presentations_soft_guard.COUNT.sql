-- Read-only row count for 20261111_human_authored_presentations_soft_guard, before or after it is applied.
-- to_jsonb(h)->>'guard' reads the column when it exists and NULL when it does not, so this runs either side.
SELECT count(*) AS rows,
       count(*) FILTER (WHERE to_jsonb(h)->>'guard' = 'hard') AS hard,
       count(*) FILTER (WHERE to_jsonb(h)->>'guard' = 'soft') AS soft,
       count(*) FILTER (WHERE to_jsonb(h)->>'guard' IS NULL) AS no_guard_column
  FROM public.human_authored_presentations h;
