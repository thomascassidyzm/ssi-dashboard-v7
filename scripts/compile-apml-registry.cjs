#!/usr/bin/env node

/**
 * APML Registry Compiler
 *
 * Reads ssi-course-production.apml and generates .apml-registry.json
 * This machine-readable format is consumed by automation_server.cjs and dashboard
 */

const fs = require('fs');
const path = require('path');

const APML_FILE = path.join(__dirname, '..', 'ssi-course-production.apml');
const REGISTRY_FILE = path.join(__dirname, '..', '.apml-registry.json');

console.log('🔧 APML Registry Compiler');
console.log('─'.repeat(60));

// Read APML file
console.log(`📖 Reading APML specification...`);
const apmlContent = fs.readFileSync(APML_FILE, 'utf8');

// Extract phase prompts
console.log(`🔍 Extracting phase prompts...`);
const phasePrompts = {};

// Phase extraction regex - matches "## Phase X:" through "PROMPT: |" block
const phaseRegex = /## Phase ([\d.]+):[^\n]*\n\nNAME: "([^"]+)"[\s\S]*?PROMPT: \|([\s\S]*?)(?=\n## Phase|\n# =====|$)/g;

let match;
let phaseCount = 0;

while ((match = phaseRegex.exec(apmlContent)) !== null) {
  const phaseId = match[1];
  const phaseName = match[2];
  const prompt = match[3].trim();

  phasePrompts[`PHASE_${phaseId.replace('.', '_')}`] = {
    phase: phaseId,
    name: phaseName,
    prompt: prompt
  };

  phaseCount++;
  console.log(`  ✓ Phase ${phaseId}: ${phaseName}`);
}

console.log(`✅ Extracted ${phaseCount} phase prompts`);

// Extract variable registry
console.log(`🔍 Extracting variable registry...`);

// Extract version from APML
const versionMatch = apmlContent.match(/version:\s*"([^"]+)"/);
const version = versionMatch ? versionMatch[1] : '7.0.0';

const registry = {
  version: version,
  generated_at: new Date().toISOString(),
  apml_file: 'ssi-course-production.apml',

  variable_registry: {
    TOTAL_SEEDS: 668,

    BATCH_SIZES: {
      PHASE_1_TRANSLATION: 100,
      PHASE_3_LEGO_DECOMPOSITION: 20,
      PHASE_5_BASKETS: 20
    },

    VFS_PATHS: {
      BASE: '/Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses',
      COURSE_FORMAT: '{target_code}_for_{known_code}_speakers'
    },

    API_ENDPOINTS: {
      COURSES_GENERATE: '/api/courses/generate',
      COURSES_STATUS: '/api/courses/:courseCode/status',
      COURSES_LIST: '/api/courses',
      COURSES_GET: '/api/courses/:courseCode',
      PROMPTS_GET: '/api/prompts/:phase',
      PROMPTS_UPDATE: '/api/prompts/:phase',
      PROMPTS_HISTORY: '/api/prompts/:phase/history'
    },

    PHASE_PROMPTS: phasePrompts
  },

  system: {
    name: 'SSi Course Production System',
    description: 'Self-improving language course generation with recursive intelligence evolution',
    architecture: 'Vue3 + Node.js + Claude Code (Sonnet 4.5)',
    deployment: 'Vercel (dashboard) + Local Mac (automation)'
  }
};

// Write registry
console.log(`💾 Writing registry to ${path.basename(REGISTRY_FILE)}...`);
fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));

console.log(`✅ Registry compiled successfully!`);
console.log(`─`.repeat(60));
console.log(`📄 Output: ${REGISTRY_FILE}`);
console.log(`📊 Phases: ${phaseCount}`);
console.log(`🎯 Ready for consumption by automation_server.cjs`);
