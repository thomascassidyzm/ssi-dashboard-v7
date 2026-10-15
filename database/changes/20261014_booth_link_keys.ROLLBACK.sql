-- Rollback for 20261014_booth_link_keys.sql (job #380). Every private booth link stops working; with
-- BOOTH_LINK_GRACE on, booths still open on bare id-only links.
BEGIN;
DROP TABLE IF EXISTS booth_link_keys;
COMMIT;
NOTIFY pgrst, 'reload schema';
