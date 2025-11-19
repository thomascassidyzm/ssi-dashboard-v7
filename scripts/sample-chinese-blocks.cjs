#!/usr/bin/env node

/**
 * Sample Chinese basket quality - 10 seeds from each block of 10
 *
 * Shows first 100 seeds (S0001-S0100) organized in blocks of 10:
 * - Block 1: S0001-S0010
 * - Block 2: S0011-S0020
 * - ...
 * - Block 10: S0091-S0100
 *
 * For each seed, shows 3 sample practice phrases to assess quality
 */

const fs = require('fs-extra');
const path = require('path');

async function sampleBlocks() {
  const courseDir = path.join(__dirname, '../public/vfs/courses/cmn_for_eng');
  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  console.log('📖 Loading lego_baskets.json...\n');
  const baskets = await fs.readJson(basketsPath);

  // Process 10 blocks of 10 seeds each
  for (let block = 0; block < 10; block++) {
    const startSeed = block * 10 + 1;
    const endSeed = startSeed + 9;

    console.log(`${'='.repeat(80)}`);
    console.log(`BLOCK ${block + 1}: S${String(startSeed).padStart(4, '0')} - S${String(endSeed).padStart(4, '0')}`);
    console.log('='.repeat(80));

    // Look at all 10 seeds in this block
    for (let seedNum = startSeed; seedNum <= endSeed; seedNum++) {
      const seedId = `S${String(seedNum).padStart(4, '0')}`;

      console.log(`\n--- ${seedId} ---`);

      // Find LEGOs for this seed
      const seedLegos = Object.entries(baskets.baskets || {})
        .filter(([legoId]) => legoId.startsWith(seedId))
        .sort(([a], [b]) => a.localeCompare(b));

      if (seedLegos.length === 0) {
        console.log('  ⚠️  No LEGOs found');
        continue;
      }

      // Sample from first, middle, and last LEGO in seed
      const indices = [
        0, // First LEGO
        Math.floor(seedLegos.length / 2), // Middle LEGO
        seedLegos.length - 1 // Last LEGO
      ];

      for (const idx of indices) {
        const [legoId, basket] = seedLegos[idx];

        if (!basket.practice_phrases || basket.practice_phrases.length === 0) {
          console.log(`  ${legoId}: No practice phrases`);
          continue;
        }

        // Show LEGO and 3 sample phrases
        const lego = basket.lego || {};
        console.log(`\n  ${legoId}: "${lego.known}" → "${lego.target}"`);

        // Sample 3 phrases (first, middle, last)
        const phraseIndices = [
          0,
          Math.floor(basket.practice_phrases.length / 2),
          basket.practice_phrases.length - 1
        ];

        for (const pIdx of phraseIndices) {
          const phrase = basket.practice_phrases[pIdx];
          if (phrase) {
            console.log(`    ${pIdx + 1}. "${phrase.known}" → "${phrase.target}"`);
          }
        }
      }
    }

    console.log(''); // Blank line between blocks
  }

  console.log('\n✅ Sample complete!');
  console.log('\nLook for quality issues:');
  console.log('  ❌ Grammatically wrong phrases');
  console.log('  ❌ Nonsensical combinations');
  console.log('  ❌ Wrong word order');
  console.log('  ❌ Incomplete fragments');
  console.log('  ✅ Natural, meaningful phrases');
  console.log('  ✅ Good progression');
}

// Run
sampleBlocks().catch(err => {
  console.error('❌ Sampling failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
