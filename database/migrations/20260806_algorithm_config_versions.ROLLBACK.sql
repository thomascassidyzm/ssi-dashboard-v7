-- Rollback for 20260806_algorithm_config_versions.sql
--
-- The forward migration is purely additive — it never touched algorithm_config,
-- so undoing it is dropping the two new tables and nothing else. No live read
-- path depends on them at the moment they are dropped: algorithm_config is
-- still the published value, exactly as before.
--
-- WHAT THIS COSTS. Dropping algorithm_config_versions destroys the config
-- history, which is the whole point of the forward migration and is NOT
-- recoverable from anywhere else — algorithm_config keeps only the current
-- value. Before running this against anything real, dump the two tables:
--
--   COPY (SELECT * FROM algorithm_config_versions) TO STDOUT WITH (FORMAT csv, HEADER);
--   COPY (SELECT * FROM algorithm_config_pointers) TO STDOUT WITH (FORMAT csv, HEADER);
--
-- Pointers are dropped first: it holds the FK into versions.

BEGIN;

DROP TABLE IF EXISTS algorithm_config_pointers;
DROP TABLE IF EXISTS algorithm_config_versions;

COMMIT;
