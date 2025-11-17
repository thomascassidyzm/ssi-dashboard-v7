#!/usr/bin/env node

/**
 * Phase 6: Generate Introduction Presentations
 *
 * Reads lego_pairs.json and generates natural language presentation text
 * for each LEGO that will be spoken to introduce the LEGO to learners.
 *
 * Input:  {courseDir}/lego_pairs.json
 * Output: {courseDir}/introductions.json
 *
 * Usage: node scripts/phase6-generate-introductions.cjs <courseDir>
 * Example: node scripts/phase6-generate-introductions.cjs public/vfs/courses/spa_for_eng
 */

const fs = require('fs-extra');
const path = require('path');

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

function generateAtomicPresentation(targetLang, knownLego, targetLego, knownSeed) {
  return `The ${targetLang} for '${knownLego}', as in '${knownSeed}', is: ... '${targetLego}' ... '${targetLego}'`;
}

function generateMolecularPresentation(targetLang, knownLego, targetLego, knownSeed, components) {
  // Build component explanation with {target1} tags
  // Component format: [[targetPart, knownPart], ...]
  // All target language parts use {target1} for consistent TTS voice
  const componentParts = components.map((comp, index) => {
    const targetPart = comp[0];
    const knownPart = comp[1];
    return `{target1}'${targetPart}' means ${knownPart}`;
  });

  // Join with proper grammar
  let explanation;
  if (componentParts.length === 1) {
    explanation = componentParts[0];
  } else if (componentParts.length === 2) {
    explanation = componentParts.join(', ');
  } else {
    explanation = componentParts.join(', ');
  }

  return `The ${targetLang} for '${knownLego}', as in '${knownSeed}', is: ... '${targetLego}' ... '${targetLego}' - ${explanation}`;
}

async function generateIntroductions(courseDir) {
  console.log(`\n[Phase 6] Generate Introduction Presentations`);
  console.log(`[Phase 6] Course directory: ${courseDir}\n`);

  const legoPath = path.join(courseDir, 'lego_pairs.json');
  const outputPath = path.join(courseDir, 'introductions.json');

  // Check for lego_pairs.json
  if (!await fs.pathExists(legoPath)) {
    throw new Error(`lego_pairs.json not found at: ${legoPath}`);
  }

  // Read LEGO pairs
  const legoData = await fs.readJson(legoPath);

  // Handle both formats: array or object with seeds property
  const seeds = Array.isArray(legoData) ? legoData : legoData.seeds;

  if (!Array.isArray(seeds)) {
    throw new Error('Invalid lego_pairs.json format - seeds should be an array');
  }

  // Infer language codes from course directory name
  const courseCode = path.basename(path.resolve(courseDir));
  const parts = courseCode.split('_');
  const targetCode = parts[0];
  const knownCode = parts.length >= 3 ? parts[2] : parts[1];

  if (!targetCode || !knownCode) {
    throw new Error(`Cannot extract language codes from directory: ${courseCode}`);
  }

  const targetLang = getLanguageName(targetCode);
  const knownLang = getLanguageName(knownCode);

  console.log(`[Phase 6] Target: ${targetLang} (${targetCode})`);
  console.log(`[Phase 6] Known: ${knownLang} (${knownCode})`);
  console.log(`[Phase 6] Seeds: ${seeds.length}\n`);

  // Load existing introductions to preserve edits
  let existingPresentations = {};
  if (await fs.pathExists(outputPath)) {
    try {
      const existingData = await fs.readJson(outputPath);
      existingPresentations = existingData.presentations || {};
      console.log(`[Phase 6] Found existing introductions, will preserve edited ones\n`);
    } catch (err) {
      console.warn(`[Phase 6] Could not read existing introductions: ${err.message}`);
    }
  }

  const presentations = {};
  let totalLegos = 0;
  let atomicLegos = 0;
  let molecularLegos = 0;
  let preservedEdits = 0;

  // Process each seed
  for (const seed of seeds) {
    // Handle both array format [seedId, [targetSeed, knownSeed], legos]
    // and object format {seed_id, seed_pair, legos}
    const seedId = seed.seed_id || seed[0];
    const seedPair = seed.seed_pair || seed[1];
    const legos = seed.legos || seed[2];

    if (!legos || !Array.isArray(legos)) continue;

    const [targetSeed, knownSeed] = Array.isArray(seedPair) ? seedPair : [seedPair.target, seedPair.known];

    // Process each LEGO in this seed
    for (const lego of legos) {
      // Handle both array and object formats
      const legoId = lego.id || lego[0];
      const type = lego.type || lego[1];
      const targetLego = lego.target || lego[2];
      const knownLego = lego.known || lego[3];
      const components = lego.components || lego[4]; // Only for COMPOSITE/M-type

      let presentation;

      if (type === 'A' || type === 'B') {
        // ATOMIC LEGO - simple introduction
        presentation = generateAtomicPresentation(targetLang, knownLego, targetLego, knownSeed);
        atomicLegos++;
      } else if (type === 'M' || type === 'C') {
        // MOLECULAR LEGO - explain components (if available)
        if (components && Array.isArray(components) && components.length > 0) {
          presentation = generateMolecularPresentation(targetLang, knownLego, targetLego, knownSeed, components);
          molecularLegos++;
        } else {
          // No components provided, treat as simple intro
          presentation = generateAtomicPresentation(targetLang, knownLego, targetLego, knownSeed);
          atomicLegos++;
        }
      } else {
        console.warn(`[Phase 6] Unknown LEGO type "${type}" for ${legoId}, skipping`);
        continue;
      }

      // Check if this introduction was manually edited
      const existing = existingPresentations[legoId];
      if (existing && typeof existing === 'object' && existing.edited === true) {
        // Preserve the edited version
        presentations[legoId] = existing;
        preservedEdits++;
      } else {
        // Use new generated version
        presentations[legoId] = presentation;
      }

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
    presentations: presentations
  };

  // Write to file
  await fs.writeJson(outputPath, output, { spaces: 2 });

  console.log(`[Phase 6] ✅ Generated ${totalLegos} introduction presentations:`);
  console.log(`[Phase 6]    - ATOMIC LEGOs: ${atomicLegos}`);
  console.log(`[Phase 6]    - MOLECULAR LEGOs: ${molecularLegos}`);
  if (preservedEdits > 0) {
    console.log(`[Phase 6]    - PRESERVED EDITS: ${preservedEdits}`);
  }
  console.log(`[Phase 6] Output: ${outputPath}\n`);

  return {
    success: true,
    totalIntroductions: totalLegos,
    atomicLegos,
    molecularLegos,
    outputPath
  };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/phase6-generate-introductions.cjs <courseDir>');
    console.error('Example: node scripts/phase6-generate-introductions.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  generateIntroductions(courseDir)
    .then(result => {
      console.log(`[Phase 6] ✅ Introduction generation complete!`);
      console.log(`[Phase 6]    Total introductions: ${result.totalIntroductions}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('[Phase 6] ❌ Introduction generation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { generateIntroductions };
