const fs = require('fs');
const path = require('path');

// Read lego_pairs.json
const legoPairsPath = path.join(__dirname, 'lego_pairs.json');
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Output directory for scaffolds
const outputDir = path.join(__dirname, 'phase5_scaffolds');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🏗️  Generating Phase 5 scaffolds with sliding window seed_pairs\n');

// Process each seed
legoPairs.seeds.forEach((seedData, seedIdx) => {
  const seedId = seedData.seed_id;

  console.log(`\n📝 ${seedId}: ${seedData.seed_pair[1]}`);

  // Build recent_seed_pairs from last 10 seeds (or all available if <10)
  const recentSeedPairs = {};
  const startIdx = Math.max(0, seedIdx - 10);
  for (let i = startIdx; i < seedIdx; i++) {
    const prevSeed = legoPairs.seeds[i];
    recentSeedPairs[prevSeed.seed_id] = [
      prevSeed.seed_pair[0],  // Target (Spanish)
      prevSeed.seed_pair[1]   // Known (English)
    ];
  }

  console.log(`   📚 Recent context: ${Object.keys(recentSeedPairs).length} seed pairs (${Object.keys(recentSeedPairs).join(', ') || 'none'})`);

  // Track LEGOs accumulated within current seed
  const currentSeedLegosAvailable = [];

  // Build scaffold for each NEW LEGO only
  const legosObj = {};
  const newLegos = seedData.legos.filter(l => l.new);
  let newLegoCount = 0;

  seedData.legos.forEach((lego, legoIdx) => {
    if (!lego.new) {
      console.log(`   ⏭️  ${lego.id}: Duplicate (ref: ${lego.ref}) - skipping scaffold`);
      return;
    }

    newLegoCount++;
    const legoId = lego.id;
    const isLastLego = (legoIdx === seedData.legos.length - 1);

    // Build scaffold
    legosObj[legoId] = {
      lego: [lego.known, lego.target],
      type: lego.type,
      current_seed_legos_available: [...currentSeedLegosAvailable],
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
          target: seedData.seed_pair[0],
          known: seedData.seed_pair[1]
        }
      }
    };

    // Add components for M-type LEGOs
    if (lego.type === 'M' && lego.components) {
      legosObj[legoId].components = lego.components.map(c => [c.target, c.known]);
    }

    console.log(`   ✅ ${legoId} (${lego.type}): "${lego.known}" / "${lego.target}"`);
    console.log(`      Available: ${currentSeedLegosAvailable.length} from current seed`);

    // Add this LEGO to current seed's available list for next LEGOs
    currentSeedLegosAvailable.push([lego.known, lego.target]);
  });

  // Build complete scaffold
  const scaffold = {
    version: "curated_v7_spanish",
    seed_id: seedId,
    generation_stage: "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
    seed_pair: {
      target: seedData.seed_pair[0],
      known: seedData.seed_pair[1]
    },
    recent_seed_pairs: recentSeedPairs,
    legos: legosObj,
    _instructions: {
      task: "Generate 12-15 practice phrases per LEGO using recent seed_pairs as pattern inspiration",
      methodology: "Read: docs/phase_intelligence/phase_5_lego_baskets.md",
      output: `Write to: ${path.join(__dirname, 'phase5_outputs', `seed_${seedId.toLowerCase()}.json`)}`,
      pattern_matching: "Use recent_seed_pairs as full sentence examples showing patterns and vocabulary",
      vocabulary_source: "Any words from recent_seed_pairs + current_seed_legos_available",
      overgeneration: "Generate 12-15 phrases knowing some may be filtered by GATE validation",
      quality: "Semantic meaning + syntactic correctness + pedagogical value",
      format: 'Array format: ["English phrase", "Spanish phrase", null, lego_count]'
    },
    _stats: {
      new_legos_in_seed: newLegoCount,
      total_legos_in_seed: seedData.legos.length,
      phrases_to_generate: newLegoCount * 12,
      recent_context_seeds: Object.keys(recentSeedPairs).length
    }
  };

  // Write scaffold
  const outputPath = path.join(outputDir, `seed_${seedId.toLowerCase()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(scaffold, null, 2));

  console.log(`   💾 Scaffold written: ${outputPath}`);
  console.log(`   📊 Stats: ${newLegoCount} new LEGOs, ${newLegoCount * 12} phrases to generate`);
});

console.log(`\n\n🎉 Scaffold generation complete!`);
console.log(`📁 Output directory: ${outputDir}`);
