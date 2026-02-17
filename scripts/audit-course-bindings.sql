-- =============================================================================
-- COURSE BINDING INTEGRITY AUDIT
-- =============================================================================
-- Run these queries to verify all audio bindings are correct
-- Export results as JSON for review
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SUMMARY: Audio binding coverage by course
-- -----------------------------------------------------------------------------
SELECT
  course_code,
  COUNT(*) as total_legos,
  COUNT(known_audio_id) as with_known,
  COUNT(target1_audio_id) as with_target1,
  COUNT(target2_audio_id) as with_target2,
  COUNT(presentation_audio_id) as with_presentation,
  ROUND(100.0 * COUNT(known_audio_id) / COUNT(*), 1) as known_pct,
  ROUND(100.0 * COUNT(target1_audio_id) / COUNT(*), 1) as target1_pct,
  ROUND(100.0 * COUNT(presentation_audio_id) / COUNT(*), 1) as presentation_pct
FROM course_legos
WHERE is_new = true
GROUP BY course_code
ORDER BY course_code;

-- -----------------------------------------------------------------------------
-- 2. SUMMARY: Practice phrases binding coverage by course
-- -----------------------------------------------------------------------------
SELECT
  course_code,
  COUNT(*) as total_phrases,
  COUNT(known_audio_id) as with_known,
  COUNT(target1_audio_id) as with_target1,
  COUNT(target2_audio_id) as with_target2,
  ROUND(100.0 * COUNT(known_audio_id) / COUNT(*), 1) as known_pct,
  ROUND(100.0 * COUNT(target1_audio_id) / COUNT(*), 1) as target1_pct
FROM course_practice_phrases
GROUP BY course_code
ORDER BY course_code;

-- -----------------------------------------------------------------------------
-- 3. LEGOS MISSING AUDIO (for INTRO/DEBUT/REVIEW phases)
-- These LEGOs won't play properly in rounds
-- -----------------------------------------------------------------------------
SELECT
  course_code,
  seed_number,
  lego_index,
  known_text,
  target_text,
  CASE WHEN known_audio_id IS NULL THEN 'MISSING' ELSE 'OK' END as known_status,
  CASE WHEN target1_audio_id IS NULL THEN 'MISSING' ELSE 'OK' END as target1_status,
  CASE WHEN target2_audio_id IS NULL THEN 'MISSING' ELSE 'OK' END as target2_status,
  CASE WHEN presentation_audio_id IS NULL THEN 'MISSING' ELSE 'OK' END as presentation_status
FROM course_legos
WHERE is_new = true
  AND (known_audio_id IS NULL
       OR target1_audio_id IS NULL
       OR target2_audio_id IS NULL
       OR presentation_audio_id IS NULL)
ORDER BY course_code, seed_number, lego_index;

-- -----------------------------------------------------------------------------
-- 4. PRACTICE PHRASES MISSING AUDIO (for PRACTICE/CONSOLIDATION phases)
-- -----------------------------------------------------------------------------
SELECT
  course_code,
  seed_number,
  lego_index,
  phrase_index,
  known_text,
  target_text,
  CASE WHEN known_audio_id IS NULL THEN 'MISSING' ELSE 'OK' END as known_status,
  CASE WHEN target1_audio_id IS NULL THEN 'MISSING' ELSE 'OK' END as target1_status,
  CASE WHEN target2_audio_id IS NULL THEN 'MISSING' ELSE 'OK' END as target2_status
FROM course_practice_phrases
WHERE known_audio_id IS NULL
   OR target1_audio_id IS NULL
   OR target2_audio_id IS NULL
ORDER BY course_code, seed_number, lego_index, phrase_index;

-- -----------------------------------------------------------------------------
-- 5. AUDIO RECORDS WITH INVALID S3 KEYS (won't play - 502 errors)
-- Check for pending/ paths or missing keys
-- -----------------------------------------------------------------------------
SELECT
  course_code,
  role,
  COUNT(*) as count,
  CASE
    WHEN s3_key IS NULL THEN 'NULL'
    WHEN s3_key LIKE 'pending/%' THEN 'PENDING'
    WHEN s3_key LIKE 'mastered/%' THEN 'MASTERED'
    ELSE 'OTHER'
  END as s3_status
FROM course_audio
GROUP BY course_code, role,
  CASE
    WHEN s3_key IS NULL THEN 'NULL'
    WHEN s3_key LIKE 'pending/%' THEN 'PENDING'
    WHEN s3_key LIKE 'mastered/%' THEN 'MASTERED'
    ELSE 'OTHER'
  END
ORDER BY course_code, role, s3_status;

-- -----------------------------------------------------------------------------
-- 6. ORPHANED AUDIO: Audio records not bound to any LEGO or phrase
-- These take up space but aren't used
-- -----------------------------------------------------------------------------
SELECT
  ca.course_code,
  ca.role,
  COUNT(*) as orphaned_count
FROM course_audio ca
LEFT JOIN course_legos cl_known ON ca.id = cl_known.known_audio_id
LEFT JOIN course_legos cl_t1 ON ca.id = cl_t1.target1_audio_id
LEFT JOIN course_legos cl_t2 ON ca.id = cl_t2.target2_audio_id
LEFT JOIN course_legos cl_pres ON ca.id = cl_pres.presentation_audio_id
LEFT JOIN course_practice_phrases cpp_known ON ca.id = cpp_known.known_audio_id
LEFT JOIN course_practice_phrases cpp_t1 ON ca.id = cpp_t1.target1_audio_id
LEFT JOIN course_practice_phrases cpp_t2 ON ca.id = cpp_t2.target2_audio_id
WHERE cl_known.id IS NULL
  AND cl_t1.id IS NULL
  AND cl_t2.id IS NULL
  AND cl_pres.id IS NULL
  AND cpp_known.id IS NULL
  AND cpp_t1.id IS NULL
  AND cpp_t2.id IS NULL
GROUP BY ca.course_code, ca.role
ORDER BY ca.course_code, ca.role;

-- -----------------------------------------------------------------------------
-- 7. BOUND AUDIO THAT DOESN'T EXIST (dangling references)
-- LEGOs/phrases pointing to non-existent audio IDs
-- -----------------------------------------------------------------------------
-- Check LEGOs known_audio_id
SELECT 'LEGO known_audio_id' as binding_type, cl.course_code, cl.seed_number, cl.lego_index, cl.known_audio_id as missing_audio_id
FROM course_legos cl
LEFT JOIN course_audio ca ON cl.known_audio_id = ca.id
WHERE cl.known_audio_id IS NOT NULL AND ca.id IS NULL

UNION ALL

-- Check LEGOs target1_audio_id
SELECT 'LEGO target1_audio_id', cl.course_code, cl.seed_number, cl.lego_index, cl.target1_audio_id
FROM course_legos cl
LEFT JOIN course_audio ca ON cl.target1_audio_id = ca.id
WHERE cl.target1_audio_id IS NOT NULL AND ca.id IS NULL

UNION ALL

-- Check LEGOs presentation_audio_id
SELECT 'LEGO presentation_audio_id', cl.course_code, cl.seed_number, cl.lego_index, cl.presentation_audio_id
FROM course_legos cl
LEFT JOIN course_audio ca ON cl.presentation_audio_id = ca.id
WHERE cl.presentation_audio_id IS NOT NULL AND ca.id IS NULL

UNION ALL

-- Check phrases known_audio_id
SELECT 'phrase known_audio_id', cpp.course_code, cpp.seed_number, cpp.lego_index, cpp.known_audio_id
FROM course_practice_phrases cpp
LEFT JOIN course_audio ca ON cpp.known_audio_id = ca.id
WHERE cpp.known_audio_id IS NOT NULL AND ca.id IS NULL

UNION ALL

-- Check phrases target1_audio_id
SELECT 'phrase target1_audio_id', cpp.course_code, cpp.seed_number, cpp.lego_index, cpp.target1_audio_id
FROM course_practice_phrases cpp
LEFT JOIN course_audio ca ON cpp.target1_audio_id = ca.id
WHERE cpp.target1_audio_id IS NOT NULL AND ca.id IS NULL;

-- -----------------------------------------------------------------------------
-- 8. AUDIO ROLE DISTRIBUTION (sanity check)
-- Each LEGO should have: 1 known, 1 target1, 1 target2, 1 presentation
-- -----------------------------------------------------------------------------
SELECT
  course_code,
  role,
  COUNT(*) as count,
  COUNT(DISTINCT text_normalized) as unique_texts
FROM course_audio
GROUP BY course_code, role
ORDER BY course_code, role;

-- -----------------------------------------------------------------------------
-- 9. DUPLICATE AUDIO (same text+role, multiple records)
-- May indicate regeneration issues
-- -----------------------------------------------------------------------------
SELECT
  course_code,
  role,
  text_normalized,
  COUNT(*) as duplicate_count
FROM course_audio
WHERE text_normalized IS NOT NULL
GROUP BY course_code, role, text_normalized
HAVING COUNT(*) > 1
ORDER BY course_code, COUNT(*) DESC
LIMIT 100;

-- -----------------------------------------------------------------------------
-- 10. COMPLETE EXPORT: All LEGOs with audio binding status
-- Export this as JSON for manual review
-- -----------------------------------------------------------------------------
SELECT
  cl.course_code,
  cl.seed_number,
  cl.lego_index,
  cl.known_text,
  cl.target_text,
  cl.type as lego_type,
  -- Audio IDs
  cl.known_audio_id,
  cl.target1_audio_id,
  cl.target2_audio_id,
  cl.presentation_audio_id,
  -- Audio existence check
  ka.s3_key as known_s3_key,
  t1a.s3_key as target1_s3_key,
  t2a.s3_key as target2_s3_key,
  pa.s3_key as presentation_s3_key,
  -- Status flags
  CASE WHEN cl.known_audio_id IS NOT NULL AND ka.id IS NOT NULL THEN true ELSE false END as known_valid,
  CASE WHEN cl.target1_audio_id IS NOT NULL AND t1a.id IS NOT NULL THEN true ELSE false END as target1_valid,
  CASE WHEN cl.target2_audio_id IS NOT NULL AND t2a.id IS NOT NULL THEN true ELSE false END as target2_valid,
  CASE WHEN cl.presentation_audio_id IS NOT NULL AND pa.id IS NOT NULL THEN true ELSE false END as presentation_valid
FROM course_legos cl
LEFT JOIN course_audio ka ON cl.known_audio_id = ka.id
LEFT JOIN course_audio t1a ON cl.target1_audio_id = t1a.id
LEFT JOIN course_audio t2a ON cl.target2_audio_id = t2a.id
LEFT JOIN course_audio pa ON cl.presentation_audio_id = pa.id
WHERE cl.is_new = true
ORDER BY cl.course_code, cl.seed_number, cl.lego_index;

-- -----------------------------------------------------------------------------
-- 11. ROUND PLAYABILITY CHECK
-- For each LEGO, check if all required audio for all round types exists
-- -----------------------------------------------------------------------------
SELECT
  cl.course_code,
  cl.seed_number,
  cl.lego_index,
  cl.known_text,
  -- INTRO needs: presentation_audio_id, target1, target2
  CASE WHEN cl.presentation_audio_id IS NOT NULL
        AND cl.target1_audio_id IS NOT NULL
        AND cl.target2_audio_id IS NOT NULL
       THEN 'PLAYABLE' ELSE 'BLOCKED' END as intro_status,
  -- DEBUT needs: known_audio_id, target1, target2
  CASE WHEN cl.known_audio_id IS NOT NULL
        AND cl.target1_audio_id IS NOT NULL
        AND cl.target2_audio_id IS NOT NULL
       THEN 'PLAYABLE' ELSE 'BLOCKED' END as debut_status,
  -- Practice phrases count
  (SELECT COUNT(*) FROM course_practice_phrases cpp
   WHERE cpp.course_code = cl.course_code
     AND cpp.seed_number = cl.seed_number
     AND cpp.lego_index = cl.lego_index
     AND cpp.known_audio_id IS NOT NULL
     AND cpp.target1_audio_id IS NOT NULL) as playable_practice_phrases,
  (SELECT COUNT(*) FROM course_practice_phrases cpp
   WHERE cpp.course_code = cl.course_code
     AND cpp.seed_number = cl.seed_number
     AND cpp.lego_index = cl.lego_index) as total_practice_phrases
FROM course_legos cl
WHERE cl.is_new = true
ORDER BY cl.course_code, cl.seed_number, cl.lego_index;
