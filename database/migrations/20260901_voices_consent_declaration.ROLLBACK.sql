-- Rollback for 20260901_voices_consent_declaration.sql.
--
-- Dropping these columns DESTROYS the only copy of the words each person
-- actually consented to — the wording lives per voice precisely because the
-- code's copy of it changes. Export them first, and keep the export:
--   select voice_id, consent_declaration, consent_declaration_kind,
--          consent_declaration_heard, consent_authorised_by, consent_authorised_at
--   from voices where consent_declaration is not null;
ALTER TABLE voices DROP CONSTRAINT IF EXISTS voices_consent_declaration_kind_known;
ALTER TABLE voices
  DROP COLUMN IF EXISTS consent_declaration,
  DROP COLUMN IF EXISTS consent_declaration_kind,
  DROP COLUMN IF EXISTS consent_declaration_heard;
