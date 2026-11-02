-- Undoes 20261102_language_canonical_bre_cor.sql; the same DELETE its header names.
DELETE FROM language_canonical WHERE (raw, canonical) IN (('bre','bre'), ('cor','cor'));
