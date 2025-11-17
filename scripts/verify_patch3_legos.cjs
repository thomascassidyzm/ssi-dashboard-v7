#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const outputDir = 'public/vfs/courses/cmn_for_eng/phase5_outputs';
const targetLegoIds = ["S0133L01","S0133L02","S0133L03","S0133L04","S0133L05","S0134L01","S0134L02","S0134L03","S0134L04","S0134L05","S0135L01","S0135L02","S0135L03","S0135L04","S0135L05","S0136L01","S0136L02","S0136L03","S0136L04","S0137L01","S0137L02","S0137L03","S0137L04","S0137L05","S0138L01","S0138L03","S0138L04","S0138L05","S0139L01","S0139L02","S0139L03","S0139L04","S0139L05","S0140L02","S0140L03","S0140L04","S0140L05","S0141L01","S0141L02","S0142L01","S0142L02","S0142L03","S0142L04","S0143L01","S0143L02","S0143L03","S0143L04","S0144L02","S0144L03","S0144L04","S0145L01","S0145L03","S0145L04","S0146L01","S0146L02","S0146L03","S0146L04","S0147L01","S0147L02","S0147L03","S0147L04","S0147L05","S0148L01","S0148L02","S0148L03","S0148L04","S0149L01","S0149L02","S0149L03","S0149L04","S0149L05","S0150L01","S0150L02","S0150L03","S0151L01","S0151L02","S0151L03","S0151L04","S0151L05","S0151L06","S0152L01","S0152L02","S0152L03","S0152L04","S0152L05","S0152L06","S0153L01","S0153L02","S0153L03","S0153L04","S0153L05","S0154L02","S0154L03","S0154L04","S0154L05","S0154L06","S0155L01","S0155L02","S0155L03","S0155L04","S0156L01","S0156L02","S0156L03","S0156L05","S0157L01","S0157L02","S0157L03","S0157L04","S0157L05","S0158L01","S0158L02","S0158L03","S0159L03","S0159L04","S0159L05","S0160L01","S0160L02","S0160L03","S0160L04","S0160L06","S0161L01","S0161L02","S0161L03","S0161L04","S0161L05","S0162L01","S0162L02","S0162L03","S0163L02","S0163L04","S0164L01","S0164L02","S0164L03","S0165L01","S0165L03","S0165L04","S0166L01","S0166L02","S0166L03","S0166L04","S0167L01","S0167L02","S0167L03","S0168L01","S0168L02","S0168L03","S0168L04","S0168L05"];

const foundLegos = new Set();
const missingLegos = [];
const seedFiles = [];

// Read all seed basket files in the range
for (let seedNum = 133; seedNum <= 168; seedNum++) {
  const seedId = 'S' + String(seedNum).padStart(4, '0');
  const filename = `seed_s${String(seedNum).padStart(4, '0')}_baskets.json`;
  const filepath = path.join(outputDir, filename);

  if (fs.existsSync(filepath)) {
    seedFiles.push(filename);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    // Handle both "baskets" and "legos" formats
    const basketsData = data.baskets || data.legos;
    if (basketsData) {
      Object.keys(basketsData).forEach(legoId => foundLegos.add(legoId));
    }
  }
}

// Check for missing LEGOs
targetLegoIds.forEach(legoId => {
  if (!foundLegos.has(legoId)) {
    missingLegos.push(legoId);
  }
});

console.log('=== Patch 3 LEGO Verification ===');
console.log(`Target LEGOs: ${targetLegoIds.length}`);
console.log(`Found LEGOs: ${foundLegos.size}`);
console.log(`Seed files: ${seedFiles.length}`);
console.log(`Missing LEGOs: ${missingLegos.length}`);

if (missingLegos.length > 0) {
  console.log('\nMissing LEGOs:');
  missingLegos.forEach(lego => console.log(`  - ${lego}`));
  process.exit(1);
} else {
  console.log('\n✅ All 148 LEGOs generated successfully!');
  process.exit(0);
}
