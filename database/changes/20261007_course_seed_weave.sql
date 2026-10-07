-- A course's RUNNING ORDER separate from its seed ids (job #949, Aran 2026-10-07; design: scout #911).
--
-- Seed ids never change (Tom, Aran: vital). A course that wants a block of new seeds played
-- somewhere other than "after the last seed number" gets ONE row in course_seed_weave:
--
--   insert_after  the old seed after which the block plays (137; 257 is the panic switch)
--   block_start   seed numbers >= this are the block (1000: Hadau Creiddiol seed N = id 1000+N)
--
-- and any seeds it has decided not to play get a row in course_seed_weave_drops. A dropped seed
-- is EXCLUDED from the running order, never deleted.
--
-- course_running_order gives every kept seed of a woven course its position:
--   old seed n <= insert_after  -> first, in id order
--   block seed (id >= block_start) -> next, in id order
--   old seed n >  insert_after  -> last, in id order
-- (positions are contiguous 1..N over KEPT seeds). A course with no weave row has NO rows in
-- this view, and every reader falls back to seed_number - which is exactly today's behaviour.
-- That fallback is the whole safety argument: every other course is untouched.
--
-- ADDITIVE ONLY: two new tables and one new view. No existing table or view is altered here.
--   ROLLBACK: database/changes/20261007_course_seed_weave.ROLLBACK.sql
BEGIN;

CREATE TABLE IF NOT EXISTS course_seed_weave (
  course_code  text PRIMARY KEY REFERENCES courses(course_code) ON DELETE CASCADE,
  insert_after integer NOT NULL CHECK (insert_after >= 0),
  block_start  integer NOT NULL DEFAULT 1000 CHECK (block_start > insert_after),
  set_by       text NOT NULL CHECK (btrim(set_by) <> ''),
  set_at       timestamptz NOT NULL DEFAULT now(),
  note         text
);

CREATE TABLE IF NOT EXISTS course_seed_weave_drops (
  course_code text NOT NULL,
  seed_number integer NOT NULL,
  reason      text NOT NULL CHECK (btrim(reason) <> ''),
  decided_by  text NOT NULL CHECK (btrim(decided_by) <> ''),
  decided_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_code, seed_number),
  -- NO ACTION on update: a dropped seed can no more be renumbered than a kept one.
  FOREIGN KEY (course_code, seed_number) REFERENCES course_seeds(course_code, seed_number) ON DELETE CASCADE
);

CREATE OR REPLACE VIEW course_running_order WITH (security_invoker = true) AS
WITH kept AS (
  SELECT s.course_code, s.seed_number,
         CASE WHEN s.seed_number >= w.block_start THEN 1
              WHEN s.seed_number <= w.insert_after THEN 0
              ELSE 2 END AS grp
  FROM course_seed_weave w
  JOIN course_seeds s ON s.course_code = w.course_code
  WHERE NOT EXISTS (SELECT 1 FROM course_seed_weave_drops d
                    WHERE d.course_code = s.course_code AND d.seed_number = s.seed_number)
)
SELECT course_code,
       seed_number,
       row_number() OVER (PARTITION BY course_code ORDER BY grp, seed_number)::integer AS position,
       (grp = 1) AS in_block
FROM kept;

COMMENT ON VIEW course_running_order IS
  'Running order of KEPT seeds for courses with a course_seed_weave row (job #949). No row for a course = order by seed_number, as always.';

ALTER TABLE course_seed_weave       ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_seed_weave_drops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS course_seed_weave_public_read       ON course_seed_weave;
DROP POLICY IF EXISTS course_seed_weave_drops_public_read ON course_seed_weave_drops;
CREATE POLICY course_seed_weave_public_read       ON course_seed_weave       FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY course_seed_weave_drops_public_read ON course_seed_weave_drops FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON course_seed_weave, course_seed_weave_drops, course_running_order FROM anon, authenticated;
GRANT SELECT ON course_seed_weave, course_seed_weave_drops, course_running_order TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON course_seed_weave, course_seed_weave_drops TO service_role;
GRANT SELECT ON course_running_order TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
