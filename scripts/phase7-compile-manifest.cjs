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
const { v4: uuidv4 } = require('uuid');

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

  // Build slices (one slice per seed for now)
  const slices = [];
  let totalIntroductionItems = 0;
  let totalPracticeNodes = 0;

  for (const seed of legoPairs.seeds) {
    const [seedId, [targetSeed, knownSeed], legos] = seed;

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

    // Create slice for this seed
    const slice = {
      id: uuidv4(),
      version: seedPairs.version,
      seeds: [seedObj],
      samples: {} // Phase 8 will populate audio samples
    };

    slices.push(slice);
  }

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

  console.log(`✅ Compiled course manifest:`);
  console.log(`   - Slices: ${slices.length}`);
  console.log(`   - Introduction Items: ${totalIntroductionItems}`);
  console.log(`   - Practice Nodes: ${totalPracticeNodes}`);
  console.log(`\n💾 Output: ${outputPath}\n`);

  // Show sample structure
  if (slices.length > 0 && slices[0].seeds.length > 0) {
    const firstSeed = slices[0].seeds[0];
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
