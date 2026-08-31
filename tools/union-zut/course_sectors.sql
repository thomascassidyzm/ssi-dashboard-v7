-- THE SECTOR REGISTRY — written, DELIBERATELY NOT APPLIED.
--
-- Schema verbatim from the sector-helix design (2026-08-31, §5). It is not run
-- against the live database by this build: nobody has approved a schema change,
-- and the union gate does not need one. `resolveCourseFamily` reads this table
-- when it exists, treats a missing table as "no family", and takes injected rows
-- for tests and demonstrations — so the gate is honest and testable today and
-- needs no rewrite the day the table lands.
--
-- Apply with: psql "$DATABASE_URL" -f tools/union-zut/course_sectors.sql

CREATE TABLE IF NOT EXISTS course_sectors (
  base_course_code    text NOT NULL,
  sector_slug         text NOT NULL,
  sector_course_code  text NOT NULL PRIMARY KEY,
  roles               jsonb NOT NULL DEFAULT '[]'::jsonb,
  role_map            jsonb NOT NULL DEFAULT '{}'::jsonb,
  core_anchor_lego_id text,            -- 'S0040L02' — the core position the segment is authored against
  sector_pod_slug     text,
  status              text NOT NULL DEFAULT 'draft',   -- draft | live
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base_course_code, sector_slug)
);

CREATE INDEX IF NOT EXISTS course_sectors_base_idx ON course_sectors (base_course_code);

COMMENT ON TABLE course_sectors IS
  'A sector segment is its own course code but one course to the learner. This table is what makes the course-builder ZUT gate read the whole family (services/course-builder/lib/course-family.cjs) and what bounds the segment''s vocabulary window to the base course up to core_anchor_lego_id.';
