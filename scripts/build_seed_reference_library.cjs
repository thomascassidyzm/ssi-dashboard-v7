#!/usr/bin/env node

/**
 * Build Seed Reference Library for Prompt Caching
 *
 * Extracts all seeds from lego_pairs.json into optimized format
 * for prompt caching in Phase 5 generation.
 */

const fs = require('fs');
const path = require('path');

function buildSeedReferenceLibrary(legoPairsPath, outputPath) {
  console.log('Building seed reference library...\n');

  // Load lego_pairs.json
  console.log(`Loading: ${legoPairsPath}`);
  const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
  console.log(`✅ Loaded ${legoPairs.seeds.length} seeds\n`);

  // Build reference library
  const library = {
    version: '1.0',
    purpose: 'Complete seed corpus for prompt caching and pattern mining',
    total_seeds: legoPairs.seeds.length,
    extraction_date: new Date().toISOString().split('T')[0],
    seeds: []
  };

  // Extract each seed
  for (const seed of legoPairs.seeds) {
    // Extract only NEW LEGOs (what's fresh in this seed)
    const newLegos = seed.legos
      .filter(lego => lego.new === true)
      .map(lego => ({
        target: lego.target,
        known: lego.known,
        type: lego.type,
        components: lego.components || null
      }));

    library.seeds.push({
      seed_id: seed.seed_id,
      target: seed.seed_pair[0],
      known: seed.seed_pair[1],
      new_legos: newLegos
    });
  }

  // Write output
  console.log(`Writing: ${outputPath}`);
  fs.writeFileSync(outputPath, JSON.stringify(library, null, 2));

  const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`✅ Seed reference library built`);
  console.log(`   Seeds: ${library.total_seeds}`);
  console.log(`   Size: ${sizeKB} KB\n`);

  return library;
}

// Main execution
function main() {
  const legoPairsPath = path.join(__dirname, '..', 'public', 'vfs', 'courses', 'spa_for_eng', 'lego_pairs.json');
  const outputPath = path.join(__dirname, '..', 'phase5_tests', 'seed_reference_library.json');

  if (!fs.existsSync(legoPairsPath)) {
    console.error(`❌ Error: lego_pairs.json not found at ${legoPairsPath}`);
    process.exit(1);
  }

  buildSeedReferenceLibrary(legoPairsPath, outputPath);
}

main();
