#!/usr/bin/env node

/**
 * Phase 7: Compile Course Manifest
 *
 * Reads v7 format files and compiles them into the legacy course manifest
 * format required by the SSi mobile app.
 *
 * Input:  {courseDir}/seed_pairs.json
 *         {courseDir}/lego_pairs.json
 *         {courseDir}/baskets/lego_baskets_s*.json
 *         {courseDir}/introductions.json
 * Output: {courseDir}/course_manifest.json
 *
 * Usage: node scripts/phase7_compile_manifest.cjs <courseDir>
 * Example: node scripts/phase7_compile_manifest.cjs public/vfs/courses/spa_for_eng
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

// Role-specific UUID segments (legacy SSi format)
const ROLE_SEGMENTS = {
  'target1': { seg2: '6044', seg3: 'AC07', seg4: '8F4E' },
  'target2': { seg2: '6044', seg3: 'E115', seg4: '8F4E' },
  'source':  { seg2: '6044', seg3: '36CD', seg4: '31D4' }
};

/**
 * Generate deterministic UUID for audio sample using SSi legacy format
 * Same text + language + role + cadence = same UUID every time
 * Format: XXXXXXXX-6044-YYYY-ZZZZ-XXXXXXXXXXXX
 */
function generateSampleUUID(text, language, role, cadence) {
  const key = `${text}|${language}|${role}|${cadence}`;
  const hash = crypto.createHash('sha1').update(key).digest('hex');
  const segments = ROLE_SEGMENTS[role];

  if (!segments) {
    throw new Error(`Unknown role: ${role}`);
  }

  return [
    hash.substring(0, 8),
    segments.seg2,
    segments.seg3,
    segments.seg4,
    hash.substring(20, 32)
  ].join('-').toUpperCase();
}

/**
 * Create language node with empty tokens/lemmas (legacy format requirement)
 */
function createLanguageNode(text) {
  return {
    tokens: [],
    text: text,
    lemmas: []
  };
}

/**
 * Compile course manifest from Phase 1-6 outputs
 */
async function compileManifest(courseDir) {
  console.log(`\n[Phase 7] Compile Course Manifest`);
  console.log(`[Phase 7] Course directory: ${courseDir}\n`);

  // Define paths
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
  const basketsDir = path.join(courseDir, 'baskets');
  const introductionsPath = path.join(courseDir, 'introductions.json');
  const outputPath = path.join(courseDir, 'course_manifest.json');

  // Check required files
  if (!await fs.pathExists(seedPairsPath)) {
    throw new Error(`seed_pairs.json not found at: ${seedPairsPath}`);
  }
  if (!await fs.pathExists(legoPairsPath)) {
    throw new Error(`lego_pairs.json not found at: ${legoPairsPath}`);
  }
  if (!await fs.pathExists(basketsDir)) {
    throw new Error(`baskets directory not found at: ${basketsDir}`);
  }
  if (!await fs.pathExists(introductionsPath)) {
    throw new Error(`introductions.json not found at: ${introductionsPath}`);
  }

  // Load data
  console.log(`[Phase 7] Loading course data...`);
  const seedPairs = await fs.readJson(seedPairsPath);
  const legoPairs = await fs.readJson(legoPairsPath);
  const introductions = await fs.readJson(introductionsPath);

  // Load all basket files
  const basketFiles = await fs.readdir(basketsDir);
  const baskets = {};
  for (const file of basketFiles) {
    if (file.match(/^lego_baskets_s\d+\.json$/)) {
      const basketPath = path.join(basketsDir, file);
      const basketData = await fs.readJson(basketPath);
      const seedId = basketData.seed;
      baskets[seedId] = basketData;
    }
  }

  // Extract course metadata
  const courseCode = path.basename(path.resolve(courseDir));
  const parts = courseCode.split('_');
  const targetLang = parts[0]; // e.g., "spa"
  const sourceLang = parts.length >= 3 ? parts[2] : parts[1]; // e.g., "eng"

  console.log(`[Phase 7] Target language: ${targetLang}`);
  console.log(`[Phase 7] Source language: ${sourceLang}`);

  // Extract seeds array
  const seeds = legoPairs.seeds || [];
  console.log(`[Phase 7] Seeds: ${seeds.length}`);

  // Initialize samples registry
  const samples = {};

  function registerSample(text, language, role, cadence = 'natural') {
    const uuid = generateSampleUUID(text, language, role, cadence);
    if (!samples[uuid]) {
      samples[uuid] = {
        text,
        language,
        role,
        cadence
      };
    }
    return uuid;
  }

  // Build manifest structure
  const manifest = {
    version: "7.9.0",
    course: courseCode,
    targetLanguage: targetLang,
    sourceLanguage: sourceLang,
    generated: new Date().toISOString(),
    slices: [{
      id: "slice_01",
      name: "Main Course",
      seeds: []
    }],
    samples: {}
  };

  console.log(`[Phase 7] Compiling ${seeds.length} seeds...\n`);

  // Process each seed
  for (const seed of seeds) {
    const seedId = seed.seed_id;
    const seedPair = seed.seed_pair;
    const legos = seed.legos || [];

    // Get translations from seed_pairs.json
    const translations = seedPairs.translations || {};
    const [targetSeed, knownSeed] = translations[seedId] || seedPair;

    // Register seed sentence samples
    const targetSeedUuid = registerSample(targetSeed, targetLang, 'target1');
    const sourceSeedUuid = registerSample(knownSeed, sourceLang, 'source');

    // Build introduction items for this seed
    const introductionItems = [];

    for (const lego of legos) {
      const legoId = lego.id;
      const targetLego = lego.target;
      const knownLego = lego.known;

      // Skip if this is a referenced LEGO (not new)
      if (!lego.new) continue;

      // Register LEGO pair samples
      const targetLegoUuid = registerSample(targetLego, targetLang, 'target1');
      const sourceLegoUuid = registerSample(knownLego, sourceLang, 'source');

      // Get introduction text
      const introText = introductions.introductions[legoId];
      let introUuid = null;
      if (introText) {
        introUuid = registerSample(introText, sourceLang, 'source');
      }

      // Get practice phrases from basket
      const basket = baskets[seedId];
      const legoBasket = basket ? basket[legoId] : null;
      const practicePhrases = legoBasket ? legoBasket.practice_phrases : [];

      // Register practice phrase samples
      const practiceItems = [];
      for (const phrase of practicePhrases) {
        const [knownPhrase, targetPhrase] = phrase;
        const targetPhraseUuid = registerSample(targetPhrase, targetLang, 'target1');
        const sourcePhraseUuid = registerSample(knownPhrase, sourceLang, 'source');

        practiceItems.push({
          target: createLanguageNode(targetPhrase),
          source: createLanguageNode(knownPhrase),
          targetSample: targetPhraseUuid,
          sourceSample: sourcePhraseUuid
        });
      }

      // Build introduction item
      introductionItems.push({
        id: legoId,
        target: createLanguageNode(targetLego),
        source: createLanguageNode(knownLego),
        targetSample: targetLegoUuid,
        sourceSample: sourceLegoUuid,
        presentationText: introText || "",
        presentationSample: introUuid,
        practiceItems: practiceItems
      });
    }

    // Add seed to manifest
    manifest.slices[0].seeds.push({
      id: seedId,
      target: createLanguageNode(targetSeed),
      source: createLanguageNode(knownSeed),
      targetSample: targetSeedUuid,
      sourceSample: sourceSeedUuid,
      introductionItems: introductionItems
    });
  }

  // Add samples to manifest
  manifest.samples = samples;

  // Write manifest
  await fs.writeJson(outputPath, manifest, { spaces: 2 });

  console.log(`[Phase 7] ✅ Compiled course manifest`);
  console.log(`[Phase 7]    Seeds: ${manifest.slices[0].seeds.length}`);
  console.log(`[Phase 7]    Audio samples: ${Object.keys(samples).length}`);
  console.log(`[Phase 7]    Output: ${outputPath}\n`);

  return {
    success: true,
    seedCount: manifest.slices[0].seeds.length,
    sampleCount: Object.keys(samples).length,
    outputPath
  };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/phase7_compile_manifest.cjs <courseDir>');
    console.error('Example: node scripts/phase7_compile_manifest.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  compileManifest(courseDir)
    .then(result => {
      console.log(`[Phase 7] ✅ Manifest compilation complete!`);
      console.log(`[Phase 7]    Total seeds: ${result.seedCount}`);
      console.log(`[Phase 7]    Total samples: ${result.sampleCount}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('[Phase 7] ❌ Manifest compilation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { compileManifest };
