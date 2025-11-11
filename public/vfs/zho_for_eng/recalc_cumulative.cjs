#!/usr/bin/env node

const fs = require('fs');
const extraction = JSON.parse(fs.readFileSync('lego_extraction.json', 'utf8'));

console.log('🔢 Recalculating cumulative counts...\n');

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

fs.writeFileSync('lego_extraction.json', JSON.stringify(extraction, null, 2), 'utf8');

console.log('\n✅ Recalculated ' + recalculated + ' cumulative counts');
console.log('💾 Saved to: lego_extraction.json');
