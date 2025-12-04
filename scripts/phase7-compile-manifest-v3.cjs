const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const langService = require('../services/language-code-service.cjs');

// ============================================================================
// PHASE 7 MANIFEST COMPILER V3
// ============================================================================
// Compiles course manifest from lego_pairs.json and lego_baskets.json
// Output: course_manifest.json with PLACEHOLDER UUIDs (populated later by lookup)
//
// KEY ARCHITECTURE:
// - Samples are stored with BLANK/placeholder UUIDs initially
// - Samples are matched via lang|text|role|cadence lookup against MAR/S3 index
// - Found samples get their UUIDs and durations populated from the index
// - Only samples that cannot be found get UUIDs assigned at generation time
//
// Practice phrase ordering:
// 1. Components (if M-type LEGO) - building blocks first
// 2. LEGO debut - the complete LEGO itself
// 3. Regular practice phrases - shortest to longest
// ============================================================================

// Accept courseCode as command-line argument
const courseCode = process.argv[2];
if (!courseCode) {
  console.error('Error: Course code required');
  console.error('Usage: node phase7-compile-manifest-v3.cjs <courseCode>');
  console.error('Example: node phase7-compile-manifest-v3.cjs spa_for_eng');
  process.exit(1);
}

const VFS_ROOT = process.env.VFS_ROOT || path.join(__dirname, '../public/vfs/courses');
const COURSE_DIR = path.join(VFS_ROOT, courseCode);
const CANONICAL_DIR = path.join(__dirname, '../public/vfs/canonical');

console.log('Phase 7 Manifest Compiler V3\n');
console.log(`Course: ${courseCode}`);
console.log(`Course Dir: ${COURSE_DIR}`);
console.log('Loading input files...');

// Load required files
const legoPairs = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, 'lego_pairs.json')));
const legoBaskets = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, 'lego_baskets.json')));
const welcomes = JSON.parse(fs.readFileSync(path.join(CANONICAL_DIR, 'welcomes.json')));
const encouragements = JSON.parse(fs.readFileSync(path.join(CANONICAL_DIR, 'eng_encouragements.json')));

// Try to load seed_pairs for fallback seed sentences
let seedPairs = null;
try {
  seedPairs = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, 'seed_pairs.json')));
} catch (e) {
  console.log('Note: seed_pairs.json not found, will use lego_pairs for seed sentences');
}

// Extract language info from lego_pairs or seed_pairs
const knownLang = seedPairs?.known_language || legoPairs.known_language || 'eng';
const targetLang = seedPairs?.target_language || legoPairs.target_language || courseCode.split('_')[0];

// Use centralized language-code-service for conversions
// @see /docs/architecture/LANGUAGE_CODE_STRATEGY.md
const manifestKnown = langService.legacyToStandard(knownLang);
const manifestTarget = langService.legacyToStandard(targetLang);

// Get language names from service
const targetName = langService.getName(targetLang);
const welcome = welcomes.welcomes[courseCode];

console.log(`Known: ${knownLang} -> ${manifestKnown}`);
console.log(`Target: ${targetLang} -> ${manifestTarget}`);
console.log(`Target language name: ${targetName}`);
console.log(`Seeds: ${legoPairs.seeds.length}`);
console.log(`Baskets: ${Object.keys(legoBaskets.baskets).length}`);
console.log(`Welcome: ${welcome ? 'Found' : 'NOT FOUND'}\n`);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate deterministic UUID from content
 */
function generateUUID(content) {
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-').toUpperCase();
}

/**
 * Create language node with text and empty tokens/lemmas
 */
function createLanguageNode(text) {
  return {
    text: text,
    tokens: [],
    lemmas: []
  };
}

/**
 * Create node with ID and known/target language nodes
 */
function createNode(knownText, targetText, idPrefix) {
  const nodeId = generateUUID(`${idPrefix}:${knownText}:${targetText}`);
  return {
    id: nodeId,
    known: createLanguageNode(knownText),
    target: createLanguageNode(targetText)
  };
}

/**
 * Generate presentation text for a LEGO
 * Format: "The {Language} for '{known}', is: ... '{target}' ... '{target}'"
 */
function generatePresentation(known, target, targetLangName) {
  return `The ${targetLangName} for '${known.toLowerCase()}', is: ... '${target}' ... '${target}'`;
}

/**
 * Sort phrases by target text length (shortest first)
 */
function sortByLength(phrases) {
  return [...phrases].sort((a, b) => a.target.length - b.target.length);
}

// ============================================================================
// BUILD MANIFEST
// ============================================================================

console.log('Building manifest structure...\n');

const manifest = {
  id: `${manifestKnown}-${manifestTarget}`,
  known: manifestKnown,
  target: manifestTarget,
  version: "8.2.0",
  status: "alpha",
  introduction: {
    id: welcome ? welcome.id : generateUUID('welcome:' + courseCode),
    cadence: "natural",
    role: "presentation",
    duration: welcome ? welcome.duration : 0
  },
  slices: []
};

// Track all samples (text -> array of entries)
const allSamples = new Map();

// Placeholder UUID - indicates sample needs lookup/generation
const PLACEHOLDER_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Add a sample entry for a text
 * @param {string} text - The text content
 * @param {string} language - Language code (e.g., 'eng', 'spa', 'cmn')
 * @param {string} role - One of: source, target1, target2, presentation, presentation_encouragement
 */
function addSample(text, language, role) {
  if (!allSamples.has(text)) {
    allSamples.set(text, []);
  }

  // Check if this role already exists for this text
  const existing = allSamples.get(text);
  const hasRole = existing.some(e => e.role === role);
  if (hasRole) return;  // Don't add duplicate roles

  // Target roles (target1, target2) use slow cadence for learner comprehension
  // Source/presentation roles use natural cadence
  const cadence = (role === 'target1' || role === 'target2') ? 'slow' : 'natural';

  // Use placeholder UUID - will be populated later via lang|text|role|cadence lookup
  existing.push({
    duration: 0,
    id: PLACEHOLDER_UUID,
    cadence: cadence,
    role: role,
    language: language  // Include language for lookup
  });
}

/**
 * Add samples for a known (source) text - single entry
 * Uses knownLang (typically 'eng')
 */
function addSourceSample(text) {
  addSample(text, knownLang, 'source');
}

/**
 * Add samples for a target text - TWO entries (target1 and target2)
 * Uses targetLang (e.g., 'spa', 'cmn', 'ita')
 */
function addTargetSamples(text) {
  addSample(text, targetLang, 'target1');
  addSample(text, targetLang, 'target2');
}

/**
 * Add sample for presentation text - single entry
 * Presentations are typically in the known language (English)
 */
function addPresentationSample(text) {
  addSample(text, knownLang, 'presentation');
}

// Single slice
const slice = {
  id: generateUUID('slice:main:' + courseCode),
  seeds: [],
  pooledEncouragements: encouragements.pooledEncouragements.map(enc => ({
    text: enc.text,
    id: enc.id
  })),
  orderedEncouragements: encouragements.orderedEncouragements.map(enc => ({
    text: enc.text,
    id: enc.id
  })),
  samples: {},  // Will be populated below
  version: "8.2.0"
};

// Add welcome to samples (presentation role - in English/known language)
if (welcome && welcome.text) {
  addSample(welcome.text, knownLang, 'presentation');
}

// Add encouragements to samples (presentation_encouragement role - in English/known language)
encouragements.pooledEncouragements.forEach((enc, idx) => {
  addSample(enc.text, knownLang, 'presentation_encouragement');
});

// ============================================================================
// PROCESS EACH SEED
// ============================================================================

console.log('Processing seeds and LEGOs...');

let processedSeeds = 0;
let processedLegos = 0;
let processedNodes = 0;
let skippedReviewLegos = 0;

legoPairs.seeds.forEach((seedData) => {
  const seedId = seedData.seed_id;

  // Get seed sentence from lego_pairs or fall back to seed_pairs
  let seedKnown, seedTarget;
  if (seedData.seed && seedData.seed.known && seedData.seed.target) {
    seedKnown = seedData.seed.known;
    seedTarget = seedData.seed.target;
  } else if (seedPairs && seedPairs.translations[seedId]) {
    seedKnown = seedPairs.translations[seedId].known;
    seedTarget = seedPairs.translations[seedId].target;
  } else {
    console.warn(`Warning: No seed sentence found for ${seedId}`);
    return;
  }

  // Create seed object
  const seed = {
    id: generateUUID('seed:' + seedId),
    seed_sentence: {
      canonical: seedKnown
    },
    node: createNode(seedKnown, seedTarget, 'seed:' + seedId),
    introduction_items: []
  };

  // Add seed samples
  addSourceSample(seedKnown);
  addTargetSamples(seedTarget);

  // Process each LEGO in this seed
  seedData.legos.forEach((lego) => {
    const legoId = lego.id;
    const legoKnown = lego.lego.known;
    const legoTarget = lego.lego.target;
    const legoType = lego.type;  // 'A' or 'M'
    const isNew = lego.new;
    const components = lego.components || [];

    // Get basket for this LEGO
    const basket = legoBaskets.baskets[legoId];

    // Skip review LEGOs (new=false) that don't have baskets
    if (!isNew && !basket) {
      skippedReviewLegos++;
      return;
    }

    // Skip if no basket at all
    if (!basket) {
      return;
    }

    // Generate presentation text
    const presentationText = generatePresentation(legoKnown, legoTarget, targetName);

    // Create introduction item
    const introItem = {
      id: generateUUID('intro:' + legoId),
      node: createNode(legoKnown, legoTarget, 'lego:' + legoId),
      nodes: [],
      presentation: presentationText
    };

    // Add LEGO samples
    addSourceSample(legoKnown);
    addTargetSamples(legoTarget);
    addPresentationSample(presentationText);

    // Build ordered practice nodes:
    // 1. Components (if M-type LEGO)
    // 2. LEGO debut (the LEGO itself)
    // 3. Regular practice phrases sorted by length

    const practiceNodes = [];

    // 1. Add components first (for M-type LEGOs)
    if (legoType === 'M' && components.length > 0) {
      components.forEach((comp, idx) => {
        const node = createNode(comp.known, comp.target, `comp:${legoId}:${idx}`);
        practiceNodes.push(node);
        // Add component samples
        addSourceSample(comp.known);
        addTargetSamples(comp.target);
        processedNodes++;
      });
    }

    // 2. Add LEGO debut (the LEGO itself as first practice)
    const debutNode = createNode(legoKnown, legoTarget, `debut:${legoId}`);
    practiceNodes.push(debutNode);
    processedNodes++;

    // 3. Add remaining practice phrases (sorted by length)
    if (basket.practice_phrases && basket.practice_phrases.length > 0) {
      // Filter out the LEGO itself (already added as debut)
      const regularPhrases = basket.practice_phrases.filter(p =>
        p.target.toLowerCase() !== legoTarget.toLowerCase()
      );

      // Sort by target length (shortest first)
      const sortedPhrases = sortByLength(regularPhrases);

      sortedPhrases.forEach((phrase, idx) => {
        const node = createNode(phrase.known, phrase.target, `phrase:${legoId}:${idx}`);
        practiceNodes.push(node);
        // Add phrase samples
        addSourceSample(phrase.known);
        addTargetSamples(phrase.target);
        processedNodes++;
      });
    }

    introItem.nodes = practiceNodes;
    seed.introduction_items.push(introItem);
    processedLegos++;
  });

  // Only add seed if it has introduction items
  if (seed.introduction_items.length > 0) {
    slice.seeds.push(seed);
    processedSeeds++;
  }

  if (processedSeeds % 100 === 0 && processedSeeds > 0) {
    console.log(`  Processed ${processedSeeds} seeds...`);
  }
});

// ============================================================================
// POPULATE SAMPLES
// ============================================================================

console.log('\nPopulating samples...');

// Convert Map to object for samples
allSamples.forEach((entries, text) => {
  slice.samples[text] = entries;
});

// Count samples by role
const roleCounts = {};
allSamples.forEach((entries) => {
  entries.forEach(e => {
    roleCounts[e.role] = (roleCounts[e.role] || 0) + 1;
  });
});

console.log('Sample counts by role:');
Object.entries(roleCounts).sort().forEach(([role, count]) => {
  console.log(`  ${role}: ${count}`);
});

// ============================================================================
// FINALIZE AND WRITE
// ============================================================================

manifest.slices.push(slice);

// Generate timestamp
const now = new Date();
const timestamp = now.getFullYear() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0') + '_' +
  String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');

const targetNameClean = targetName.replace(/\s+/g, '_');
const knownNameClean = (langNames[knownLang] || 'English').replace(/\s+/g, '_');
const manifestFilename = `${targetNameClean}_for_${knownNameClean}_speakers_COURSE_${timestamp}.json`;

const outputPath = path.join(COURSE_DIR, manifestFilename);

// Write manifest
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 1));

// Also save as course_manifest.json
const standardPath = path.join(COURSE_DIR, 'course_manifest.json');
fs.copyFileSync(outputPath, standardPath);

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\nManifest compilation complete!\n');
console.log('Summary:');
console.log(`  Seeds: ${processedSeeds}`);
console.log(`  LEGOs (introduction_items): ${processedLegos}`);
console.log(`  Practice nodes: ${processedNodes}`);
console.log(`  Skipped review LEGOs: ${skippedReviewLegos}`);
console.log(`  Unique sample texts: ${allSamples.size}`);
console.log(`  Total sample entries: ${Object.values(roleCounts).reduce((a, b) => a + b, 0)}`);
console.log(`  Output: ${manifestFilename}`);
console.log(`  Also saved as: course_manifest.json`);
console.log(`  Size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB\n`);
