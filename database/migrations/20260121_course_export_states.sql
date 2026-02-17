-- Migration: Create course_export_states table
-- Purpose: Track export workflow state for each course (manifest generation, S3 verification, publishing, deployment)
-- Date: 2026-01-21
-- Updated: No manifest storage (too much space over time) - store stats/hash instead, regenerate on demand

-- Create the table
CREATE TABLE IF NOT EXISTS course_export_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code TEXT NOT NULL UNIQUE REFERENCES courses(course_code) ON DELETE CASCADE,

  -- Step completion flags
  manifest_generated BOOLEAN DEFAULT FALSE,
  s3_verified BOOLEAN DEFAULT FALSE,
  manifest_published BOOLEAN DEFAULT FALSE,
  audio_deployed BOOLEAN DEFAULT FALSE,

  -- Timestamps for each step
  manifest_generated_at TIMESTAMPTZ,
  s3_verified_at TIMESTAMPTZ,
  manifest_published_at TIMESTAMPTZ,
  audio_deployed_at TIMESTAMPTZ,

  -- Manifest metadata (NOT stored - regenerated on demand)
  manifest_version TEXT,
  manifest_hash TEXT,
  manifest_status TEXT CHECK (manifest_status IN ('alpha', 'beta', 'release')),
  manifest_seed_count INTEGER,
  manifest_lego_count INTEGER,
  manifest_audio_count INTEGER,

  -- Pending manifest location (stored locally on generating machine)
  pending_manifest_path TEXT,           -- e.g., 'temp/pending/en-it.json'
  generated_on_machine TEXT,            -- e.g., "Tom's Machine"

  -- S3 verification results
  -- { total, existing, missing, missingUuids[], durationFixes }
  s3_verification JSONB,

  -- Publish results
  publish_course_configs_path TEXT,
  publish_apidev_filename TEXT,

  -- Deploy results
  -- { total, newFiles, overwrites, overwriteUuids[] }
  deploy_plan JSONB,
  deploy_executed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for course code lookup
CREATE INDEX IF NOT EXISTS idx_export_states_course ON course_export_states(course_code);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_export_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_export_states_updated_at ON course_export_states;
CREATE TRIGGER trigger_export_states_updated_at
  BEFORE UPDATE ON course_export_states
  FOR EACH ROW
  EXECUTE FUNCTION update_export_states_updated_at();

-- Add comment for documentation
COMMENT ON TABLE course_export_states IS 'Tracks export workflow state for each course (manifest generation, S3 verification, publishing, deployment). Manifest is NOT stored - regenerated on demand to save space.';
COMMENT ON COLUMN course_export_states.manifest_hash IS 'SHA256 hash (first 16 chars) for change detection';
COMMENT ON COLUMN course_export_states.manifest_seed_count IS 'Number of seeds in manifest at generation time';
COMMENT ON COLUMN course_export_states.manifest_lego_count IS 'Number of unique LEGOs in manifest at generation time';
COMMENT ON COLUMN course_export_states.manifest_audio_count IS 'Number of unique audio UUIDs in manifest at generation time';
COMMENT ON COLUMN course_export_states.s3_verification IS 'JSON: { total, existing, missing, missingUuids[], durationFixes }';
COMMENT ON COLUMN course_export_states.deploy_plan IS 'JSON: { total, newFiles, overwrites, overwriteUuids[] }';
COMMENT ON COLUMN course_export_states.pending_manifest_path IS 'Relative path in course-configs repo: temp/pending/{id}.json';
COMMENT ON COLUMN course_export_states.generated_on_machine IS 'Human-readable machine name where manifest was generated';
