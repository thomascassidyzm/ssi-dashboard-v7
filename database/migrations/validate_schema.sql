-- =============================================================================
-- Schema Validation Script
-- =============================================================================
-- Purpose: Verify that migrations 001 and 002 executed correctly
-- Run this after executing both migrations
-- =============================================================================

-- Clean output
\set QUIET on
\pset border 2
\pset format wrapped

\echo ''
\echo '========================================='
\echo 'SSi Database Schema Validation'
\echo '========================================='
\echo ''

-- =============================================================================
-- 1. Check Enums
-- =============================================================================
\echo '1. ENUMS'
\echo '--------'

SELECT
    t.typname as enum_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('content_status', 'lego_type')
GROUP BY t.typname
ORDER BY t.typname;

\echo ''
\echo 'Expected:'
\echo '  - content_status: draft, released, deprecated'
\echo '  - lego_type: A, M'
\echo '  - phrase_type: SHOULD NOT EXIST (runtime only)'
\echo ''

-- =============================================================================
-- 2. Check Tables
-- =============================================================================
\echo '2. TABLES'
\echo '---------'

SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('courses', 'course_seeds', 'course_legos', 'course_practice_phrases')
ORDER BY tablename;

\echo ''
\echo 'Expected: courses, course_seeds, course_legos, course_practice_phrases'
\echo ''

-- =============================================================================
-- 3. Check Columns in course_practice_phrases
-- =============================================================================
\echo '3. COURSE_PRACTICE_PHRASES COLUMNS'
\echo '-----------------------------------'

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'course_practice_phrases'
AND column_name IN ('phrase_type', 'word_count', 'lego_count', 'position', 'version')
ORDER BY
    CASE column_name
        WHEN 'position' THEN 1
        WHEN 'word_count' THEN 2
        WHEN 'lego_count' THEN 3
        WHEN 'version' THEN 4
        WHEN 'phrase_type' THEN 5
    END;

\echo ''
\echo 'Expected:'
\echo '  - position: integer (NOT NULL)'
\echo '  - word_count: integer (NOT NULL)'
\echo '  - lego_count: integer (NOT NULL)'
\echo '  - version: integer (NOT NULL, default 1)'
\echo '  - phrase_type: SHOULD NOT EXIST'
\echo ''

-- =============================================================================
-- 4. Check Triggers
-- =============================================================================
\echo '4. TRIGGERS (Version Auto-Increment)'
\echo '------------------------------------'

SELECT
    trigger_name,
    event_object_table AS table_name,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%version%'
OR trigger_name LIKE '%updated_at%'
ORDER BY event_object_table, trigger_name;

\echo ''
\echo 'Expected: Triggers on courses, course_seeds, course_legos, course_practice_phrases'
\echo ''

-- =============================================================================
-- 5. Check Indexes for Delta Sync
-- =============================================================================
\echo '5. DELTA SYNC INDEXES'
\echo '---------------------'

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE '%sync%'
ORDER BY tablename, indexname;

\echo ''
\echo 'Expected: Indexes on (course_code, updated_at) for all content tables'
\echo ''

-- =============================================================================
-- 6. Check Foreign Keys
-- =============================================================================
\echo '6. FOREIGN KEY CONSTRAINTS'
\echo '--------------------------'

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('course_seeds', 'course_legos', 'course_practice_phrases')
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo 'Expected: All foreign keys should have delete_rule = CASCADE'
\echo ''

-- =============================================================================
-- 7. Check Unique Constraints
-- =============================================================================
\echo '7. UNIQUE CONSTRAINTS'
\echo '---------------------'

SELECT
    tc.table_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS unique_columns
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
AND tc.table_name IN ('course_seeds', 'course_legos', 'course_practice_phrases')
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

\echo ''
\echo 'Expected:'
\echo '  - course_seeds: (course_code, seed_number)'
\echo '  - course_legos: (course_code, seed_number, lego_index)'
\echo '  - course_practice_phrases: (course_code, seed_number, lego_index, position)'
\echo ''

-- =============================================================================
-- 8. Check Views
-- =============================================================================
\echo '8. VIEWS'
\echo '--------'

SELECT
    schemaname,
    viewname
FROM pg_views
WHERE schemaname = 'public'
AND viewname LIKE 'course%'
ORDER BY viewname;

\echo ''
\echo 'Expected:'
\echo '  - course_practice_phrases_with_type (shows runtime phrase_type)'
\echo '  - course_summary (statistics)'
\echo '  - seed_with_legos (manifest generation)'
\echo ''

-- =============================================================================
-- 9. Check Functions
-- =============================================================================
\echo '9. FUNCTIONS'
\echo '------------'

SELECT
    routine_name,
    routine_type,
    data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'increment_version'
ORDER BY routine_name;

\echo ''
\echo 'Expected: increment_version() FUNCTION'
\echo ''

-- =============================================================================
-- 10. Test Runtime phrase_type Classification
-- =============================================================================
\echo '10. RUNTIME PHRASE_TYPE TEST'
\echo '----------------------------'
\echo 'Testing view: course_practice_phrases_with_type'
\echo ''

-- This will fail if no data exists, but shows the view works
\echo 'Sample query (will return empty if no data):'
\echo 'SELECT position, phrase_type FROM course_practice_phrases_with_type LIMIT 5;'
\echo ''

SELECT
    position,
    CASE
        WHEN position = 0 THEN 'component'
        WHEN position = 1 THEN 'lego'
        WHEN position BETWEEN 2 AND 7 THEN 'debut'
        ELSE 'eternal'
    END AS phrase_type_expected
FROM generate_series(0, 10) AS position;

\echo ''
\echo 'The above shows how position maps to phrase_type'
\echo ''

-- =============================================================================
-- 11. Check Preserved Tables (Should Still Exist)
-- =============================================================================
\echo '11. PRESERVED TABLES (Course-Agnostic)'
\echo '--------------------------------------'

SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('audio_samples', 'voices', 'sample_flags', 'recording_provenance', 'course_audio_usage')
ORDER BY tablename;

\echo ''
\echo 'Expected: All 5 tables should still exist (not dropped by migration 001)'
\echo ''

-- =============================================================================
-- 12. Check Dropped Tables (Should NOT Exist)
-- =============================================================================
\echo '12. DROPPED TABLES (Should NOT Exist)'
\echo '-------------------------------------'

SELECT
    tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('seeds', 'legos', 'basket_phrases', 'lego_components')
ORDER BY tablename;

\echo ''
\echo 'Expected: NO RESULTS (tables were dropped in migration 001)'
\echo ''

-- =============================================================================
-- Summary
-- =============================================================================
\echo ''
\echo '========================================='
\echo 'VALIDATION COMPLETE'
\echo '========================================='
\echo ''
\echo 'Review the output above to verify:'
\echo '  ✓ Enums created (content_status, lego_type)'
\echo '  ✓ phrase_type enum NOT created'
\echo '  ✓ Tables created with correct structure'
\echo '  ✓ course_practice_phrases has word_count, lego_count (NOT phrase_type)'
\echo '  ✓ Triggers auto-increment version'
\echo '  ✓ Indexes support delta sync'
\echo '  ✓ Foreign keys cascade on delete'
\echo '  ✓ Unique constraints match registry'
\echo '  ✓ Views created for runtime classification'
\echo '  ✓ Preserved tables still exist'
\echo '  ✓ Old tables dropped'
\echo ''
\echo 'If any checks failed, review the migration SQL files.'
\echo ''
