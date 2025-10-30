#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const legoIds = [
  "S0528L02", "S0528L03", "S0528L04", "S0528L05",
  "S0529L01", "S0529L02", "S0530L01", "S0530L02",
  "S0531L01", "S0531L02", "S0531L03", "S0532L01",
  "S0532L02", "S0533L01", "S0533L02", "S0534L01",
  "S0534L02", "S0534L03", "S0535L01", "S0535L03"
];

const legoPairsPath = path.join(__dirname, 'vfs/courses/spa_for_eng/lego_pairs.json');
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

const extracted = {};

// Navigate through seeds structure
for (const seed of legoPairs.seeds) {
  const seedId = seed[0];
  const seedPair = seed[1];
  const legos = seed[2];

  for (const lego of legos) {
    const legoId = lego[0];
    if (legoIds.includes(legoId)) {
      extracted[legoId] = {
        seedId: seedId,
        seedPair: seedPair,
        legoData: lego
      };
    }
  }
}

const outputPath = path.join(__dirname, 'temp_agent_06_data.json');
fs.writeFileSync(outputPath, JSON.stringify(extracted, null, 2));

console.log(`Extracted ${Object.keys(extracted).length} LEGOs to temp_agent_06_data.json`);
