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
const Ajv = require('ajv');
const manifestValidator = require('../services/manifest-validator.cjs');
const welcomeService = require('../services/welcome-service.cjs');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Usage: node scripts/phase7-compile-manifest.cjs <course_code>');
  console.error('   Example: node scripts/phase7-compile-manifest.cjs ita_for_eng_10seeds');
  process.exit(1);
}

const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
// Use deduplicated files (output of Phase 5.5)
const legoPairsPath = path.join(courseDir, 'lego_pairs_deduplicated.json');
const legoBasketsPath = path.join(courseDir, 'lego_baskets_deduplicated.json');
const introductionsPath = path.join(courseDir, 'introductions.json');
const outputPath = path.join(courseDir, 'course_manifest.json');

// Role-specific UUID segments (legacy SSi format)
const ROLE_SEGMENTS = {
  'target1': { seg2: '6044', seg3: 'AC07', seg4: '8F4E' },
  'target2': { seg2: '6044', seg3: 'E115', seg4: '8F4E' },
  'source':  { seg2: '6044', seg3: '36CD', seg4: '31D4' },
  'presentation': { seg2: '9CFE', seg3: '2486', seg4: '8F4E' }  // Presentation voice (including encouragements)
};

// Generate deterministic UUID for audio sample using SSi legacy format
// Same text + language + role + cadence = same UUID every time
// Format: XXXXXXXX-6044-YYYY-ZZZZ-XXXXXXXXXXXX
// Where YYYY and ZZZZ are role-specific fixed segments
function generateSampleUUID(text, language, role, cadence) {
  const key = `${text}|${language}|${role}|${cadence}`;

  // Generate hash
  const hash = crypto.createHash('sha1').update(key).digest('hex');

  // Get role-specific segments
  const segments = ROLE_SEGMENTS[role];
  if (!segments) {
    throw new Error(`Unknown role: ${role}`);
  }

  // Build UUID with role-specific middle sections
  // seg1 from hash bytes 0-3, seg5 from hash bytes 10-15
  const uuid = [
    hash.substring(0, 8),           // segment 1: first 4 bytes of hash
    segments.seg2,                   // segment 2: always 6044
    segments.seg3,                   // segment 3: role-specific
    segments.seg4,                   // segment 4: role-specific
    hash.substring(20, 32)          // segment 5: last 6 bytes of hash
  ].join('-').toUpperCase();

  return uuid;
}

// Helper to create language node (tokens/lemmas empty per user request)
function createLanguageNode(text) {
  return {
    tokens: [],
    text: text,
    lemmas: []
  };
}

/**
 * Load canonical encouragements for source language
 * Encouragements are shared across courses (e.g., all English courses share English encouragements)
 *
 * @param {string} knownLanguageCode - 3-letter ISO language code (e.g., 'eng', 'spa')
 * @returns {Object|null} - Encouragements object or null if not found
 */
async function loadEncouragements(knownLanguageCode) {
  const canonicalDir = path.join(__dirname, '..', 'vfs', 'canonical');
  const encouragementPath = path.join(canonicalDir, `${knownLanguageCode}_encouragements.json`);

  if (!await fs.pathExists(encouragementPath)) {
    const instructionsPath = 'docs/phase_intelligence/translate_encouragements.md';
    console.error(`\n❌ MISSING ENCOURAGEMENTS FOR ${knownLanguageCode.toUpperCase()}`);
    console.error(`\nExpected file: ${encouragementPath}`);
    console.error(`\n📖 TO CREATE ENCOURAGEMENTS:`);
    console.error(`   1. Read the translation instructions:`);
    console.error(`      ${instructionsPath}`);
    console.error(`\n   2. Follow the markdown instructions to translate from English canonical`);
    console.error(`\n   3. Input:  vfs/canonical/eng_encouragements.json`);
    console.error(`      Output: vfs/canonical/${knownLanguageCode}_encouragements.json`);
    console.error(`\n   4. The instructions include:`);
    console.error(`      - Translation guidelines for ${knownLanguageCode}`);
    console.error(`      - Tone and style requirements (warm, conversational, informal)`);
    console.error(`      - UUID preservation rules`);
    console.error(`      - Validation checklist`);
    console.error(`      - Example translations`);
    console.error(`\n💡 TIP: Encouragements are spoken in the SOURCE language (known language).`);
    console.error(`        For this course, that's ${knownLanguageCode.toUpperCase()}.`);
    console.error(`\nPhase 7 cannot proceed without encouragements.\n`);
    throw new Error(`Missing encouragements file: ${encouragementPath}`);
  }

  try {
    const encouragements = await fs.readJson(encouragementPath);
    console.log(`✓ Loaded encouragements for ${knownLanguageCode}`);
    console.log(`  Pooled: ${encouragements.pooledEncouragements?.length || 0}`);
    console.log(`  Ordered: ${encouragements.orderedEncouragements?.length || 0}`);
    return encouragements;
  } catch (error) {
    console.error(`\n❌ Failed to parse encouragements file: ${encouragementPath}`);
    console.error(`   Error: ${error.message}`);
    console.error(`\n   The file exists but contains invalid JSON.`);
    console.error(`   Please check the file format and try again.\n`);
    throw error;
  }
}

/**
 * Load welcome for the course
 * Welcomes are course-specific (one per language pair)
 *
 * @param {string} courseCode - Course code (e.g., 'ita_for_eng_10seeds')
 * @returns {Object|null} - Welcome object or null if not found
 */
async function loadWelcome(courseCode) {
  try {
    const welcome = await welcomeService.getWelcomeForCourse(courseCode);

    if (!welcome || !welcome.text) {
      console.error(`\n❌ MISSING WELCOME FOR ${courseCode.toUpperCase()}`);
      console.error(`\n📖 TO CREATE WELCOME:`);
      console.error(`   1. Run the welcome generation script:`);
      console.error(`      node scripts/generate-welcome.cjs ${courseCode}`);
      console.error(`\n   2. The script will:`);
      console.error(`      - Use Claude AI to generate appropriate welcome text`);
      console.error(`      - Save to: vfs/canonical/welcomes.json`);
      console.error(`      - Generate UUID for audio sample`);
      console.error(`\n   3. Alternatively, manually edit vfs/canonical/welcomes.json:`);
      console.error(`      {`);
      console.error(`        "welcomes": {`);
      console.error(`          "${courseCode}": {`);
      console.error(`            "text": "Your welcome message in SOURCE language...",`);
      console.error(`            "id": "GENERATED-UUID",`);
      console.error(`            "generated_date": "2024-10-29T...",`);
      console.error(`            "voice": null,`);
      console.error(`            "duration": 0`);
      console.error(`          }`);
      console.error(`        }`);
      console.error(`      }`);
      console.error(`\n💡 TIP: Welcomes are spoken in the SOURCE language (known language).`);
      console.error(`\nPhase 7 cannot proceed without a welcome.\n`);
      throw new Error(`Missing welcome for course: ${courseCode}`);
    }

    console.log(`✓ Loaded welcome for ${courseCode}`);
    if (welcome.id) {
      console.log(`  UUID: ${welcome.id}`);
      console.log(`  Duration: ${welcome.duration || 0}s`);
    } else {
      console.log(`  ⚠️  Audio not yet generated (will be created in Phase 8)`);
    }

    return welcome;
  } catch (error) {
    if (error.message.includes('Missing welcome')) {
      throw error;
    }

    console.error(`\n❌ Failed to load welcome: ${error.message}\n`);
    throw error;
  }
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
  const legoPairsData = await fs.readJson(legoPairsPath);
  const legoBasketsData = await fs.readJson(legoBasketsPath);
  const introductions = await fs.readJson(introductionsPath);

  // Handle both formats: array (from Phase 5.5) or object with seeds property
  const seeds = Array.isArray(legoPairsData) ? legoPairsData : legoPairsData.seeds;
  const baskets = legoBasketsData.baskets || legoBasketsData;
  const version = legoPairsData.version || introductions.version || '7.8.0';

  // Extract course metadata
  const [targetCode, , knownCode] = courseCode.split('_');
  const courseId = `${targetCode}-${knownCode}`;

  console.log(`📊 Course ID: ${courseId}`);
  console.log(`📊 Seeds: ${seeds.length}`);
  console.log(`📊 LEGOs: ${Object.keys(introductions.introductions).length}\n`);

  // Load canonical encouragements for source language
  const encouragements = await loadEncouragements(knownCode);

  // Load course welcome
  const welcome = await loadWelcome(courseCode);

  // Create LEGO lookup for quick access
  const legoLookup = {};
  for (const seed of seeds) {
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
  const basketLookup = baskets;

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
  const manifestSeeds = [];
  let totalIntroductionItems = 0;
  let totalPracticeNodes = 0;

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

      // Get presentation text from Phase 6
      const presentation = introductions.introductions[legoId];
      if (!presentation) {
        console.warn(`⚠️  No presentation found for ${legoId}, skipping`);
        continue;
      }

      // Register LEGO pair samples
      registerSample(targetLego, targetCode, 'target1', 'natural');
      registerSample(targetLego, targetCode, 'target2', 'natural');
      registerSample(knownLego, knownCode, 'source', 'natural');

      // Register presentation text sample (spoken in known language with presentation voice)
      registerSample(presentation, knownCode, 'presentation', 'natural');

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
                registerSample(knownPhrase, knownCode, 'source', 'natural');

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
      seed_sentence: {
        canonical: knownSeed
      },
      introduction_items: introductionItems
    };

    manifestSeeds.push(seedObj);
  }

  // NOTE: Encouragements are NOT registered as samples here
  // They will be added dynamically by the encouragement service after Phase A/B
  // when checking if they already exist in the MAR

  // Create single slice with all seeds
  const slices = [{
    id: uuidv4(),
    version: version,
    seeds: manifestSeeds,
    pooledEncouragements: [],
    orderedEncouragements: [],
    samples: samples // Audio sample metadata (Phase 8 will generate actual audio files)
  }];

  // Build final manifest
  const manifest = {
    id: courseId,
    version: version,
    target: targetCode,
    known: knownCode,
    status: "alpha",
    introduction: {
      id: welcome.id || "",  // UUID of audio sample (empty if not generated yet)
      cadence: "natural",
      role: "presentation",
      duration: welcome.duration || 0
    },
    slices: slices
  };

  // Validate manifest against JSON Schema
  console.log('🔍 Validating manifest against schema...');
  const schemaPath = path.join(__dirname, '..', 'schemas', 'course-manifest-schema.json');
  try {
    const schema = await fs.readJson(schemaPath);
    const ajv = new Ajv({ strict: false }); // Disable strict mode for format keywords
    const validate = ajv.compile(schema);
    const valid = validate(manifest);

    if (!valid) {
      console.error('\n❌ Manifest validation failed:');
      console.error(JSON.stringify(validate.errors, null, 2));
      console.error('\nPlease fix the errors above before proceeding.\n');
      process.exit(1);
    }

    console.log('✅ Manifest validation passed\n');
  } catch (schemaError) {
    console.warn(`⚠️  Could not validate schema: ${schemaError.message}`);
    console.warn('Proceeding without validation...\n');
  }

  // Validate manifest structure and sample coverage
  console.log('🔍 Validating manifest structure and samples...\n');
  const validationReport = manifestValidator.validateManifest(manifest);

  if (!validationReport.valid) {
    console.error('\n❌ Manifest validation failed:\n');
    console.error(manifestValidator.formatValidationReport(validationReport));
    console.error('\n❌ Phase 7 cannot proceed with these errors.');
    console.error('   Please fix the issues above and re-run Phase 7.\n');
    process.exit(1);
  }

  console.log('✅ Manifest structure validation passed');

  // Show warnings if any
  if (validationReport.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    for (const warning of validationReport.warnings) {
      console.log(`   ${warning.message}`);
    }
  }
  console.log('');

  // Write manifest
  await fs.writeJson(outputPath, manifest, { spaces: 2 });

  // Count total sample entries
  const totalSamples = Object.keys(samples).length;
  const totalSampleVariants = Object.values(samples).reduce((sum, arr) => sum + arr.length, 0);

  console.log(`✅ Compiled course manifest:`);
  console.log(`   - Seeds: ${manifestSeeds.length}`);
  console.log(`   - Introduction Items: ${totalIntroductionItems}`);
  console.log(`   - Practice Nodes: ${totalPracticeNodes}`);
  console.log(`   - Audio Samples: ${totalSamples} unique phrases, ${totalSampleVariants} total variants`);
  if (encouragements) {
    const pooledCount = encouragements.pooledEncouragements?.length || 0;
    const orderedCount = encouragements.orderedEncouragements?.length || 0;
    console.log(`   - Encouragements: ${pooledCount} pooled, ${orderedCount} ordered`);
  }
  console.log(`\n💾 Output: ${outputPath}\n`);

  // Show sample structure
  if (manifestSeeds.length > 0) {
    const firstSeed = manifestSeeds[0];
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
