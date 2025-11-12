const fs = require('fs');

// Load S0001-S0010 for prior context
const priorData = JSON.parse(fs.readFileSync('../spa_for_eng_s0001-0010/lego_pairs.json', 'utf8'));

// Load merged S0011-S0040
const merged = JSON.parse(fs.readFileSync('lego_pairs_merged.json', 'utf8'));

// Build registry from S0001-S0010
const registry = new Map();
priorData.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    const key = lego.target.toLowerCase().trim() + '|' + lego.known.toLowerCase().trim();
    if (!registry.has(key)) {
      registry.set(key, {
        first_seen: lego.id,
        seed: seed.seed_id
      });
    }
  });
});

console.log('📊 Prior context: ' + registry.size + ' unique LEGOs from S0001-S0010\n');

// Deduplicate S0011-S0040
let newCount = 0;
let dupCount = 0;

merged.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    const key = lego.target.toLowerCase().trim() + '|' + lego.known.toLowerCase().trim();

    if (registry.has(key)) {
      // Duplicate
      lego.new = false;
      lego.ref = registry.get(key).seed;
      dupCount++;
    } else {
      // New LEGO
      lego.new = true;
      registry.set(key, {
        first_seen: lego.id,
        seed: seed.seed_id
      });
      newCount++;
    }
  });
});

// Write deduplicated output
fs.writeFileSync('lego_pairs_deduplicated_final.json', JSON.stringify(merged, null, 2));

console.log('✅ Deduplication complete:');
console.log('   New LEGOs: ' + newCount);
console.log('   Duplicates: ' + dupCount);
console.log('   Total: ' + (newCount + dupCount));
console.log('   Dedup rate: ' + Math.round(dupCount/(newCount+dupCount)*100) + '%');
