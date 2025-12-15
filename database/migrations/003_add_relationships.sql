-- =============================================================================
-- Migration 003: Add Foreign Key Relationships for PostgREST
-- =============================================================================
-- Purpose: Enable PostgREST nested selects between tables
-- Date: 2025-12-15
--
-- Problem: course-data-service.cjs uses nested selects like:
--   .from('course_seeds')
--   .select('*, course_legos(*)')
--
-- But PostgREST requires explicit FK relationships to auto-detect joins.
-- The original schema used denormalized (course_code, seed_number) for performance
-- but didn't add FK relationships between child tables.
--
-- Solution: Add composite foreign keys that reference the parent tables.
--
-- Key Design Decisions:
--   1. ON DELETE CASCADE - When a parent is deleted, children auto-delete
--      This maintains referential integrity in our hierarchical course structure:
--      courses → course_seeds → course_legos → course_practice_phrases
--
--   2. Existing indexes are sufficient for FK performance:
--      - idx_course_legos_seed covers (course_code, seed_number)
--      - idx_course_practice_phrases_lego covers (course_code, seed_number, lego_index)
--      These indexes already exist and will be used by PostgreSQL for FK lookups
--
--   3. No additional FKs needed:
--      - All tables already have FK to courses(course_code) with ON DELETE CASCADE
--      - The missing piece was the composite FK between sibling tables
-- =============================================================================

-- =============================================================================
-- PREREQUISITE: Ensure unique constraints exist on parent tables
-- =============================================================================
-- PostgreSQL requires unique constraint on referenced columns for FK.
-- The schema already has UNIQUE(course_code, seed_number) on course_seeds
-- and UNIQUE(course_code, seed_number, lego_index) on course_legos.
-- This is just documentation - no action needed.

-- =============================================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- Constraint 1: course_legos → course_seeds
-- Links each LEGO to its parent seed using denormalized composite key
ALTER TABLE course_legos
ADD CONSTRAINT fk_course_legos_seed
FOREIGN KEY (course_code, seed_number)
REFERENCES course_seeds(course_code, seed_number)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT fk_course_legos_seed ON course_legos IS
'Links LEGO to parent seed. Cascade ensures LEGOs are deleted when seed is deleted.';

-- Constraint 2: course_practice_phrases → course_legos
-- Links each practice phrase to its parent LEGO using denormalized composite key
ALTER TABLE course_practice_phrases
ADD CONSTRAINT fk_course_practice_phrases_lego
FOREIGN KEY (course_code, seed_number, lego_index)
REFERENCES course_legos(course_code, seed_number, lego_index)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT fk_course_practice_phrases_lego ON course_practice_phrases IS
'Links practice phrase to parent LEGO. Cascade ensures phrases are deleted when LEGO is deleted.';

-- =============================================================================
-- VERIFICATION: Check indexes are being used for FK lookups
-- =============================================================================
-- The following indexes from 002_registry_schema.sql will be used by PostgreSQL
-- for FK constraint validation and JOIN performance:
--
-- For fk_course_legos_seed:
--   - idx_course_legos_seed ON course_legos(course_code, seed_number)
--     This index exactly matches the FK columns, providing optimal lookup performance
--
-- For fk_course_practice_phrases_lego:
--   - idx_course_practice_phrases_lego ON course_practice_phrases(course_code, seed_number, lego_index)
--     This index exactly matches the FK columns, providing optimal lookup performance
--
-- No additional indexes needed - the existing ones are perfect for FK performance.
-- =============================================================================

-- =============================================================================
-- POSTGREST BENEFITS
-- =============================================================================
-- After applying this migration, PostgREST will auto-detect these relationships:
--
-- 1. Nested select from seeds to legos:
--    GET /course_seeds?select=*,course_legos(*)&course_code=eq.spa_for_eng
--
-- 2. Nested select from legos to practice phrases:
--    GET /course_legos?select=*,course_practice_phrases(*)&course_code=eq.spa_for_eng
--
-- 3. Deep nested select (seeds → legos → phrases):
--    GET /course_seeds?select=*,course_legos(*,course_practice_phrases(*))&course_code=eq.spa_for_eng
--
-- 4. Reverse relationship (practice phrase → parent LEGO):
--    GET /course_practice_phrases?select=*,course_legos(*)&course_code=eq.spa_for_eng
--
-- PostgREST introspects the FK constraints to determine valid join paths.
-- =============================================================================

-- =============================================================================
-- REFERENTIAL INTEGRITY HIERARCHY
-- =============================================================================
-- The complete deletion cascade hierarchy:
--
-- courses (PK: course_code)
--   ↓ ON DELETE CASCADE
--   course_seeds (FK: course_code)
--     ↓ ON DELETE CASCADE  [NEW - added by this migration]
--     course_legos (FK: course_code, seed_number)
--       ↓ ON DELETE CASCADE  [NEW - added by this migration]
--       course_practice_phrases (FK: course_code, seed_number, lego_index)
--
-- Example: Deleting 'spa_for_eng' from courses will cascade delete:
--   1. All seeds for spa_for_eng
--   2. All legos for those seeds (via new FK)
--   3. All practice phrases for those legos (via new FK)
--
-- This ensures referential integrity without orphaned records.
-- =============================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 003 completed: Foreign key relationships added';
    RAISE NOTICE '';
    RAISE NOTICE 'Added constraints:';
    RAISE NOTICE '  - fk_course_legos_seed: course_legos → course_seeds (course_code, seed_number)';
    RAISE NOTICE '  - fk_course_practice_phrases_lego: course_practice_phrases → course_legos (course_code, seed_number, lego_index)';
    RAISE NOTICE '';
    RAISE NOTICE 'Cascade behavior:';
    RAISE NOTICE '  - Deleting a seed will cascade delete its LEGOs';
    RAISE NOTICE '  - Deleting a LEGO will cascade delete its practice phrases';
    RAISE NOTICE '';
    RAISE NOTICE 'PostgREST nested selects enabled:';
    RAISE NOTICE '  - /course_seeds?select=*,course_legos(*)';
    RAISE NOTICE '  - /course_legos?select=*,course_practice_phrases(*)';
    RAISE NOTICE '  - /course_seeds?select=*,course_legos(*,course_practice_phrases(*))';
    RAISE NOTICE '';
    RAISE NOTICE 'Existing indexes will be used for FK performance (no new indexes needed)';
END $$;
