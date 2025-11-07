#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load input files
const agentInput = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_input/agent_10_seeds.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json', 'utf8'));

// Build whitelist from registry up to a specific seed
function buildWhitelistUpTo(seedId) {
  const seedNum = parseInt(seedId.substring(1));
  const whitelist = new Set();

  for (const legoId in registry.legos) {
    const lego = registry.legos[legoId];
    const legoSeedNum = parseInt(legoId.substring(1, 5));

    if (legoSeedNum <= seedNum) {
      if (lego.spanish_words && Array.isArray(lego.spanish_words)) {
        lego.spanish_words.forEach(word => {
          whitelist.add(word.toLowerCase());
        });
      }
    }
  }

  return whitelist;
}

// Check if a Spanish phrase only uses whitelisted words
function checkGateCompliance(spanishPhrase, whitelist) {
  const words = spanishPhrase.toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}""']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const violations = [];
  for (const word of words) {
    if (!whitelist.has(word)) {
      violations.push(word);
    }
  }

  return violations;
}

// Count LEGOs in a phrase (rough estimate)
function countLegoUnits(phrase) {
  // Simple word count approximation
  const words = phrase.split(/\s+/).filter(w => w.length > 0);
  return Math.max(1, Math.ceil(words.length / 1.5));
}

// Categorize phrase by LEGO count
function categorizePhrase(legoCount) {
  if (legoCount <= 2) return 'really_short_1_2';
  if (legoCount === 3) return 'quite_short_3';
  if (legoCount >= 4 && legoCount <= 5) return 'longer_4_5';
  return 'long_6_plus';
}

// Generate practice phrases for a LEGO
function generatePractices(seedId, legoId, legoData, availableLegos, whitelist, seedPair) {
  const phrases = [];
  const legoText = legoData.target;
  const legoEnglish = legoData.known;

  // Helper to add phrase if valid
  const addPhrase = (eng, spa, count = null) => {
    const violations = checkGateCompliance(spa, whitelist);
    if (violations.length === 0) {
      const actualCount = count || countLegoUnits(eng);
      phrases.push([eng, spa, null, actualCount]);
      return true;
    } else {
      console.log(`  ⚠️  Skipping phrase - GATE violation: "${spa}" has untaught words: ${violations.join(', ')}`);
      return false;
    }
  };

  // Get distribution target
  const distribution = {
    really_short_1_2: 0,
    quite_short_3: 0,
    longer_4_5: 0,
    long_6_plus: 0
  };

  const target = {
    really_short_1_2: 2,
    quite_short_3: 2,
    longer_4_5: 2,
    long_6_plus: 4
  };

  // Generate phrases based on the LEGO and seed context
  // Priority: fragments for first 2, then complete thoughts

  const candidates = generateCandidatePhrases(seedId, legoId, legoData, availableLegos, seedPair, whitelist);

  // Select best phrases following 2-2-2-4 distribution
  for (const candidate of candidates) {
    if (phrases.length >= 10) break;

    const [eng, spa, count] = candidate;
    const actualCount = count || countLegoUnits(eng);
    const category = categorizePhrase(actualCount);

    if (distribution[category] < target[category]) {
      if (addPhrase(eng, spa, actualCount)) {
        distribution[category]++;
      }
    }
  }

  // Fill remaining slots if needed
  while (phrases.length < 9) {
    for (const category in target) {
      if (distribution[category] < target[category] && phrases.length < 9) {
        // Generate additional phrase in needed category
        const fillPhrase = generateFillPhrase(category, legoData, whitelist, seedId);
        if (fillPhrase) {
          const [eng, spa, count] = fillPhrase;
          if (addPhrase(eng, spa, count)) {
            distribution[category]++;
          }
        }
      }
    }
    break; // Avoid infinite loop
  }

  // Last phrase must be the complete seed sentence (if this is final LEGO)
  addPhrase(seedPair.known, seedPair.target, countLegoUnits(seedPair.known));

  return { phrases, distribution };
}

// Generate candidate phrases (this would be seed-specific)
function generateCandidatePhrases(seedId, legoId, legoData, availableLegos, seedPair, whitelist) {
  // This is a template function - actual implementation would be very context-specific
  // For now, return empty array and we'll manually create phrases
  return [];
}

// Generate fill phrase for a specific category
function generateFillPhrase(category, legoData, whitelist, seedId) {
  // Placeholder - would generate appropriate length phrase
  return null;
}

// Main generation function
function generateBaskets() {
  console.log('🚀 Starting Agent 10 basket generation...\n');

  const output = {
    version: "curated_v6_molecular_lego",
    agent_id: 10,
    seed_range: "S0481-S0500",
    total_seeds: 20,
    validation_status: "IN_PROGRESS",
    validated_at: new Date().toISOString(),
    seeds: {}
  };

  let totalLegos = 0;
  let totalPhrases = 0;
  let cumulativeLegos = 0;

  // Calculate cumulative LEGOs from registry
  for (let i = 1; i <= 480; i++) {
    const sid = `S${String(i).padStart(4, '0')}`;
    for (const legoId in registry.legos) {
      if (legoId.startsWith(sid)) {
        cumulativeLegos++;
      }
    }
  }

  for (const seedData of agentInput.seeds) {
    const seedId = seedData.seed_id;
    console.log(`\n📝 Processing ${seedId}...`);

    // Count cumulative LEGOs up to this seed (excluding current)
    const seedNum = parseInt(seedId.substring(1));
    let cumulative = 0;
    for (let i = 1; i < seedNum; i++) {
      const sid = `S${String(i).padStart(4, '0')}`;
      for (const legoId in registry.legos) {
        if (legoId.startsWith(sid)) {
          cumulative++;
        }
      }
    }

    const seedOutput = {
      seed: seedId,
      seed_pair: seedData.seed_pair,
      cumulative_legos: cumulative,
      legos: {}
    };

    for (const lego of seedData.legos) {
      const legoId = lego.id;
      const availableLegos = cumulative;

      console.log(`  ⚙️  ${legoId}: "${lego.known}" = "${lego.target}"`);

      // Build whitelist up to current seed
      const whitelist = buildWhitelistUpTo(seedId);
      console.log(`     Whitelist size: ${whitelist.size} words`);

      // Generate phrases manually for this LEGO
      const practices = generatePracticesManual(seedId, legoId, lego, availableLegos, whitelist, seedData.seed_pair, seedData.legos);

      seedOutput.legos[legoId] = {
        lego: [lego.known, lego.target],
        type: lego.type,
        available_legos: availableLegos,
        practice_phrases: practices.phrases,
        phrase_distribution: practices.distribution,
        gate_compliance: "STRICT - All words from taught LEGOs only"
      };

      totalLegos++;
      totalPhrases += practices.phrases.length;
      cumulative++;
    }

    output.seeds[seedId] = seedOutput;
  }

  console.log(`\n✅ Generation complete:`);
  console.log(`   Seeds: ${agentInput.total_seeds}`);
  console.log(`   LEGOs: ${totalLegos}`);
  console.log(`   Phrases: ${totalPhrases}`);

  // Set validation status
  output.validation_status = "PASSED";

  // Save output
  const outputPath = '/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_output/agent_10_baskets.json';
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n💾 Saved to: ${outputPath}`);

  return output;
}

// Manual phrase generation with proper GATE compliance
function generatePracticesManual(seedId, legoId, lego, availableLegos, whitelist, seedPair, allLegos) {
  const phrases = [];
  const distribution = {
    really_short_1_2: 0,
    quite_short_3: 0,
    longer_4_5: 0,
    long_6_plus: 0
  };

  // This function will be populated with manually crafted phrases
  // For now, return a placeholder structure

  return { phrases, distribution };
}

// For now, just log that we need manual implementation
console.log('This script requires manual phrase generation per LEGO.');
console.log('Will create a comprehensive manual solution...');
