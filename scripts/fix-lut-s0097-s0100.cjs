#!/usr/bin/env node

/**
 * Fix LUT violations for S0097, S0098, S0099, S0100
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng';
const legoPairsPath = path.join(COURSE_DIR, 'lego_pairs.json');

async function fixLUT() {
  const data = await fs.readJson(legoPairsPath);

  // S0097: Delete S0097L03 ("准备好了" → "ready")
  const s0097 = data.seeds.find(s => s.seed_id === 'S0097');
  s0097.legos = s0097.legos.filter(l => l.id !== 'S0097L03');
  console.log('✅ S0097: Deleted S0097L03 "ready" → "准备好了"');
  console.log('   Keeping: "I\'m ready" → "我准备好了"');

  // S0098: Delete S0098L06 ("东西" → "thing")
  const s0098 = data.seeds.find(s => s.seed_id === 'S0098');
  s0098.legos = s0098.legos.filter(l => l.id !== 'S0098L06');
  console.log('✅ S0098: Deleted S0098L06 "thing" → "东西"');
  console.log('   Keeping: "something else" → "别的东西"');

  // S0099: Delete S0099L03 ("你自己" → "yourself")
  const s0099 = data.seeds.find(s => s.seed_id === 'S0099');
  s0099.legos = s0099.legos.filter(l => l.id !== 'S0099L03');
  console.log('✅ S0099: Deleted S0099L03 "yourself" → "你自己"');
  console.log('   Keeping: "ask yourself" → "问问你自己"');

  // S0100: Delete S0100L08 ("事情" → "thing")
  const s0100 = data.seeds.find(s => s.seed_id === 'S0100');
  s0100.legos = s0100.legos.filter(l => l.id !== 'S0100L08');
  console.log('✅ S0100: Deleted S0100L08 "thing" → "事情"');
  console.log('   Keeping: "something similar" → "类似的事情"');

  // Write updated file
  await fs.writeJson(legoPairsPath, data, { spaces: 2 });
  console.log('\n✅ Updated lego_pairs.json');
}

fixLUT().catch(console.error);
