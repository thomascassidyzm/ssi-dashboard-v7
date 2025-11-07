#!/usr/bin/env node

import fs from 'fs';

// Load registry
const registryData = JSON.parse(fs.readFileSync('./registry/lego_registry_s0001_s0300.json', 'utf8'));
const seedsData = JSON.parse(fs.readFileSync('./batch_input/agent_01_seeds.json', 'utf8'));

// Extract all LEGOs up to a specific seed and LEGO
function extractWhitelistUpTo(seedId, legoIndex) {
  const whitelist = new Set();
  const allLegos = Object.values(registryData.legos);

  // Parse seed number
  const targetSeedNum = parseInt(seedId.substring(1));

  allLegos.forEach(lego => {
    const legoSeedNum = parseInt(lego.id.substring(1, 5));
    const legoNum = parseInt(lego.id.substring(6, 8));

    // Include if before target seed, or if same seed and before/equal to target lego
    if (legoSeedNum < targetSeedNum || (legoSeedNum === targetSeedNum && legoNum <= legoIndex)) {
      if (lego.spanish_words) {
        lego.spanish_words.forEach(word => {
          whitelist.add(word);
        });
      }
    }
  });

  return Array.from(whitelist).sort();
}

// Build whitelist for each LEGO in our seeds
console.log('Building whitelists for S0101-S0110...\n');

const whitelists = {};

seedsData.seeds.forEach(seed => {
  seed.legos.forEach((lego, idx) => {
    const legoNum = parseInt(lego.id.substring(6, 8));
    const whitelist = extractWhitelistUpTo(seed.seed_id, legoNum);

    whitelists[lego.id] = {
      seed: seed.seed_id,
      lego: lego.id,
      lego_text: lego.target,
      available_legos: seed.cumulative_legos - (seed.legos.length - idx),
      whitelist: whitelist,
      whitelist_size: whitelist.length
    };

    console.log(`${lego.id}: ${whitelist.length} words available`);
  });
});

// Save whitelist data
fs.writeFileSync('./batch_output/whitelists.json', JSON.stringify(whitelists, null, 2));
console.log('\nWhitelists saved to batch_output/whitelists.json');

// Print summary statistics
console.log('\n=== WHITELIST SUMMARY ===');
Object.keys(whitelists).forEach(legoId => {
  const wl = whitelists[legoId];
  console.log(`${legoId}: ${wl.whitelist_size} words (${wl.available_legos} LEGOs)`);
});
