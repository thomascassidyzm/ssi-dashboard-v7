const fs = require('fs');
const path = require('path');

// Read lego_pairs.json
const legoPairsPath = path.join(__dirname, 'lego_pairs.json');
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

console.log('🔍 Deduplicating LEGOs across seeds\n');

// Track seen LEGOs: key = "target|known", value = first seed_id
const seenLegos = new Map();
let duplicateCount = 0;

// Process each seed in order
legoPairs.seeds.forEach((seed) => {
  const seedId = seed.seed_id;

  seed.legos.forEach((lego) => {
    const key = `${lego.target}|${lego.known}`;

    if (seenLegos.has(key)) {
      // Duplicate found!
      const firstSeedId = seenLegos.get(key);
      lego.new = false;
      lego.ref = firstSeedId;
      duplicateCount++;

      console.log(`❌ ${lego.id} (${lego.type}): "${lego.target}" / "${lego.known}"`);
      console.log(`   → Duplicate of ${firstSeedId}\n`);
    } else {
      // First occurrence
      seenLegos.set(key, seedId);
      lego.new = true;

      // Remove ref if it exists (from previous runs)
      delete lego.ref;
    }
  });
});

// Write updated file
fs.writeFileSync(legoPairsPath, JSON.stringify(legoPairs, null, 2));

console.log(`\n📊 Summary:`);
console.log(`   Total seeds: ${legoPairs.seeds.length}`);
console.log(`   Total LEGOs: ${legoPairs.seeds.reduce((sum, s) => sum + s.legos.length, 0)}`);
console.log(`   Duplicates found: ${duplicateCount}`);
console.log(`   Unique LEGOs: ${seenLegos.size}`);
console.log(`\n✅ Deduplication complete! Updated: ${legoPairsPath}`);
