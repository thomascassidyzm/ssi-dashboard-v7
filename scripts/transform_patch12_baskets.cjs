#!/usr/bin/env node

/**
 * Transform Patch 12 basket files from scaffold format to output format
 * Input: { "legos": { "S0617L01": { ...practice_phrases... } } }
 * Output: { "seed_id": "S0617", "baskets": [ { "lego_id": "S0617L01", "practice_phrases": [[...]] } ] }
 */

const fs = require('fs-extra');
const path = require('path');

const outputsDir = path.join(__dirname, '../public/vfs/courses/cmn_for_eng/phase5_outputs');

async function transformBaskets() {
  console.log('Transforming Patch 12 basket files to correct format...\n');

  let transformed = 0;
  let skipped = 0;

  for (let seedNum = 617; seedNum <= 642; seedNum++) {
    const seedId = `s0${seedNum}`;
    const filePath = path.join(outputsDir, `seed_${seedId}_baskets.json`);

    if (!(await fs.pathExists(filePath))) {
      console.log(`⏭️  ${seedId.toUpperCase()}: File not found, skipping`);
      skipped++;
      continue;
    }

    const data = await fs.readJson(filePath);

    // Check if already in correct format
    if (data.baskets && Array.isArray(data.baskets)) {
      console.log(`✅ ${seedId.toUpperCase()}: Already in correct format (${data.baskets.length} baskets)`);
      skipped++;
      continue;
    }

    // Check if in scaffold format (with "legos" key)
    let legosData = null;
    if (data.legos && typeof data.legos === 'object') {
      legosData = data.legos;
    }
    // Check if LEGOs are top-level keys (alternative scaffold format)
    else if (Object.keys(data).some(key => key.match(/^S\d{4}L\d{2}$/))) {
      legosData = data;
    }

    if (legosData) {
      const baskets = [];

      for (const [legoId, legoData] of Object.entries(legosData)) {
        // Skip non-LEGO keys
        if (!legoId.match(/^S\d{4}L\d{2}$/)) continue;

        // Transform practice_phrases from [known, target, null, lego_count] to {known, target}
        const transformedPhrases = (legoData.practice_phrases || []).map(phrase => {
          if (Array.isArray(phrase)) {
            return {
              known: phrase[0],
              target: phrase[1]
            };
          }
          return phrase; // Already in object format
        });

        baskets.push({
          lego_id: legoId,
          practice_phrases: transformedPhrases
        });
      }

      // Write transformed data
      const outputData = {
        seed_id: seedId.toUpperCase(),
        baskets
      };

      await fs.writeJson(filePath, outputData, { spaces: 2 });
      console.log(`✨ ${seedId.toUpperCase()}: Transformed ${baskets.length} baskets, ${baskets.reduce((sum, b) => sum + b.practice_phrases.length, 0)} phrases`);
      transformed++;
    } else {
      console.log(`⚠️  ${seedId.toUpperCase()}: Unknown format, skipping`);
      skipped++;
    }
  }

  console.log();
  console.log('='.repeat(70));
  console.log(`✅ Transformation complete!`);
  console.log(`   Files transformed: ${transformed}`);
  console.log(`   Files skipped: ${skipped}`);
  console.log('='.repeat(70));
}

transformBaskets().catch(console.error);
