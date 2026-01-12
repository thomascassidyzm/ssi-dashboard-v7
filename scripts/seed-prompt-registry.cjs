#!/usr/bin/env node

/**
 * Seed Prompt Registry
 *
 * Seeds the Supabase prompt registry tables with existing prompts
 * and language briefs. This script is idempotent - safe to run multiple times.
 *
 * Tables seeded:
 * - phase_prompts: Phase 0/1/2/3 prompts
 * - language_briefs: CIK-enhanced language pair briefs
 *
 * @version 1.0.0
 * @date 2026-01-12
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabase, isInitialized } = require('../services/supabase-client.cjs');

// =============================================================================
// CONFIGURATION
// =============================================================================

const PROMPT_FILES = {
  phase0: {
    path: 'services/phases/phase0-language-brief/PROMPT.md',
    title: 'Language Pair Intelligence Brief',
    version: 'v1.2-file'
  },
  phase1: {
    path: 'services/phases/phase1-translation/PROMPT.md',
    title: 'LEGO Pair Generation (Translation + Extraction)',
    version: 'v9.2-file'
  },
  phase2: {
    path: 'services/phases/phase2-conflict-resolution/PROMPT.md',
    title: 'Conflict Resolution',
    version: 'v8.1-file'
  },
  phase3: {
    path: 'services/phases/phase3-basket-generation/PROMPT.md',
    title: 'Basket Generation',
    version: 'v8.0-file'
  }
};

const LANGUAGE_BRIEF_FILE = '/tmp/ita-for-eng-brief-cik.json';

// =============================================================================
// LOGGING HELPERS
// =============================================================================

const log = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`),
  warn: (msg) => console.log(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  skip: (msg) => console.log(`[SKIP] ${msg}`)
};

// =============================================================================
// PHASE PROMPTS SEEDING
// =============================================================================

/**
 * Check if a prompt version already exists
 */
async function promptExists(phaseCode, version) {
  const { data, error } = await supabase
    .from('phase_prompts')
    .select('id')
    .eq('phase_code', phaseCode)
    .eq('version', version)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return !!data;
}

/**
 * Insert a phase prompt
 */
async function insertPrompt(phaseCode, version, title, content, isActive = true) {
  // Check if exists first (idempotent)
  const exists = await promptExists(phaseCode, version);
  if (exists) {
    log.skip(`${phaseCode} version ${version} already exists`);
    return { skipped: true };
  }

  // If setting this as active, first deactivate any existing active version
  if (isActive) {
    const { error: deactivateError } = await supabase
      .from('phase_prompts')
      .update({ is_active: false })
      .eq('phase_code', phaseCode)
      .eq('is_active', true);

    if (deactivateError) {
      log.warn(`Could not deactivate existing ${phaseCode} prompts: ${deactivateError.message}`);
    }
  }

  const { data, error } = await supabase
    .from('phase_prompts')
    .insert({
      phase_code: phaseCode,
      version: version,
      title: title,
      prompt_content: content,
      is_active: isActive,
      metadata: {
        source: 'file',
        seeded_at: new Date().toISOString(),
        seeded_by: 'seed-prompt-registry.cjs'
      }
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Seed all phase prompts from files
 */
async function seedPhasePrompts() {
  log.info('Seeding phase prompts...');

  const baseDir = path.resolve(__dirname, '..');
  let successCount = 0;
  let skipCount = 0;

  for (const [phaseCode, config] of Object.entries(PROMPT_FILES)) {
    const filePath = path.join(baseDir, config.path);

    try {
      // Read the prompt file
      if (!fs.existsSync(filePath)) {
        log.error(`File not found: ${filePath}`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      log.info(`Read ${config.path} (${content.length} chars)`);

      // Insert into database
      const result = await insertPrompt(
        phaseCode,
        config.version,
        config.title,
        content,
        true // is_active
      );

      if (result.skipped) {
        skipCount++;
      } else {
        log.success(`Inserted ${phaseCode} (${config.version}): ${result.title}`);
        successCount++;
      }

    } catch (err) {
      log.error(`Failed to seed ${phaseCode}: ${err.message}`);
    }
  }

  log.info(`Phase prompts: ${successCount} inserted, ${skipCount} skipped`);
}

// =============================================================================
// LANGUAGE BRIEFS SEEDING
// =============================================================================

/**
 * Check if a language brief version already exists
 */
async function briefExists(knownCode, targetCode, version) {
  const { data, error } = await supabase
    .from('language_briefs')
    .select('id')
    .eq('known_code', knownCode)
    .eq('target_code', targetCode)
    .eq('version', version)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return !!data;
}

/**
 * Insert a language brief
 */
async function insertBrief(knownCode, targetCode, version, content, isActive = true) {
  // Check if exists first (idempotent)
  const exists = await briefExists(knownCode, targetCode, version);
  if (exists) {
    log.skip(`Brief ${knownCode}->${targetCode} version ${version} already exists`);
    return { skipped: true };
  }

  // If setting this as active, first deactivate any existing active version for this pair
  if (isActive) {
    const { error: deactivateError } = await supabase
      .from('language_briefs')
      .update({ is_active: false })
      .eq('known_code', knownCode)
      .eq('target_code', targetCode)
      .eq('is_active', true);

    if (deactivateError) {
      log.warn(`Could not deactivate existing ${knownCode}->${targetCode} briefs: ${deactivateError.message}`);
    }
  }

  const { data, error } = await supabase
    .from('language_briefs')
    .insert({
      known_code: knownCode,
      target_code: targetCode,
      version: version,
      brief_content: content,
      is_active: isActive
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Seed language briefs from files
 */
async function seedLanguageBriefs() {
  log.info('Seeding language briefs...');

  let successCount = 0;
  let skipCount = 0;

  // Italian for English speakers (from /tmp)
  try {
    if (!fs.existsSync(LANGUAGE_BRIEF_FILE)) {
      log.warn(`Brief file not found: ${LANGUAGE_BRIEF_FILE}`);
    } else {
      const content = fs.readFileSync(LANGUAGE_BRIEF_FILE, 'utf-8');
      const briefData = JSON.parse(content);
      log.info(`Read Italian brief (${Object.keys(briefData).length} top-level keys)`);

      const result = await insertBrief(
        'eng',      // known_code (English)
        'ita',      // target_code (Italian)
        'v1.0-cik', // version
        briefData,  // brief_content (JSON object)
        true        // is_active
      );

      if (result.skipped) {
        skipCount++;
      } else {
        log.success(`Inserted brief eng->ita (v1.0-cik)`);
        successCount++;
      }
    }
  } catch (err) {
    log.error(`Failed to seed Italian brief: ${err.message}`);
  }

  log.info(`Language briefs: ${successCount} inserted, ${skipCount} skipped`);
}

// =============================================================================
// MIGRATION SQL
// =============================================================================

/**
 * Returns the SQL to create the prompt registry tables
 */
function getMigrationSQL() {
  return `
-- ============================================================================
-- PROMPT REGISTRY MIGRATION
-- Run this in Supabase SQL Editor to create the required tables
-- ============================================================================

-- Phase Prompts Table
CREATE TABLE IF NOT EXISTS phase_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_code TEXT NOT NULL CHECK (phase_code IN ('phase0', 'phase1', 'phase2', 'phase3')),
  version TEXT NOT NULL,
  title TEXT,
  prompt_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (phase_code, version)
);

-- Ensure only one active version per phase
CREATE UNIQUE INDEX IF NOT EXISTS one_active_per_phase
ON phase_prompts (phase_code)
WHERE is_active = true;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_phase_prompts_phase_code ON phase_prompts (phase_code);
CREATE INDEX IF NOT EXISTS idx_phase_prompts_is_active ON phase_prompts (is_active);

-- Language Briefs Table
CREATE TABLE IF NOT EXISTS language_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  known_code TEXT NOT NULL,
  target_code TEXT NOT NULL,
  version TEXT NOT NULL,
  brief_content JSONB NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (known_code, target_code, version)
);

-- Ensure only one active version per language pair
CREATE UNIQUE INDEX IF NOT EXISTS one_active_per_pair
ON language_briefs (known_code, target_code)
WHERE is_active = true;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_language_briefs_pair ON language_briefs (known_code, target_code);
CREATE INDEX IF NOT EXISTS idx_language_briefs_is_active ON language_briefs (is_active);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_phase_prompts_updated_at ON phase_prompts;
CREATE TRIGGER update_phase_prompts_updated_at
  BEFORE UPDATE ON phase_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_language_briefs_updated_at ON language_briefs;
CREATE TRIGGER update_language_briefs_updated_at
  BEFORE UPDATE ON language_briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant access to authenticated users (adjust as needed)
-- GRANT SELECT ON phase_prompts TO authenticated;
-- GRANT SELECT ON language_briefs TO authenticated;

SELECT 'Prompt Registry tables created successfully!' AS status;
`;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('SEED PROMPT REGISTRY');
  console.log('='.repeat(60));
  console.log();

  // Check Supabase connection
  if (!isInitialized()) {
    log.error('Supabase not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_KEY.');
    process.exit(1);
  }
  log.success('Supabase connection initialized');

  // Test connection and check if tables exist
  try {
    const { data, error } = await supabase.from('phase_prompts').select('id').limit(1);
    if (error) {
      const msg = error.message || '';
      const isTableMissing = msg.includes('does not exist') ||
                             msg.includes('Could not find the table') ||
                             error.code === '42P01' ||
                             error.code === 'PGRST204';

      if (isTableMissing) {
        log.error('Table "phase_prompts" does not exist. Please run the migration first.');
        log.info('');
        log.info('Run the following SQL in Supabase SQL Editor:');
        log.info('');
        console.log(getMigrationSQL());
        process.exit(1);
      }
      throw error;
    }
    log.success('Database connection verified');
  } catch (err) {
    log.error(`Database connection failed: ${err.message}`);
    process.exit(1);
  }

  console.log();

  // Seed phase prompts
  await seedPhasePrompts();

  console.log();

  // Seed language briefs
  await seedLanguageBriefs();

  console.log();
  console.log('='.repeat(60));
  console.log('SEEDING COMPLETE');
  console.log('='.repeat(60));
}

main().catch(err => {
  log.error(`Unexpected error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
