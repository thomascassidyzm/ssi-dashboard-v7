-- =============================================================================
-- PROMPT REGISTRY SCHEMA
-- Migration: 20260112_prompt_registry.sql
-- APML Spec: apml/core/prompt-registry-v1.apml
--
-- Single Source of Truth for agent prompts, language briefs, and APML specs.
-- =============================================================================

-- =============================================================================
-- 1. PHASE PROMPTS TABLE
-- =============================================================================
-- Canonical prompts for Phase 0/1/2/3 agents with versioning

CREATE TABLE IF NOT EXISTS phase_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Phase identification
  phase_code TEXT NOT NULL
    CHECK (phase_code IN ('phase0', 'phase1', 'phase2', 'phase3')),

  -- Versioning
  version TEXT NOT NULL,
  title TEXT,

  -- Content
  prompt_content TEXT NOT NULL,

  -- Activation state
  is_active BOOLEAN DEFAULT false,

  -- Additional configuration
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique version per phase
  UNIQUE (phase_code, version)
);

-- Partial unique index: Only one active prompt per phase
CREATE UNIQUE INDEX IF NOT EXISTS one_active_per_phase
  ON phase_prompts (phase_code)
  WHERE is_active = true;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_phase_prompts_phase_code
  ON phase_prompts (phase_code);

CREATE INDEX IF NOT EXISTS idx_phase_prompts_is_active
  ON phase_prompts (is_active);

CREATE INDEX IF NOT EXISTS idx_phase_prompts_phase_active
  ON phase_prompts (phase_code, is_active);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_phase_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER phase_prompts_updated_at_trigger
  BEFORE UPDATE ON phase_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_phase_prompts_updated_at();

COMMENT ON TABLE phase_prompts IS 'Canonical prompts for Phase 0/1/2/3 agents with version history';
COMMENT ON COLUMN phase_prompts.phase_code IS 'Which phase this prompt is for (phase0, phase1, phase2, phase3)';
COMMENT ON COLUMN phase_prompts.version IS 'Semantic version, e.g., v9.3-cik';
COMMENT ON COLUMN phase_prompts.prompt_content IS 'Full markdown prompt content';
COMMENT ON COLUMN phase_prompts.is_active IS 'Whether this version is currently active (only one per phase)';
COMMENT ON COLUMN phase_prompts.metadata IS 'Additional config, notes, changelog';

-- =============================================================================
-- 2. LANGUAGE BRIEFS TABLE
-- =============================================================================
-- CIK-enhanced language pair briefs with versioning

CREATE TABLE IF NOT EXISTS language_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Language pair identification (ISO 639-3 codes)
  known_code TEXT NOT NULL,
  target_code TEXT NOT NULL,

  -- Versioning
  version TEXT NOT NULL,

  -- Content (follows Phase 0 output schema)
  brief_content JSONB NOT NULL,

  -- Activation state
  is_active BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique version per language pair
  UNIQUE (known_code, target_code, version)
);

-- Partial unique index: Only one active brief per language pair
CREATE UNIQUE INDEX IF NOT EXISTS one_active_per_pair
  ON language_briefs (known_code, target_code)
  WHERE is_active = true;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_language_briefs_codes
  ON language_briefs (known_code, target_code);

CREATE INDEX IF NOT EXISTS idx_language_briefs_is_active
  ON language_briefs (is_active);

CREATE INDEX IF NOT EXISTS idx_language_briefs_codes_active
  ON language_briefs (known_code, target_code, is_active);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_language_briefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER language_briefs_updated_at_trigger
  BEFORE UPDATE ON language_briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_language_briefs_updated_at();

COMMENT ON TABLE language_briefs IS 'CIK-enhanced language pair briefs with version history';
COMMENT ON COLUMN language_briefs.known_code IS 'ISO 639-3 code for known language';
COMMENT ON COLUMN language_briefs.target_code IS 'ISO 639-3 code for target language';
COMMENT ON COLUMN language_briefs.version IS 'Brief version, e.g., v1.0-cik';
COMMENT ON COLUMN language_briefs.brief_content IS 'Full brief JSON following Phase 0 output schema';
COMMENT ON COLUMN language_briefs.is_active IS 'Whether this version is currently active (only one per pair)';

-- =============================================================================
-- 3. APML DOCUMENTS TABLE
-- =============================================================================
-- APML specification documents with versioning

CREATE TABLE IF NOT EXISTS apml_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document identification
  document_path TEXT NOT NULL,

  -- Versioning
  version TEXT NOT NULL,
  title TEXT,

  -- Content
  content TEXT NOT NULL,

  -- Activation state
  is_active BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Unique version per document path
  UNIQUE (document_path, version)
);

-- Partial unique index: Only one active version per document
CREATE UNIQUE INDEX IF NOT EXISTS one_active_per_document
  ON apml_documents (document_path)
  WHERE is_active = true;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_apml_documents_path
  ON apml_documents (document_path);

CREATE INDEX IF NOT EXISTS idx_apml_documents_is_active
  ON apml_documents (is_active);

CREATE INDEX IF NOT EXISTS idx_apml_documents_path_active
  ON apml_documents (document_path, is_active);

COMMENT ON TABLE apml_documents IS 'APML specification documents with version history';
COMMENT ON COLUMN apml_documents.document_path IS 'Path like core/cik-lego-principles-v1';
COMMENT ON COLUMN apml_documents.version IS 'Document version';
COMMENT ON COLUMN apml_documents.content IS 'Full APML document content';
COMMENT ON COLUMN apml_documents.is_active IS 'Whether this version is currently active';

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE phase_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE apml_documents ENABLE ROW LEVEL SECURITY;

-- Service role has full access (backend operations)
CREATE POLICY phase_prompts_service_policy ON phase_prompts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY language_briefs_service_policy ON language_briefs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY apml_documents_service_policy ON apml_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read all prompts
CREATE POLICY phase_prompts_read_policy ON phase_prompts
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can read all briefs
CREATE POLICY language_briefs_read_policy ON language_briefs
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can read all APML documents
CREATE POLICY apml_documents_read_policy ON apml_documents
  FOR SELECT TO authenticated USING (true);

-- Anon users can read active prompts only (for public API access)
CREATE POLICY phase_prompts_anon_read_policy ON phase_prompts
  FOR SELECT TO anon USING (is_active = true);

-- Anon users can read active briefs only
CREATE POLICY language_briefs_anon_read_policy ON language_briefs
  FOR SELECT TO anon USING (is_active = true);

-- Anon users can read active APML documents only
CREATE POLICY apml_documents_anon_read_policy ON apml_documents
  FOR SELECT TO anon USING (is_active = true);

-- =============================================================================
-- 5. HELPER FUNCTIONS
-- =============================================================================

-- Function to activate a prompt version (deactivates others in same phase)
CREATE OR REPLACE FUNCTION activate_prompt_version(
  p_phase_code TEXT,
  p_version TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  previous_active_version TEXT,
  new_active_id UUID
) AS $$
DECLARE
  v_previous_version TEXT;
  v_new_id UUID;
BEGIN
  -- Get current active version
  SELECT version INTO v_previous_version
  FROM phase_prompts
  WHERE phase_code = p_phase_code AND is_active = true;

  -- Deactivate all versions for this phase
  UPDATE phase_prompts
  SET is_active = false
  WHERE phase_code = p_phase_code;

  -- Activate the requested version
  UPDATE phase_prompts
  SET is_active = true
  WHERE phase_code = p_phase_code AND version = p_version
  RETURNING id INTO v_new_id;

  -- Return result
  RETURN QUERY SELECT
    v_new_id IS NOT NULL AS success,
    v_previous_version AS previous_active_version,
    v_new_id AS new_active_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate a language brief version (deactivates others for same pair)
CREATE OR REPLACE FUNCTION activate_brief_version(
  p_known_code TEXT,
  p_target_code TEXT,
  p_version TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  previous_active_version TEXT,
  new_active_id UUID
) AS $$
DECLARE
  v_previous_version TEXT;
  v_new_id UUID;
BEGIN
  -- Get current active version
  SELECT version INTO v_previous_version
  FROM language_briefs
  WHERE known_code = p_known_code
    AND target_code = p_target_code
    AND is_active = true;

  -- Deactivate all versions for this pair
  UPDATE language_briefs
  SET is_active = false
  WHERE known_code = p_known_code AND target_code = p_target_code;

  -- Activate the requested version
  UPDATE language_briefs
  SET is_active = true
  WHERE known_code = p_known_code
    AND target_code = p_target_code
    AND version = p_version
  RETURNING id INTO v_new_id;

  -- Return result
  RETURN QUERY SELECT
    v_new_id IS NOT NULL AS success,
    v_previous_version AS previous_active_version,
    v_new_id AS new_active_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active prompt for a phase
CREATE OR REPLACE FUNCTION get_active_prompt(p_phase_code TEXT)
RETURNS TABLE(
  id UUID,
  phase_code TEXT,
  version TEXT,
  title TEXT,
  prompt_content TEXT,
  metadata JSONB,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pp.phase_code,
    pp.version,
    pp.title,
    pp.prompt_content,
    pp.metadata,
    pp.updated_at
  FROM phase_prompts pp
  WHERE pp.phase_code = p_phase_code AND pp.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active brief for a language pair
CREATE OR REPLACE FUNCTION get_active_brief(
  p_known_code TEXT,
  p_target_code TEXT
)
RETURNS TABLE(
  id UUID,
  known_code TEXT,
  target_code TEXT,
  version TEXT,
  brief_content JSONB,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lb.id,
    lb.known_code,
    lb.target_code,
    lb.version,
    lb.brief_content,
    lb.updated_at
  FROM language_briefs lb
  WHERE lb.known_code = p_known_code
    AND lb.target_code = p_target_code
    AND lb.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Tables created:
--   - phase_prompts: Phase 0/1/2/3 prompts with versioning
--   - language_briefs: CIK-enhanced language pair briefs
--   - apml_documents: APML specification documents
--
-- Constraints:
--   - Unique (phase_code, version) for phase_prompts
--   - Unique (known_code, target_code, version) for language_briefs
--   - Unique (document_path, version) for apml_documents
--   - Partial unique indexes enforce "only one active per phase/pair/document"
--
-- RLS:
--   - service_role: full access (all tables)
--   - authenticated: read access (all tables)
--   - anon: read active only (all tables)
--
-- Helper functions:
--   - activate_prompt_version(phase_code, version)
--   - activate_brief_version(known_code, target_code, version)
--   - get_active_prompt(phase_code)
--   - get_active_brief(known_code, target_code)
-- =============================================================================
