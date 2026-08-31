-- Rollback for 20260831_voices_consent.sql.
-- Dropping these columns DESTROYS recorded consent facts. Export them first:
--   select voice_id, consent_status, consent_person, consent_authorised_by,
--          consent_authorised_how, consent_authorised_at, consent_recorded_by,
--          consent_recorded_at, consent_source, consent_note
--   from voices where consent_status <> 'not_recorded';
DROP INDEX IF EXISTS voices_consent_outstanding;
ALTER TABLE voices DROP CONSTRAINT IF EXISTS voices_consent_awaiting_names_the_person;
ALTER TABLE voices DROP CONSTRAINT IF EXISTS voices_consent_authorised_is_evidenced;
ALTER TABLE voices DROP CONSTRAINT IF EXISTS voices_consent_status_known;
ALTER TABLE voices
  DROP COLUMN IF EXISTS consent_status,
  DROP COLUMN IF EXISTS consent_person,
  DROP COLUMN IF EXISTS consent_person_contact,
  DROP COLUMN IF EXISTS consent_authorised_by,
  DROP COLUMN IF EXISTS consent_authorised_how,
  DROP COLUMN IF EXISTS consent_authorised_at,
  DROP COLUMN IF EXISTS consent_recorded_by,
  DROP COLUMN IF EXISTS consent_recorded_at,
  DROP COLUMN IF EXISTS consent_source,
  DROP COLUMN IF EXISTS consent_note;
