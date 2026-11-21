-- Who wrote course content in a time window: content_edit_events between :'from' and :'to'.
-- READ-ONLY, and for the NIGHTLY QA COPY only (Tom 2026-11-05: lookups never run on live). Usage:
--   set -a; . ~/ssi-restore/qa-copy.env; set +a
--   psql "$DATABASE_URL" -X -v from='2026-11-18T23:00Z' -v to='2026-11-18T23:20Z' -f tools/qa-copy/edit-events-window.sql
-- Written for cs #888 (the ungoverned 23:06-23:12Z edit batch): the actor label is the only place a
-- caller's identity survives, and the API log that names it carries no timestamps.
SELECT occurred_at, course_code, operation, surface, actor_kind, actor_id, actor_label, actor_role,
       actor_verified, request_id,
       CASE WHEN jsonb_typeof(scope->'lego_ids') = 'array' THEN jsonb_array_length(scope->'lego_ids') ELSE 0 END AS legos,
       CASE WHEN jsonb_typeof(scope->'phrase_ids') = 'array' THEN jsonb_array_length(scope->'phrase_ids') ELSE 0 END AS phrases,
       scope->'seed_numbers' AS seeds,
       id
  FROM public.content_edit_events
 WHERE occurred_at >= :'from'::timestamptz AND occurred_at < :'to'::timestamptz
 ORDER BY occurred_at;
