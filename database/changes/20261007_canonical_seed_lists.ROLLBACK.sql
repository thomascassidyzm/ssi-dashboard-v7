-- Undo 20261007_canonical_seed_lists.sql (+ its Welsh North sandbox population).
-- Unassigning alone (step 1) returns every course to canonical_seeds; step 2 removes the tables.
BEGIN;
DELETE FROM canonical_list_assignments;            -- 1. every course back on canonical_seeds
DROP TABLE IF EXISTS canonical_list_assignments;   -- 2. remove the feature entirely
DROP TABLE IF EXISTS canonical_list_seeds;
DROP TABLE IF EXISTS canonical_seed_lists;
COMMIT;
NOTIFY pgrst, 'reload schema';
