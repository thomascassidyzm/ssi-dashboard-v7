#!/usr/bin/env node

/**
 * Phase 7: Compile Course Manifest
 *
 * Combines all course data from previous phases into a single manifest file
 * compatible with the SSi mobile app legacy format.
 *
 * Input files:
 *   - seed_pairs.json (Phase 1)
 *   - lego_pairs.json (Phase 3)
 *   - phase5_segments/segment_01/baskets.json
 *   - phase5_segments/segment_02/baskets.json
 *   - phase5_segments/segment_03/baskets.json
 *   - phase6_segments/segment_01/introductions.json (optional)
 *   - phase6_segments/segment_02/introductions.json (optional)
 *   - phase6_segments/segment_03/introductions.json (optional)
 *
 * Output: course_manifest.json
 *
 * Usage: node scripts/phase7-compile-manifest.cjs <course_code>
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Usage: node scripts/phase7-compile-manifest.cjs <course_code>');
  console.error('   Example: node scripts/phase7-compile-manifest.cjs spa_for_eng');
  process.exit(1);
}

const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);

// Role-specific UUID segments (SSi legacy format)
const ROLE_SEGMENTS = {
  'target1': { seg3: 'AC07', seg4: '8F4E' },
  'target2': { seg3: 'E115', seg4: '8F4E' },
  'source':  { seg3: '36CD', seg4: '31D4' }
};

/**
 * Generate deterministic UUID for audio samples
 * Format: XXXXXXXX-6044-YYYY-ZZZZ-XXXXXXXXXXXX
 * Same text + language + role + cadence = same UUID every time
 */
function generateSampleUUID(text, language, role, cadence) {
  const input = `${text}|${language}|${role}|${cadence}`;
  const hash = crypto.createHash('sha1').update(input).digest('hex');

  const seg = ROLE_SEGMENTS[role];
  if (!seg) {
    throw new Error(`Unknown role: ${role}`);
  }

  return `${hash.substr(0,8)}-6044-${seg.seg3}-${seg.seg4}-${hash.substr(8,12)}`.toUpperCase();
}

/**
 * Create language node with empty tokens/lemmas (legacy compatibility)
 */
function createLanguageNode(text) {
  return {
    tokens: [],
    text: text,
    lemmas: []
  };
}

/**
 * Generate a simple introduction text for a LEGO when Phase 6 data is not available
 */
function generateSimpleIntroduction(legoId, targetLego, knownLego, targetSeed, knownSeed, targetLang, knownLang, type) {
  const targetLangName = targetLang === 'spa' ? 'Spanish' :
                         targetLang === 'ita' ? 'Italian' :
                         targetLang === 'fre' ? 'French' : 'target language';

  if (type === 'B') {
    // BASE LEGO - simple introduction
    return `Now, the ${targetLangName} for "${knownLego}" as in "${knownSeed}" is "${targetLego}", ${targetLego}.`;
  } else {
    // COMPOSITE LEGO - basic introduction without component breakdown
    return `The ${targetLangName} for "${knownLego}" as in "${knownSeed}" is "${targetLego}".`;
  }
}

async function compileManifest() {
  console.log(`\n📦 Phase 7: Compile Course Manifest`);
  console.log(`Course: ${courseCode}\n`);

  // Load required files
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  if (!await fs.pathExists(seedPairsPath)) {
    console.error(`❌ seed_pairs.json not found: ${seedPairsPath}`);
    console.error('   Run Phase 1 first');
    process.exit(1);
  }

  if (!await fs.pathExists(legoPairsPath)) {
    console.error(`❌ lego_pairs.json not found: ${legoPairsPath}`);
    console.error('   Run Phase 3 first');
    process.exit(1);
  }

  console.log('📖 Loading seed_pairs.json...');
  const seedPairs = await fs.readJson(seedPairsPath);

  console.log('📖 Loading lego_pairs.json...');
  const legoPairsData = await fs.readJson(legoPairsPath);

  // Merge baskets from all segments
  console.log('📖 Loading baskets from segments...');
  const allBaskets = {};
  let basketsLoaded = 0;
  let totalBaskets = 0;

  for (let i = 1; i <= 3; i++) {
    const segmentNum = String(i).padStart(2, '0');
    const basketPath = path.join(courseDir, 'phase5_segments', `segment_${segmentNum}`, 'baskets.json');

    if (await fs.pathExists(basketPath)) {
      const segmentBaskets = await fs.readJson(basketPath);

      // Convert numeric index to legoId lookup
      for (const key of Object.keys(segmentBaskets)) {
        const basket = segmentBaskets[key];
        if (basket && basket.legoId) {
          allBaskets[basket.legoId] = basket;
          totalBaskets++;
        }
      }

      basketsLoaded++;
      console.log(`   ✓ Loaded segment_${segmentNum}: ${totalBaskets} baskets`);
    } else {
      console.log(`   ⊘ Segment_${segmentNum} not found (optional)`);
    }
  }

  if (basketsLoaded === 0) {
    console.warn('⚠️  No baskets found in any segment');
  }

  // Merge introductions from all segments (optional)
  console.log('📖 Loading introductions from segments...');
  const allIntroductions = {};
  let introsLoaded = 0;

  for (let i = 1; i <= 3; i++) {
    const segmentNum = String(i).padStart(2, '0');
    const introPath = path.join(courseDir, 'phase6_segments', `segment_${segmentNum}`, 'introductions.json');

    if (await fs.pathExists(introPath)) {
      const segmentIntros = await fs.readJson(introPath);
      Object.assign(allIntroductions, segmentIntros.introductions || segmentIntros);
      introsLoaded++;
      console.log(`   ✓ Loaded segment_${segmentNum}: ${Object.keys(segmentIntros.introductions || segmentIntros).length} introductions`);
    }
  }

  if (introsLoaded === 0) {
    console.log('   ⊘ No phase6 introductions found - will generate simple ones');
  }

  // Extract metadata
  const targetCode = seedPairs.target_language || legoPairsData.target || 'spa';
  const knownCode = seedPairs.known_language || legoPairsData.known || 'eng';
  const courseId = `${targetCode}-${knownCode}`;
  const version = seedPairs.version || legoPairsData.version || '7.7.0';

  console.log(`\n📊 Course ID: ${courseId}`);
  console.log(`📊 Version: ${version}`);
  console.log(`📊 Target: ${targetCode}, Known: ${knownCode}`);

  // Get seeds array from lego_pairs
  const seeds = legoPairsData.seeds || [];
  console.log(`📊 Total seeds: ${seeds.length}`);
  console.log(`📊 Total baskets: ${Object.keys(allBaskets).length}`);
  console.log(`📊 Total introductions: ${Object.keys(allIntroductions).length}\n`);

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

  // Build all seeds
  const manifestSeeds = [];
  let totalIntroductionItems = 0;
  let totalPracticeNodes = 0;
  let generatedIntros = 0;

  console.log('🔨 Building manifest...\n');

  for (const seed of seeds) {
    const [seedId, [targetSeed, knownSeed], legos] = seed;

    // Register seed sentence samples
    registerSample(targetSeed, targetCode, 'target1', 'natural');
    registerSample(targetSeed, targetCode, 'target2', 'natural');
    registerSample(knownSeed, knownCode, 'source', 'natural');

    // Build introduction items for this seed
    const introductionItems = [];

    for (const lego of legos) {
      const [legoId, type, targetLego, knownLego, components] = lego;

      // Get presentation text (from Phase 6 or generate simple one)
      let presentation = allIntroductions[legoId];
      if (!presentation) {
        presentation = generateSimpleIntroduction(
          legoId, targetLego, knownLego, targetSeed, knownSeed,
          targetCode, knownCode, type
        );
        generatedIntros++;
      }

      // Register LEGO pair samples
      registerSample(targetLego, targetCode, 'target1', 'natural');
      registerSample(targetLego, targetCode, 'target2', 'natural');
      registerSample(knownLego, knownCode, 'source', 'natural');

      // Register presentation text sample (spoken in known language)
      registerSample(presentation, knownCode, 'source', 'natural');

      // Get practice phrases from baskets
      const basketData = allBaskets[legoId];
      const practiceNodes = [];

      if (basketData) {
        // Use dPhrases for practice windows (expanding context phrases)
        // Note: baskets use camelCase (dPhrases, not dphrases)
        const dPhrases = basketData.dPhrases || [];

        for (const phrase of dPhrases) {
          if (phrase.target && phrase.known) {
            // Register practice phrase samples
            registerSample(phrase.target, targetCode, 'target1', 'natural');
            registerSample(phrase.target, targetCode, 'target2', 'natural');
            registerSample(phrase.known, knownCode, 'source', 'natural');

            practiceNodes.push({
              id: uuidv4(),
              target: createLanguageNode(phrase.target),
              known: createLanguageNode(phrase.known)
            });
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

    manifestSeeds.push(seedObj);
  }

  // Create single slice with all seeds
  const slices = [{
    id: uuidv4(),
    version: version,
    seeds: manifestSeeds,
    samples: samples
  }];

  // Build final manifest
  const manifest = {
    id: courseId,
    version: version,
    target: targetCode,
    known: knownCode,
    slices: slices
  };

  // Write manifest
  const outputPath = path.join(courseDir, 'course_manifest.json');
  await fs.writeJson(outputPath, manifest, { spaces: 2 });

  // Count statistics
  const totalSamples = Object.keys(samples).length;
  const totalSampleVariants = Object.values(samples).reduce((sum, arr) => sum + arr.length, 0);

  console.log(`✅ Course manifest compiled successfully!\n`);
  console.log(`📊 Statistics:`);
  console.log(`   - Seeds: ${manifestSeeds.length}`);
  console.log(`   - Introduction Items (LEGOs): ${totalIntroductionItems}`);
  console.log(`   - Practice Nodes: ${totalPracticeNodes}`);
  console.log(`   - Audio Samples: ${totalSamples} unique phrases`);
  console.log(`   - Sample Variants: ${totalSampleVariants} (target1, target2, source)`);
  if (generatedIntros > 0) {
    console.log(`   - Generated introductions: ${generatedIntros} (Phase 6 not run)`);
  }
  console.log(`\n💾 Output: ${outputPath}\n`);

  // Show sample structure
  if (manifestSeeds.length > 0) {
    const firstSeed = manifestSeeds[0];
    console.log(`📝 Sample structure:`);
    console.log(`   Seed: "${firstSeed.node.known.text}"`);
    console.log(`   → LEGOs: ${firstSeed.introductionItems.length}`);
    if (firstSeed.introductionItems.length > 0) {
      const firstLego = firstSeed.introductionItems[0];
      console.log(`   → First LEGO: "${firstLego.node.known.text}"`);
      console.log(`   → Presentation: "${firstLego.presentation.substring(0, 80)}..."`);
      if (firstLego.nodes) {
        console.log(`   → Practice nodes: ${firstLego.nodes.length}`);
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
