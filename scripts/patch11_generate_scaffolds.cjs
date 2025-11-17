#!/usr/bin/env node

/**
 * Patch 11: Generate scaffolds for 38 specific LEGOs in S0561-S0616 range
 */

const { preparePhase5Scaffolds } = require('../tools/phase-prep/phase5_prep_scaffolds.cjs');

const COURSE_DIR = 'public/vfs/courses/cmn_for_eng';

const PATCH11_LEGO_IDS = [
  "S0562L01",
  "S0562L02",
  "S0562L03",
  "S0562L04",
  "S0563L01",
  "S0563L02",
  "S0563L03",
  "S0564L01",
  "S0564L02",
  "S0564L04",
  "S0564L05",
  "S0564L06",
  "S0604L01",
  "S0604L02",
  "S0604L03",
  "S0604L04",
  "S0605L02",
  "S0605L03",
  "S0606L02",
  "S0606L03",
  "S0606L05",
  "S0606L06",
  "S0606L07",
  "S0613L01",
  "S0613L02",
  "S0613L03",
  "S0613L04",
  "S0614L01",
  "S0614L02",
  "S0614L03",
  "S0614L04",
  "S0615L02",
  "S0615L03",
  "S0615L04",
  "S0615L05",
  "S0616L02",
  "S0616L03",
  "S0616L04"
];

async function main() {
  console.log(`🚀 Patch 11: Generating scaffolds for ${PATCH11_LEGO_IDS.length} LEGOs`);
  console.log(`   Course: cmn_for_eng`);
  console.log(`   Seed range: S0561-S0616`);
  console.log('');

  try {
    const result = await preparePhase5Scaffolds(COURSE_DIR, {
      legoIds: PATCH11_LEGO_IDS
    });

    console.log('\n✅ Scaffolds generated successfully!');
    console.log(`   Scaffold files created: ${result.totalNewLegos}`);
    console.log(`   Total phrases to generate: ${result.totalNewLegos * 10}`);
    console.log(`   Scaffolds directory: ${result.scaffoldsDir}`);
    console.log(`   Outputs directory: ${result.outputsDir}`);
    console.log('');
    console.log('📋 Next step: Batch LEGOs and spawn sub-agents');

  } catch (error) {
    console.error('❌ Scaffold generation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
