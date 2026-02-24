-- Add content versioning (semver) to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS content_version TEXT DEFAULT '0.0.0';
