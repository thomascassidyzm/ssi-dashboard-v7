const fs = require('fs');
const path = require('path');

// Read lego_pairs.json
const legoPairsPath = path.join(__dirname, 'lego_pairs.json');
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

console.log('🔄 Reordering LEGOs: A-types before M-types within each seed\n');

// Process each seed
legoPairs.seeds.forEach((seed) => {
  const seedId = seed.seed_id;
  const originalOrder = seed.legos.map(l => `${l.id}(${l.type})`).join(', ');

  // Separate A-types and M-types
  const aTypes = seed.legos.filter(l => l.type === 'A');
  const mTypes = seed.legos.filter(l => l.type === 'M');

  // Concatenate: A-types first, then M-types
  const reordered = [...aTypes, ...mTypes];

  // Renumber IDs
  reordered.forEach((lego, idx) => {
    const newId = `${seedId}L${String(idx + 1).padStart(2, '0')}`;
    lego.id = newId;
  });

  // Update seed
  seed.legos = reordered;

  const newOrder = reordered.map(l => `${l.id}(${l.type})`).join(', ');

  if (originalOrder !== newOrder) {
    console.log(`✅ ${seedId}:`);
    console.log(`   Before: ${originalOrder}`);
    console.log(`   After:  ${newOrder}\n`);
  } else {
    console.log(`✓ ${seedId}: Already correctly ordered\n`);
  }
});

// Write updated file
fs.writeFileSync(legoPairsPath, JSON.stringify(legoPairs, null, 2));

console.log(`\n🎉 Reordering complete! Updated: ${legoPairsPath}`);
