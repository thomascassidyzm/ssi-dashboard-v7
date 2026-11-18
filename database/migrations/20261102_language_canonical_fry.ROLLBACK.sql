-- Undoes 20261102_language_canonical_fry.sql; the same DELETE its header names.
DELETE FROM language_canonical WHERE raw IN ('fry','fy') AND canonical = 'fry';
