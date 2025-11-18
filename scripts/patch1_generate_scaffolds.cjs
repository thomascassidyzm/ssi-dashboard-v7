#!/usr/bin/env node

/**
 * Patch 1 Scaffold Generator
 * Generates scaffolds for 45 missing LEGOs (S0044-S0056, excluding S0055)
 */

const { preparePhase5Scaffolds } = require('../tools/phase-prep/phase5_prep_scaffolds.cjs');
const path = require('path');

const COURSE_DIR = 'public/vfs/courses/cmn_for_eng';

const PATCH1_LEGO_IDS = [
  "S0044L01", "S0044L02", "S0044L03", "S0044L04",
  "S0045L01", "S0045L02", "S0045L03",
  "S0046L02", "S0046L03", "S0046L04",
  "S0047L01", "S0047L02", "S0047L03", "S0047L04",
  "S0048L01", "S0048L02",
  "S0049L01", "S0049L02", "S0049L04",
  "S0050L01", "S0050L02", "S0050L03", "S0050L04",
  "S0051L01", "S0051L02", "S0051L03", "S0051L04", "S0051L05",
  "S0052L01", "S0052L02", "S0052L03", "S0052L04",
  "S0053L01", "S0053L02", "S0053L03", "S0053L04",
  "S0054L01", "S0054L02", "S0054L03", "S0054L04",
  "S0056L01", "S0056L02", "S0056L03", "S0056L04", "S0056L05"
];

async function main() {
  console.log('🚀 Patch 1: Generating scaffolds for 45 LEGOs');
  console.log(`📂 Course: ${COURSE_DIR}`);
  console.log(`🎯 LEGO range: S0044-S0056 (${PATCH1_LEGO_IDS.length} LEGOs)`);

  const result = await preparePhase5Scaffolds(COURSE_DIR, {
    legoIds: PATCH1_LEGO_IDS
  });

  console.log('\n✅ Scaffold generation complete!');
  console.log(`   Filtered LEGOs: ${result.totalNewLegos}`);
  console.log(`   Phrases to generate: ${result.totalNewLegos * 10}`);
  console.log(`   Scaffolds: ${result.scaffoldsDir}`);
  console.log(`   Outputs: ${result.outputsDir}`);
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
