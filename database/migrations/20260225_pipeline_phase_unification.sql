-- Pipeline Phase Unification
-- Unify all pipeline phases on build_jobs as single source of truth.
-- Adds 'gender-prep' as a valid pass, drops obsolete constraints/triggers,
-- migrates legacy pass_1/pass_2 rows, backfills completed phases.

BEGIN;

-- 1. Drop obsolete constraints
ALTER TABLE build_jobs DROP CONSTRAINT IF EXISTS pass_1_always_668;
DROP TRIGGER IF EXISTS enforce_pass_order ON build_jobs;
DROP FUNCTION IF EXISTS enforce_pass_order();

-- 2. Update pass CHECK to include all pipeline phases
ALTER TABLE build_jobs DROP CONSTRAINT IF EXISTS build_jobs_pass_check;
ALTER TABLE build_jobs ADD CONSTRAINT build_jobs_pass_check
  CHECK (pass IN ('translate', 'build-team', 'final-pass', 'gender-prep', 'decompose',
                  'pass_1', 'pass_2'));
-- Keep pass_1/pass_2 in CHECK so existing rows don't violate, but no new ones should be created.

-- 3. Migrate legacy pass_1 → decompose, pass_2 → final-pass
UPDATE build_jobs SET pass = 'decompose' WHERE pass = 'pass_1';
UPDATE build_jobs SET pass = 'final-pass' WHERE pass = 'pass_2';

-- 4. Now tighten the constraint (remove legacy values)
ALTER TABLE build_jobs DROP CONSTRAINT build_jobs_pass_check;
ALTER TABLE build_jobs ADD CONSTRAINT build_jobs_pass_check
  CHECK (pass IN ('translate', 'build-team', 'final-pass', 'gender-prep', 'decompose'));

-- 5. Backfill complete rows for courses that already finished final-pass
--    (from quality_rules.final_pass_completed = true)
INSERT INTO build_jobs (course_code, pass, status, total_seeds, completed_at)
SELECT
  c.course_code,
  'final-pass',
  'complete',
  COALESCE((SELECT COUNT(*) FROM course_seeds cs WHERE cs.course_code = c.course_code), 0),
  NOW()
FROM courses c
WHERE (c.quality_rules->>'final_pass_completed')::boolean = true
  AND NOT EXISTS (
    SELECT 1 FROM build_jobs bj
    WHERE bj.course_code = c.course_code AND bj.pass = 'final-pass' AND bj.status = 'complete'
  );

-- 6. Backfill complete rows for courses that already have gender expansions
INSERT INTO build_jobs (course_code, pass, status, total_seeds, completed_at)
SELECT
  cge.course_code,
  'gender-prep',
  'complete',
  COUNT(DISTINCT cge.original_text),
  MAX(cge.created_at)
FROM course_gender_expansions cge
GROUP BY cge.course_code
HAVING COUNT(*) > 0
  AND NOT EXISTS (
    SELECT 1 FROM build_jobs bj
    WHERE bj.course_code = cge.course_code AND bj.pass = 'gender-prep' AND bj.status = 'complete'
  );

COMMIT;
