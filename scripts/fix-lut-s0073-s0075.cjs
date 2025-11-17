#!/usr/bin/env node

/**
 * Fix LUT violations for S0073, S0074, S0075
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng';
const legoPairsPath = path.join(COURSE_DIR, 'lego_pairs.json');

async function fixLUT() {
  const data = await fs.readJson(legoPairsPath);

  // S0073: Delete S0073L02 ("但是" → "but") and S0073L05 ("要学习" → "to learn")
  const s0073 = data.seeds.find(s => s.seed_id === 'S0073');
  s0073.legos = s0073.legos.filter(l => l.id !== 'S0073L02' && l.id !== 'S0073L05');
  console.log('✅ S0073: Deleted S0073L02 "but" → "但是"');
  console.log('✅ S0073: Deleted S0073L05 "to learn" → "要学习"');
  console.log('   Keeping: "more to learn" → "更多要学习"');

  // S0074: Delete S0074L05 ("帮助我" → "help me")
  const s0074 = data.seeds.find(s => s.seed_id === 'S0074');
  s0074.legos = s0074.legos.filter(l => l.id !== 'S0074L05');
  console.log('✅ S0074: Deleted S0074L05 "help me" → "帮助我"');
  console.log('   Keeping: "help me to understand" → "帮助我理解"');

  // S0075: Delete S0075L04 ("要学习" → "to learn")
  const s0075 = data.seeds.find(s => s.seed_id === 'S0075');
  s0075.legos = s0075.legos.filter(l => l.id !== 'S0075L04');
  console.log('✅ S0075: Deleted S0075L04 "to learn" → "要学习"');
  console.log('   Keeping: "more to learn" → "更多要学习"');

  // Write updated file
  await fs.writeJson(legoPairsPath, data, { spaces: 2 });
  console.log('\n✅ Updated lego_pairs.json');
}

fixLUT().catch(console.error);
