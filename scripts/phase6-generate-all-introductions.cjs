#!/usr/bin/env node

/**
 * Phase 6: Generate ALL introductions for Spanish course
 *
 * Reads lego_pairs.json and generates introduction text for every LEGO
 * that is marked as "new: true" in each seed.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const COURSE_DIR = path.join(__dirname, '../public/vfs/courses/spa_for_eng');
const LEGO_PAIRS_FILE = path.join(COURSE_DIR, 'lego_pairs.json');
const OUTPUT_FILE = path.join(COURSE_DIR, 'introductions.json');

// Language names
const TARGET_LANG = 'Spanish';
const KNOWN_LANG = 'English';

/**
 * Generate introduction text for a BASE LEGO (type A)
 */
function generateBaseIntroduction(lego, knownSeed) {
  return `Now, the ${TARGET_LANG} for "${lego.known}" as in "${knownSeed}" is "${lego.target}", ${lego.target}.`;
}

/**
 * Generate introduction text for a COMPOSITE LEGO (type M)
 */
function generateCompositeIntroduction(lego, knownSeed) {
  const components = lego.components || [];

  // Build component explanations
  const explanations = components.map(([targetPart, knownPart]) => {
    return `"${targetPart}" means "${knownPart}"`;
  });

  // Join with commas and "and"
  let componentText;
  if (explanations.length === 1) {
    componentText = explanations[0];
  } else if (explanations.length === 2) {
    componentText = explanations.join(' and ');
  } else {
    const lastPart = explanations.pop();
    componentText = explanations.join(', ') + ', and ' + lastPart;
  }

  return `The ${TARGET_LANG} for "${lego.known}" as in "${knownSeed}" is "${lego.target}" - where ${componentText}.`;
}

/**
 * Main function to generate all introductions
 */
function generateIntroductions() {
  console.log('Starting Phase 6: Generate ALL Introductions for Spanish Course\n');

  // Read lego_pairs.json
  console.log(`Reading ${LEGO_PAIRS_FILE}...`);
  const legoPairs = JSON.parse(fs.readFileSync(LEGO_PAIRS_FILE, 'utf8'));

  console.log(`✓ Loaded ${legoPairs.seeds.length} seeds\n`);

  // Initialize output structure
  const output = {
    version: '7.8.0',
    course: 'spa_for_eng',
    target: TARGET_LANG,
    known: KNOWN_LANG,
    generated: new Date().toISOString(),
    introductions: {}
  };

  let totalIntroductions = 0;
  let baseCount = 0;
  let compositeCount = 0;

  // Process each seed
  for (const seed of legoPairs.seeds) {
    const knownSeed = seed.seed_pair[1]; // English sentence

    // Process each LEGO in the seed
    for (const lego of seed.legos) {
      // Only generate introductions for NEW LEGOs
      if (!lego.new) continue;

      let introduction;

      if (lego.type === 'A') {
        // BASE LEGO
        introduction = generateBaseIntroduction(lego, knownSeed);
        baseCount++;
      } else if (lego.type === 'M') {
        // COMPOSITE LEGO
        introduction = generateCompositeIntroduction(lego, knownSeed);
        compositeCount++;
      } else {
        console.warn(`Warning: Unknown LEGO type "${lego.type}" for ${lego.id}`);
        continue;
      }

      output.introductions[lego.id] = introduction;
      totalIntroductions++;
    }

    // Progress indicator every 10 seeds
    if (parseInt(seed.seed_id.substring(1)) % 10 === 0) {
      console.log(`  ✓ Processed ${seed.seed_id} (${totalIntroductions} introductions so far)`);
    }
  }

  // Write output file
  console.log(`\nWriting introductions to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  // Summary
  console.log('\n=== Generation Complete ===');
  console.log(`✓ Total introductions: ${totalIntroductions}`);
  console.log(`✓ BASE LEGOs (type A): ${baseCount}`);
  console.log(`✓ COMPOSITE LEGOs (type M): ${compositeCount}`);
  console.log(`\nIntroductions saved to: ${OUTPUT_FILE}`);
}

// Run generation
try {
  generateIntroductions();
} catch (error) {
  console.error('ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
