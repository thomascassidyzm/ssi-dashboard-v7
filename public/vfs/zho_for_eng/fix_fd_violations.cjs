#!/usr/bin/env node

/**
 * Fix FD Violations in Chinese LEGO Extraction
 */

const fs = require('fs');
const extraction = JSON.parse(fs.readFileSync('lego_extraction.json', 'utf8'));

console.log('🔧 Fixing FD violations...\n');

let fixes = 0;

// Fix 1: Already done - S0013L02 is now "说得很好" = "speak very well"
// Now need to update any references to S0013L02 to have correct target

extraction.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    // Fix references to S0013L02
    if (lego.id === 'S0013L02' && lego.ref === 'S0013') {
      if (lego.target !== '说得很好') {
        console.log(`✓ Fix S0013L02 reference in ${seed.seed_id}: "${lego.target}" → "说得很好"`);
        lego.target = '说得很好';
        lego.known = 'speak very well';
        if (!lego.components) {
          lego.components = [['说','speak'],['得','complement marker'],['很好','very well']];
        }
        fixes++;
      }
    }
  });
});

// Fix 2: Change S0020L02 from 学 to 学习 (reference S0002L02)
const s0020 = extraction.seeds.find(s => s.seed_id === 'S0020');
if (s0020) {
  const learnLego = s0020.legos.find(l => l.id === 'S0020L02');
  if (learnLego && learnLego.target === '学') {
    console.log('✓ Fix S0020L02: "学" → reference "学习" from S0002');
    learnLego.id = 'S0002L02';
    learnLego.target = '学习';
    learnLego.known = 'learn';
    delete learnLego.new;
    learnLego.ref = 'S0002';
    fixes++;
  }
}

// Fix 3: Add components to S0032L03 (什么东西)
const s0032 = extraction.seeds.find(s => s.seed_id === 'S0032');
if (s0032) {
  const somethingLego = s0032.legos.find(l => l.id === 'S0032L03');
  if (somethingLego && !somethingLego.components) {
    console.log('✓ Add components to S0032L03: "什么东西"');
    somethingLego.type = 'M';
    somethingLego.components = [['什么','what'],['东西','thing']];
    fixes++;
  }
}

// Fix 4: Change S0022L02 known from "meet" to "get to know"
const s0022 = extraction.seeds.find(s => s.seed_id === 'S0022');
if (s0022) {
  const meetLego = s0022.legos.find(l => l.id === 'S0022L02');
  if (meetLego && meetLego.known === 'meet') {
    console.log('✓ Fix S0022L02 known: "meet" → "get to know"');
    meetLego.known = 'get to know';
    fixes++;
  }
}

// Recalculate cumulative counts from S0013 onwards
console.log('\n🔢 Recalculating cumulative counts...');

const registry = new Map();
let recalculated = 0;

extraction.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    if (lego.new) {
      registry.set(lego.id, true);
    }
  });

  const expectedCumulative = registry.size;
  if (seed.cumulative_legos !== expectedCumulative) {
    console.log(`✓ ${seed.seed_id}: ${seed.cumulative_legos} → ${expectedCumulative}`);
    seed.cumulative_legos = expectedCumulative;
    recalculated++;
  }
});

// Save
fs.writeFileSync('lego_extraction.json', JSON.stringify(extraction, null, 2), 'utf8');

console.log('\n' + '='.repeat(70));
console.log(`\n✅ Fixed ${fixes} FD violations`);
console.log(`✅ Recalculated ${recalculated} cumulative counts`);
console.log(`📁 Saved to: lego_extraction.json`);
console.log('\n💡 Run: node test_extraction.cjs to verify fixes');
