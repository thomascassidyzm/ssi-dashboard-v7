-- Rollback for 20261013_lego_proof_flags.sql. Drops Aran's proofing flags with it: export them first
-- (the page's "Export flags", or: SELECT * FROM lego_proof_flags).
BEGIN;
DROP TABLE IF EXISTS lego_proof_flags;
COMMIT;
NOTIFY pgrst, 'reload schema';
