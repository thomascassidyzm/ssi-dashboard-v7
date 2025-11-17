#!/usr/bin/env node

/**
 * Patch 11: Verify all 38 LEGOs were generated correctly
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = 'public/vfs/courses/cmn_for_eng';
const OUTPUTS_DIR = path.join(COURSE_DIR, 'phase5_outputs');

const EXPECTED_LEGOS = [
  "S0562L01", "S0562L02", "S0562L03", "S0562L04",
  "S0563L01", "S0563L02", "S0563L03",
  "S0564L01", "S0564L02", "S0564L04", "S0564L05", "S0564L06",
  "S0604L01", "S0604L02", "S0604L03", "S0604L04",
  "S0605L02", "S0605L03",
  "S0606L02", "S0606L03", "S0606L05", "S0606L06", "S0606L07",
  "S0613L01", "S0613L02", "S0613L03", "S0613L04",
  "S0614L01", "S0614L02", "S0614L03", "S0614L04",
  "S0615L02", "S0615L03", "S0615L04", "S0615L05",
  "S0616L02", "S0616L03", "S0616L04"
];

// Map seed IDs to their basket files (try both cases)
const SEED_FILES = {
  'S0562': 'seed_S0562_baskets.json',
  'S0563': 'seed_S0563_baskets.json',
  'S0564': ['seed_S0564_baskets.json', 'seed_s0564_baskets.json'],
  'S0604': ['seed_S0604_baskets.json', 'seed_s0604_baskets.json'],
  'S0605': ['seed_S0605_baskets.json', 'seed_s0605_baskets.json'],
  'S0606': ['seed_S0606_baskets.json', 'seed_s0606_baskets.json'],
  'S0613': 'seed_s0613_baskets.json',
  'S0614': ['seed_S0614_baskets.json', 'seed_s0614_baskets.json'],
  'S0615': 'seed_S0615_baskets.json',
  'S0616': 'seed_S0616_baskets.json'
};

async function verifyOutputs() {
  console.log('🔍 Verifying Patch 11 outputs...\n');

  const foundLegos = new Set();
  const missingLegos = [];
  const invalidLegos = [];
  let totalPhrases = 0;

  for (const [seedId, fileNames] of Object.entries(SEED_FILES)) {
    const files = Array.isArray(fileNames) ? fileNames : [fileNames];

    for (const fileName of files) {
      const filePath = path.join(OUTPUTS_DIR, fileName);

      if (!await fs.pathExists(filePath)) {
        continue; // Try next variant
      }

      console.log(`📄 Checking ${fileName}...`);
      const data = await fs.readJson(filePath);

      // Handle two possible formats:
      // 1. Scaffold format: { legos: { "S0604L01": {...}, ... } }
      // 2. Output format: { "L01": { lego_id: "S0604L01", ... }, ... }

      let legosData = data.legos || data;

      // Check each LEGO in this file
      for (const [key, legoData] of Object.entries(legosData)) {
        // Skip metadata fields
        if (key.startsWith('_') || ['version', 'seed_id', 'generation_stage', 'seed_pair', 'recent_seed_pairs', 'recent_new_legos'].includes(key)) {
          continue;
        }

        // Get the full LEGO ID (either from key or from lego_id field)
        const legoId = legoData._metadata?.lego_id || legoData.lego_id || key;

        if (EXPECTED_LEGOS.includes(legoId)) {
          foundLegos.add(legoId);

          const phrases = legoData.practice_phrases || [];
          totalPhrases += phrases.length;

          if (phrases.length !== 10) {
            invalidLegos.push({
              legoId,
              expected: 10,
              actual: phrases.length
            });
            console.log(`   ❌ ${legoId}: ${phrases.length} phrases (expected 10)`);
          } else {
            console.log(`   ✅ ${legoId}: ${phrases.length} phrases`);
          }
        }
      }
    }
  }

  // Check for missing LEGOs
  for (const legoId of EXPECTED_LEGOS) {
    if (!foundLegos.has(legoId)) {
      missingLegos.push(legoId);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Expected LEGOs: ${EXPECTED_LEGOS.length}`);
  console.log(`Found LEGOs: ${foundLegos.size}`);
  console.log(`Total phrases: ${totalPhrases}`);
  console.log(`Expected phrases: ${EXPECTED_LEGOS.length * 10} (${EXPECTED_LEGOS.length} LEGOs × 10)`);
  console.log('');

  if (missingLegos.length > 0) {
    console.log('❌ MISSING LEGOs:');
    missingLegos.forEach(id => console.log(`   - ${id}`));
    console.log('');
  }

  if (invalidLegos.length > 0) {
    console.log('⚠️  INVALID PHRASE COUNTS:');
    invalidLegos.forEach(({ legoId, expected, actual }) => {
      console.log(`   - ${legoId}: ${actual}/${expected} phrases`);
    });
    console.log('');
  }

  if (missingLegos.length === 0 && invalidLegos.length === 0) {
    console.log('✅ ALL CHECKS PASSED!');
    console.log(`   ${foundLegos.size} LEGOs generated`);
    console.log(`   ${totalPhrases} total phrases`);
    console.log('   Ready for merge and commit!');
    return true;
  } else {
    console.log('❌ VERIFICATION FAILED');
    return false;
  }
}

verifyOutputs()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Verification error:', error.message);
    process.exit(1);
  });
