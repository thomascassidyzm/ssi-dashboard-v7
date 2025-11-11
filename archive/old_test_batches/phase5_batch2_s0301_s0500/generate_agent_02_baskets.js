#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load input files
const agentInput = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_input/agent_02_seeds.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json', 'utf8'));

// Build whitelist up to a given seed
function buildWhitelist(seedId) {
  const seedNum = parseInt(seedId.replace('S', ''));
  const whitelist = new Set();

  for (const legoId in registry.legos) {
    const lego = registry.legos[legoId];
    const legoSeedNum = parseInt(legoId.split('L')[0].replace('S', ''));

    if (legoSeedNum <= seedNum) {
      lego.spanish_words.forEach(word => {
        whitelist.add(word.toLowerCase());
      });
    }
  }

  return Array.from(whitelist).sort();
}

// Get cumulative LEGO count up to seed
function getCumulativeLegoCount(seedId) {
  const seedNum = parseInt(seedId.replace('S', ''));
  let count = 0;

  for (const legoId in registry.legos) {
    const legoSeedNum = parseInt(legoId.split('L')[0].replace('S', ''));
    if (legoSeedNum <= seedNum) {
      count++;
    }
  }

  return count;
}

// Count LEGOs available (excluding current seed)
function getAvailableLegoCount(seedId) {
  const seedNum = parseInt(seedId.replace('S', ''));
  let count = 0;

  for (const legoId in registry.legos) {
    const legoSeedNum = parseInt(legoId.split('L')[0].replace('S', ''));
    if (legoSeedNum < seedNum) {
      count++;
    }
  }

  return count;
}

// Get LEGO count for current seed
function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// Validate Spanish phrase against whitelist
function validatePhrase(spanish, whitelist) {
  const words = spanish.toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const violations = [];
  for (const word of words) {
    if (!whitelist.includes(word)) {
      violations.push(word);
    }
  }

  return violations;
}

// Generate practice phrases for a LEGO
function generatePractices(lego, whitelist, seedPair, isFinalLego) {
  const practices = [];
  const legoEnglish = lego.known;
  const legoSpanish = lego.target;

  // Phrases will be generated with proper distribution
  // Distribution: 2 short (1-2), 2 quite short (3), 2 longer (4-5), 4 long (6+)

  // This is where the AI agent needs to generate creative, natural phrases
  // For now, returning placeholder structure
  return {
    phrases: practices,
    needsGeneration: true,
    lego: lego,
    whitelist: whitelist,
    seedPair: seedPair,
    isFinalLego: isFinalLego
  };
}

// Main processing
function generateBaskets() {
  console.log('Starting Agent 02 basket generation...\n');

  const output = {
    version: "curated_v6_molecular_lego",
    agent_id: 2,
    seed_range: "S0321-S0340",
    total_seeds: 20,
    validation_status: "NEEDS_VALIDATION",
    validated_at: new Date().toISOString(),
    seeds: {}
  };

  let totalLegos = 0;

  for (const seedData of agentInput.seeds) {
    const seedId = seedData.seed_id;
    const seedPair = seedData.seed_pair;
    const legos = seedData.legos;

    console.log(`Processing ${seedId}: ${seedPair.known}`);

    // Build whitelist up to this seed
    const whitelist = buildWhitelist(seedId);
    const cumulativeLegos = getCumulativeLegoCount(seedId);

    output.seeds[seedId] = {
      seed: seedId,
      seed_pair: seedPair,
      cumulative_legos: cumulativeLegos,
      legos: {}
    };

    // Process each LEGO
    for (let i = 0; i < legos.length; i++) {
      const lego = legos[i];
      const legoId = lego.id;
      const isFinalLego = (i === legos.length - 1);
      const availableLegos = getAvailableLegoCount(legoId);

      console.log(`  - ${legoId}: ${lego.known} (${lego.target})`);

      // Generate metadata
      output.seeds[seedId].legos[legoId] = {
        lego: [lego.known, lego.target],
        type: lego.type,
        available_legos: availableLegos,
        practice_phrases: [],
        phrase_distribution: {
          really_short_1_2: 0,
          quite_short_3: 0,
          longer_4_5: 0,
          long_6_plus: 0
        },
        gate_compliance: "STRICT - All words from taught LEGOs only",
        _metadata: {
          needsGeneration: true,
          whitelist: whitelist.slice(0, 20), // Store sample for reference
          isFinalLego: isFinalLego,
          seedSentence: seedPair.known
        }
      };

      totalLegos++;
    }
  }

  console.log(`\n✅ Structure created for ${agentInput.total_seeds} seeds, ${totalLegos} LEGOs`);
  console.log(`\n⚠️  NEEDS PHRASE GENERATION - This script creates the structure.`);
  console.log(`    An AI agent needs to generate the actual practice phrases.\n`);

  // Save intermediate output
  const outputPath = '/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_output/agent_02_baskets_template.json';
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Template saved to: ${outputPath}`);

  return output;
}

// Run generation
try {
  generateBaskets();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
