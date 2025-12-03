#!/usr/bin/env node

/**
 * Compile App-Ready Manifest
 *
 * Phase 7: Transform SSoT files into app-ready course manifest
 *
 * Input:
 *   - lego_pairs.json (LEGOs with types and components)
 *   - lego_baskets.json (practice phrases)
 *   - introductions_v2.json (presentation text)
 *   - voices.json (encouragements)
 *
 * Output:
 *   - {CourseTitle}_COURSE_{timestamp}.json
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const COURSE = process.argv[2] || 'cmn_for_eng';
const VFS_BASE = path.join(__dirname, '../public/vfs');
const COURSE_DIR = path.join(VFS_BASE, 'courses', COURSE);

// UUID v5 namespace (URL)
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// Language code mappings
const LANG_NAMES = {
  'cmn': { full: 'Chinese', short: 'cm' },
  'eng': { full: 'English', short: 'en' },
  'spa': { full: 'Spanish', short: 'es' },
  'ita': { full: 'Italian', short: 'it' },
};

/**
 * Generate deterministic UUID v5
 */
function generateUUID(text, language, role, cadence) {
  const input = `${text}|${language}|${role}|${cadence}`;

  // Parse namespace UUID
  const namespaceBytes = Buffer.from(UUID_NAMESPACE.replace(/-/g, ''), 'hex');

  // Create SHA-1 hash
  const hash = crypto.createHash('sha1');
  hash.update(namespaceBytes);
  hash.update(input);
  const digest = hash.digest();

  // Set version (5) and variant bits
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;

  // Format as UUID (uppercase)
  const hex = digest.slice(0, 16).toString('hex').toUpperCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Create AudioRef object
 */
function createAudioRef(text, language, role, cadence = 'natural') {
  return {
    id: generateUUID(text, language, role, cadence),
    cadence,
    role,
    duration: 0
  };
}

/**
 * Create node structure with text
 */
function createNode(knownText, targetText) {
  return {
    id: generateUUID(`${knownText}|${targetText}`, 'node', 'node', 'natural'),
    known: {
      text: knownText,
      tokens: [],
      lemmas: []
    },
    target: {
      text: targetText,
      tokens: [],
      lemmas: []
    }
  };
}

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log(' PHASE 7: MANIFEST COMPILATION');
  console.log(' Course: ' + COURSE);
  console.log('═'.repeat(70));

  try {
    // ========================================================================
    // STEP 1: Load SSoT files
    // ========================================================================
    console.log('\n[1/7] Loading SSoT files...');

    const legoPairs = await fs.readJson(path.join(COURSE_DIR, 'lego_pairs.json'));
    // Use v2 baskets (with component drills prepended for M-type LEGOs)
    const legoBaskets = await fs.readJson(path.join(COURSE_DIR, 'lego_baskets_v2.json'));
    const introductions = await fs.readJson(path.join(COURSE_DIR, 'introductions_v2.json'));
    const voices = await fs.readJson(path.join(VFS_BASE, 'canonical', 'voices.json'));

    console.log(`  - lego_pairs.json: ${legoPairs.seeds.length} seeds`);
    console.log(`  - lego_baskets.json: ${Object.keys(legoBaskets.baskets).length} baskets`);
    console.log(`  - introductions_v2.json: ${Object.keys(introductions.presentations).length} presentations`);

    // Extract language codes
    const targetLang = COURSE.split('_')[0]; // cmn
    const knownLang = 'eng';
    const targetShort = LANG_NAMES[targetLang]?.short || targetLang.substring(0, 2);
    const knownShort = LANG_NAMES[knownLang]?.short || 'en';
    const targetName = LANG_NAMES[targetLang]?.full || targetLang;

    // ========================================================================
    // STEP 2: Build lookup maps
    // ========================================================================
    console.log('\n[2/7] Building lookup maps...');

    // Map LEGO target text → LEGO info
    const legoByTarget = new Map();
    for (const seed of legoPairs.seeds) {
      for (const lego of seed.legos) {
        legoByTarget.set(lego.lego.target, {
          id: lego.id,
          type: lego.type,
          known: lego.lego.known,
          target: lego.lego.target,
          components: lego.components || [],
          seedId: seed.seed_id,
          seedKnown: seed.seed_pair.known,
          seedTarget: seed.seed_pair.target
        });
      }
    }
    console.log(`  - legoByTarget: ${legoByTarget.size} entries`);

    // Map LEGO target text → basket practice phrases
    const basketByTarget = new Map();
    for (const [key, basket] of Object.entries(legoBaskets.baskets)) {
      const targetText = basket.lego.target;
      basketByTarget.set(targetText, basket.practice_phrases || []);
    }
    console.log(`  - basketByTarget: ${basketByTarget.size} entries`);

    // ========================================================================
    // STEP 3: Initialize samples dictionary
    // ========================================================================
    console.log('\n[3/7] Initializing samples dictionary...');

    const samples = {};

    function addSample(text, language, role, cadence = 'natural') {
      if (!samples[text]) {
        samples[text] = [];
      }
      // Avoid duplicates
      const existing = samples[text].find(s => s.role === role && s.cadence === cadence);
      if (!existing) {
        samples[text].push(createAudioRef(text, language, role, cadence));
      }
    }

    // ========================================================================
    // STEP 4: Build seeds array
    // ========================================================================
    console.log('\n[4/7] Building seeds array...');

    const seeds = [];

    for (const seedData of legoPairs.seeds) {
      const seedKnown = seedData.seed_pair.known;
      const seedTarget = seedData.seed_pair.target;

      // Add seed sentence to samples
      addSample(seedKnown, knownLang, 'practice_known');
      addSample(seedTarget, targetLang, 'practice_target');

      // Build introduction_items (LEGOs)
      const introductionItems = [];

      for (const lego of seedData.legos) {
        const legoId = lego.id;
        const legoKnown = lego.lego.known;
        const legoTarget = lego.lego.target;

        // Get presentation text
        const intro = introductions.presentations[legoId];
        const presentationText = intro
          ? `${intro.text} ... '${intro.target_text}' ... '${intro.target_text}'`
          : `The ${targetName} for '${legoKnown}', as in '${seedKnown}', is: ... '${legoTarget}' ... '${legoTarget}'`;

        // Add LEGO to samples
        addSample(legoKnown, knownLang, 'practice_known');
        addSample(legoTarget, targetLang, 'lego_target');
        addSample(presentationText, knownLang, 'presentation');

        // Build nodes array: first the LEGO itself, then practice phrases from basket
        const practiceNodes = [];

        // First node is the LEGO itself
        practiceNodes.push(createNode(legoKnown, legoTarget));

        // Add practice phrases from basket
        const basketPhrases = basketByTarget.get(legoTarget) || [];
        for (const phrase of basketPhrases) {
          practiceNodes.push(createNode(phrase.known, phrase.target));
          // Add practice phrases to samples
          addSample(phrase.known, knownLang, 'practice_known');
          addSample(phrase.target, targetLang, 'practice_target');
        }

        // Create introduction_item
        const introItem = {
          id: generateUUID(legoId, 'lego', 'intro_item', 'natural'),
          node: createNode(legoKnown, legoTarget),
          nodes: practiceNodes,
          presentation: presentationText
        };

        introductionItems.push(introItem);
      }

      // Create seed object
      const seed = {
        id: generateUUID(seedData.seed_id, 'seed', 'seed', 'natural'),
        seed_sentence: {
          canonical: seedKnown
        },
        node: createNode(seedKnown, seedTarget),
        introduction_items: introductionItems
      };

      seeds.push(seed);
    }

    console.log(`  - Built ${seeds.length} seeds`);
    console.log(`  - Total introduction_items: ${seeds.reduce((n, s) => n + s.introduction_items.length, 0)}`);

    // ========================================================================
    // STEP 5: Add basket phrases to samples
    // ========================================================================
    console.log('\n[5/7] Adding basket phrases to samples...');

    let phraseCount = 0;
    for (const [key, basket] of Object.entries(legoBaskets.baskets)) {
      if (basket.practice_phrases) {
        for (const phrase of basket.practice_phrases) {
          addSample(phrase.known, knownLang, 'practice_known');
          addSample(phrase.target, targetLang, 'practice_target');
          phraseCount++;
        }
      }
    }
    console.log(`  - Added ${phraseCount} practice phrases`);

    // ========================================================================
    // STEP 6: Add encouragements
    // ========================================================================
    console.log('\n[6/7] Adding encouragements...');

    const pooledEncouragements = [];
    const orderedEncouragements = [];

    // Get encouragements from voices.json
    const encouragementIndex = voices.encouragement_index?.eng;
    if (encouragementIndex && encouragementIndex.uuids) {
      // We need to get the actual encouragement texts
      // For now, use placeholder structure matching Kai's manifest
      for (const uuid of encouragementIndex.uuids) {
        pooledEncouragements.push({
          id: uuid,
          cadence: 'natural',
          role: 'presentation_encouragement',
          duration: 0
        });
      }
      console.log(`  - Added ${pooledEncouragements.length} encouragements from voices.json`);
    }

    // Add standard encouragement messages to samples
    const standardEncouragements = [
      "And remember that your brain has got as many neurons as there are stars in the galaxy—your brain is the most complex object in the universe.",
      "You're doing excellently—yes, I know you want to make fewer mistakes, but the effort you're putting in is what gets the results, so you really are doing excellently.",
      "Remember that learning comes in layers, so don't worry if you forget a word that you could say before, that's absolutely normal."
    ];

    for (const text of standardEncouragements) {
      addSample(text, knownLang, 'presentation_encouragement');
    }

    // ========================================================================
    // STEP 7: Compile manifest
    // ========================================================================
    console.log('\n[7/7] Compiling manifest...');

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
    const courseTitle = `${targetName}_for_English_speakers`;

    const manifest = {
      id: `${knownShort}-${targetShort}`,
      known: knownShort,
      target: targetShort,
      version: '9.1.0',
      status: 'alpha',
      introduction: {
        id: generateUUID('course_introduction', knownLang, 'presentation', 'natural'),
        cadence: 'natural',
        role: 'presentation',
        duration: 0
      },
      slices: [{
        id: generateUUID('slice_1', 'slice', 'slice', 'natural'),
        version: '9.1.0',
        seeds: seeds,
        pooledEncouragements: pooledEncouragements,
        orderedEncouragements: orderedEncouragements,
        samples: samples
      }]
    };

    // Write manifest
    const manifestFilename = `${courseTitle}_COURSE_${timestamp}.json`;
    const manifestPath = path.join(COURSE_DIR, manifestFilename);
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });

    // Also copy to course_manifest.json
    const courseManifestPath = path.join(COURSE_DIR, 'course_manifest.json');
    await fs.writeJson(courseManifestPath, manifest, { spaces: 2 });

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log(' MANIFEST COMPILATION COMPLETE');
    console.log('═'.repeat(70));
    console.log(`\nOutput files:`);
    console.log(`  - ${manifestFilename}`);
    console.log(`  - course_manifest.json`);
    console.log(`\nStatistics:`);
    console.log(`  - Seeds: ${seeds.length}`);
    console.log(`  - Introduction items (LEGOs): ${seeds.reduce((n, s) => n + s.introduction_items.length, 0)}`);
    console.log(`  - Unique sample entries: ${Object.keys(samples).length}`);
    console.log(`  - File size: ${(JSON.stringify(manifest).length / 1024 / 1024).toFixed(2)} MB`);
    console.log('');

  } catch (error) {
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
