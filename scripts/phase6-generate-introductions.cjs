#!/usr/bin/env node

/**
 * Phase 6: Generate Introduction Presentations
 *
 * Reads lego_pairs_deduplicated.json (or lego_pairs.json) and generates
 * natural language presentation text for each LEGO that will be spoken
 * to introduce the LEGO to learners.
 *
 * Input:  vfs/courses/{course_code}/lego_pairs_deduplicated.json (preferred)
 *         vfs/courses/{course_code}/lego_pairs.json (fallback)
 * Output: vfs/courses/{course_code}/introductions.json
 *
 * Usage: node scripts/phase6-generate-introductions.cjs <course_code>
 */

const fs = require('fs-extra');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Usage: node scripts/phase6-generate-introductions.cjs <course_code>');
  console.error('   Example: node scripts/phase6-generate-introductions.cjs spa_for_eng_20seeds');
  process.exit(1);
}

const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const deduplicatedPath = path.join(courseDir, 'lego_pairs_deduplicated.json');
const legoPath = path.join(courseDir, 'lego_pairs.json');
const outputPath = path.join(courseDir, 'introductions.json');

// Language name mapping
const LANGUAGE_NAMES = {
  'ita': 'Italian',
  'spa': 'Spanish',
  'fra': 'French',
  'cmn': 'Mandarin',
  'cym': 'Welsh',
  'gle': 'Irish',
  'eus': 'Basque',
  'mkd': 'Macedonian',
  'eng': 'English'
};

function getLanguageName(code) {
  return LANGUAGE_NAMES[code] || code.toUpperCase();
}

function generateBasePresentation(targetLang, knownLego, targetLego, knownSeed) {
  return `Now, the ${targetLang} for "${knownLego}" as in "${knownSeed}" is "${targetLego}", ${targetLego}.`;
}

function generateCompositePresentation(targetLang, knownLego, targetLego, knownSeed, components) {
  // Build component explanation
  // Component format: [[targetPart, knownPart], ...]
  const componentParts = components.map(comp => {
    const targetPart = comp[0];
    const knownPart = comp[1];
    return `"${targetPart}" means "${knownPart}"`;
  });

  // Join with proper grammar
  let explanation;
  if (componentParts.length === 1) {
    explanation = componentParts[0];
  } else if (componentParts.length === 2) {
    explanation = componentParts.join(' and ');
  } else {
    const last = componentParts.pop();
    explanation = componentParts.join(', ') + ', and ' + last;
  }

  return `The ${targetLang} for "${knownLego}" as in "${knownSeed}" is "${targetLego}" - where ${explanation}.`;
}

async function generateIntroductions() {
  console.log(`\n🎙️  Phase 6: Generate Introduction Presentations`);
  console.log(`Course: ${courseCode}\n`);

  // Check for deduplicated file first, fallback to regular
  let inputPath;
  if (await fs.pathExists(deduplicatedPath)) {
    inputPath = deduplicatedPath;
    console.log(`📂 Using deduplicated LEGOs\n`);
  } else if (await fs.pathExists(legoPath)) {
    inputPath = legoPath;
    console.log(`📂 Using original LEGOs (deduplicated not found)\n`);
  } else {
    console.error(`❌ LEGO pairs not found`);
    console.error(`   Tried: ${deduplicatedPath}`);
    console.error(`   Tried: ${legoPath}`);
    console.error(`   Run Phase 3 (and optionally Phase 5.5) first`);
    process.exit(1);
  }

  // Read LEGO pairs
  const legoData = await fs.readJson(inputPath);

  // Handle both formats: array or object with seeds property
  const seeds = Array.isArray(legoData) ? legoData : legoData.seeds;

  if (!Array.isArray(seeds)) {
    console.error(`❌ Invalid lego_pairs.json format`);
    process.exit(1);
  }

  // Extract target language from course code
  const [targetCode, , knownCode] = courseCode.split('_');
  const targetLang = getLanguageName(targetCode);
  const knownLang = getLanguageName(knownCode);

  console.log(`📖 Target: ${targetLang} (${targetCode})`);
  console.log(`📖 Known: ${knownLang} (${knownCode})`);
  console.log(`📊 Seeds: ${seeds.length}\n`);

  const introductions = {};
  let totalLegos = 0;
  let baseLegos = 0;
  let compositeLegos = 0;

  // Process each seed
  for (const seed of seeds) {
    const [seedId, [targetSeed, knownSeed], legos] = seed;

    // Process each LEGO in this seed
    for (const lego of legos) {
      const legoId = lego[0];
      const type = lego[1];
      const targetLego = lego[2];
      const knownLego = lego[3];
      const components = lego[4]; // Only for COMPOSITE

      let presentation;

      if (type === 'B') {
        // BASE LEGO - simple introduction
        presentation = generateBasePresentation(targetLang, knownLego, targetLego, knownSeed);
        baseLegos++;
      } else if (type === 'C') {
        // COMPOSITE LEGO - explain components
        presentation = generateCompositePresentation(targetLang, knownLego, targetLego, knownSeed, components);
        compositeLegos++;
      } else {
        console.warn(`⚠️  Unknown LEGO type "${type}" for ${legoId}, skipping`);
        continue;
      }

      introductions[legoId] = presentation;
      totalLegos++;
    }
  }

  // Generate output
  const output = {
    version: "7.8.0",
    course: courseCode,
    target: targetCode,
    known: knownCode,
    generated: new Date().toISOString(),
    introductions: introductions
  };

  // Write to file
  await fs.writeJson(outputPath, output, { spaces: 2 });

  console.log(`✅ Generated ${totalLegos} introduction presentations:`);
  console.log(`   - BASE LEGOs: ${baseLegos}`);
  console.log(`   - COMPOSITE LEGOs: ${compositeLegos}`);
  console.log(`\n💾 Output: ${outputPath}\n`);

  // Show a few examples
  console.log(`📝 Sample presentations:\n`);
  const sampleIds = Object.keys(introductions).slice(0, 3);
  for (const id of sampleIds) {
    console.log(`${id}:`);
    console.log(`  "${introductions[id]}"\n`);
  }
}

generateIntroductions().catch(err => {
  console.error('\n❌ Phase 6 failed:', err.message);
  process.exit(1);
});
