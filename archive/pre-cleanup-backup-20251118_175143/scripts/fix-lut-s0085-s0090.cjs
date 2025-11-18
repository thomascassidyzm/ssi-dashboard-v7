#!/usr/bin/env node

/**
 * Fix LUT violations for S0085, S0087, S0090
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng';
const legoPairsPath = path.join(COURSE_DIR, 'lego_pairs.json');

async function fixLUT() {
  const data = await fs.readJson(legoPairsPath);

  // S0085: Delete S0085L01 ("认识" → "know") and S0085L02 ("不认识" → "don't know")
  const s0085 = data.seeds.find(s => s.seed_id === 'S0085');
  s0085.legos = s0085.legos.filter(l => l.id !== 'S0085L01' && l.id !== 'S0085L02');
  console.log('✅ S0085: Deleted S0085L01 "know" → "认识"');
  console.log('✅ S0085: Deleted S0085L02 "don\'t know" → "不认识"');
  console.log('   Keeping: "I don\'t know" → "我不认识"');

  // S0087: Delete S0087L02 ("认识" → "know") and S0087L03 ("不认识" → "don't know")
  const s0087 = data.seeds.find(s => s.seed_id === 'S0087');
  s0087.legos = s0087.legos.filter(l => l.id !== 'S0087L02' && l.id !== 'S0087L03');
  console.log('✅ S0087: Deleted S0087L02 "know" → "认识"');
  console.log('✅ S0087: Deleted S0087L03 "don\'t know" → "不认识"');
  console.log('   Keeping: "people I don\'t know" → "我不认识的人"');

  // S0090: Delete S0090L02 ("能" → "can")
  const s0090 = data.seeds.find(s => s.seed_id === 'S0090');
  s0090.legos = s0090.legos.filter(l => l.id !== 'S0090L02');
  console.log('✅ S0090: Deleted S0090L02 "can" → "能"');
  console.log('   Keeping: "you can" → "你能"');

  // Write updated file
  await fs.writeJson(legoPairsPath, data, { spaces: 2 });
  console.log('\n✅ Updated lego_pairs.json');
}

fixLUT().catch(console.error);
