-- Rollback for 20261013_phrase_proof_flags.sql. Drops Aran's phrase proofing flags with it: export them first
-- (the page's "Export flags", or: SELECT * FROM phrase_proof_flags).
BEGIN;
DROP TABLE IF EXISTS phrase_proof_flags;
COMMIT;
NOTIFY pgrst, 'reload schema';
