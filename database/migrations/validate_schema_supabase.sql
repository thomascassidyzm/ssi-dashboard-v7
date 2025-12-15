-- =============================================================================
-- Schema Validation Script (Supabase SQL Editor Compatible)
-- =============================================================================
-- Run this after executing migrations 001 and 002
-- Each query should be run separately in Supabase SQL Editor
-- Updated: 2025-12-15 (post design principles review)
-- =============================================================================

-- 1. CHECK ENUMS
-- Expected: content_status (draft, released, deprecated), lego_type (A, M)
-- NOTE: NO phrase_type enum - it's computed at runtime from word_count/position
SELECT
    t.typname as enum_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('content_status', 'lego_type')
GROUP BY t.typname
ORDER BY t.typname;

-- 2. CHECK TABLES EXIST
-- Expected: courses, course_seeds, course_legos, course_practice_phrases
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('courses', 'course_seeds', 'course_legos', 'course_practice_phrases')
ORDER BY tablename;

-- 3. CHECK course_practice_phrases COLUMNS
-- Expected: position, word_count, lego_count, version
-- NOT expected: phrase_type (computed at runtime, not stored)
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'course_practice_phrases'
ORDER BY ordinal_position;

-- 4. CHECK TRIGGERS (version auto-increment)
SELECT
    trigger_name,
    event_object_table AS table_name,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%version%'
OR trigger_name LIKE '%updated_at%'
ORDER BY event_object_table, trigger_name;

-- 5. CHECK DELTA SYNC INDEXES
SELECT
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND (indexname LIKE '%sync%' OR indexname LIKE '%updated_at%')
ORDER BY tablename, indexname;

-- 6. CHECK UNIQUE CONSTRAINTS
SELECT
    tc.table_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS unique_columns
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
AND tc.table_name IN ('course_seeds', 'course_legos', 'course_practice_phrases')
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- 7. CHECK VIEWS
SELECT viewname
FROM pg_views
WHERE schemaname = 'public'
AND viewname LIKE 'course%'
ORDER BY viewname;

-- 8. CHECK increment_version FUNCTION EXISTS
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'increment_version';

-- 9. CHECK PRESERVED TABLES (should still exist from before migration)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('audio_samples', 'voices', 'sample_flags')
ORDER BY tablename;

-- 10. CHECK OLD TABLES DROPPED
-- This should return NO rows
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('seeds', 'legos', 'basket_phrases', 'lego_components')
ORDER BY tablename;

-- 11. TEST RUNTIME PHRASE_TYPE CLASSIFICATION (shows the mapping)
SELECT
    position,
    CASE
        WHEN position = 0 THEN 'component'
        WHEN position = 1 THEN 'lego'
        WHEN position BETWEEN 2 AND 7 THEN 'debut'
        ELSE 'eternal'
    END AS phrase_type
FROM generate_series(0, 10) AS position;
