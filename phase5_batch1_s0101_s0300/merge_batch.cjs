#!/usr/bin/env node

/**
 * Phase 5 Batch 1 Merge Script
 *
 * Purpose: Merge 20 agent basket outputs into single consolidated file
 */

const fs = require('fs');
const path = require('path');

console.log('=== PHASE 5 BATCH 1 MERGE ===\n');

// Load all agent outputs
console.log('Step 1: Loading agent outputs...');

const allBaskets = {};
const agentStats = [];
let totalSeeds = 0;
let totalLEGOs = 0;
let totalPhrases = 0;

for (let agentNum = 1; agentNum <= 20; agentNum++) {
  const agentId = String(agentNum).padStart(2, '0');
  const filename = `batch_output/agent_${agentId}_baskets.json`;

  let agentSeeds = 0;
  let agentLEGOs = 0;
  let agentPhrases = 0;

  // Check for consolidated agent file first
  if (fs.existsSync(filename)) {
    try {
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));

      // Handle different file structures
      let seedsData = data;
      if (data.seeds) {
        seedsData = data.seeds; // Nested under "seeds" key
      }

      // Find all seed keys (S0XXX)
      const seedKeys = Object.keys(seedsData).filter(key => key.match(/^S\d{4}$/));

      for (const seedId of seedKeys) {
        if (allBaskets[seedId]) {
          console.log(`  ⚠️  Warning: Duplicate seed ${seedId} from agent ${agentId}`);
          continue;
        }

        allBaskets[seedId] = seedsData[seedId];
        agentSeeds++;

        // Count LEGOs and phrases
        if (seedsData[seedId].legos) {
          const legoIds = Object.keys(seedsData[seedId].legos);
          agentLEGOs += legoIds.length;

          for (const legoId of legoIds) {
            const lego = seedsData[seedId].legos[legoId];
            if (lego.practice_phrases) {
              agentPhrases += lego.practice_phrases.length;
            }
          }
        }
      }
    } catch (error) {
      console.log(`  ✗ Agent ${agentId}: Error loading - ${error.message}`);
      continue;
    }
  } else {
    // Look for individual seed files (pattern: lego_baskets_sXXXX.json)
    // Agents 1 and 9 use this format
    const seedStart = 101 + (agentNum - 1) * 10;
    const seedEnd = seedStart + 9;

    for (let seedNum = seedStart; seedNum <= seedEnd; seedNum++) {
      const seedId = `S${String(seedNum).padStart(4, '0')}`;
      const seedFile = `batch_output/lego_baskets_s${String(seedNum).padStart(4, '0')}.json`;

      if (fs.existsSync(seedFile)) {
        try {
          const data = JSON.parse(fs.readFileSync(seedFile, 'utf8'));

          if (allBaskets[seedId]) {
            console.log(`  ⚠️  Warning: Duplicate seed ${seedId}`);
            continue;
          }

          // Extract seed data (structure varies)
          const seedData = data[seedId] || data;
          allBaskets[seedId] = seedData;
          agentSeeds++;

          // Count LEGOs and phrases
          if (seedData.legos) {
            const legoIds = Object.keys(seedData.legos);
            agentLEGOs += legoIds.length;

            for (const legoId of legoIds) {
              const lego = seedData.legos[legoId];
              if (lego.practice_phrases) {
                agentPhrases += lego.practice_phrases.length;
              }
            }
          }
        } catch (error) {
          console.log(`  ✗ ${seedId}: Error loading - ${error.message}`);
        }
      }
    }

    if (agentSeeds === 0) {
      console.log(`  ⚠️  Agent ${agentId}: No files found, skipping`);
      continue;
    }
  }

  totalSeeds += agentSeeds;
  totalLEGOs += agentLEGOs;
  totalPhrases += agentPhrases;

  agentStats.push({
    agent: agentId,
    seeds: agentSeeds,
    legos: agentLEGOs,
    phrases: agentPhrases
  });

  console.log(`  ✓ Agent ${agentId}: ${agentSeeds} seeds, ${agentLEGOs} LEGOs, ${agentPhrases} phrases`);
}

console.log(`\n✓ Loaded ${totalSeeds} seeds from ${agentStats.length} agents\n`);

// Step 2: Verify completeness
console.log('Step 2: Verifying completeness...');

const expectedSeeds = [];
for (let i = 101; i <= 300; i++) {
  expectedSeeds.push(`S${String(i).padStart(4, '0')}`);
}

const missingSeeds = expectedSeeds.filter(seedId => !allBaskets[seedId]);

if (missingSeeds.length > 0) {
  console.log(`  ⚠️  Missing ${missingSeeds.length} seeds:`);
  missingSeeds.slice(0, 10).forEach(seedId => console.log(`    - ${seedId}`));
  if (missingSeeds.length > 10) {
    console.log(`    ... and ${missingSeeds.length - 10} more`);
  }
} else {
  console.log(`  ✓ All 200 seeds present (S0101-S0300)`);
}

// Step 3: Create merged output
console.log('\nStep 3: Creating merged output...');

const mergedOutput = {
  version: "curated_v6_molecular_lego",
  batch: "batch1",
  seed_range: "S0101-S0300",
  course_direction: "Spanish for English speakers",
  mapping: "KNOWN (English) → TARGET (Spanish)",
  total_seeds: totalSeeds,
  total_legos: totalLEGOs,
  total_phrases: totalPhrases,
  merged_at: new Date().toISOString(),
  curation_metadata: {
    curated_by: "20 parallel Sonnet 4.5 agents with extended thinking",
    spec_version: "Phase 5 v3.0 (ACTIVE)",
    notes: "All baskets follow 2-2-2-4 distribution. GATE compliance enforced."
  },
  agent_contributions: agentStats
};

// Add all seeds in order
for (const seedId of expectedSeeds) {
  if (allBaskets[seedId]) {
    mergedOutput[seedId] = allBaskets[seedId];
  }
}

// Save merged output
const outputPath = 'baskets_s0101_s0300.json';
fs.writeFileSync(outputPath, JSON.stringify(mergedOutput, null, 2));

const stats = fs.statSync(outputPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(`✓ Saved merged output: ${outputPath} (${sizeMB} MB)\n`);

// Step 4: Summary
console.log('=== MERGE COMPLETE ===\n');
console.log(`📊 Summary:`);
console.log(`  - Seeds: ${totalSeeds}/200`);
console.log(`  - LEGOs: ${totalLEGOs}`);
console.log(`  - Phrases: ${totalPhrases}`);
console.log(`  - Agents: ${agentStats.length}/20`);
console.log(`  - Output: ${outputPath} (${sizeMB} MB)\n`);

if (missingSeeds.length > 0) {
  console.log(`⚠️  ${missingSeeds.length} seeds missing - review needed\n`);
} else {
  console.log(`✅ Batch 1 merge successful!\n`);
}
