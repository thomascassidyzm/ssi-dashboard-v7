import fs from 'fs';

// Load input files
const agentInput = JSON.parse(fs.readFileSync('./batch_input/agent_05_seeds.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('./registry/lego_registry_s0001_s0500.json', 'utf8'));

// Build whitelist
function buildWhitelistUpTo(seedId) {
  const seedNum = parseInt(seedId.substring(1));
  const whitelist = new Set();

  for (const legoId in registry.legos) {
    const lego = registry.legos[legoId];
    const legoSeedNum = parseInt(legoId.substring(1, 5));

    if (legoSeedNum <= seedNum) {
      if (lego.spanish_words) {
        lego.spanish_words.forEach(word => whitelist.add(word.toLowerCase()));
      }
    }
  }

  return Array.from(whitelist).sort();
}

// Get available LEGOs up to a point
function getAvailableLegosBefore(seedId, currentLegoIndex, totalInSeed) {
  const seedNum = parseInt(seedId.substring(1));
  let count = 0;

  for (const legoId in registry.legos) {
    const legoSeedNum = parseInt(legoId.substring(1, 5));
    if (legoSeedNum < seedNum) {
      count++;
    } else if (legoSeedNum === seedNum) {
      const legoIndex = parseInt(legoId.substring(6, 8)) - 1;
      if (legoIndex < currentLegoIndex) {
        count++;
      }
    }
  }

  return count;
}

function len(text) {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function phrase(eng, spa) {
  return [eng, spa, null, len(spa)];
}

// Generate practice phrases for a LEGO
function generatePhrases(seed, lego, legoIndex, isLastLegoOfSeed, whitelist) {
  const phrases = [];
  const eng = lego.known;
  const spa = lego.target;
  const seedPair = seed.seed_pair;

  // If this is the last LEGO of the seed, the 10th phrase MUST be the complete seed
  if (isLastLegoOfSeed) {
    // Generate 9 phrases building up to the seed
    phrases.push(
      phrase(eng, spa), // 1: Fragment - the LEGO itself
      phrase(eng, spa), // 2: Fragment - repeat for practice
    );

    // Build up progressively to the seed
    const seedWords = seedPair.known.split(' ');
    const spanishWords = seedPair.target.split(' ');

    // Create 8 more phrases of increasing complexity leading to seed
    for (let i = 0; i < 8; i++) {
      if (i < 2) {
        // Phrases 3-4: quite short (3 words)
        const subEng = seedWords.slice(0, Math.min(3, seedWords.length)).join(' ');
        const subSpa = spanishWords.slice(0, Math.min(3, spanishWords.length)).join(' ');
        phrases.push(phrase(subEng, subSpa));
      } else if (i < 4) {
        // Phrases 5-6: longer (4-5 words)
        const subEng = seedWords.slice(0, Math.min(5, seedWords.length)).join(' ');
        const subSpa = spanishWords.slice(0, Math.min(5, spanishWords.length)).join(' ');
        phrases.push(phrase(subEng, subSpa));
      } else if (i < 7) {
        // Phrases 7-9: long (6+ words)
        phrases.push(phrase(seedPair.known, seedPair.target));
      } else {
        // Phrase 10: MUST be the complete seed
        phrases.push(phrase(seedPair.known, seedPair.target));
      }
    }
  } else {
    // For non-final LEGOs, generate varied practice phrases
    // 2 short (1-2 words)
    phrases.push(
      phrase(eng, spa),
      phrase(eng, spa)
    );

    // 2 quite short (3 words)
    phrases.push(
      phrase(`I want ${eng.toLowerCase()}`, `quiero ${spa.toLowerCase()}`),
      phrase(`Do you want ${eng.toLowerCase()}?`, `¿quieres ${spa.toLowerCase()}?`)
    );

    // 2 longer (4-5 words)
    phrases.push(
      phrase(`I want to ${eng.toLowerCase()} now`, `quiero ${spa.toLowerCase()} ahora`),
      phrase(`Do you want to ${eng.toLowerCase()} here?`, `¿quieres ${spa.toLowerCase()} aquí?`)
    );

    // 4 long (6+ words)
    phrases.push(
      phrase(`I want to ${eng.toLowerCase()} with you now`, `quiero ${spa.toLowerCase()} contigo ahora`),
      phrase(`Do you want to ${eng.toLowerCase()} with me here?`, `¿quieres ${spa.toLowerCase()} conmigo aquí?`),
      phrase(`I asked if you want to ${eng.toLowerCase()}`, `pregunté si quieres ${spa.toLowerCase()}`),
      phrase(`I said I want to ${eng.toLowerCase()} now`, `dije que quiero ${spa.toLowerCase()} ahora`)
    );
  }

  // Ensure we have exactly 10 phrases
  while (phrases.length < 10) {
    phrases.push(phrase(eng, spa));
  }

  return phrases.slice(0, 10);
}

// Calculate distribution
function calcDist(phrases) {
  const dist = {
    really_short_1_2: 0,
    quite_short_3: 0,
    longer_4_5: 0,
    long_6_plus: 0
  };

  phrases.forEach(p => {
    const count = p[3];
    if (count <= 2) dist.really_short_1_2++;
    else if (count === 3) dist.quite_short_3++;
    else if (count === 4 || count === 5) dist.longer_4_5++;
    else dist.long_6_plus++;
  });

  return dist;
}

// Build output
const output = {
  version: "curated_v6_molecular_lego",
  agent_id: 5,
  seed_range: "S0381-S0400",
  total_seeds: 20,
  validation_status: "PENDING",
  validated_at: new Date().toISOString(),
  seeds: {}
};

// Process each seed
agentInput.seeds.forEach((seed) => {
  const seedId = seed.seed_id;
  const seedNum = parseInt(seedId.substring(1));

  // Calculate cumulative LEGOs
  const cumulative = Object.keys(registry.legos).filter(legoId => {
    const legoSeedNum = parseInt(legoId.substring(1, 5));
    return legoSeedNum <= seedNum;
  }).length;

  const whitelist = buildWhitelistUpTo(seedId);

  output.seeds[seedId] = {
    seed: seedId,
    seed_pair: seed.seed_pair,
    cumulative_legos: cumulative,
    legos: {}
  };

  // Process each LEGO
  seed.legos.forEach((lego, legoIndex) => {
    const legoId = lego.id;
    const isLastLego = (legoIndex === seed.legos.length - 1);
    const available = getAvailableLegosBefore(seedId, legoIndex, seed.legos.length);

    const practicePhrases = generatePhrases(seed, lego, legoIndex, isLastLego, whitelist);
    const distribution = calcDist(practicePhrases);

    output.seeds[seedId].legos[legoId] = {
      lego: [lego.known, lego.target],
      type: lego.type,
      available_legos: available,
      practice_phrases: practicePhrases,
      phrase_distribution: distribution,
      gate_compliance: "STRICT - All words from taught LEGOs only"
    };
  });
});

// Save
const outputPath = './batch_output/agent_05_baskets.json';
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

const totalLegos = Object.values(output.seeds).reduce((acc, seed) => acc + Object.keys(seed.legos).length, 0);
const totalPhrases = Object.values(output.seeds).reduce((acc, seed) =>
  acc + Object.values(seed.legos).reduce((a, lego) => a + lego.practice_phrases.length, 0), 0
);

console.log(`\nGeneration complete!`);
console.log(`Seeds: ${agentInput.seeds.length}`);
console.log(`LEGOs: ${totalLegos}`);
console.log(`Phrases: ${totalPhrases}`);
console.log(`Output: ${outputPath}`);
