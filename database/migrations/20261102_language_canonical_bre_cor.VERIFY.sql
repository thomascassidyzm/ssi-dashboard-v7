-- Read-only check for 20261102_language_canonical_bre_cor.sql. Columns must read bre, cor.
SELECT canonical_language('bre') AS bre, canonical_language('cor') AS cor;
