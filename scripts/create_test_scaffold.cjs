#!/usr/bin/env node

/**
 * Create Test Scaffold for Cached Context Testing
 *
 * Generates scaffold for S0046-S0050 (11 LEGOs)
 */

const fs = require('fs');
const path = require('path');

function extractSeedNum(seedId) {
  const match = seedId.match(/S(\d{4})/);
  return match ? parseInt(match[1], 10) : 0;
}

function buildWhitelist(registry, targetSeedNum) {
  const whitelist = new Set();

  // Go through all LEGOs in registry up to target seed
  for (const legoId in registry.legos) {
    const lego = registry.legos[legoId];
    // Extract seed number from LEGO ID (e.g., S0046L01 -> 46)
    const match = legoId.match(/S(\d{4})L/);
    if (match) {
      const seedNum = parseInt(match[1], 10);
      if (seedNum <= targetSeedNum) {
        // Add all spanish_words from this LEGO
        for (const word of lego.spanish_words) {
          whitelist.add(word.toLowerCase());
        }
      }
    }
  }

  return Array.from(whitelist).sort();
}

function createTestScaffold() {
  console.log('Creating test scaffold for S0046-S0050...\n');

  // Load lego_pairs (for seed structure)
  const legoPairsPath = path.join(__dirname, '..', 'public', 'vfs', 'courses', 'spa_for_eng', 'lego_pairs.json');
  const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

  // Load registry (for proper whitelist building)
  const registryPath = path.join(__dirname, '..', 'phase5_batch1_s0101_s0300', 'registry', 'lego_registry_s0001_s0300.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  console.log(`Loaded registry: ${registry.total_legos} LEGOs\n`);

  // Find seeds S0046-S0050
  const testSeeds = legoPairs.seeds.filter(s => {
    const num = extractSeedNum(s.seed_id);
    return num >= 46 && num <= 50;
  });

  console.log(`Found ${testSeeds.length} seeds`);

  const scaffold = {
    test_id: 'test_1_cached_context',
    agent_id: 'test_agent_C',
    seed_range: 'S0046-S0050',
    total_seeds: testSeeds.length,
    seeds: {}
  };

  // Process each seed
  let totalLegos = 0;
  for (const seedData of testSeeds) {
    const seedNum = extractSeedNum(seedData.seed_id);
    const whitelist = buildWhitelist(registry, seedNum);

    console.log(`  ${seedData.seed_id}: whitelist ${whitelist.length} words`);

    scaffold.seeds[seedData.seed_id] = {
      seed_id: seedData.seed_id,
      seed_pair: {
        target: seedData.seed_pair[0],
        known: seedData.seed_pair[1]
      },
      whitelist: whitelist,
      recency_focus: {
        window_start: `S${String(Math.max(1, seedNum - 5)).padStart(4, '0')}`,
        window_end: `S${String(seedNum - 1).padStart(4, '0')}`,
        instruction: `Prioritize vocabulary and patterns from seeds ${Math.max(1, seedNum-5)}-${seedNum-1}. Target: 60-80% of phrases should use recent vocabulary.`
      },
      legos: {}
    };

    // Extract NEW LEGOs
    const newLegos = seedData.legos.filter(l => l.new === true);
    totalLegos += newLegos.length;

    for (let i = 0; i < newLegos.length; i++) {
      const lego = newLegos[i];
      const isFinal = (i === newLegos.length - 1);

      scaffold.seeds[seedData.seed_id].legos[lego.id] = {
        lego_id: lego.id,
        lego: [lego.known, lego.target],
        type: lego.type,
        is_final_lego: isFinal,
        practice_phrases: [],
        phrase_distribution: {
          really_short_1_2: 0,
          quite_short_3: 0,
          longer_4_5: 0,
          long_6_plus: 0
        }
      };
    }
  }

  // Write scaffold
  const outputPath = path.join(__dirname, '..', 'phase5_tests', 'scaffolds', 'test_agent_C_scaffold.json');
  fs.writeFileSync(outputPath, JSON.stringify(scaffold, null, 2));

  console.log(`\n✅ Test scaffold created`);
  console.log(`   Seeds: ${testSeeds.length}`);
  console.log(`   LEGOs: ${totalLegos}`);
  console.log(`   Output: ${outputPath}\n`);
}

createTestScaffold();
