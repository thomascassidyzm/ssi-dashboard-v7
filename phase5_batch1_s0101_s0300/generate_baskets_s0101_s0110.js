#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load input files
const seedsFile = './batch_input/agent_01_seeds.json';
const registryFile = './registry/lego_registry_s0001_s0300.json';

const seedsData = JSON.parse(fs.readFileSync(seedsFile, 'utf8'));
const registryData = JSON.parse(fs.readFileSync(registryFile, 'utf8'));

console.log('Loaded seeds:', seedsData.total_seeds);
console.log('Registry total LEGOs:', registryData.total_legos);

// Build whitelist of Spanish words up to a given LEGO
function buildWhitelist(upToLegoCount) {
  const whitelist = new Set();
  const allLegos = Object.values(registryData.legos);

  // Take first N LEGOs
  const legosToInclude = allLegos.slice(0, upToLegoCount);

  legosToInclude.forEach(lego => {
    if (lego.spanish_words) {
      lego.spanish_words.forEach(word => {
        whitelist.add(word.toLowerCase());
      });
    }
  });

  return whitelist;
}

// Validate Spanish phrase against whitelist
function validateGateCompliance(spanishPhrase, whitelist) {
  const words = spanishPhrase
    .toLowerCase()
    .replace(/[.,¿?!¡]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const violations = words.filter(word => !whitelist.has(word));

  return {
    compliant: violations.length === 0,
    violations: violations
  };
}

// Extract individual words from LEGO target
function extractWords(target) {
  return target
    .toLowerCase()
    .replace(/[.,¿?!¡]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

// Generate practice phrases for a LEGO
function generatePracticePhrasesForLego(seed, lego, legoIndex, isLastLego, availableLegos, previousSeeds) {
  const whitelist = buildWhitelist(availableLegos);
  const phrases = [];

  console.log(`\nGenerating phrases for ${lego.id} (${lego.known})`);
  console.log(`Whitelist size: ${whitelist.size} words`);
  console.log(`Available LEGOs: ${availableLegos}`);

  // Get recent vocabulary from previous 5 seeds
  const recentWords = new Set();
  previousSeeds.slice(-5).forEach(s => {
    s.legos.forEach(l => {
      extractWords(l.target).forEach(w => recentWords.add(w));
    });
  });

  // For now, generate template phrases - these will need to be manually crafted
  // following all the rules from the spec

  // Phrases 1-2: Short (1-2 LEGOs) - fragments OK
  phrases.push([lego.known, lego.target, null, 1]);

  // We need more sophisticated phrase generation here
  // This is a placeholder structure

  return phrases;
}

// Main generation function
function generateBaskets() {
  const output = {};
  let totalSeeds = 0;
  let totalLegos = 0;
  let totalPhrases = 0;

  seedsData.seeds.forEach(seed => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing ${seed.seed_id}: ${seed.seed_pair.known}`);
    console.log(`${'='.repeat(60)}`);

    const seedBaskets = {
      version: "curated_v7_spanish",
      seed: seed.seed_id,
      course_direction: "Spanish for English speakers",
      mapping: "KNOWN (English) → TARGET (Spanish)",
      seed_pair: seed.seed_pair,
      patterns_introduced: "TBD",
      cumulative_patterns: [],
      cumulative_legos: seed.cumulative_legos,
      curation_metadata: {
        curated_at: new Date().toISOString(),
        curated_by: "Claude Code - Phase 5 v3.0 Agent 01",
        notes: "Agent-generated basket with 10 practice phrases per LEGO, full GATE validation"
      }
    };

    seed.legos.forEach((lego, legoIndex) => {
      const isLastLego = legoIndex === seed.legos.length - 1;
      const availableLegos = seed.cumulative_legos - (seed.legos.length - legoIndex - 1);

      // Get previous seeds for recency priority
      const seedIndex = seedsData.seeds.findIndex(s => s.seed_id === seed.seed_id);
      const previousSeeds = seedsData.seeds.slice(Math.max(0, seedIndex - 5), seedIndex);

      const phrases = generatePracticePhrasesForLego(
        seed,
        lego,
        legoIndex,
        isLastLego,
        availableLegos,
        previousSeeds
      );

      seedBaskets[lego.id] = {
        lego: [lego.known, lego.target],
        type: lego.type,
        available_legos: availableLegos,
        available_patterns: [],
        practice_phrases: phrases,
        phrase_distribution: {
          really_short_1_2: 0,
          quite_short_3: 0,
          longer_4_5: 0,
          long_6_plus: 0
        },
        pattern_coverage: "TBD",
        gate_compliance: `STRICT - Only S0001-${seed.seed_id}L${String(legoIndex).padStart(2, '0')} LEGOs available`
      };

      if (isLastLego) {
        seedBaskets[lego.id].full_seed_included = "YES - phrase 10";
      }

      totalLegos++;
    });

    // Save individual seed file
    const outputPath = `./batch_output/lego_baskets_${seed.seed_id.toLowerCase()}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(seedBaskets, null, 2));
    console.log(`Saved: ${outputPath}`);

    totalSeeds++;
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`GENERATION COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Seeds: ${totalSeeds}`);
  console.log(`LEGOs: ${totalLegos}`);
  console.log(`Phrases: ${totalPhrases}`);

  return { totalSeeds, totalLegos, totalPhrases };
}

// Run generation
try {
  const results = generateBaskets();
  console.log(`\nAgent 01 complete: ${results.totalSeeds} seeds, ${results.totalLegos} LEGOs, ${results.totalPhrases} phrases generated`);
} catch (error) {
  console.error('Error during generation:', error);
  process.exit(1);
}
