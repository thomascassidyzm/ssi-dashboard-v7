#!/usr/bin/env node

/**
 * Phase 7: Compile Spanish Course to Legacy App Format
 *
 * Converts v8.1.1 format files into the legacy mobile app format
 * Input:  seed_pairs.json, lego_pairs.json, lego_baskets.json, introductions.json
 * Output: spa_for_eng_668seeds.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const COURSE_DIR = path.join(__dirname, '..', 'public', 'vfs', 'courses', 'spa_for_eng');

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
function generateSampleUUID(text, language, role, cadence = 'natural') {
  const input = `${text}|${language}|${role}|${cadence}`;
  const hash = crypto.createHash('sha1').update(input).digest('hex');

  const segments = ROLE_SEGMENTS[role];
  if (!segments) {
    throw new Error(`Unknown role: ${role}`);
  }

  return `${hash.substring(0, 8).toUpperCase()}-6044-${segments.seg3}-${segments.seg4}-${hash.substring(hash.length - 12).toUpperCase()}`;
}

/**
 * Create language node (legacy format with empty tokens/lemmas)
 */
function createLanguageNode(text) {
  return {
    tokens: [],
    text: text,
    lemmas: []
  };
}

async function compileManifest() {
  console.log('\n📦 Phase 7: Compile Spanish Course to Legacy Format\n');

  // Load input files
  console.log('📖 Loading course data...');
  const seedPairs = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, 'seed_pairs.json'), 'utf8'));
  const legoPairs = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, 'lego_pairs.json'), 'utf8'));
  const baskets = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, 'lego_baskets.json'), 'utf8'));
  const introductions = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, 'introductions.json'), 'utf8'));

  console.log(`✓ Seeds: ${legoPairs.seeds.length}`);
  console.log(`✓ LEGOs: ${Object.keys(introductions.presentations).length}`);
  console.log(`✓ Baskets: ${Object.keys(baskets.baskets).length}\n`);

  // Create sample registry
  const sampleRegistry = new Map();
  function registerSample(text, role) {
    const lang = role === 'source' ? 'eng' : 'spa';
    const key = `${text}|${role}`;
    if (!sampleRegistry.has(key)) {
      sampleRegistry.set(key, generateSampleUUID(text, lang, role));
    }
    return sampleRegistry.get(key);
  }

  // Build manifest
  const manifest = {
    id: 'spa-eng',
    version: legoPairs.version || '8.1.1',
    target: 'spa',
    known: 'eng',
    slices: [{
      id: uuidv4().toUpperCase(),
      version: legoPairs.version || '8.1.1',
      seeds: []
    }]
  };

  const slice = manifest.slices[0];

  // Process each seed
  console.log('🔨 Compiling seeds...');
  let processedSeeds = 0;

  for (const seedData of legoPairs.seeds) {
    const seedId = seedData.seed_id;
    const [knownSeed, targetSeed] = seedData.seed_pair;

    const seedUuid = uuidv4().toUpperCase();

    const seed = {
      id: seedUuid,
      node: {
        id: seedUuid,
        target: createLanguageNode(targetSeed),
        known: createLanguageNode(knownSeed)
      },
      seedSentence: {
        canonical: knownSeed
      },
      introductionItems: []
    };

    // Register seed samples
    registerSample(targetSeed, 'target1');
    registerSample(targetSeed, 'target2');
    registerSample(knownSeed, 'source');

    // Process LEGOs for this seed (only new=true)
    for (const lego of seedData.legos) {
      if (!lego.new) continue;

      const legoId = lego.id;
      const basket = baskets.baskets[legoId];
      const presentation = introductions.presentations[legoId];

      if (!basket || !presentation) {
        console.warn(`⚠️  Missing basket or intro for ${legoId}`);
        continue;
      }

      const itemUuid = uuidv4().toUpperCase();

      const item = {
        id: itemUuid,
        node: {
          id: itemUuid,
          target: createLanguageNode(lego.target),
          known: createLanguageNode(lego.known)
        },
        presentation: presentation,
        nodes: []
      };

      // Register LEGO samples
      registerSample(lego.target, 'target1');
      registerSample(lego.target, 'target2');
      registerSample(lego.known, 'source');

      // Add practice phrases from basket (handle both formats)
      let practiceData = [];

      if (basket.practice_phrases && basket.practice_phrases.length > 0) {
        // Format 1: practice_phrases array with [target, known, null, level]
        practiceData = basket.practice_phrases.map(p => [p[0], p[1]]);
      } else if (basket.baskets && basket.baskets.length > 0) {
        // Format 2: baskets array with {spa, eng} objects
        practiceData = basket.baskets.map(b => [b.spa, b.eng]);
      }

      for (const [targetPhrase, knownPhrase] of practiceData) {
        const phraseUuid = uuidv4().toUpperCase();

        item.nodes.push({
          id: phraseUuid,
          target: createLanguageNode(targetPhrase),
          known: createLanguageNode(knownPhrase)
        });

        // Register practice phrase samples
        registerSample(targetPhrase, 'target1');
        registerSample(targetPhrase, 'target2');
        registerSample(knownPhrase, 'source');
      }

      seed.introductionItems.push(item);
    }

    slice.seeds.push(seed);
    processedSeeds++;

    if (processedSeeds % 50 === 0) {
      console.log(`  Processed ${processedSeeds}/${legoPairs.seeds.length} seeds...`);
    }
  }

  console.log(`✓ Compiled ${processedSeeds} seeds\n`);

  // Build samples object
  console.log('🎵 Building audio sample registry...');
  const samples = {};
  for (const [key, uuid] of sampleRegistry) {
    const [text, role] = key.split('|');
    const lang = role === 'source' ? 'eng' : 'spa';
    samples[text] = {
      id: uuid,
      language: lang,
      cadence: 'natural'
    };
  }

  slice.samples = samples;
  console.log(`✓ Registered ${Object.keys(samples).length} unique audio samples\n`);

  // Write output
  const outputPath = path.join(COURSE_DIR, 'spa_for_eng_668seeds.json');
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

  console.log('================================================================================');
  console.log(`✅ Course manifest compiled successfully!`);
  console.log(`📄 Output: ${outputPath}`);
  console.log(`📊 ${processedSeeds} seeds, ${Object.keys(samples).length} audio samples`);
  console.log('================================================================================\n');
}

compileManifest().catch(err => {
  console.error('❌ Phase 7 failed:', err.message);
  console.error(err);
  process.exit(1);
});
