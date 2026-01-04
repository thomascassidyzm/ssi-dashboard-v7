-- Migration 006: Presentation Templates v13
--
-- Creates presentation_templates table and populates with new simplified format.
-- Presentation audio now ends with "is:" - target words played separately by app.
--
-- Placeholders:
--   {target_lang_name} = Human-readable target language name (e.g., "Spanish")
--   {known}            = Known LEGO text (e.g., "I want")
--   {seed}             = Full seed sentence (e.g., "I want to speak Spanish with you now")

-- Step 1: Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS presentation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template TEXT NOT NULL,
    known_lang TEXT,               -- NULL = all
    target_lang TEXT,              -- NULL = all
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Deactivate any old format templates (if they exist)
UPDATE presentation_templates
SET is_active = false
WHERE template LIKE '%...%{target}%...%{target}%'
   OR template LIKE '%... ''%'' ... ''%''%';

-- Step 3: Insert new templates per known language

-- English (known language)
INSERT INTO presentation_templates (template, known_lang, priority, is_active)
VALUES (
  'The {target_lang_name} for ''{known}'', as in ''{seed}'', is:',
  'eng',
  10,
  true
);

-- Spanish (known language) - for courses teaching TO Spanish speakers
INSERT INTO presentation_templates (template, known_lang, priority, is_active)
VALUES (
  'El {target_lang_name} de ''{known}'', como en ''{seed}'', es:',
  'spa',
  10,
  true
);

-- Chinese/Mandarin (known language) - zho code
INSERT INTO presentation_templates (template, known_lang, priority, is_active)
VALUES (
  '{target_lang_name}""{known}""，如""{seed}""，是：',
  'zho',
  10,
  true
);

-- Chinese/Mandarin (known language) - cmn code (Mandarin specifically)
INSERT INTO presentation_templates (template, known_lang, priority, is_active)
VALUES (
  '{target_lang_name}""{known}""，如""{seed}""，是：',
  'cmn',
  10,
  true
);

-- Welsh (known language)
INSERT INTO presentation_templates (template, known_lang, priority, is_active)
VALUES (
  'Y {target_lang_name} am ''{known}'', fel yn ''{seed}'', yw:',
  'cym',
  10,
  true
);

-- Step 4: Verify
SELECT id, known_lang, template, priority, is_active
FROM presentation_templates
ORDER BY is_active DESC, priority DESC, known_lang NULLS LAST;
