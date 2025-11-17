#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const OUTPUTS_DIR = 'public/vfs/courses/cmn_for_eng/phase5_outputs';
const SEEDS = ['s0043', 's0044', 's0045', 's0046', 's0047', 's0048', 's0049', 's0050', 's0051', 's0052', 's0053', 's0054', 's0055', 's0056'];

console.log('🔍 Verifying Patch 1 Outputs\n');

let totalLegos = 0;
let totalPhrases = 0;
let filesFound = 0;

for (const seed of SEEDS) {
  const filePath = path.join(OUTPUTS_DIR, `seed_${seed}_baskets.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ Missing: seed_${seed}_baskets.json`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const legoIds = Object.keys(data.legos || {});
  const legoCount = legoIds.length;

  let phraseCount = 0;
  for (const legoId of legoIds) {
    const lego = data.legos[legoId];
    phraseCount += (lego.practice_phrases || []).length;
  }

  console.log(`✓ ${seed}: ${legoCount} LEGOs, ${phraseCount} phrases`);

  filesFound++;
  totalLegos += legoCount;
  totalPhrases += phraseCount;
}

console.log(`\n📊 Summary:`);
console.log(`   Files: ${filesFound}/14`);
console.log(`   LEGOs: ${totalLegos}`);
console.log(`   Phrases: ${totalPhrases}`);
console.log(`   Expected: 53 LEGOs, 530 phrases`);
console.log(totalLegos === 53 && totalPhrases === 530 ? '\n✅ ALL VERIFIED!' : '\n⚠️ Counts do not match!');
