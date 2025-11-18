#!/usr/bin/env node

/**
 * Verify Patch 12 LEGO basket generation
 * Count LEGOs and phrases across all S0617-S0642 seeds
 */

const fs = require('fs-extra');
const path = require('path');

const outputsDir = path.join(__dirname, '../public/vfs/courses/cmn_for_eng/phase5_outputs');

async function verifyPatch12() {
  console.log('='.repeat(70));
  console.log('PATCH 12 VERIFICATION (Seeds S0617-S0642)');
  console.log('='.repeat(70));
  console.log();

  let totalSeeds = 0;
  let totalLegos = 0;
  let totalPhrases = 0;
  const legoIds = [];

  for (let seedNum = 617; seedNum <= 642; seedNum++) {
    const seedId = `s0${seedNum}`;
    const filePath = path.join(outputsDir, `seed_${seedId}_baskets.json`);

    if (await fs.pathExists(filePath)) {
      const data = await fs.readJson(filePath);
      const baskets = data.baskets || [];

      totalSeeds++;
      totalLegos += baskets.length;

      baskets.forEach(basket => {
        legoIds.push(basket.lego_id);
        const phrases = basket.practice_phrases || [];
        totalPhrases += phrases.length;
      });

      console.log(`✅ ${seedId.toUpperCase()}: ${baskets.length} LEGOs, ${baskets.reduce((sum, b) => sum + (b.practice_phrases?.length || 0), 0)} phrases`);
    } else {
      console.log(`❌ ${seedId.toUpperCase()}: FILE NOT FOUND`);
    }
  }

  console.log();
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Seeds processed: ${totalSeeds} / 26`);
  console.log(`LEGOs generated: ${totalLegos} / 100 (target)`);
  console.log(`Phrases generated: ${totalPhrases} / ~1000 (target)`);
  console.log(`Average phrases per LEGO: ${(totalPhrases / totalLegos).toFixed(1)}`);
  console.log();

  // Check for expected LEGOs
  const expectedLegos = [
    "S0617L01", "S0617L02", "S0617L03",
    "S0618L01", "S0618L02", "S0618L03",
    "S0619L01", "S0619L02", "S0619L03", "S0619L05",
    "S0620L01", "S0620L02", "S0620L03", "S0620L05",
    "S0621L01", "S0621L02", "S0621L03", "S0621L04", "S0621L05", "S0621L06",
    "S0622L01", "S0622L03", "S0622L04", "S0622L05",
    "S0623L01", "S0623L02", "S0623L03", "S0623L04", "S0623L05", "S0623L06", "S0623L07",
    "S0624L02", "S0624L03",
    "S0625L02", "S0625L04", "S0625L05",
    "S0626L02", "S0626L03", "S0626L04",
    "S0627L02", "S0627L04", "S0627L05",
    "S0628L01", "S0628L02", "S0628L03",
    "S0629L02", "S0629L03", "S0629L04", "S0629L06", "S0629L07", "S0629L08", "S0629L09",
    "S0630L01", "S0630L03", "S0630L04",
    "S0631L01", "S0631L02", "S0631L04", "S0631L05",
    "S0632L01", "S0632L03", "S0632L04",
    "S0633L01", "S0633L02", "S0633L03", "S0633L04", "S0633L05", "S0633L06",
    "S0634L02", "S0634L03", "S0634L04", "S0634L05",
    "S0635L02", "S0635L03", "S0635L04", "S0635L05", "S0635L06",
    "S0636L03", "S0636L04",
    "S0637L02", "S0637L03", "S0637L05",
    "S0638L01", "S0638L02", "S0638L04",
    "S0639L01", "S0639L02", "S0639L03",
    "S0640L01", "S0640L02", "S0640L03", "S0640L04", "S0640L05", "S0640L06",
    "S0641L01", "S0641L02", "S0641L04",
    "S0642L01", "S0642L02", "S0642L03"
  ];

  const missingLegos = expectedLegos.filter(id => !legoIds.includes(id));
  const extraLegos = legoIds.filter(id => !expectedLegos.includes(id));

  if (missingLegos.length > 0) {
    console.log(`⚠️  Missing LEGOs (${missingLegos.length}):`);
    console.log(`   ${missingLegos.join(', ')}`);
    console.log();
  }

  if (extraLegos.length > 0) {
    console.log(`ℹ️  Extra LEGOs (${extraLegos.length}) - bonus generation:`);
    console.log(`   ${extraLegos.join(', ')}`);
    console.log();
  }

  if (missingLegos.length === 0 && totalSeeds === 26) {
    console.log('✅ PATCH 12 COMPLETE - All 100 LEGOs generated successfully!');
  } else {
    console.log('⚠️  PATCH 12 INCOMPLETE - Some LEGOs or seeds missing');
  }

  console.log('='.repeat(70));
}

verifyPatch12().catch(console.error);
