-- =============================================================================
-- Example Queries for Registry-Aligned Schema
-- =============================================================================
-- Demonstrates how to query course data imported via import-course-registry.cjs
--
-- Assumes you've run:
--   node database/import-course-registry.cjs spa_for_eng_v2
-- =============================================================================

-- =============================================================================
-- BASIC QUERIES
-- =============================================================================

-- 1. Get all courses
SELECT course_code, known_lang, target_lang, display_name, status
FROM courses
ORDER BY course_code;

-- Example output:
-- course_code      | known_lang | target_lang | display_name        | status
-- -----------------+------------+-------------+---------------------+--------
-- spa_for_eng_v2   | eng        | spa         | SPA FOR ENG V2      | draft


-- 2. Get seeds for a course (first 10)
SELECT seed_id, seed_number, known_text, target_text, status
FROM course_seeds
WHERE course_code = 'spa_for_eng_v2'
ORDER BY seed_number
LIMIT 10;

-- Example output:
-- seed_id | seed_number | known_text                              | target_text                           | status
-- --------+-------------+-----------------------------------------+---------------------------------------+--------
-- S0001   | 1           | I want to speak Spanish with you now    | Quiero hablar español contigo ahora   | draft
-- S0002   | 2           | I want to learn Spanish                 | Quiero aprender español               | draft


-- 3. Get LEGOs for a specific seed
SELECT lego_id, lego_index, type, is_new, known_text, target_text, components
FROM course_legos
WHERE course_code = 'spa_for_eng_v2'
AND seed_number = 1
ORDER BY lego_index;

-- Example output:
-- lego_id   | lego_index | type | is_new | known_text  | target_text | components
-- ----------+------------+------+--------+-------------+-------------+------------
-- S0001L01  | 1          | A    | true   | I want      | quiero      | null
-- S0001L02  | 2          | A    | true   | to speak    | hablar      | null
-- S0001L03  | 3          | M    | true   | with you    | contigo     | [{"known": "with", "target": "con"}, {"known": "you", "target": "ti"}]


-- 4. Get practice phrases for a LEGO (with computed phrase_type)
SELECT position, known_text, target_text, word_count, lego_count, phrase_type
FROM course_practice_phrases_with_type
WHERE course_code = 'spa_for_eng_v2'
AND seed_number = 1
AND lego_index = 1
ORDER BY position;

-- Example output:
-- position | known_text                  | target_text                | word_count | lego_count | phrase_type
-- ---------+-----------------------------+----------------------------+------------+------------+-------------
-- 0        | I want now                  | quiero ahora               | 3          | 2          | component
-- 1        | I want                      | quiero                     | 2          | 1          | lego
-- 2        | I want to speak             | quiero hablar              | 4          | 2          | debut
-- 3        | I want to learn             | quiero aprender            | 4          | 2          | debut


-- =============================================================================
-- ADVANCED QUERIES
-- =============================================================================

-- 5. Get all M-type LEGOs with their components
SELECT
    lego_id,
    known_text,
    target_text,
    jsonb_array_length(components) as component_count,
    components
FROM course_legos
WHERE course_code = 'spa_for_eng_v2'
AND type = 'M'
ORDER BY seed_number, lego_index;

-- Example output:
-- lego_id   | known_text   | target_text  | component_count | components
-- ----------+--------------+--------------+-----------------+-------------------------------------------------------
-- S0001L03  | with you     | contigo      | 2               | [{"known": "with", "target": "con"}, {"known": "you", "target": "ti"}]


-- 6. Extract individual components from JSONB
SELECT
    lego_id,
    known_text as lego_known,
    jsonb_array_elements(components) as component
FROM course_legos
WHERE course_code = 'spa_for_eng_v2'
AND type = 'M'
AND seed_number = 1;

-- Example output:
-- lego_id   | lego_known   | component
-- ----------+--------------+---------------------------------------
-- S0001L03  | with you     | {"known": "with", "target": "con"}
-- S0001L03  | with you     | {"known": "you", "target": "ti"}


-- 7. Count practice phrases by phrase_type
SELECT
    phrase_type,
    COUNT(*) as phrase_count,
    AVG(word_count)::numeric(10,2) as avg_word_count,
    AVG(lego_count)::numeric(10,2) as avg_lego_count
FROM course_practice_phrases_with_type
WHERE course_code = 'spa_for_eng_v2'
GROUP BY phrase_type
ORDER BY phrase_count DESC;

-- Example output:
-- phrase_type | phrase_count | avg_word_count | avg_lego_count
-- ------------+--------------+----------------+----------------
-- eternal     | 120          | 7.50           | 3.20
-- debut       | 36           | 4.80           | 2.10
-- lego        | 18           | 2.00           | 1.00
-- component   | 6            | 3.00           | 1.50


-- 8. Get course summary (using built-in view)
SELECT *
FROM course_summary
WHERE course_code = 'spa_for_eng_v2';

-- Example output:
-- course_code    | known_lang | target_lang | display_name    | status | seed_count | lego_count | new_lego_count | phrase_count | last_seed_update | last_lego_update | last_phrase_update
-- ---------------+------------+-------------+-----------------+--------+------------+------------+----------------+--------------+------------------+------------------+--------------------
-- spa_for_eng_v2 | eng        | spa         | SPA FOR ENG V2  | draft  | 10         | 25         | 18             | 180          | 2025-12-13 10:00 | 2025-12-13 10:00 | 2025-12-13 10:00


-- 9. Get seeds with all LEGOs (using built-in view)
SELECT
    seed_id,
    seed_known,
    seed_target,
    lego_id,
    lego_known,
    lego_target,
    is_new,
    lego_type
FROM seed_with_legos
WHERE course_code = 'spa_for_eng_v2'
AND seed_number = 1
ORDER BY lego_index;

-- Example output:
-- seed_id | seed_known                           | seed_target                          | lego_id   | lego_known  | lego_target | is_new | lego_type
-- --------+--------------------------------------+--------------------------------------+-----------+-------------+-------------+--------+-----------
-- S0001   | I want to speak Spanish with you now | Quiero hablar español contigo ahora  | S0001L01  | I want      | quiero      | true   | A
-- S0001   | I want to speak Spanish with you now | Quiero hablar español contigo ahora  | S0001L02  | to speak    | hablar      | true   | A


-- =============================================================================
-- CONTENT MANAGEMENT QUERIES
-- =============================================================================

-- 10. Set release batches (staged rollout)
UPDATE course_seeds
SET release_batch = 1
WHERE course_code = 'spa_for_eng_v2'
AND seed_number BETWEEN 1 AND 100;

UPDATE course_seeds
SET release_batch = 2
WHERE course_code = 'spa_for_eng_v2'
AND seed_number BETWEEN 101 AND 200;


-- 11. Release batch 1
UPDATE courses
SET status = 'released'
WHERE course_code = 'spa_for_eng_v2';

UPDATE course_seeds
SET status = 'released'
WHERE course_code = 'spa_for_eng_v2'
AND release_batch = 1;

UPDATE course_legos
SET status = 'released'
WHERE course_code = 'spa_for_eng_v2'
AND seed_number IN (
    SELECT seed_number FROM course_seeds
    WHERE course_code = 'spa_for_eng_v2'
    AND release_batch = 1
);

UPDATE course_practice_phrases
SET status = 'released'
WHERE course_code = 'spa_for_eng_v2'
AND seed_number IN (
    SELECT seed_number FROM course_seeds
    WHERE course_code = 'spa_for_eng_v2'
    AND release_batch = 1
);


-- 12. Check what's released vs draft
SELECT
    status,
    COUNT(DISTINCT seed_number) as seed_count,
    COUNT(DISTINCT (seed_number, lego_index)) as lego_count
FROM course_legos
WHERE course_code = 'spa_for_eng_v2'
GROUP BY status;

-- Example output:
-- status    | seed_count | lego_count
-- ----------+------------+------------
-- draft     | 5          | 12
-- released  | 5          | 13


-- =============================================================================
-- DELTA SYNC QUERIES
-- =============================================================================

-- 13. Initial sync (first time)
SELECT *
FROM course_seeds
WHERE course_code = 'spa_for_eng_v2'
AND status = 'released'
ORDER BY seed_number;


-- 14. Delta sync (subsequent syncs - changes since last sync)
SELECT *
FROM course_seeds
WHERE course_code = 'spa_for_eng_v2'
AND status = 'released'
AND updated_at > '2025-12-13 10:00:00'  -- Replace with last sync timestamp
ORDER BY updated_at;


-- 15. Get version history (after an update)
-- Note: version auto-increments on UPDATE via trigger

-- Update a seed
UPDATE course_seeds
SET known_text = 'I want to speak Spanish with you right now'
WHERE course_code = 'spa_for_eng_v2'
AND seed_number = 1;

-- Check version (should be 2)
SELECT seed_id, version, updated_at, known_text
FROM course_seeds
WHERE course_code = 'spa_for_eng_v2'
AND seed_number = 1;

-- Example output:
-- seed_id | version | updated_at           | known_text
-- --------+---------+----------------------+-----------------------------------------------
-- S0001   | 2       | 2025-12-13 10:15:00  | I want to speak Spanish with you right now


-- =============================================================================
-- ANALYTICS QUERIES
-- =============================================================================

-- 16. LEGO reuse analysis (find most reused LEGOs)
SELECT
    known_text,
    target_text,
    COUNT(DISTINCT seed_number) as used_in_seeds
FROM course_legos
WHERE course_code = 'spa_for_eng_v2'
GROUP BY known_text, target_text
HAVING COUNT(DISTINCT seed_number) > 1
ORDER BY used_in_seeds DESC
LIMIT 10;


-- 17. Practice phrase complexity distribution
SELECT
    CASE
        WHEN word_count <= 3 THEN '1-3 words'
        WHEN word_count <= 5 THEN '4-5 words'
        WHEN word_count <= 7 THEN '6-7 words'
        ELSE '8+ words'
    END as complexity,
    COUNT(*) as phrase_count
FROM course_practice_phrases
WHERE course_code = 'spa_for_eng_v2'
GROUP BY complexity
ORDER BY MIN(word_count);


-- 18. New LEGO introduction rate
SELECT
    seed_number,
    COUNT(*) FILTER (WHERE is_new = true) as new_legos,
    COUNT(*) FILTER (WHERE is_new = false) as revisit_legos,
    COUNT(*) as total_legos
FROM course_legos
WHERE course_code = 'spa_for_eng_v2'
GROUP BY seed_number
ORDER BY seed_number;


-- =============================================================================
-- JSONB QUERIES (Components)
-- =============================================================================

-- 19. Search components by text
SELECT
    lego_id,
    known_text,
    target_text,
    components
FROM course_legos
WHERE course_code = 'spa_for_eng_v2'
AND components @> '[{"known": "with"}]'::jsonb;

-- Example: Find all M-type LEGOs that use "with" as a component


-- 20. Get component statistics
SELECT
    COUNT(*) as m_type_lego_count,
    SUM(jsonb_array_length(components)) as total_components,
    AVG(jsonb_array_length(components))::numeric(10,2) as avg_components_per_lego
FROM course_legos
WHERE course_code = 'spa_for_eng_v2'
AND type = 'M';


-- =============================================================================
-- EXPORT QUERIES (For manifest generation)
-- =============================================================================

-- 21. Export seed structure (similar to lego_pairs.json)
SELECT
    jsonb_build_object(
        'seed_id', s.seed_id,
        'seed_pair', jsonb_build_object(
            'known', s.known_text,
            'target', s.target_text
        ),
        'legos', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', l.lego_id,
                    'type', l.type,
                    'new', l.is_new,
                    'lego', jsonb_build_object(
                        'known', l.known_text,
                        'target', l.target_text
                    ),
                    'components', l.components
                )
                ORDER BY l.lego_index
            )
            FROM course_legos l
            WHERE l.course_code = s.course_code
            AND l.seed_number = s.seed_number
        )
    ) as seed_data
FROM course_seeds s
WHERE s.course_code = 'spa_for_eng_v2'
AND s.status = 'released'
ORDER BY s.seed_number
LIMIT 1;


-- 22. Export practice baskets (similar to lego_baskets.json)
SELECT
    l.lego_id,
    jsonb_build_object(
        'lego', jsonb_build_object(
            'known', l.known_text,
            'target', l.target_text
        ),
        'practice_phrases', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'known', p.known_text,
                    'target', p.target_text,
                    'lego_count_used', p.lego_count
                )
                ORDER BY p.position
            )
            FROM course_practice_phrases p
            WHERE p.course_code = l.course_code
            AND p.seed_number = l.seed_number
            AND p.lego_index = l.lego_index
        )
    ) as basket_data
FROM course_legos l
WHERE l.course_code = 'spa_for_eng_v2'
AND l.is_new = true
AND l.status = 'released'
ORDER BY l.seed_number, l.lego_index
LIMIT 1;


-- =============================================================================
-- DEBUGGING QUERIES
-- =============================================================================

-- 23. Find LEGOs without practice phrases (should only be revisit LEGOs)
SELECT
    l.lego_id,
    l.is_new,
    l.known_text,
    COUNT(p.id) as phrase_count
FROM course_legos l
LEFT JOIN course_practice_phrases p
    ON p.course_code = l.course_code
    AND p.seed_number = l.seed_number
    AND p.lego_index = l.lego_index
WHERE l.course_code = 'spa_for_eng_v2'
GROUP BY l.lego_id, l.is_new, l.known_text
HAVING COUNT(p.id) = 0;


-- 24. Validate M-type LEGOs have components
SELECT
    lego_id,
    type,
    known_text,
    components
FROM course_legos
WHERE course_code = 'spa_for_eng_v2'
AND type = 'M'
AND components IS NULL;

-- Should return 0 rows (schema constraint prevents this)


-- 25. Check for orphaned practice phrases
SELECT p.*
FROM course_practice_phrases p
LEFT JOIN course_legos l
    ON l.course_code = p.course_code
    AND l.seed_number = p.seed_number
    AND l.lego_index = p.lego_index
WHERE p.course_code = 'spa_for_eng_v2'
AND l.id IS NULL;

-- Should return 0 rows (denormalized but still validated)


-- =============================================================================
-- NOTES
-- =============================================================================

-- phrase_type classification:
-- - position = 0: component
-- - position = 1: lego
-- - position 2-7: debut
-- - position 8+: eternal

-- Generated columns:
-- - seed_id: 'S' || lpad(seed_number::text, 4, '0')
-- - lego_id: 'S' || lpad(seed_number::text, 4, '0') || 'L' || lpad(lego_index::text, 2, '0')

-- Version tracking:
-- - version starts at 1
-- - Auto-increments on UPDATE via trigger
-- - updated_at auto-updates via trigger

-- Status values:
-- - 'draft': In development
-- - 'released': Live for learners
-- - 'deprecated': Superseded by newer version
