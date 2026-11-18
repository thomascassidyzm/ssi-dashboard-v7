-- Read-only check for 20261102_language_canonical_fry.sql. Both columns must read fry.
SELECT canonical_language('fry') AS fry, canonical_language('fy') AS fy;
