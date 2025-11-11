#!/usr/bin/env node
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('phase3_batch3_s0521_s0668/lego_pairs_s0521_s0668.json', 'utf8'));

let fixed = 0;
let removedIds = [];

data.seeds.forEach(seed => {
  const originalLength = seed.legos.length;
  seed.legos = seed.legos.filter(lego => {
    if (!lego.known || lego.known === '') {
      console.log(`Removing invalid LEGO from ${seed.seed_id}: id=${lego.id}, target="${lego.target}", known=""`);
      removedIds.push(lego.id);
      fixed++;
      return false;
    }
    return true;
  });
});

// Update counts
data.new_legos_this_batch -= fixed;
data.cumulative_legos -= fixed;

fs.writeFileSync('phase3_batch3_s0521_s0668/lego_pairs_s0521_s0668.json', JSON.stringify(data, null, 2));

console.log(`\n✓ Removed ${fixed} invalid LEGOs with empty 'known' fields`);
console.log(`✓ Updated counts: ${data.new_legos_this_batch} new, ${data.cumulative_legos} cumulative`);
console.log(`\nRemoved LEGO IDs: ${removedIds.join(', ')}`);
