-- Add learner_display_name for localised course names in the learning app
-- display_name = English (for Popty dashboard builders)
-- learner_display_name = localised (for learners in the app)

ALTER TABLE courses ADD COLUMN IF NOT EXISTS learner_display_name TEXT;

-- Copy current localised display_names to learner_display_name
UPDATE courses SET learner_display_name = display_name
WHERE display_name IS NOT NULL;
