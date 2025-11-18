#!/usr/bin/env node

/**
 * Phase 5 Patch 11 Scaffold Generation
 * Generates scaffolds for 25 missing LEGOs in seeds S0561-S0616
 */

const path = require('path');

// Import the scaffold prep function
const { preparePhase5Scaffolds } = require('../tools/phase-prep/phase5_prep_scaffolds.cjs');

// Patch 11 LEGO IDs (25 LEGOs from S0562-S0616)
const patch11LegoIds = [
  "S0562L01", "S0562L03", "S0562L04",
  "S0563L01", "S0563L02", "S0563L03",
  "S0564L01", "S0564L02", "S0564L04", "S0564L05", "S0564L06",
  "S0613L01", "S0613L02", "S0613L03", "S0613L04",
  "S0614L01", "S0614L03", "S0614L04",
  "S0615L02", "S0615L03", "S0615L04", "S0615L05",
  "S0616L02", "S0616L03", "S0616L04"
];

async function main() {
  const courseDir = path.join(__dirname, '../public/vfs/courses/cmn_for_eng');

  console.log('='.repeat(70));
  console.log('Phase 5 Patch 11 Scaffold Generation');
  console.log('='.repeat(70));
  console.log(`Course: cmn_for_eng`);
  console.log(`Seeds: S0561-S0616`);
  console.log(`LEGOs to generate: ${patch11LegoIds.length}`);
  console.log('='.repeat(70));
  console.log();

  try {
    const result = await preparePhase5Scaffolds(courseDir, {
      legoIds: patch11LegoIds
    });

    console.log();
    console.log('='.repeat(70));
    console.log('✅ Patch 11 Scaffolds Generated Successfully!');
    console.log('='.repeat(70));
    console.log(`Total LEGOs: ${result.totalNewLegos}`);
    console.log(`Total phrases to generate: ${result.totalNewLegos * 10}`);
    console.log(`Scaffolds directory: ${result.scaffoldsDir}`);
    console.log(`Outputs directory: ${result.outputsDir}`);
    console.log('='.repeat(70));
    console.log();
    console.log('Next step: Spawn sub-agents to generate baskets (10 LEGOs per agent)');

  } catch (error) {
    console.error();
    console.error('='.repeat(70));
    console.error('❌ Scaffold Generation Failed');
    console.error('='.repeat(70));
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
