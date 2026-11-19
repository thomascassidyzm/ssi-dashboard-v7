-- cs #950: both indexes — present? valid? size. Read-only.
SET statement_timeout = '30s';
SELECT c.relname AS index, i.indisvalid AS valid, i.indisready AS ready, pg_size_pretty(pg_relation_size(c.oid)) AS size
  FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
 WHERE c.relname IN ('idx_cpp_decomposition_path','idx_course_audio_course_role_normtext') ORDER BY 1;
SELECT pid, application_name, state, now() - query_start AS running, left(query, 80) AS query
  FROM pg_stat_activity WHERE query ILIKE '%CREATE INDEX%' AND pid <> pg_backend_pid();
