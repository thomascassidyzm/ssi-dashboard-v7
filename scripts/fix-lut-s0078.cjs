#!/usr/bin/env node

/**
 * Fix LUT violations for S0078
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng';
const legoPairsPath = path.join(COURSE_DIR, 'lego_pairs.json');

async function fixLUT() {
  const data = await fs.readJson(legoPairsPath);

  // S0078: Delete S0078L03 ("你说的话" → "what you said")
  // Keep S0078L04 ("你说的" → "what you said") as the base form
  const s0078 = data.seeds.find(s => s.seed_id === 'S0078');
  s0078.legos = s0078.legos.filter(l => l.id !== 'S0078L03');
  console.log('✅ S0078: Deleted S0078L03 "what you said" → "你说的话"');
  console.log('   Keeping: "what you said" → "你说的" (base form)');

  // Write updated file
  await fs.writeJson(legoPairsPath, data, { spaces: 2 });
  console.log('\n✅ Updated lego_pairs.json');
}

fixLUT().catch(console.error);
