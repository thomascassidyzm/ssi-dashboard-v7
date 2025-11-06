#!/usr/bin/env node

/**
 * Phase 7: Course Manifest Compilation for Spanish Course
 *
 * Compiles v7.7 format files (lego_pairs, baskets, introductions) into
 * the legacy course manifest format required by the SSi mobile app.
 *
 * This script is adapted from phase_7_compilation.md for the Spanish course baskets format.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Configuration
const COURSE_NAME = 'spa_for_eng';
const NUM_SEEDS = 100;
const COURSE_DIR = path.join(__dirname, `../public/vfs/courses/${COURSE_NAME}`);
const BASKETS_DIR = path.join(COURSE_DIR, 'baskets');
const OUTPUT_FILE = path.join(COURSE_DIR, `${COURSE_NAME}_${NUM_SEEDS}seeds.json`);

// Files to read
const LEGO_PAIRS_FILE = path.join(COURSE_DIR, 'lego_pairs.json');
const INTRODUCTIONS_FILE = path.join(COURSE_DIR, 'introductions.json');

// Role-specific UUID segments (SSi legacy format)
const ROLE_SEGMENTS = {
  'target1': { seg3: 'AC07', seg4: '8F4E' },
  'target2': { seg3: 'E115', seg4: '8F4E' },
  'source':  { seg3: '36CD', seg4: '31D4' }
};

/**
 * Generate deterministic UUID for audio samples
 * Format: XXXXXXXX-6044-YYYY-ZZZZ-XXXXXXXXXXXX
 */
function generateSampleUUID(text, language, role, cadence) {
  const input = `${text}|${language}|${role}|${cadence}`;
  const hash = crypto.createHash('sha1').update(input).digest('hex');

  const segments = ROLE_SEGMENTS[role];
  if (!segments) {
    throw new Error(`Unknown role: ${role}`);
  }

  return `${hash.substring(0, 8).toUpperCase()}-6044-${segments.seg3}-${segments.seg4}-${hash.substring(hash.length - 12).toUpperCase()}`;
}

/**
 * Create a node structure with empty tokens/lemmas arrays
 */
function createNode(targetText, knownText) {
  const id = uuidv4().toUpperCase();
  return {
    id,
    target: {
      tokens: [],
      text: targetText,
      lemmas: []
    },
    known: {
      tokens: [],
      text: knownText,
      lemmas: []
    }
  };
}

/**
 * Register audio samples for a phrase
 */
function registerSamples(samplesObj, text, language, isTarget) {
  if (!samplesObj[text]) {
    samplesObj[text] = [];
  }

  if (isTarget) {
    // Target language gets two voice variants
    samplesObj[text].push(
      {
        id: generateSampleUUID(text, language, 'target1', 'natural'),
        cadence: 'natural',
        role: 'target1'
      },
      {
        id: generateSampleUUID(text, language, 'target2', 'natural'),
        cadence: 'natural',
        role: 'target2'
      }
    );
  } else {
    // Source language gets one voice
    samplesObj[text].push({
      id: generateSampleUUID(text, language, 'source', 'natural'),
      cadence: 'natural',
      role: 'source'
    });
  }
}

/**
 * Load basket files for the first N seeds
 */
function loadBaskets(numSeeds = NUM_SEEDS) {
  const baskets = [];
  for (let i = 1; i <= numSeeds; i++) {
    const seedNum = String(i).padStart(4, '0');
    const basketFile = path.join(BASKETS_DIR, `lego_baskets_s${seedNum}.json`);

    if (fs.existsSync(basketFile)) {
      const basket = JSON.parse(fs.readFileSync(basketFile, 'utf8'));
      baskets.push(basket);
    } else {
      console.warn(`Warning: Basket file not found: ${basketFile}`);
    }
  }
  return baskets;
}

/**
 * Main compilation function
 */
function compileManifest() {
  console.log('Starting Phase 7: Course Manifest Compilation for Spanish...\n');

  // Load input files
  console.log('Loading input files...');
  const legoPairs = JSON.parse(fs.readFileSync(LEGO_PAIRS_FILE, 'utf8'));
  const introductions = JSON.parse(fs.readFileSync(INTRODUCTIONS_FILE, 'utf8'));
  const baskets = loadBaskets(); // Load configured number of seeds

  console.log(`✓ Loaded ${legoPairs.seeds.length} seeds from lego_pairs.json`);
  console.log(`✓ Loaded ${Object.keys(introductions.introductions).length} introductions`);
  console.log(`✓ Loaded ${baskets.length} baskets\n`);

  // Initialize manifest structure
  const manifest = {
    id: 'spa-eng',
    version: '7.8.0',
    target: 'spa',
    known: 'eng',
    slices: [{
      id: uuidv4().toUpperCase(),
      version: '7.8.0',
      seeds: [],
      samples: {}
    }]
  };

  const slice = manifest.slices[0];
  const samples = slice.samples;

  console.log('Compiling seeds...');

  // Process each seed
  for (let seedIndex = 0; seedIndex < Math.min(NUM_SEEDS, legoPairs.seeds.length); seedIndex++) {
    const seedData = legoPairs.seeds[seedIndex];
    const basket = baskets[seedIndex];

    if (!basket) {
      console.warn(`Warning: No basket found for seed ${seedData.seed_id}`);
      continue;
    }

    console.log(`  Processing ${seedData.seed_id}...`);

    // Create seed node
    const seedNode = createNode(seedData.seed_pair[0], seedData.seed_pair[1]);

    // Register seed sentence samples
    registerSamples(samples, seedData.seed_pair[0], 'spa', true);
    registerSamples(samples, seedData.seed_pair[1], 'eng', false);

    // Build introduction items
    const introductionItems = [];

    // Process each LEGO in the seed
    for (const legoData of seedData.legos) {
      if (!legoData.new) continue; // Only process new LEGOs

      const legoId = legoData.id;

      // Get the corresponding basket data
      const basketKey = legoId; // e.g., "S0001L01"
      const basketLego = basket[basketKey];

      if (!basketLego) {
        console.warn(`    Warning: No basket data found for ${legoId}`);
        continue;
      }

      // Create LEGO node
      const legoNode = createNode(legoData.target, legoData.known);

      // Register LEGO samples
      registerSamples(samples, legoData.target, 'spa', true);
      registerSamples(samples, legoData.known, 'eng', false);

      // Get presentation text
      const presentation = introductions.introductions[legoId];
      if (presentation) {
        registerSamples(samples, presentation, 'eng', false);
      }

      // Build practice nodes from basket
      const practiceNodes = [];

      if (basketLego.practice_phrases) {
        for (const phrase of basketLego.practice_phrases) {
          const [knownPhrase, targetPhrase] = phrase;

          // Create practice node
          const practiceNode = createNode(targetPhrase, knownPhrase);
          practiceNodes.push(practiceNode);

          // Register samples for practice phrases
          registerSamples(samples, targetPhrase, 'spa', true);
          registerSamples(samples, knownPhrase, 'eng', false);
        }
      }

      // Create introduction item
      const introItem = {
        id: legoNode.id,
        node: legoNode,
        presentation: presentation || '',
        nodes: practiceNodes
      };

      introductionItems.push(introItem);
    }

    // Create seed object
    const seed = {
      id: seedNode.id,
      node: seedNode,
      seedSentence: {
        canonical: seedData.seed_pair[1] + '.' // Add period
      },
      introductionItems
    };

    slice.seeds.push(seed);
    console.log(`    ✓ Added ${introductionItems.length} introduction items with ${introductionItems.reduce((sum, item) => sum + item.nodes.length, 0)} practice nodes`);
  }

  // Write output
  console.log(`\nWriting manifest to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');

  // Statistics
  const totalIntroItems = slice.seeds.reduce((sum, seed) => sum + seed.introductionItems.length, 0);
  const totalPracticeNodes = slice.seeds.reduce(
    (sum, seed) => sum + seed.introductionItems.reduce((itemSum, item) => itemSum + item.nodes.length, 0),
    0
  );
  const totalUniquePhrases = Object.keys(samples).length;
  const totalSamples = Object.values(samples).flat().length;

  console.log('\n=== Compilation Complete ===');
  console.log(`✓ Slices: ${manifest.slices.length}`);
  console.log(`✓ Seeds: ${slice.seeds.length}`);
  console.log(`✓ Introduction items: ${totalIntroItems}`);
  console.log(`✓ Practice nodes: ${totalPracticeNodes}`);
  console.log(`✓ Unique phrases: ${totalUniquePhrases}`);
  console.log(`✓ Total audio samples: ${totalSamples}`);
  console.log(`\nManifest saved to: ${OUTPUT_FILE}`);
}

// Run compilation
try {
  compileManifest();
} catch (error) {
  console.error('ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
