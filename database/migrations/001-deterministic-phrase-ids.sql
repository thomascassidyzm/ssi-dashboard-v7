-- ============================================================================
-- MIGRATION: Deterministic Phrase IDs
--
-- Changes course_practice_phrases.id from UUID to TEXT
-- Changes course_qa_flags.phrase_id from UUID to TEXT
-- Migrates phrase_role = 'practice' → 'build'
--
-- Run in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- 1. Drop ALL dependent views
DROP VIEW IF EXISTS practice_cycles;
DROP VIEW IF EXISTS course_practice_phrases_with_type;

-- 2. Drop FK constraint from course_qa_flags → course_practice_phrases
ALTER TABLE course_qa_flags
  DROP CONSTRAINT IF EXISTS course_qa_flags_phrase_id_fkey;

-- 3. Change course_practice_phrases.id from UUID to TEXT, remove default
ALTER TABLE course_practice_phrases
  ALTER COLUMN id TYPE TEXT USING id::TEXT,
  ALTER COLUMN id DROP DEFAULT;

-- 4. Change course_qa_flags.phrase_id from UUID to TEXT
ALTER TABLE course_qa_flags
  ALTER COLUMN phrase_id TYPE TEXT USING phrase_id::TEXT;

-- 5. Re-add FK constraint
ALTER TABLE course_qa_flags
  ADD CONSTRAINT course_qa_flags_phrase_id_fkey
  FOREIGN KEY (phrase_id) REFERENCES course_practice_phrases(id)
  ON DELETE CASCADE;

-- 6. Migrate phrase_role = 'practice' → 'build' across all rows
UPDATE course_practice_phrases
  SET phrase_role = 'build'
  WHERE phrase_role = 'practice';

-- 7. Recreate views

-- 7a. course_practice_phrases_with_type
CREATE OR REPLACE VIEW course_practice_phrases_with_type AS
SELECT *,
  CASE
    WHEN position = 0 THEN 'component'
    WHEN position = 1 THEN 'lego'
    WHEN position BETWEEN 2 AND 7 THEN 'debut'
    ELSE 'eternal'
  END AS phrase_type
FROM course_practice_phrases;

-- 7b. practice_cycles (joins phrases with course_audio for known/target1/target2)
CREATE OR REPLACE VIEW practice_cycles AS
SELECT cpp.id,
    cpp.course_code,
    cpp.seed_number,
    cpp.lego_index,
    cpp."position",
    (('S'::text || lpad(cpp.seed_number::text, 4, '0'::text)) || 'L'::text) || lpad(cpp.lego_index::text, 2, '0'::text) AS lego_id,
    cpp.phrase_role,
    cpp.connected_lego_ids,
    cpp.lego_position,
        CASE
            WHEN cpp."position" = 0 THEN 'component'::text
            WHEN cpp."position" = 1 THEN 'debut'::text
            ELSE 'practice'::text
        END AS phrase_type,
    cpp.word_count AS target_word_count,
    cpp.lego_count,
    cpp.target_syllable_count,
    cpp.difficulty,
    cpp.register,
    cpp.status,
    cpp.version,
    cpp.known_text,
    cpp.target_text,
    ka.id AS known_audio_uuid,
    ka.s3_key AS known_s3_key,
    ka.duration_ms AS known_duration_ms,
    t1.id AS target1_audio_uuid,
    t1.s3_key AS target1_s3_key,
    t1.duration_ms AS target1_duration_ms,
    t2.id AS target2_audio_uuid,
    t2.s3_key AS target2_s3_key,
    t2.duration_ms AS target2_duration_ms
   FROM course_practice_phrases cpp
     LEFT JOIN course_audio ka ON ka.course_code = cpp.course_code AND ka.text_stripped = lower(TRIM(BOTH FROM regexp_replace(cpp.known_text, '[。？！、，.!?,;:()（）「」『』\[\]…—–¿¡\-]+'::text, ''::text, 'g'::text))) AND ka.role = 'known'::text
     LEFT JOIN course_audio t1 ON t1.course_code = cpp.course_code AND t1.text_stripped = lower(TRIM(BOTH FROM regexp_replace(cpp.target_text, '[。？！、，.!?,;:()（）「」『』\[\]…—–¿¡\-]+'::text, ''::text, 'g'::text))) AND t1.role = 'target1'::text
     LEFT JOIN course_audio t2 ON t2.course_code = cpp.course_code AND t2.text_stripped = lower(TRIM(BOTH FROM regexp_replace(cpp.target_text, '[。？！、，.!?,;:()（）「」『』\[\]…—–¿¡\-]+'::text, ''::text, 'g'::text))) AND t2.role = 'target2'::text;

COMMIT;
