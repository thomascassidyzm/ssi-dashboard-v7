-- Template mode: allow NULL known_text for template courses (target-only decompositions)
-- These are idempotent — DROP NOT NULL on an already-nullable column is a no-op.

ALTER TABLE course_seeds ALTER COLUMN known_text DROP NOT NULL;
ALTER TABLE course_legos ALTER COLUMN known_text DROP NOT NULL;
ALTER TABLE course_practice_phrases ALTER COLUMN known_text DROP NOT NULL;
