-- cs #950: runs the cs #945 migration 20261119_cpp_decomposition_gin_idx.sql with a short lock wait and a long
-- build allowance (outside any transaction: CREATE INDEX CONCURRENTLY refuses one), then reports validity.
SET lock_timeout = '10s';
SET statement_timeout = '90min';
\i database/migrations/20261119_cpp_decomposition_gin_idx.sql
SELECT c.relname AS index, i.indisvalid AS valid, pg_size_pretty(pg_relation_size(c.oid)) AS size
  FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
 WHERE c.relname = 'idx_cpp_decomposition_path';
