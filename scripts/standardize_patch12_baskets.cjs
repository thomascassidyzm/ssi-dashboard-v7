#!/usr/bin/env node

/**
 * Standardize Patch 12 basket filenames (uppercase S -> lowercase s)
 * Keep the larger/more complete file when duplicates exist
 */

const fs = require('fs-extra');
const path = require('path');

const outputsDir = path.join(__dirname, '../public/vfs/courses/cmn_for_eng/phase5_outputs');

async function standardizeFilenames() {
  console.log('Standardizing Patch 12 basket filenames...\n');

  const files = await fs.readdir(outputsDir);
  const uppercaseFiles = files.filter(f => f.match(/seed_S06\d{2}_baskets\.json/));

  let standardized = 0;
  let skipped = 0;

  for (const uppercaseFile of uppercaseFiles) {
    const lowercaseFile = uppercaseFile.replace('seed_S', 'seed_s');
    const uppercasePath = path.join(outputsDir, uppercaseFile);
    const lowercasePath = path.join(outputsDir, lowercaseFile);

    // Check if lowercase version exists
    if (await fs.pathExists(lowercasePath)) {
      // Compare sizes, keep the larger one
      const upperStats = await fs.stat(uppercasePath);
      const lowerStats = await fs.stat(lowercasePath);

      if (upperStats.size > lowerStats.size) {
        console.log(`Replacing ${lowercaseFile} (${lowerStats.size}B) with ${uppercaseFile} (${upperStats.size}B)`);
        await fs.remove(lowercasePath);
        await fs.move(uppercasePath, lowercasePath);
        standardized++;
      } else {
        console.log(`Keeping ${lowercaseFile} (${lowerStats.size}B), removing ${uppercaseFile} (${upperStats.size}B)`);
        await fs.remove(uppercasePath);
        skipped++;
      }
    } else {
      console.log(`Renaming ${uppercaseFile} -> ${lowercaseFile}`);
      await fs.move(uppercasePath, lowercasePath);
      standardized++;
    }
  }

  console.log(`\n✅ Standardization complete!`);
  console.log(`   Files standardized: ${standardized}`);
  console.log(`   Files removed (smaller duplicates): ${skipped}`);

  // Verify all seeds are present
  const expectedSeeds = [];
  for (let i = 617; i <= 642; i++) {
    expectedSeeds.push(`S0${i}`);
  }

  const finalFiles = await fs.readdir(outputsDir);
  const patch12Files = finalFiles.filter(f => f.match(/seed_s06\d{2}_baskets\.json/));

  console.log(`\n📊 Verification:`);
  console.log(`   Expected seeds: ${expectedSeeds.length} (S0617-S0642)`);
  console.log(`   Basket files found: ${patch12Files.length}`);

  const missingSeedsSet = new Set(expectedSeeds);
  for (const file of patch12Files) {
    const match = file.match(/seed_s(0\d{3})_baskets\.json/);
    if (match) {
      missingSeedsSet.delete(match[1].toUpperCase());
    }
  }

  if (missingSeedsSet.size === 0) {
    console.log(`   ✅ All seeds present!`);
  } else {
    console.log(`   ⚠️  Missing seeds: ${Array.from(missingSeedsSet).join(', ')}`);
  }
}

standardizeFilenames().catch(console.error);
