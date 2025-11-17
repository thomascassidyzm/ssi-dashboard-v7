#!/usr/bin/env node

/**
 * Build vocabulary whitelist (registry) from lego_pairs.json
 * Extracts Spanish → English mappings for all taught LEGOs through a given seed
 *
 * Registry includes:
 * - All target → known mappings from new LEGOs
 * - All component → meaning mappings from Molecular LEGOs
 */

const fs = require('fs');
const path = require('path');

/**
 * Extract vocabulary registry from all seeds up to and including targetSeed
 */
function buildVocabularyRegistry(legoPairsPath, targetSeed) {
  // Load lego_pairs.json
  const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

  const registry = {};

  // Parse seed number (e.g., "S0011" -> 11)
  const targetNum = parseInt(targetSeed.substring(1));

  // Iterate through all seeds up to target
  for (const seed of legoPairs.seeds) {
    const seedNum = parseInt(seed.seed_id.substring(1));

    // Stop when we reach seeds beyond our target
    if (seedNum > targetNum) {
      break;
    }

    // Process each LEGO in this seed
    for (const lego of seed.legos) {
      // Only process NEW LEGOs (skip references)
      if (!lego.new) {
        continue;
      }

      // Add the main target → known mapping
      registry[lego.target] = lego.known;

      // For Molecular LEGOs, add component mappings
      if (lego.type === 'M' && lego.components) {
        for (const [spanish, english] of lego.components) {
          registry[spanish] = english;
        }
      }
    }
  }

  return registry;
}

/**
 * Generate statistics about the registry
 */
function getRegistryStats(registry) {
  const entries = Object.keys(registry);

  const stats = {
    total_entries: entries.length,
    single_word_entries: 0,
    multi_word_entries: 0,
    sample_entries: {}
  };

  entries.forEach(key => {
    if (key.includes(' ')) {
      stats.multi_word_entries++;
    } else {
      stats.single_word_entries++;
    }
  });

  // Get first 10 entries as samples
  const sampleKeys = entries.slice(0, 10);
  sampleKeys.forEach(key => {
    stats.sample_entries[key] = registry[key];
  });

  return stats;
}

// Main execution
if (require.main === module) {
  const targetSeed = process.argv[2] || 'S0011';
  const courseCode = process.argv[3] || 'spa_for_eng';

  const legoPairsPath = path.join(
    __dirname,
    'public/vfs/courses',
    courseCode,
    'lego_pairs.json'
  );

  console.log(`Building vocabulary registry for ${targetSeed}...`);
  console.log(`Reading from: ${legoPairsPath}`);

  // Check if file exists
  if (!fs.existsSync(legoPairsPath)) {
    console.error(`ERROR: lego_pairs.json not found at ${legoPairsPath}`);
    process.exit(1);
  }

  const registry = buildVocabularyRegistry(legoPairsPath, targetSeed);
  const stats = getRegistryStats(registry);

  console.log(`\n✅ Registry built successfully!`);
  console.log(`   Total entries: ${stats.total_entries}`);
  console.log(`   Single words: ${stats.single_word_entries}`);
  console.log(`   Multi-word expressions: ${stats.multi_word_entries}`);

  // Output to file
  const output = {
    course: courseCode,
    seed: targetSeed,
    vocabulary_count: stats.total_entries,
    vocabulary_registry: registry,
    statistics: {
      single_word_entries: stats.single_word_entries,
      multi_word_entries: stats.multi_word_entries
    },
    generated_at: new Date().toISOString(),
    note: "This registry contains Spanish → English mappings for all taught vocabulary through the specified seed, including molecular LEGO components"
  };

  const outputPath = `./vocabulary_whitelist_${targetSeed.toLowerCase()}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n📄 Registry saved to: ${outputPath}`);

  // Display sample entries for verification
  console.log(`\n📋 Sample entries (first 10):`);
  Object.entries(stats.sample_entries).forEach(([spanish, english]) => {
    console.log(`   "${spanish}" → "${english}"`);
  });
}

module.exports = { buildVocabularyRegistry, getRegistryStats };
