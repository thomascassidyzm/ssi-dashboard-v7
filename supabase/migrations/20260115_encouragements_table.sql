-- =============================================================================
-- 20260115: ENCOURAGEMENTS TABLE
-- =============================================================================
-- Canonical encouragement texts - the source of truth for what encouragements
-- exist for each language. Audio is looked up from shared_audio by text match.
--
-- Two types:
--   - 'ordered' (48): Played in sequence (positions 1-48)
--   - 'pooled' (26): Randomly selected from pool

CREATE TABLE IF NOT EXISTS encouragements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  pool_type TEXT NOT NULL CHECK (pool_type IN ('pooled', 'ordered')),
  position INTEGER,  -- For ordered encouragements (1-48), NULL for pooled
  lang TEXT NOT NULL DEFAULT 'eng',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_encouragement_text UNIQUE (text, lang)
);

CREATE INDEX IF NOT EXISTS idx_encouragements_lang ON encouragements(lang);
CREATE INDEX IF NOT EXISTS idx_encouragements_pool ON encouragements(pool_type, lang);
CREATE INDEX IF NOT EXISTS idx_encouragements_position ON encouragements(position) WHERE position IS NOT NULL;

COMMENT ON TABLE encouragements IS 'Canonical encouragement texts by language. Audio looked up from shared_audio by text match.';

-- =============================================================================
-- POPULATE FROM SHARED_AUDIO (English only for now)
-- =============================================================================
-- shared_audio has audio_type: 'instruction' (ordered) or 'encouragement' (pooled)
-- We extract the text and categorize it

INSERT INTO encouragements (text, pool_type, position, lang)
SELECT
  text,
  CASE
    WHEN audio_type = 'instruction' THEN 'ordered'
    ELSE 'pooled'
  END as pool_type,
  -- For instructions, derive position from the row number
  CASE
    WHEN audio_type = 'instruction' THEN
      ROW_NUMBER() OVER (PARTITION BY language, audio_type ORDER BY created_at, id)
    ELSE NULL
  END as position,
  language as lang
FROM shared_audio
WHERE language = 'eng'
ON CONFLICT (text, lang) DO NOTHING;
