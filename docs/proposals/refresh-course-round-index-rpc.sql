-- PROPOSAL — NOT APPLIED. Written 2026-07-14, parked pending a decision on
-- whether/how to expose this. Do not run against the live DB without
-- confirming scope (who should be able to call it, and whether course_code
-- scoping is worth adding) first.
--
-- Context: course_round_index (materialized view over course_legos) has no
-- trigger/RPC keeping it in sync with manual course_legos surgery. Today the
-- only fix is shell + DATABASE_URL access (tools/refresh-round-index.cjs),
-- which only machines with .env.psql can run. This RPC would let the same
-- refresh be triggered by anyone holding the service-role key (e.g. from a
-- dashboard admin action) without needing psql/DATABASE_URL at all — see
-- docs/kai-machine-db-setup.md for why that matters.
--
-- Convention note: this repo's live migration history is applied directly
-- via psql, not tracked as files here (see database/migrations/README.md —
-- that directory is archived). This file is deliberately NOT in
-- database/migrations/ for that reason; it's a proposal to review, then
-- apply directly and record in the ssi-learning-app schema.sql snapshot.

CREATE OR REPLACE FUNCTION refresh_course_round_index()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
END;
$$;

-- Restrict to service role only — never anon/authenticated (this refreshes
-- estate-wide, no per-course RLS scoping, and matview refresh is not free).
REVOKE ALL ON FUNCTION refresh_course_round_index() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_course_round_index() TO service_role;
