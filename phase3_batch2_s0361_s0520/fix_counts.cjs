#!/usr/bin/env node
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('phase3_batch2_s0361_s0520/lego_pairs_s0361_s0520.json', 'utf8'));

// Count actual new and referenced LEGOs
let actualNewCount = 0;
let actualRefCount = 0;

data.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    if (lego.new) {
      actualNewCount++;
    } else {
      actualRefCount++;
    }
  });
});

console.log('Current metadata:');
console.log(`  new_legos_this_batch: ${data.new_legos_this_batch}`);
console.log(`  referenced_legos: ${data.referenced_legos}`);
console.log(`  cumulative_legos: ${data.cumulative_legos}`);

console.log('\nActual counts:');
console.log(`  New LEGOs: ${actualNewCount}`);
console.log(`  Referenced LEGOs: ${actualRefCount}`);
console.log(`  Cumulative: ${926 + actualNewCount} (926 from S0001-S0360 + ${actualNewCount} new)`);

// Update metadata
data.new_legos_this_batch = actualNewCount;
data.referenced_legos = actualRefCount;
data.cumulative_legos = 926 + actualNewCount;

fs.writeFileSync('phase3_batch2_s0361_s0520/lego_pairs_s0361_s0520.json', JSON.stringify(data, null, 2));

console.log('\n✓ Metadata updated successfully');
