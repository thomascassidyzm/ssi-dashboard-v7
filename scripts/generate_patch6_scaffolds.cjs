#!/usr/bin/env node

/**
 * Generate scaffolds for Patch 6 missing LEGOs
 * S0334L07 and S0335L07
 */

const { preparePhase5Scaffolds } = require('../tools/phase-prep/phase5_prep_scaffolds.cjs');
const path = require('path');

const courseDir = path.join(__dirname, '../public/vfs/courses/cmn_for_eng');

const legoIds = [
  'S0334L07',
  'S0335L07'
];

console.log('🚀 Generating scaffolds for Patch 6');
console.log(`   LEGOs: ${legoIds.join(', ')}`);
console.log(`   Course: cmn_for_eng`);
console.log('');

preparePhase5Scaffolds(courseDir, { legoIds })
  .then(result => {
    console.log('\n✅ Scaffolds generated successfully!');
    console.log(`   LEGOs: ${result.totalNewLegos}`);
    console.log(`   Phrases to generate: ${result.totalNewLegos * 10}`);
    console.log(`   Scaffolds dir: ${result.scaffoldsDir}`);
    console.log(`   Outputs dir: ${result.outputsDir}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Scaffold generation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
