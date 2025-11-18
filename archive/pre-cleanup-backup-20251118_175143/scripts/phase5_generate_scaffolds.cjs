#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Custom JSON formatter: arrays on single lines, objects pretty-printed
 * Makes practice_phrases much more readable
 */
function formatJSON(obj, indent = 0) {
  const spaces = '  '.repeat(indent);

  if (Array.isArray(obj)) {
    // Arrays: single line
    return JSON.stringify(obj);
  } else if (obj && typeof obj === 'object') {
    // Objects: pretty print
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';

    const lines = entries.map(([key, value]) => {
      return `${spaces}  "${key}": ${formatJSON(value, indent + 1)}`;
    });

    return '{\n' + lines.join(',\n') + '\n' + spaces + '}';
  } else {
    // Primitives
    return JSON.stringify(obj);
  }
}

/**
 * Phase 5: Generate Scaffolds (v3 - Sliding Window)
 *
 * Builds scaffold JSON files for each seed containing:
 * - recent_seed_pairs: Last 10 seeds as complete sentences (sliding window)
 * - current seed context: The seed_pair being taught
 * - LEGOs to teach: Only new LEGOs (new: true from deduplication)
 * - Incremental availability: Each LEGO has access to previous LEGOs from current seed
 *
 * Usage: node phase5_generate_scaffolds.cjs <course_path>
 * Example: node phase5_generate_scaffolds.cjs public/vfs/courses/spa_for_eng_s0001-0100
 */

// Parse command line arguments
const coursePath = process.argv[2];

if (!coursePath) {
  console.error('❌ Error: Course path required');
  console.error('Usage: node phase5_generate_scaffolds.cjs <course_path>');
  console.error('Example: node phase5_generate_scaffolds.cjs public/vfs/courses/spa_for_eng_s0001-0100');
  process.exit(1);
}

// Resolve paths
const projectRoot = path.resolve(__dirname, '..');
const fullCoursePath = path.resolve(projectRoot, coursePath);
const legoPairsPath = path.join(fullCoursePath, 'lego_pairs.json');
const outputDir = path.join(fullCoursePath, 'phase5_scaffolds');

// Validate paths
if (!fs.existsSync(fullCoursePath)) {
  console.error(`❌ Error: Course directory not found: ${fullCoursePath}`);
  process.exit(1);
}

if (!fs.existsSync(legoPairsPath)) {
  console.error(`❌ Error: lego_pairs.json not found: ${legoPairsPath}`);
  process.exit(1);
}

console.log('🏗️  Generating Phase 5 scaffolds with sliding window seed_pairs');
console.log(`📁 Course: ${coursePath}\n`);

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read lego_pairs.json
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Process each seed
legoPairs.seeds.forEach((seedData, seedIdx) => {
  const seedId = seedData.seed_id;

  console.log(`\n📝 ${seedId}: ${seedData.seed_pair[1]}`);

  // Build recent_seed_pairs from last 10 seeds (or all available if <10)
  // WITH LEGO HIGHLIGHTS - shows which LEGOs were introduced in each seed
  const recentSeedPairs = {};
  const startIdx = Math.max(0, seedIdx - 10);
  for (let i = startIdx; i < seedIdx; i++) {
    const prevSeed = legoPairs.seeds[i];

    // Extract new LEGOs introduced in this seed
    // Compact format: [[id, known, target], ...] - KNOWN first (prompt), TARGET second (response)
    const newLegosInSeed = prevSeed.legos
      .filter(l => l.new)
      .map(l => [l.id, l.known, l.target]);

    // Compact format: [[known_sentence, target_sentence], [[lego_id, known, target], ...]]
    // KNOWN first (English prompt), TARGET second (Spanish response)
    recentSeedPairs[prevSeed.seed_id] = [
      [prevSeed.seed_pair[1], prevSeed.seed_pair[0]],  // Sentence pair: [known, target]
      newLegosInSeed  // New LEGOs: [[id, known, target], ...]
    ];
  }

  const totalRecentLegos = Object.values(recentSeedPairs).reduce((sum, sp) => sum + sp[1].length, 0);
  console.log(`   📚 Recent context: ${Object.keys(recentSeedPairs).length} seed pairs, ${totalRecentLegos} LEGOs (${Object.keys(recentSeedPairs).join(', ') || 'none'})`);

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
          known: seedData.seed_pair[1],  // Known language (prompt)
          target: seedData.seed_pair[0]  // Target language (response)
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
      known: seedData.seed_pair[1],  // Known language (English prompt)
      target: seedData.seed_pair[0]  // Target language (Spanish response)
    },
    recent_seed_pairs: recentSeedPairs,
    legos: legosObj,
    _instructions: {
      task: "Generate 12-15 practice phrases per LEGO using recent seed_pairs as pattern inspiration",
      methodology: "Read: docs/phase_intelligence/phase_5_lego_baskets.md",
      output: `Write to: ${path.join(fullCoursePath, 'phase5_outputs', `seed_${seedId.toLowerCase()}.json`)}`,
      pattern_matching: "Use recent_seed_pairs sentences as natural language pattern examples",
      lego_coverage_requirement: "Practice phrases MUST use at least 60% of the LEGOs listed in recent_seed_pairs[seed_id][1]",
      vocabulary_source: "Prioritize LEGOs from recent_seed_pairs[seed_id][1] + current_seed_legos_available, then any words from sentences",
      overgeneration: "Generate 12-15 phrases knowing some may be filtered by GATE validation",
      quality: "Semantic meaning + syntactic correctness + pedagogical value",
      format: 'Array format: ["English phrase", "Spanish phrase", null, lego_count]'
    },
    _stats: {
      new_legos_in_seed: newLegoCount,
      total_legos_in_seed: seedData.legos.length,
      phrases_to_generate: newLegoCount * 12,
      recent_context_seeds: Object.keys(recentSeedPairs).length,
      recent_legos_available: totalRecentLegos
    }
  };

  // Write scaffold with custom formatting (compact arrays, pretty objects)
  const outputPath = path.join(outputDir, `seed_${seedId.toLowerCase()}.json`);
  fs.writeFileSync(outputPath, formatJSON(scaffold) + '\n');

  console.log(`   💾 Scaffold written: ${outputPath}`);
  console.log(`   📊 Stats: ${newLegoCount} new LEGOs, ${newLegoCount * 12} phrases to generate`);
});

console.log(`\n\n🎉 Scaffold generation complete!`);
console.log(`📁 Output directory: ${outputDir}`);
