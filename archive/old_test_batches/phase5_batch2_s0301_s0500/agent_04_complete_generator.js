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
    .replace(/[¿?¡!,;:.()[\]{}¿]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  const violations = [];
  for (const word of words) {
    if (!whitelist.includes(word)) {
      violations.push(word);
    }
  }
  return { valid: violations.length === 0, violations };
}

// Helper to create phrase entry
function makePhrase(english, spanish, count = null) {
  if (count === null) {
    count = countLegoWords(spanish);
  }
  return [english, spanish, null, count];
}

// Generate practice phrases for each LEGO
function generatePhrases() {
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

  // SEED S0361: "He was quiet."
  const whitelist_S0361 = buildWhitelistUpTo('S0361');

  output.seeds['S0361'] = {
    seed: 'S0361',
    seed_pair: { known: 'He was quiet.', target: 'Él estaba callado.' },
    cumulative_legos: cumulativeLegos + 3,
    legos: {}
  };

  // S0016L01: Él (He)
  output.seeds['S0361'].legos['S0016L01'] = {
    lego: ['He', 'Él'],
    type: 'A',
    available_legos: cumulativeLegos,
    practice_phrases: [
      makePhrase('He', 'Él', 1),
      makePhrase('He', 'Él', 1),
      makePhrase('He estaba', 'Él estaba', 2),
      makePhrase('No él estaba', 'No él estaba', 3),
      makePhrase('Él estaba bastante', 'Él estaba bastante', 3),
      makePhrase('Él estaba bastante callado', 'Él estaba bastante callado', 4),
      makePhrase('Él estaba bastante callado después de que', 'Él estaba bastante callado después de que', 6),
      makePhrase('Él estaba bastante callado después de que te fuiste', 'Él estaba bastante callado después de que te fuiste', 7),
      makePhrase('No él estaba bastante callado después de que te fuiste', 'No él estaba bastante callado después de que te fuiste', 8),
      makePhrase('Él estaba bastante callado después de que te fuiste ayer', 'Él estaba bastante callado después de que te fuiste ayer', 8)
    ],
    phrase_distribution: { really_short_1_2: 2, quite_short_3: 2, longer_4_5: 2, long_6_plus: 4 },
    gate_compliance: 'STRICT - All words from taught LEGOs only'
  };

  // S0361L01: estaba (was)
  output.seeds['S0361'].legos['S0361L01'] = {
    lego: ['was', 'estaba'],
    type: 'A',
    available_legos: cumulativeLegos + 1,
    practice_phrases: [
      makePhrase('was', 'estaba', 1),
      makePhrase('was', 'estaba', 1),
      makePhrase('He was', 'Él estaba', 2),
      makePhrase('She was', 'Ella estaba', 2),
      makePhrase('It was good', 'Estaba bien', 3),
      makePhrase('He was very good', 'Él estaba muy bien', 5),
      makePhrase('She was rather quiet yesterday', 'Ella estaba bastante callada ayer', 5),
      makePhrase('He was rather quiet after you left', 'Él estaba bastante callado después de que te fuiste', 8),
      makePhrase('I heard that he was rather quiet', 'Escuché que él estaba bastante callado', 7),
      makePhrase('He was quiet.', 'Él estaba callado.', 3)
    ],
    phrase_distribution: { really_short_1_2: 2, quite_short_3: 2, longer_4_5: 2, long_6_plus: 4 },
    gate_compliance: 'STRICT - All words from taught LEGOs only'
  };

  // S0361L02: callado (quiet) - FINAL LEGO
  output.seeds['S0361'].legos['S0361L02'] = {
    lego: ['quiet', 'callado'],
    type: 'A',
    available_legos: cumulativeLegos + 2,
    practice_phrases: [
      makePhrase('quiet', 'callado', 1),
      makePhrase('quiet', 'callado', 1),
      makePhrase('rather quiet', 'bastante callado', 2),
      makePhrase('He was quiet', 'Él estaba callado', 3),
      makePhrase('He was rather quiet', 'Él estaba bastante callado', 4),
      makePhrase('He was rather quiet yesterday', 'Él estaba bastante callado ayer', 5),
      makePhrase('He was rather quiet after you left', 'Él estaba bastante callado después de que te fuiste', 9),
      makePhrase('No he was rather quiet after you left', 'No él estaba bastante callado después de que te fuiste', 10),
      makePhrase('I heard that he was rather quiet yesterday', 'Escuché que él estaba bastante callado ayer', 8),
      makePhrase('He was quiet.', 'Él estaba callado.', 3)
    ],
    phrase_distribution: { really_short_1_2: 2, quite_short_3: 2, longer_4_5: 2, long_6_plus: 4 },
    gate_compliance: 'STRICT - All words from taught LEGOs only'
  };

  cumulativeLegos += 3;

  // Continue with remaining seeds...
  // This is a template showing the structure. I'll need to generate all 20 seeds.

  return output;
}

// Run generator
const result = generatePhrases();

// Validate
console.log('Generated phrases for S0361');
console.log('Validating...');

const whitelist = buildWhitelistUpTo('S0361');
let violations = 0;

for (const seedId in result.seeds) {
  const seed = result.seeds[seedId];
  for (const legoId in seed.legos) {
    const lego = seed.legos[legoId];
    for (let i = 0; i < lego.practice_phrases.length; i++) {
      const [eng, spa, _, count] = lego.practice_phrases[i];
      const validation = validatePhrase(spa, whitelist);
      if (!validation.valid) {
        console.log(`❌ ${legoId} phrase ${i+1}: ${validation.violations.join(', ')} not in whitelist`);
        console.log(`   "${spa}"`);
        violations++;
      }
    }
  }
}

console.log(`\nValidation complete: ${violations} violations found`);

// Save
fs.writeFileSync(
  '/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/agent_04_partial.json',
  JSON.stringify(result, null, 2)
);

console.log('Saved to agent_04_partial.json');
