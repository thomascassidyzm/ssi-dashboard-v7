const fs = require('fs');
const path = require('path');

// Read lego_pairs.json
const legoPairsPath = path.join(__dirname, 'lego_pairs.json');
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Output directory for scaffolds
const scaffoldsDir = path.join(__dirname, 'phase5_scaffolds');
if (!fs.existsSync(scaffoldsDir)) {
  fs.mkdirSync(scaffoldsDir, { recursive: true });
}

// Track all seeds for recent_context building and CUMULATIVE whitelist
const allSeeds = [];
const globalWhitelistPairs = []; // CUMULATIVE across all seeds

// Process each seed
legoPairs.seeds.forEach((seedData, seedIdx) => {
  const seedId = seedData.seed_id;
  const [target, known] = seedData.seed_pair;

  // Build recent_context from the last 5 seeds (excluding current)
  const recentContext = {};
  const startIdx = Math.max(0, seedIdx - 5);
  for (let i = startIdx; i < seedIdx; i++) {
    const prevSeed = allSeeds[i];
    if (prevSeed) {
      // Extract LEGO targets for tiling display
      const legoTargets = prevSeed.legos.map(l => l.target).join(' | ');
      const legoKnowns = prevSeed.legos.map(l => l.known).join(' | ');
      recentContext[prevSeed.seed_id] = [legoTargets, legoKnowns];
    }
  }

  // Build LEGO objects with cumulative whitelist from ALL previous seeds
  // Note: Current seed's LEGOs are added incrementally as we process each LEGO below
  const legosObj = {};

  seedData.legos.forEach((lego, idx) => {
    const legoId = lego.id;
    const isLastLego = (idx === seedData.legos.length - 1);

    // Use globalWhitelistPairs (cumulative across ALL seeds so far)
    // Extract Spanish words from whitelist for easy access
    const availableSpanishWords = new Set();
    globalWhitelistPairs.forEach(([targetWord, knownWord]) => {
      targetWord.split(' ').forEach(word => availableSpanishWords.add(word));
    });

    legosObj[legoId] = {
      lego: [lego.known, lego.target],
      type: lego.type,
      available_legos: globalWhitelistPairs.length,
      available_spanish_words: Array.from(availableSpanishWords).sort(),
      whitelist_pairs: [...globalWhitelistPairs],
      is_final_lego: isLastLego,
      practice_phrases: [],
      phrase_distribution: {
        really_short_1_2: 0,
        quite_short_3: 0,
        longer_4_5: 0,
        long_6_plus: 0
      },
      _metadata: {
        lego_id: legoId,
        seed_context: {
          target,
          known
        }
      }
    };

    // Add components for M-type
    if (lego.type === 'M' && lego.components) {
      legosObj[legoId].components = lego.components;
    }

    // Add THIS LEGO to global whitelist for future LEGOs/seeds (3-category rule)
    // Category 1 & 2: Add the LEGO itself (A-type or M-type)
    globalWhitelistPairs.push([lego.target, lego.known]);

    // Category 3: Add M-type components with literal translations
    if (lego.type === 'M' && lego.components) {
      lego.components.forEach(([compTarget, compKnown]) => {
        globalWhitelistPairs.push([compTarget, compKnown]);
      });
    }
  });

  // Build scaffold object
  const scaffold = {
    version: "curated_v7_spanish",
    seed_id: seedId,
    generation_stage: "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
    seed_pair: {
      target,
      known
    },
    recent_context: recentContext,
    legos: legosObj,
    _instructions: {
      task: "Fill practice_phrases arrays using Phase 5 Ultimate Intelligence v5.0",
      methodology: "Read: docs/phase_intelligence/phase_5_lego_baskets.md (v5.0)",
      output: `Write to: ${path.join(__dirname, 'phase5_outputs', `seed_${seedId.toLowerCase()}.json`)}`,
      whitelist_note: "3-category rule applied: A-types, M-types, M-components with literal translations"
    },
    _stats: {
      new_legos_in_seed: seedData.legos.length,
      phrases_to_generate: seedData.legos.length * 10,
      cumulative_legos_before: 0 // Will be updated for later seeds
    }
  };

  // Write scaffold file
  const scaffoldPath = path.join(scaffoldsDir, `seed_${seedId.toLowerCase()}.json`);
  fs.writeFileSync(scaffoldPath, JSON.stringify(scaffold, null, 2));
  console.log(`✅ Generated scaffold: ${scaffoldPath}`);

  // Store seed for future recent_context
  allSeeds.push(seedData);
});

console.log(`\n🎉 Generated ${legoPairs.seeds.length} scaffolds in ${scaffoldsDir}`);
