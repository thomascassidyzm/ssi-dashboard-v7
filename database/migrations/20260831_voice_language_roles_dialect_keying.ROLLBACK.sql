-- Rollback for 20260831_voice_language_roles_dialect_keying.sql.
-- Comment-only: drops the comment, changes no data and no shape.
COMMENT ON COLUMN voice_language_roles.language IS NULL;
