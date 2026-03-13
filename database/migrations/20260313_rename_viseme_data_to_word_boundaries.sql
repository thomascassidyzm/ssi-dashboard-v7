-- Rename viseme_data to word_boundaries on course_audio
-- Column now stores Azure WordBoundary event data [{text, offset, duration}]
-- instead of viseme keyframes [[ms, visemeId]]

ALTER TABLE course_audio RENAME COLUMN viseme_data TO word_boundaries;
