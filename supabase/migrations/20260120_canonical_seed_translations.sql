-- Canonical seed translations for non-English known languages
-- Allows courses like bre_for_fra to use French canonical seeds

CREATE TABLE IF NOT EXISTS canonical_seed_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_number INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_course TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seed_number, language_code)
);

CREATE INDEX IF NOT EXISTS idx_canonical_seed_translations_lang
  ON canonical_seed_translations(language_code);

CREATE INDEX IF NOT EXISTS idx_canonical_seed_translations_seed
  ON canonical_seed_translations(seed_number);

COMMENT ON TABLE canonical_seed_translations IS 'Translations of canonical seeds into various languages, bootstrapped from existing courses';
