#!/usr/bin/env node

/**
 * Phase 7: Compile Course Manifest
 *
 * Reads v7.7 format files and compiles them into the legacy course manifest
 * format required by the SSi mobile app.
 *
 * Input:  vfs/courses/{course_code}/seed_pairs.json
 *         vfs/courses/{course_code}/lego_pairs.json
 *         vfs/courses/{course_code}/lego_baskets.json
 *         vfs/courses/{course_code}/introductions.json
 * Output: vfs/courses/{course_code}/course_manifest.json
 *
 * Usage: node scripts/phase7-compile-manifest.cjs <course_code>
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4, v5: uuidv5 } = require('uuid');
const crypto = require('crypto');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Usage: node scripts/phase7-compile-manifest.cjs <course_code>');
  console.error('   Example: node scripts/phase7-compile-manifest.cjs ita_for_eng_10seeds');
  process.exit(1);
}

const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');
const introductionsPath = path.join(courseDir, 'introductions.json');
const outputPath = path.join(courseDir, 'course_manifest.json');

// SSi namespace UUID for deterministic audio sample UUIDs
const SSI_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// Generate deterministic UUID for audio sample
// Same text + language + role + cadence = same UUID every time
function generateSampleUUID(text, language, role, cadence) {
  const key = `${text}|${language}|${role}|${cadence}`;
  return uuidv5(key, SSI_NAMESPACE);
}

// Helper to create language node (tokens/lemmas empty per user request)
function createLanguageNode(text) {
  return {
    tokens: [],
    text: text,
    lemmas: []
  };
}

async function compileManifest() {
  console.log(`\n📦 Phase 7: Compile Course Manifest`);
  console.log(`Course: ${courseCode}\n`);

  // Check all required inputs exist
  const requiredFiles = [
    { path: seedPairsPath, name: 'seed_pairs.json', phase: 'Phase 1' },
    { path: legoPairsPath, name: 'lego_pairs.json', phase: 'Phase 3' },
    { path: legoBasketsPath, name: 'lego_baskets.json', phase: 'Phase 4' },
    { path: introductionsPath, name: 'introductions.json', phase: 'Phase 6' }
  ];

  for (const file of requiredFiles) {
    if (!await fs.pathExists(file.path)) {
      console.error(`❌ ${file.name} not found: ${file.path}`);
      console.error(`   Run ${file.phase} first to generate this file`);
      process.exit(1);
    }
  }

  // Load all input files
  console.log('📖 Reading input files...');
  const seedPairs = await fs.readJson(seedPairsPath);
  const legoPairs = await fs.readJson(legoPairsPath);
  const legoBaskets = await fs.readJson(legoBasketsPath);
  const introductions = await fs.readJson(introductionsPath);

  // Extract course metadata
  const [targetCode, , knownCode] = courseCode.split('_');
  const courseId = `${targetCode}-${knownCode}`;

  console.log(`📊 Course ID: ${courseId}`);
  console.log(`📊 Seeds: ${legoPairs.seeds.length}`);
  console.log(`📊 LEGOs: ${Object.keys(introductions.introductions).length}\n`);

  // Create LEGO lookup for quick access
  const legoLookup = {};
  for (const seed of legoPairs.seeds) {
    const [seedId, [targetSeed, knownSeed], legos] = seed;
    for (const lego of legos) {
      const [legoId, type, targetLego, knownLego, components] = lego;
      legoLookup[legoId] = {
        seedId,
        type,
        target: targetLego,
        known: knownLego,
        seedTarget: targetSeed,
        seedKnown: knownSeed,
        components
      };
    }
  }

  // Create basket lookup (baskets is an object, not array)
  const basketLookup = legoBaskets.baskets;

  // Track all audio samples
  const samples = {};

  function registerSample(text, language, role, cadence) {
    if (!text || text.trim() === '') return;

    if (!samples[text]) {
      samples[text] = [];
    }

    // Check if this exact role/cadence combo already exists
    const exists = samples[text].some(s => s.role === role && s.cadence === cadence);
    if (!exists) {
      samples[text].push({
        id: generateSampleUUID(text, language, role, cadence),
        cadence: cadence,
        role: role
      });
    }
  }

  // Build all seeds (all seeds go in a single slice)
  const seeds = [];
  let totalIntroductionItems = 0;
  let totalPracticeNodes = 0;

  for (const seed of legoPairs.seeds) {
    const [seedId, [targetSeed, knownSeed], legos] = seed;

    // Register seed sentence samples
    registerSample(targetSeed, targetCode, 'target1', 'natural');
    registerSample(targetSeed, targetCode, 'target2', 'natural');
    registerSample(knownSeed, knownCode, 'known', 'natural');

    // Build introduction items for this seed
    const introductionItems = [];

    for (const lego of legos) {
      const [legoId, type, targetLego, knownLego, components] = lego;

      // Get presentation text from Phase 6
      const presentation = introductions.introductions[legoId];
      if (!presentation) {
        console.warn(`⚠️  No presentation found for ${legoId}, skipping`);
        continue;
      }

      // Register LEGO pair samples
      registerSample(targetLego, targetCode, 'target1', 'natural');
      registerSample(targetLego, targetCode, 'target2', 'natural');
      registerSample(knownLego, knownCode, 'known', 'natural');

      // Register presentation text sample (spoken in known language)
      registerSample(presentation, knownCode, 'known', 'natural');

      // Get practice phrases (nodes) from baskets
      const basket = basketLookup[legoId];
      const practiceNodes = [];

      if (basket) {
        // Basket structure: [lego_pair, full_sentences, practice_windows]
        // practice_windows is an array of 4 windows with expanding phrases
        const practiceWindows = basket[2] || [];

        // Flatten all windows into a single list of practice phrases
        for (const window of practiceWindows) {
          if (Array.isArray(window)) {
            for (const phrase of window) {
              if (Array.isArray(phrase) && phrase.length === 2) {
                const [targetPhrase, knownPhrase] = phrase;

                // Register practice phrase samples
                registerSample(targetPhrase, targetCode, 'target1', 'natural');
                registerSample(targetPhrase, targetCode, 'target2', 'natural');
                registerSample(knownPhrase, knownCode, 'known', 'natural');

                practiceNodes.push({
                  id: uuidv4(),
                  target: createLanguageNode(targetPhrase),
                  known: createLanguageNode(knownPhrase)
                });
              }
            }
          }
        }

        totalPracticeNodes += practiceNodes.length;
      }

      // Build introduction item
      const introItem = {
        id: uuidv4(),
        node: {
          id: uuidv4(),
          target: createLanguageNode(targetLego),
          known: createLanguageNode(knownLego)
        },
        presentation: presentation
      };

      // Add nodes if we have practice phrases
      if (practiceNodes.length > 0) {
        introItem.nodes = practiceNodes;
      }

      introductionItems.push(introItem);
      totalIntroductionItems++;
    }

    // Build seed object
    const seedObj = {
      id: uuidv4(),
      node: {
        id: uuidv4(),
        target: createLanguageNode(targetSeed),
        known: createLanguageNode(knownSeed)
      },
      seedSentence: {
        canonical: knownSeed
      },
      introductionItems: introductionItems
    };

    seeds.push(seedObj);
  }

  // Create single slice with all seeds
  const slices = [{
    id: uuidv4(),
    version: seedPairs.version,
    seeds: seeds,
    samples: samples // Audio sample metadata (Phase 8 will generate actual audio files)
  }];

  // Build final manifest
  const manifest = {
    id: courseId,
    version: seedPairs.version,
    target: targetCode,
    known: knownCode,
    slices: slices
  };

  // Write manifest
  await fs.writeJson(outputPath, manifest, { spaces: 2 });

  // Count total sample entries
  const totalSamples = Object.keys(samples).length;
  const totalSampleVariants = Object.values(samples).reduce((sum, arr) => sum + arr.length, 0);

  console.log(`✅ Compiled course manifest:`);
  console.log(`   - Seeds: ${seeds.length}`);
  console.log(`   - Introduction Items: ${totalIntroductionItems}`);
  console.log(`   - Practice Nodes: ${totalPracticeNodes}`);
  console.log(`   - Audio Samples: ${totalSamples} unique phrases, ${totalSampleVariants} total variants`);
  console.log(`\n💾 Output: ${outputPath}\n`);

  // Show sample structure
  if (seeds.length > 0) {
    const firstSeed = seeds[0];
    console.log(`📝 Sample structure:\n`);
    console.log(`Seed: "${firstSeed.node.known.text}"`);
    console.log(`  → LEGOs: ${firstSeed.introductionItems.length}`);
    if (firstSeed.introductionItems.length > 0) {
      const firstLego = firstSeed.introductionItems[0];
      console.log(`  → First LEGO: "${firstLego.node.known.text}"`);
      console.log(`  → Presentation: "${firstLego.presentation}"`);
      if (firstLego.nodes) {
        console.log(`  → Practice nodes: ${firstLego.nodes.length}`);
      }
    }
    console.log();
  }
}

compileManifest().catch(err => {
  console.error('\n❌ Phase 7 failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
