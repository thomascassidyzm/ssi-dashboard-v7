#!/usr/bin/env node

/**
 * Fix LUT violations for S0027, S0030
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng';
const legoPairsPath = path.join(COURSE_DIR, 'lego_pairs.json');

async function fixLUT() {
  const data = await fs.readJson(legoPairsPath);

  // S0027: Delete S0027L05 ("回答" → "answer")
  const s0027 = data.seeds.find(s => s.seed_id === 'S0027');
  s0027.legos = s0027.legos.filter(l => l.id !== 'S0027L05');
  console.log('✅ S0027: Deleted S0027L05 "answer" → "回答"');
  console.log('   Keeping: "take too much time to answer" → "花太多时间回答"');

  // S0030: Delete S0030L06 ("一些事情" → "something")
  const s0030 = data.seeds.find(s => s.seed_id === 'S0030');
  s0030.legos = s0030.legos.filter(l => l.id !== 'S0030L06');
  console.log('✅ S0030: Deleted S0030L06 "something" → "一些事情"');
  console.log('   Keeping: "to ask you something" → "问你一些事情"');

  // Write updated file
  await fs.writeJson(legoPairsPath, data, { spaces: 2 });
  console.log('\n✅ Updated lego_pairs.json');
}

fixLUT().catch(console.error);
