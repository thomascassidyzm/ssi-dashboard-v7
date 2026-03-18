-- Add 'backfill-phrases' to allowed build_jobs pass values
ALTER TABLE build_jobs DROP CONSTRAINT IF EXISTS build_jobs_pass_check;
ALTER TABLE build_jobs ADD CONSTRAINT build_jobs_pass_check
  CHECK (pass IN ('translate', 'build-team', 'final-pass', 'gender-prep', 'decompose', 'backfill-phrases'));
