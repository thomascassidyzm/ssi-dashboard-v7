-- =============================================================================
-- 011: IMPORT COURSE WELCOMES
-- =============================================================================
-- Purpose: Add welcome audio records to course_audio table
-- Date: 2026-01-10
--
-- Welcomes are:
--   - Course-specific (one per course)
--   - Human recordings (origin = 'human')
--   - Played at course start
--   - Audio files already exist in S3 at mastered/{uuid}.mp3
-- =============================================================================

-- Ensure 'welcome' is in the role CHECK constraint (idempotent)
ALTER TABLE course_audio DROP CONSTRAINT IF EXISTS course_audio_role_check;
ALTER TABLE course_audio ADD CONSTRAINT course_audio_role_check
  CHECK (role IN ('known', 'target1', 'target2', 'presentation', 'encouragement', 'instruction', 'welcome'));

-- Delete any existing welcome records (idempotent - allows re-running)
DELETE FROM course_audio WHERE role = 'welcome';

-- Insert welcome audio records
-- Data from public/vfs/canonical/welcomes.json

-- Spanish for English
INSERT INTO course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms)
VALUES (
  'spa_for_eng',
  'Welcome to this unusual game that will help you to become a Spanish speaker. Here''s how it works - I teach you something in Spanish, then I say something in English and give you a chance to say it out loud in Spanish. Then, you listen carefully to the Spanish speakers who will model it for you. It''s important that you say something in the gaps, because that''s how you learn. Even if you aren''t sure, have a go at saying whatever you can, and you''ll be starting to speak in Spanish sooner than you think. The more you treat it as a game, the more playful you are with it, the more you laugh when you make mistakes, the better it will go and the faster you will learn. So, let''s start playing.',
  'welcome to this unusual game that will help you to become a spanish speaker. here''s how it works - i teach you something in spanish, then i say something in english and give you a chance to say it out loud in spanish. then, you listen carefully to the spanish speakers who will model it for you. it''s important that you say something in the gaps, because that''s how you learn. even if you aren''t sure, have a go at saying whatever you can, and you''ll be starting to speak in spanish sooner than you think. the more you treat it as a game, the more playful you are with it, the more you laugh when you make mistakes, the better it will go and the faster you will learn. so, let''s start playing.',
  'eng',
  'welcome',
  'Aran',
  'human',
  'mastered/955C760A-7857-481A-948E-59F79CC3F560.mp3',
  45830
);

-- Irish for English
INSERT INTO course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms)
VALUES (
  'gle_for_eng',
  'Welcome to this unusual game that will help you to become a Irish speaker. Here''s how it works - I teach you something in Irish, then I say something in English and give you a chance to say it out loud in Irish. Then, you listen carefully to the Irish speakers who will model it for you. It''s important that you say something in the gaps, because that''s how you learn. Even if you aren''t sure, have a go at saying whatever you can, and you''ll be starting to speak in Irish sooner than you think. The more you treat it as a game, the more playful you are with it, the more you laugh when you make mistakes, the better it will go and the faster you will learn. So, let''s start playing.',
  'welcome to this unusual game that will help you to become a irish speaker. here''s how it works - i teach you something in irish, then i say something in english and give you a chance to say it out loud in irish. then, you listen carefully to the irish speakers who will model it for you. it''s important that you say something in the gaps, because that''s how you learn. even if you aren''t sure, have a go at saying whatever you can, and you''ll be starting to speak in irish sooner than you think. the more you treat it as a game, the more playful you are with it, the more you laugh when you make mistakes, the better it will go and the faster you will learn. so, let''s start playing.',
  'eng',
  'welcome',
  'Aran',
  'human',
  'mastered/CFAAE8EC-BC4E-45A7-9265-3947FF4F703F.mp3',
  46161
);

-- Welsh (South) for English
INSERT INTO course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms)
VALUES (
  'cym_s_for_eng',
  'Welcome to this unusual game that will help you to become a Welsh speaker. Here''s how it works - I teach you something in Welsh, then I say something in English and give you a chance to say it out loud in Welsh. Then, you listen carefully to the Welsh speakers who will model it for you. It''s important that you say something in the gaps, because that''s how you learn. Even if you aren''t sure, have a go at saying whatever you can, and you''ll be starting to speak in Welsh sooner than you think. The more you treat it as a game, the more playful you are with it, the more you laugh when you make mistakes, the better it will go and the faster you will learn. So, let''s start playing.',
  'welcome to this unusual game that will help you to become a welsh speaker. here''s how it works - i teach you something in welsh, then i say something in english and give you a chance to say it out loud in welsh. then, you listen carefully to the welsh speakers who will model it for you. it''s important that you say something in the gaps, because that''s how you learn. even if you aren''t sure, have a go at saying whatever you can, and you''ll be starting to speak in welsh sooner than you think. the more you treat it as a game, the more playful you are with it, the more you laugh when you make mistakes, the better it will go and the faster you will learn. so, let''s start playing.',
  'eng',
  'welcome',
  'Aran',
  'human',
  'mastered/E520A333-56AA-4985-ADFA-0715A9FF27B6.mp3',
  44300
);

-- Welsh (North) for English
INSERT INTO course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms)
VALUES (
  'cym_n_for_eng',
  'Welcome to this unusual game that will help you to become a Welsh speaker. Here''s how it works - I teach you something in Welsh, then I say something in English and give you a chance to say it out loud in Welsh. Then, you listen carefully to the Welsh speakers who will model it for you. It''s important that you say something in the gaps, because that''s how you learn. Even if you aren''t sure, have a go at saying whatever you can, and you''ll be starting to speak in Welsh sooner than you think. The more you treat it as a game, the more playful you are with it, the more you laugh when you make mistakes, the better it will go and the faster you will learn. So, let''s start playing.',
  'welcome to this unusual game that will help you to become a welsh speaker. here''s how it works - i teach you something in welsh, then i say something in english and give you a chance to say it out loud in welsh. then, you listen carefully to the welsh speakers who will model it for you. it''s important that you say something in the gaps, because that''s how you learn. even if you aren''t sure, have a go at saying whatever you can, and you''ll be starting to speak in welsh sooner than you think. the more you treat it as a game, the more playful you are with it, the more you laugh when you make mistakes, the better it will go and the faster you will learn. so, let''s start playing.',
  'eng',
  'welcome',
  'Aran',
  'human',
  'mastered/E520A333-56AA-4985-ADFA-0715A9FF27B6.mp3',
  44300
);

-- Log completion
DO $$
DECLARE
  welcome_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO welcome_count FROM course_audio WHERE role = 'welcome';
  RAISE NOTICE 'Migration 011 completed: % welcome audio records now in course_audio', welcome_count;
END $$;
