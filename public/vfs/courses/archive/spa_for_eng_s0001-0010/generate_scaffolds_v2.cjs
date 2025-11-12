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

console.log('🏗️  Generating Phase 5 scaffolds with tiled pattern approach\n');

// Helper: Build tiled LEGO representation of a seed
function buildTiledSeed(seedData) {
  const targetTiles = seedData.legos.map(l => l.target).join(' | ');
  const knownTiles = seedData.legos.map(l => l.known).join(' | ');
  return [targetTiles, knownTiles];
}

// Process each seed
legoPairs.seeds.forEach((seedData, seedIdx) => {
  const seedId = seedData.seed_id;
  const [seedTarget, seedKnown] = seedData.seed_pair;

  // Build recent_context from last 10 seeds (or all available if <10)
  const recentContext = {};
  const startIdx = Math.max(0, seedIdx - 10);
  for (let i = startIdx; i < seedIdx; i++) {
    const prevSeed = legoPairs.seeds[i];
    const [tiledTarget, tiledKnown] = buildTiledSeed(prevSeed);
    recentContext[prevSeed.seed_id] = [tiledTarget, tiledKnown];
  }

  // Build scaffold for each NEW LEGO only
  const legosObj = {};
  const newLegosInSeed = seedData.legos.filter(l => l.new);

  // Track LEGOs available within current seed (cumulative as we go)
  const currentSeedLegosAvailable = [];

  seedData.legos.forEach((lego) => {
    if (!lego.new) {
      // Skip duplicates - no basket needed
      console.log(`⏭️  ${lego.id}: Duplicate (ref: ${lego.ref}) - skipping scaffold`);
      return;
    }

    const legoId = lego.id;
    const isLastLego = (lego === seedData.legos[seedData.legos.length - 1]);

    // Build scaffold for this LEGO
    legosObj[legoId] = {
      lego: [lego.known, lego.target],
      type: lego.type,
      recent_context: { ...recentContext }, // 10 MR seeds with tiled patterns
      current_seed_legos_available: [...currentSeedLegosAvailable], // LEGOs from current seed learned so far
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
          target: seedTarget,
          known: seedKnown
        }
      }
    };

    // Add components for M-type
    if (lego.type === 'M' && lego.components) {
      legosObj[legoId].components = lego.components;
    }

    // Add this LEGO to current seed's available list for next LEGOs
    currentSeedLegosAvailable.push([lego.known, lego.target]);
  });

  // Only write scaffold if there are NEW LEGOs
  if (Object.keys(legosObj).length === 0) {
    console.log(`⏭️  ${seedId}: No new LEGOs - skipping scaffold\n`);
    return;
  }

  // Build scaffold object
  const scaffold = {
    version: "curated_v7_spanish",
    seed_id: seedId,
    generation_stage: "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
    seed_pair: {
      target: seedTarget,
      known: seedKnown
    },
    recent_context: recentContext,
    legos: legosObj,
    _instructions: {
      task: "Generate 12-15 practice phrases per LEGO using pattern matching",
      methodology: "Read: docs/phase_intelligence/phase_5_lego_baskets.md",
      output: `Write to: ${path.join(__dirname, 'phase5_outputs', `seed_${seedId.toLowerCase()}.json`)}`,
      pattern_matching: "Use recent_context tiled patterns to slot new LEGOs into learned structures",
      overgeneration: "Generate 12-15 phrases knowing some may be filtered by GATE validation",
      quality: "Semantic meaning + syntactic correctness + pedagogical value"
    },
    _stats: {
      new_legos_in_seed: newLegosInSeed.length,
      total_legos_in_seed: seedData.legos.length,
      phrases_to_generate: newLegosInSeed.length * 12
    }
  };

  // Write scaffold file
  const scaffoldPath = path.join(scaffoldsDir, `seed_${seedId.toLowerCase()}.json`);
  fs.writeFileSync(scaffoldPath, JSON.stringify(scaffold, null, 2));
  console.log(`✅ ${seedId}: ${newLegosInSeed.length} new LEGOs → ${scaffoldPath}\n`);
});

console.log(`🎉 Scaffold generation complete!`);
