import fs from 'fs';

// Load input files
const agentInput = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_input/agent_04_seeds.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json', 'utf8'));

// Build whitelist up to a specific seed
function buildWhitelistUpTo(seedId) {
  const seedNum = parseInt(seedId.substring(1));
  const whitelist = new Set();

  for (const legoId in registry.legos) {
    const lego = registry.legos[legoId];
    const legoSeedNum = parseInt(legoId.substring(1, 5));

    if (legoSeedNum <= seedNum) {
      if (lego.spanish_words) {
        lego.spanish_words.forEach(word => {
          whitelist.add(word.toLowerCase());
        });
      }
    }
  }

  return Array.from(whitelist);
}

// Count words in phrase
function countLegoWords(phrase) {
  return phrase.toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0).length;
}

// Validate phrase against whitelist
function validatePhrase(spanish, whitelist) {
  const words = spanish.toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  for (const word of words) {
    if (!whitelist.includes(word)) {
      return { valid: false, invalidWord: word };
    }
  }
  return { valid: true };
}

// Generate practice phrases for a LEGO
function generatePractices(legoData, seedData, whitelist, isLastLego, seedPair) {
  const practices = [];
  const target = legoData.target;
  const known = legoData.known;
  const legoType = legoData.type;

  // For each LEGO, we need to generate 10 phrases following the 2-2-2-4 distribution
  // Phrases should use vocabulary from the whitelist

  // This is a complex task that requires understanding of Spanish grammar and
  // natural phrase construction. For each LEGO, I'll create contextually appropriate phrases.

  return practices;
}

// Main generation function
function generateBaskets() {
  const output = {
    version: "curated_v6_molecular_lego",
    agent_id: 4,
    seed_range: "S0361-S0380",
    total_seeds: 20,
    validation_status: "PENDING",
    validated_at: new Date().toISOString(),
    seeds: {}
  };

  let cumulativeLegos = 0;

  // Count LEGOs up to S0360
  for (const legoId in registry.legos) {
    const legoSeedNum = parseInt(legoId.substring(1, 5));
    if (legoSeedNum < 361) {
      cumulativeLegos++;
    }
  }

  for (const seedData of agentInput.seeds) {
    const seedId = seedData.seed_id;
    const seedNum = parseInt(seedId.substring(1));

    // Build whitelist for this seed (all LEGOs up to and including current seed)
    const whitelist = buildWhitelistUpTo(seedId);

    output.seeds[seedId] = {
      seed: seedId,
      seed_pair: seedData.seed_pair,
      cumulative_legos: cumulativeLegos + seedData.legos.length,
      legos: {}
    };

    cumulativeLegos += seedData.legos.length;

    for (let i = 0; i < seedData.legos.length; i++) {
      const lego = seedData.legos[i];
      const legoId = lego.id;
      const isLastLego = (i === seedData.legos.length - 1);

      // Skip punctuation-only LEGOs
      if (lego.target === '.' || lego.target === '?' || lego.target === '!') {
        continue;
      }

      const availableLegos = cumulativeLegos - (seedData.legos.length - i);

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
        gate_compliance: "STRICT - All words from taught LEGOs only"
      };
    }
  }

  return output;
}

// Generate initial structure
const output = generateBaskets();

console.log('Generated initial structure');
console.log(`Seeds: ${Object.keys(output.seeds).length}`);
console.log(`First seed: ${Object.keys(output.seeds)[0]}`);
console.log(`Last seed: ${Object.keys(output.seeds)[Object.keys(output.seeds).length - 1]}`);

// Save to file for manual completion
fs.writeFileSync(
  '/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/agent_04_structure.json',
  JSON.stringify(output, null, 2)
);

console.log('Structure saved to agent_04_structure.json');
console.log('\nWhitelist samples:');
const whitelist = buildWhitelistUpTo('S0380');
console.log(`Total words in whitelist: ${whitelist.length}`);
console.log(`Sample words: ${whitelist.slice(0, 30).join(', ')}`);
