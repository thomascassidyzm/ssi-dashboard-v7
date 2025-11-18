#!/usr/bin/env node

/**
 * Fix LUT violations for S0011-S0020 by removing duplicate LEGOs
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng';
const legoPairsPath = path.join(COURSE_DIR, 'lego_pairs.json');

async function fixLUT() {
  const data = await fs.readJson(legoPairsPath);

  // S0011: Delete S0011L04 ("说话" → "to speak")
  const s0011 = data.seeds.find(s => s.seed_id === 'S0011');
  s0011.legos = s0011.legos.filter(l => l.id !== 'S0011L04');
  console.log('✅ S0011: Deleted S0011L04 "to speak" → "说话"');

  // S0013: Delete S0013L03 ("得很好" → "very well")
  const s0013 = data.seeds.find(s => s.seed_id === 'S0013');
  s0013.legos = s0013.legos.filter(l => l.id !== 'S0013L03');
  console.log('✅ S0013: Deleted S0013L03 "very well" → "得很好"');

  // S0014: Delete S0014L04 ("整天都" → "all day")
  const s0014 = data.seeds.find(s => s.seed_id === 'S0014');
  s0014.legos = s0014.legos.filter(l => l.id !== 'S0014L04');
  console.log('✅ S0014: Deleted S0014L04 "all day" → "整天都"');

  // S0020: Delete S0020L03 ("学会" → "to learn")
  const s0020 = data.seeds.find(s => s.seed_id === 'S0020');
  s0020.legos = s0020.legos.filter(l => l.id !== 'S0020L03');
  console.log('✅ S0020: Deleted S0020L03 "to learn" → "学会"');

  // Write updated file
  await fs.writeJson(legoPairsPath, data, { spaces: 2 });
  console.log('\n✅ Updated lego_pairs.json');
}

fixLUT().catch(console.error);
