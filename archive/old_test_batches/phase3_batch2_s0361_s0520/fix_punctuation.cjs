#!/usr/bin/env node
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('phase3_batch2_s0361_s0520/lego_pairs_s0361_s0520.json', 'utf8'));

let fixed = 0;
data.seeds.forEach(seed => {
  const originalLength = seed.legos.length;
  seed.legos = seed.legos.filter(lego => {
    if (lego.target === '¿' && (!lego.known || lego.known === '')) {
      console.log(`Removing invalid punctuation LEGO from ${seed.seed_id}`);
      fixed++;
      return false;
    }
    return true;
  });
});

data.new_legos_this_batch -= fixed;
data.cumulative_legos -= fixed;

fs.writeFileSync('phase3_batch2_s0361_s0520/lego_pairs_s0361_s0520.json', JSON.stringify(data, null, 2));
console.log(`\n✓ Removed ${fixed} invalid punctuation LEGOs`);
console.log(`✓ Updated counts: ${data.new_legos_this_batch} new, ${data.cumulative_legos} cumulative`);
