-- Migration: zho_for_eng known_text cleanup
-- Date: 2026-05-23
-- Author: Tom + Sonnet audit (full-course quality pass)
-- Audit: ~/Desktop/zho_full_course_quality_audit.md
--
-- Scope: 54 rows of known_text replacements in zho_for_eng. All Chinese
-- target_text is untouched. Six buckets:
--   1. Methodology-label fixes (10 rows) — grammar labels in known_text,
--      forbidden by SSi methodology
--   2. ba/把 (6 rows) — phonetic-romanisation label replaced with the
--      most natural example word; principle "examples >> explanations"
--   3. 只要 accuracy bug (14 rows) — "as soon as" → "as long as"
--   4. "the faintest idea" positive-construction replacement (2 rows)
--   5. comprehend → understand cluster (9 rows, seed 74) — register fix
--      + false-Chinese-distinction repair
--   6. Semicolon synonym-pair labels (14 rows, seeds 221–230) — editorial
--      consistency; drop the second synonym
--
-- Each UPDATE also NULLs known_audio_id so the post-migration Phase 8
-- regen picks them up and renders fresh English audio. Chinese audio
-- (target1_audio_id, target2_audio_id) is untouched.

BEGIN;

-- ============================================================================
-- 1. Methodology-label fixes
-- ============================================================================

-- S0033L02 (了 perfective particle) — "(completed)" → "already" + 3 BUILD cascades
UPDATE course_legos
  SET known_text = 'already'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0033L02';

UPDATE course_practice_phrases
  SET known_text = 'came back already', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0033L02B01';
UPDATE course_practice_phrases
  SET known_text = 'met already', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0033L02B02';
UPDATE course_practice_phrases
  SET known_text = 'started already', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0033L02B03';

-- S0069L03 (只 measure word) — "measure word" → "one"
UPDATE course_legos
  SET known_text = 'one'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0069L03';

-- S0229L02 (的话 conditional particle) — "if (conditional marker)" → "if"
-- + 1 BUILD cascade carrying the same label
UPDATE course_legos
  SET known_text = 'if'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0229L02';

UPDATE course_practice_phrases
  SET known_text = 'if', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0229L02B01';

-- S0336L01 (扇 classifier for flat objects) — "door (classifier)" → "door"
UPDATE course_legos
  SET known_text = 'door'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0336L01';

-- ============================================================================
-- 2. ba/把 — phonetic romanisation → "take" example word (6 rows, seeds 53 & 241)
-- ============================================================================
-- 把 is the Chinese disposal/object-fronting particle ("I'm doing
-- something with X"). No single English word captures it, but "take" is
-- the most common natural English standalone gloss for the disposal
-- sense, and reads naturally in the assembly fragments:
--   把这个       (ba this)       → "take this"
--   我想把这个    (I want ba this) → "I want to take this"
-- The USE phrases at S0053L04 (using 放进 / put-into) render naturally
-- in English without "take" — that's how the learner discovers 把
-- disappears in English when paired with a main verb. Principle:
-- examples >> explanations.

UPDATE course_legos
  SET known_text = 'take'
  WHERE course_code = 'zho_for_eng' AND lego_id IN ('S0053L01', 'S0241L01');

UPDATE course_practice_phrases
  SET known_text = 'take', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0053L01B01';
UPDATE course_practice_phrases
  SET known_text = 'take this', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0053L01B02';
UPDATE course_practice_phrases
  SET known_text = 'I want to take this', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0053L01B03';
UPDATE course_practice_phrases
  SET known_text = 'take this put into', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0053L04B04';

-- ============================================================================
-- 3. 只要 accuracy bug — "as soon as" → "as long as" (14 rows, seed 97)
-- ============================================================================
-- 只要 is conditional ("provided that / as long as"), NOT temporal
-- ("the moment that / immediately after"). Original translations confused
-- it with 马上. Pedagogical risk: learners would produce wrong Chinese.

UPDATE course_legos
  SET known_text = 'as long as'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0097L01';

UPDATE course_practice_phrases
  SET known_text = 'as long as', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L01B01';
UPDATE course_practice_phrases
  SET known_text = 'as long as you want', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L01B02';
UPDATE course_practice_phrases
  SET known_text = 'as long as I can', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L01B03';
UPDATE course_practice_phrases
  SET known_text = 'as long as', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L01B04';

UPDATE course_practice_phrases
  SET known_text = 'as long as you want, I can do this', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L01U01';
UPDATE course_practice_phrases
  SET known_text = 'as long as you want, I''m ready', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L01U02';
UPDATE course_practice_phrases
  SET known_text = 'as long as you want, I can go', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L01U03';
UPDATE course_practice_phrases
  SET known_text = 'as long as I can, I''ll answer', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L01U04';
UPDATE course_practice_phrases
  SET known_text = 'as long as I''m ready, I can do this', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L01U05';
UPDATE course_practice_phrases
  SET known_text = 'I think I can go as long as you want', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L01U06';
UPDATE course_practice_phrases
  SET known_text = 'as long as I can, I''ll go home', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L01U07';
UPDATE course_practice_phrases
  SET known_text = 'as long as you want, I can take the bus', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L01U08';
UPDATE course_practice_phrases
  SET known_text = 'as long as you want, I''ll be ready immediately', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0097L02U08';

-- ============================================================================
-- 4. "the faintest idea" → natural positive constructions (2 rows, seed 260)
-- ============================================================================
-- "I have the faintest idea" / "I should have the faintest idea" are not
-- English in positive form. Direct replace (literal-then-natural pair
-- mechanic would be insufficient here per audit Section 5).

UPDATE course_practice_phrases
  SET known_text = 'I have a little idea', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0260L01U04';
UPDATE course_practice_phrases
  SET known_text = 'I should have some idea', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0260L01U06';

-- ============================================================================
-- 5. comprehend → understand (9 rows, seed 74)
-- ============================================================================
-- 理解 = "to understand" (standard, conversational). "Comprehend" is a
-- register mismatch and risks teaching a false formal/informal split
-- between 理解 and 明白 that doesn't exist in Chinese.

UPDATE course_legos
  SET known_text = 'to understand'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0074L01';

UPDATE course_practice_phrases
  SET known_text = 'to understand', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0074L01B01';
UPDATE course_practice_phrases
  SET known_text = 'I want to understand', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0074L01B02';
UPDATE course_practice_phrases
  SET known_text = 'help me understand', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0074L01B03';
UPDATE course_practice_phrases
  SET known_text = 'I need to understand', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0074L01B04';

UPDATE course_practice_phrases
  SET known_text = 'I want to understand this', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0074L01U01';
UPDATE course_practice_phrases
  SET known_text = 'I didn''t understand', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0074L01U03';
UPDATE course_practice_phrases
  SET known_text = 'I think I understand now', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0074L01U04';
UPDATE course_practice_phrases
  SET known_text = 'I need to understand this', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0074L01U07';

-- ============================================================================
-- 6. Semicolon synonym-pair LEGO/BUILD labels (14 rows, seeds 221–230)
-- ============================================================================
-- These LEGOs used a "synonym1; synonym2" format that's unique in the
-- course and inherits into B01. Drop the second synonym for consistency.
-- USE phrases are already clean.

UPDATE course_legos SET known_text = 'to try'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0221L01';
UPDATE course_practice_phrases
  SET known_text = 'to try', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0221L01B01';

UPDATE course_legos SET known_text = 'part'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0221L03';
UPDATE course_practice_phrases
  SET known_text = 'part', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0221L03B01';

UPDATE course_legos SET known_text = 'to want'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0222L01';
UPDATE course_practice_phrases
  SET known_text = 'to want', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0222L01B01';

UPDATE course_legos SET known_text = 'to start'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0223L01';
UPDATE course_practice_phrases
  SET known_text = 'to start', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0223L01B01';

UPDATE course_legos SET known_text = 'woman'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0225L01';
UPDATE course_practice_phrases
  SET known_text = 'woman', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0225L01B01';

-- man; male LEGO is already `man`; only the BUILD row carries the pair.
UPDATE course_practice_phrases
  SET known_text = 'man', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0226L01B01';

UPDATE course_legos SET known_text = 'to speak'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0227L01';
UPDATE course_practice_phrases
  SET known_text = 'to speak', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0227L01B01';

UPDATE course_legos SET known_text = 'to know'
  WHERE course_code = 'zho_for_eng' AND lego_id = 'S0230L01';
UPDATE course_practice_phrases
  SET known_text = 'to know', known_audio_id = NULL
  WHERE id = 'zho_for_eng:S0230L01B01';

-- ============================================================================
-- Force audio re-generation for every LEGO known_text we just updated.
-- The LEGO's own known audio lives in course_audio joined by text — but
-- the lego row itself doesn't carry an audio_id. Phase 8 regen will pick
-- up any mismatched-text rows when it next runs. The practice_phrases
-- known_audio_id is already NULL'd row-by-row above.
-- ============================================================================

COMMIT;
