#!/usr/bin/env node
/**
 * Manifest Compiler v11
 *
 * Compiles course_manifest.json from:
 * - lego_pairs.json (seeds with LEGOs, new: true/false flags)
 * - lego_baskets.json (practice phrases per LEGO)
 * - welcomes.json (course introduction)
 * - eng_encouragements.json (encouragements)
 * - voices.json (voice assignments for sample IDs)
 *
 * v11 Spec:
 * - Structured node IDs: S0042L01-LEGO-0000-{hash}
 * - Cadence: source=natural, target1/target2=slow
 * - Skip new: false LEGOs (already introduced)
 * - Skip seeds with no new: true LEGOs
 * - Tokens/lemmas: empty arrays []
 *
 * Usage: node compile-manifest-v11.cjs <course_code>
 * Example: node compile-manifest-v11.cjs spa_for_eng
 */

const fs = require('fs');
const path = require('path');
const uuid = require('../services/uuid-v11.cjs');

// =============================================================================
// CONFIGURATION
// =============================================================================

const courseCode = process.argv[2];
if (!courseCode) {
  console.error('Usage: node compile-manifest-v11.cjs <course_code>');
  console.error('Example: node compile-manifest-v11.cjs spa_for_eng');
  process.exit(1);
}

const VFS_ROOT = path.join(__dirname, '../public/vfs');
const COURSE_DIR = path.join(VFS_ROOT, 'courses', courseCode);
const CANONICAL_DIR = path.join(VFS_ROOT, 'canonical');

// Language code mappings
const LANG_CODES = {
  'eng': { short: 'en', name: 'English' },
  'spa': { short: 'es', name: 'Spanish' },
  'ita': { short: 'it', name: 'Italian' },
  'cmn': { short: 'zh', name: 'Chinese' },
  'fra': { short: 'fr', name: 'French' },
  'deu': { short: 'de', name: 'German' },
  'por': { short: 'pt', name: 'Portuguese' },
  'cym': { short: 'cy', name: 'Welsh' },
  'jpn': { short: 'ja', name: 'Japanese' }
};

// =============================================================================
// LOAD INPUT FILES
// =============================================================================

console.log('═'.repeat(70));
console.log(' MANIFEST COMPILER v11');
console.log(' Course: ' + courseCode);
console.log('═'.repeat(70));
console.log('');

console.log('[1/6] Loading input files...');

// Required course files
const legoPairsPath = path.join(COURSE_DIR, 'lego_pairs.json');
const legoBasketsPath = path.join(COURSE_DIR, 'lego_baskets.json');

if (!fs.existsSync(legoPairsPath)) {
  console.error('ERROR: lego_pairs.json not found at ' + legoPairsPath);
  process.exit(1);
}
if (!fs.existsSync(legoBasketsPath)) {
  console.error('ERROR: lego_baskets.json not found at ' + legoBasketsPath);
  process.exit(1);
}

const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
const legoBaskets = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));

// Canonical files
const welcomesPath = path.join(CANONICAL_DIR, 'welcomes.json');
const encouragementsPath = path.join(CANONICAL_DIR, 'eng_encouragements.json');
const voicesPath = path.join(CANONICAL_DIR, 'voices.json');

let welcomes = {};
let encouragements = { pooledEncouragements: [], orderedEncouragements: [] };
let voices = {};

if (fs.existsSync(welcomesPath)) {
  welcomes = JSON.parse(fs.readFileSync(welcomesPath, 'utf8'));
}
if (fs.existsSync(encouragementsPath)) {
  encouragements = JSON.parse(fs.readFileSync(encouragementsPath, 'utf8'));
}
if (fs.existsSync(voicesPath)) {
  voices = JSON.parse(fs.readFileSync(voicesPath, 'utf8'));
}

// Extract language info
const targetLang3 = courseCode.split('_')[0]; // e.g., 'spa'
const knownLang3 = 'eng';
const targetLang = LANG_CODES[targetLang3]?.short || targetLang3;
const knownLang = LANG_CODES[knownLang3]?.short || 'en';
const targetName = LANG_CODES[targetLang3]?.name || targetLang3;

// Get voice IDs (for sample ID generation)
const targetVoiceId = voices.target_voice || `azure_${targetLang3}`;
const knownVoiceId = voices.known_voice || 'azure_eng';
const presentationVoiceId = voices.presentation_voice || 'azure_eng';

console.log('  lego_pairs.json: ' + legoPairs.seeds.length + ' seeds');
console.log('  lego_baskets.json: ' + Object.keys(legoBaskets.baskets || {}).length + ' baskets');
console.log('  Target: ' + targetLang3 + ' → ' + targetLang + ' (' + targetName + ')');
console.log('  Known: ' + knownLang3 + ' → ' + knownLang);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Tokenize text (just lowercase split, no real tokenization)
 */
function tokenize(text) {
  // Return empty array per v11 spec - tokens/lemmas not used
  return [];
}

/**
 * Create a language node (known or target half of a Node)
 */
function createLanguageNode(text) {
  return {
    text: text,
    tokens: tokenize(text),
    lemmas: []
  };
}

/**
 * Create a full Node (known + target pair)
 */
function createNode(nodeId, knownText, targetText) {
  return {
    id: nodeId,
    known: createLanguageNode(knownText),
    target: createLanguageNode(targetText)
  };
}

/**
 * Generate presentation text for a LEGO
 */
function generatePresentation(knownText, targetText, langName) {
  return `The ${langName} for '${knownText.toLowerCase()}', is: ... '${targetText}' ... '${targetText}'`;
}

/**
 * Parse seed ID to get numeric part: "s0042" → "S0042"
 */
function normalizeSeedId(seedId) {
  // Handle various formats: s0042, S0042, seed_0042, etc.
  const match = seedId.match(/(\d+)/);
  if (match) {
    return 'S' + match[1].padStart(4, '0');
  }
  return seedId.toUpperCase();
}

/**
 * Parse LEGO index from ID: "lego_s0042_001" → "L01"
 */
function normalizeLegoIndex(legoId, seedId) {
  // Try to extract LEGO number from ID
  const match = legoId.match(/_(\d+)$/);
  if (match) {
    return 'L' + match[1].padStart(2, '0');
  }
  // Fallback: use position
  return 'L01';
}

// =============================================================================
// SAMPLES DICTIONARY
// =============================================================================

const samples = {};
const sampleStats = {
  source: 0,
  target1: 0,
  target2: 0,
  presentation: 0,
  presentation_encouragement: 0
};

/**
 * Add a sample entry
 */
function addSample(text, lang3, role, voiceId) {
  if (!text || text.trim() === '') return;

  const cadence = uuid.getCadenceForRole(role);
  const sampleId = uuid.generateSampleId(voiceId, text, lang3, role, cadence);

  if (!samples[text]) {
    samples[text] = [];
  }

  // Check for duplicate role
  const existing = samples[text].find(s => s.role === role);
  if (!existing) {
    samples[text].push({
      id: sampleId,
      cadence: cadence,
      role: role,
      duration: 0  // Will be populated from Supabase
    });
    sampleStats[role] = (sampleStats[role] || 0) + 1;
  }
}

/**
 * Add samples for a known/target pair
 */
function addPairSamples(knownText, targetText) {
  addSample(knownText, knownLang3, 'source', knownVoiceId);
  addSample(targetText, targetLang3, 'target1', targetVoiceId);
  addSample(targetText, targetLang3, 'target2', targetVoiceId);
}

// =============================================================================
// BUILD MANIFEST
// =============================================================================

console.log('');
console.log('[2/6] Processing encouragements...');

// Add encouragement samples
const pooledEncouragements = [];
const orderedEncouragements = [];

for (const enc of (encouragements.pooledEncouragements || [])) {
  pooledEncouragements.push({ text: enc.text, id: enc.id });
  addSample(enc.text, knownLang3, 'presentation_encouragement', presentationVoiceId);
}

for (const enc of (encouragements.orderedEncouragements || [])) {
  orderedEncouragements.push({ text: enc.text, id: enc.id });
  addSample(enc.text, knownLang3, 'presentation_encouragement', presentationVoiceId);
}

console.log('  Pooled: ' + pooledEncouragements.length);
console.log('  Ordered: ' + orderedEncouragements.length);

console.log('');
console.log('[3/6] Building seeds and introduction_items...');

const seeds = [];
let skippedSeeds = 0;
let skippedLegos = 0;
let totalIntroItems = 0;
let totalNodes = 0;
const errors = [];

// Build basket lookup: LEGO ID → basket
const basketLookup = {};
for (const [legoId, basket] of Object.entries(legoBaskets.baskets || {})) {
  basketLookup[legoId] = basket;
}

for (const seedData of legoPairs.seeds) {
  const rawSeedId = seedData.seed_id;
  const seedId = normalizeSeedId(rawSeedId);

  // Get seed sentence
  const seedKnown = seedData.seed_pair?.known || seedData.seed?.known;
  const seedTarget = seedData.seed_pair?.target || seedData.seed?.target;

  if (!seedKnown || !seedTarget) {
    errors.push(`Seed ${rawSeedId}: Missing seed_pair known/target`);
    continue;
  }

  // Filter to only new: true LEGOs
  const newLegos = (seedData.legos || []).filter(l => l.new === true);

  if (newLegos.length === 0) {
    skippedSeeds++;
    skippedLegos += (seedData.legos || []).length;
    continue;
  }

  // Count skipped LEGOs in this seed
  skippedLegos += (seedData.legos || []).length - newLegos.length;

  // Build introduction_items for new LEGOs
  const introductionItems = [];
  let legoIndex = 0;

  for (const lego of newLegos) {
    legoIndex++;
    const legoIdNorm = 'L' + String(legoIndex).padStart(2, '0');
    const legoKnown = lego.lego?.known;
    const legoTarget = lego.lego?.target;

    if (!legoKnown || !legoTarget) {
      errors.push(`Seed ${rawSeedId}, LEGO ${lego.id}: Missing lego known/target`);
      continue;
    }

    // Get basket for this LEGO
    const basket = basketLookup[lego.id];
    if (!basket) {
      errors.push(`Seed ${rawSeedId}, LEGO ${lego.id}: No basket found (new: true LEGO must have practice phrases)`);
      continue;
    }

    // Generate IDs
    const introItemId = uuid.generateLegoNodeId(seedId, legoIdNorm, legoKnown, legoTarget);
    const legoNodeId = uuid.generateLegoNodeId(seedId, legoIdNorm, legoKnown, legoTarget);

    // Build practice nodes from basket
    const nodes = [];

    // Components (COMP) - for M-type LEGOs
    if (lego.type === 'M' && lego.components && lego.components.length > 0) {
      let compIndex = 0;
      for (const comp of lego.components) {
        compIndex++;
        const compNodeId = uuid.generateComponentNodeId(seedId, legoIdNorm, compIndex, comp.known, comp.target);
        nodes.push(createNode(compNodeId, comp.known, comp.target));
        addPairSamples(comp.known, comp.target);
        totalNodes++;
      }
    }

    // Debut phrases (DEBU) - from basket
    const debutPhrases = basket.debut_phrases || basket.practice_phrases || [];
    let debuIndex = 0;
    for (const phrase of debutPhrases) {
      debuIndex++;
      const debuNodeId = uuid.generateDebutNodeId(seedId, legoIdNorm, debuIndex, phrase.known, phrase.target);
      nodes.push(createNode(debuNodeId, phrase.known, phrase.target));
      addPairSamples(phrase.known, phrase.target);
      totalNodes++;
    }

    // Generate presentation text
    const presentationText = generatePresentation(legoKnown, legoTarget, targetName);

    // Add samples for this LEGO
    addPairSamples(legoKnown, legoTarget);
    addSample(presentationText, knownLang3, 'presentation', presentationVoiceId);

    // Create introduction_item
    introductionItems.push({
      id: introItemId,
      node: createNode(legoNodeId, legoKnown, legoTarget),
      nodes: nodes,
      presentation: presentationText
    });

    totalIntroItems++;
  }

  if (introductionItems.length === 0) {
    skippedSeeds++;
    continue;
  }

  // Create seed
  const seedNodeId = uuid.generateSeedNodeId(seedId, seedKnown, seedTarget);
  addPairSamples(seedKnown, seedTarget);

  seeds.push({
    id: seedNodeId,
    seed_sentence: {
      canonical: seedKnown
    },
    node: createNode(seedNodeId, seedKnown, seedTarget),
    introduction_items: introductionItems
  });
}

console.log('  Seeds included: ' + seeds.length);
console.log('  Seeds skipped (no new LEGOs): ' + skippedSeeds);
console.log('  LEGOs skipped (new: false): ' + skippedLegos);
console.log('  Introduction items: ' + totalIntroItems);
console.log('  Practice nodes: ' + totalNodes);

if (errors.length > 0) {
  console.log('');
  console.log('  ERRORS (' + errors.length + '):');
  for (const err of errors.slice(0, 10)) {
    console.log('    - ' + err);
  }
  if (errors.length > 10) {
    console.log('    ... and ' + (errors.length - 10) + ' more');
  }
}

// =============================================================================
// BUILD INTRODUCTION
// =============================================================================

console.log('');
console.log('[4/6] Building course introduction...');

const welcome = welcomes.welcomes?.[courseCode];
let introduction;

if (welcome) {
  introduction = {
    id: welcome.id,
    cadence: 'natural',
    role: 'presentation',
    duration: welcome.duration || 0
  };
  console.log('  Welcome found: ' + welcome.id);
} else {
  // Generate placeholder
  const introId = uuid.generateSampleId(presentationVoiceId, `Welcome to ${targetName}`, knownLang3, 'presentation', 'natural');
  introduction = {
    id: introId,
    cadence: 'natural',
    role: 'presentation',
    duration: 0
  };
  console.log('  Welcome not found, using placeholder');
}

// =============================================================================
// COMPILE MANIFEST
// =============================================================================

console.log('');
console.log('[5/6] Compiling manifest...');

const manifest = {
  id: `${knownLang}-${targetLang}`,
  known: knownLang,
  target: targetLang,
  version: '11.0.0',
  status: 'alpha',
  introduction: introduction,
  slices: [{
    id: uuid.uuidv5(`slice:${courseCode}:main`, uuid.SSI_AUDIO_NAMESPACE),
    version: '11.0.0',
    seeds: seeds,
    pooledEncouragements: pooledEncouragements,
    orderedEncouragements: orderedEncouragements,
    samples: samples
  }]
};

console.log('  Manifest ID: ' + manifest.id);
console.log('  Version: ' + manifest.version);
console.log('  Unique sample texts: ' + Object.keys(samples).length);
console.log('');
console.log('  Sample counts by role:');
for (const [role, count] of Object.entries(sampleStats).sort()) {
  console.log('    ' + role + ': ' + count);
}

// =============================================================================
// WRITE OUTPUT
// =============================================================================

console.log('');
console.log('[6/6] Writing output...');

const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
const manifestFilename = `${targetName}_for_English_speakers_COURSE_${timestamp}.json`;
const manifestPath = path.join(COURSE_DIR, manifestFilename);
const standardPath = path.join(COURSE_DIR, 'course_manifest.json');

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
fs.writeFileSync(standardPath, JSON.stringify(manifest, null, 2));

const fileSize = fs.statSync(manifestPath).size;

console.log('  ' + manifestFilename);
console.log('  course_manifest.json');
console.log('  Size: ' + (fileSize / 1024 / 1024).toFixed(2) + ' MB');

console.log('');
console.log('═'.repeat(70));
console.log(' COMPLETE');
console.log('═'.repeat(70));
console.log('');
