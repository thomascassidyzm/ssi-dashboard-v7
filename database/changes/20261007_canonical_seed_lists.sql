-- Course-specific canonical seed lists (job #903, Aran's ruling 2026-10-07: "we want a custom,
-- separate version of the canonical list for the Welsh courses ... and we need to make sure it
-- doesn't impact on any other course").
--
-- ADDITIVE ONLY. canonical_seeds is not altered, renumbered or written. The courses table is
-- not altered: assignment lives in its own table, so a course with no row in
-- canonical_list_assignments reads canonical_seeds exactly as before. Resolver:
-- services/course-builder/lib/canonical-source.cjs.
--
-- More than one list can exist (Welsh North and South will diverge).
-- A list is COMPLETE for the course assigned to it: a seed number with no row, or with
-- source_text = '', is an EMPTY canonical slot — it never falls back to canonical_seeds.
--
--   ROLLBACK: database/changes/20261007_canonical_seed_lists.ROLLBACK.sql
BEGIN;

CREATE TABLE IF NOT EXISTS canonical_seed_lists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  created_by  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS canonical_list_seeds (
  list_id     uuid NOT NULL REFERENCES canonical_seed_lists(id) ON DELETE CASCADE,
  seed_number integer NOT NULL CHECK (seed_number > 0),
  source_text text NOT NULL DEFAULT '',   -- '' = deliberately empty slot
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, seed_number)
);

CREATE TABLE IF NOT EXISTS canonical_list_assignments (
  course_code text PRIMARY KEY REFERENCES courses(course_code) ON DELETE CASCADE,
  list_id     uuid NOT NULL REFERENCES canonical_seed_lists(id) ON DELETE RESTRICT,
  assigned_by text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS canonical_list_assignments_list ON canonical_list_assignments (list_id);

-- RLS posture matches canonical_seeds: RLS on, public SELECT for anon+authenticated, no write
-- policy (writes are service_role / postgres only, which bypass RLS).
ALTER TABLE canonical_seed_lists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_list_seeds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_list_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS canonical_seed_lists_public_read       ON canonical_seed_lists;
DROP POLICY IF EXISTS canonical_list_seeds_public_read       ON canonical_list_seeds;
DROP POLICY IF EXISTS canonical_list_assignments_public_read ON canonical_list_assignments;
CREATE POLICY canonical_seed_lists_public_read       ON canonical_seed_lists       FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY canonical_list_seeds_public_read       ON canonical_list_seeds       FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY canonical_list_assignments_public_read ON canonical_list_assignments FOR SELECT TO anon, authenticated USING (true);

-- Grants match canonical_seeds: anon/authenticated read-only; service_role full.
REVOKE ALL ON canonical_seed_lists, canonical_list_seeds, canonical_list_assignments FROM anon, authenticated;
GRANT SELECT ON canonical_seed_lists, canonical_list_seeds, canonical_list_assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON canonical_seed_lists, canonical_list_seeds, canonical_list_assignments TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
