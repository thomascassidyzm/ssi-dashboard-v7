-- Migration: Remove trailing periods from all course text columns
-- Date: 2026-02-24
-- Scope: course_practice_phrases, course_legos, course_seeds (known_text + target_text)
-- Rule: Remove exactly one trailing '.' — leave '!' and '?' intact

-- 1. course_practice_phrases.known_text
UPDATE course_practice_phrases
SET known_text = regexp_replace(known_text, '\.$', '')
WHERE known_text ~ '\.$';

-- 2. course_practice_phrases.target_text
UPDATE course_practice_phrases
SET target_text = regexp_replace(target_text, '\.$', '')
WHERE target_text ~ '\.$';

-- 3. course_legos.known_text
UPDATE course_legos
SET known_text = regexp_replace(known_text, '\.$', '')
WHERE known_text ~ '\.$';

-- 4. course_legos.target_text
UPDATE course_legos
SET target_text = regexp_replace(target_text, '\.$', '')
WHERE target_text ~ '\.$';

-- 5. course_seeds.known_text
UPDATE course_seeds
SET known_text = regexp_replace(known_text, '\.$', '')
WHERE known_text ~ '\.$';

-- 6. course_seeds.target_text
UPDATE course_seeds
SET target_text = regexp_replace(target_text, '\.$', '')
WHERE target_text ~ '\.$';
