-- Every restored copy on the local cluster (ssi_copy_YYYYMMDD); refresh.sh drops all but the newest.
SELECT datname FROM pg_database WHERE datname LIKE 'ssi\_copy\_%' ORDER BY datname;
