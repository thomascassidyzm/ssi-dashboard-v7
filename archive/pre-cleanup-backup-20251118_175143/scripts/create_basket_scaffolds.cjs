#!/usr/bin/env node

/**
 * Phase 5 - Basket Scaffold Generator
 *
 * Purpose: Handle ALL mechanical setup for basket generation
 * - Build whitelists (available Spanish vocabulary per seed)
 * - Calculate metadata (available_legos, is_final_lego)
 * - Create JSON structure with EMPTY practice_phrases arrays
 *
 * Output: Scaffold JSON ready for LLM phrase generation
 *
 * Stage 1 of the Staged Pipeline approach
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract seed number from seed ID
 * @param {string} seedId - e.g., "S0301"
 * @returns {number} - e.g., 301
 */
function extractSeedNum(seedId) {
  const match = seedId.match(/S(\d{4})/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extract LEGO base ID (seed number) from LEGO ID
 * @param {string} legoId - e.g., "S0301L05" or "S0016"
 * @returns {number} - e.g., 301 or 16
 */
function extractLegoSeedNum(legoId) {
  const match = legoId.match(/S(\d{4})/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Build whitelist of all Spanish words available up to target seed
 * @param {object} registry - LEGO registry
 * @param {number} targetSeedNum - Current seed number
 * @returns {string[]} - Array of allowed Spanish words (sorted)
 */
function buildWhitelist(registry, targetSeedNum) {
  const whitelist = new Set();

  for (const legoId in registry.legos) {
    const legoSeedNum = extractLegoSeedNum(legoId);

    // Include all LEGOs from seeds up to (and including) target seed
    if (legoSeedNum <= targetSeedNum) {
      const lego = registry.legos[legoId];
      if (lego.spanish_words && Array.isArray(lego.spanish_words)) {
        lego.spanish_words.forEach(word => whitelist.add(word));
      }
    }
  }

  return Array.from(whitelist).sort();
}

/**
 * Calculate how many LEGOs are available before current seed
 * @param {object} registry - LEGO registry
 * @param {number} currentSeedNum - Current seed number
 * @returns {number} - Count of available LEGOs
 */
function calculateAvailableLegos(registry, currentSeedNum) {
  let count = 0;

  for (const legoId in registry.legos) {
    const legoSeedNum = extractLegoSeedNum(legoId);
    if (legoSeedNum < currentSeedNum) {
      count++;
    }
  }

  return count;
}

/**
 * Get LEGO data from registry
 * @param {object} registry - LEGO registry
 * @param {string} legoId - LEGO ID to look up
 * @returns {object|null} - LEGO data or null if not found
 */
function getLegoFromRegistry(registry, legoId) {
  return registry.legos[legoId] || null;
}

// ============================================================================
// SCAFFOLD GENERATION
// ============================================================================

/**
 * Generate scaffold for a single agent
 * @param {object} agentSeeds - Agent seeds JSON
 * @param {object} registry - LEGO registry
 * @returns {object} - Scaffold JSON with empty practice_phrases
 */
function generateScaffold(agentSeeds, registry) {
  const scaffold = {
    version: "curated_v6_molecular_lego",
    agent_id: agentSeeds.agent_id,
    agent_name: agentSeeds.agent_name,
    seed_range: agentSeeds.seed_range,
    total_seeds: agentSeeds.total_seeds,
    validation_status: "PENDING",
    generation_method: "STAGED_PIPELINE",
    generation_stage: "SCAFFOLD_READY_FOR_PHRASE_GENERATION",
    seeds: {}
  };

  for (const seedData of agentSeeds.seeds) {
    const seedId = seedData.seed_id;
    const seedNum = extractSeedNum(seedId);

    console.log(`  Processing ${seedId} (seed #${seedNum})...`);

    // Build whitelist for this seed (all Spanish words up to this seed)
    const whitelist = buildWhitelist(registry, seedNum);
    console.log(`    Whitelist: ${whitelist.length} Spanish words available`);

    // Calculate available LEGOs (before this seed)
    const availableLegos = calculateAvailableLegos(registry, seedNum);

    // Create seed entry
    scaffold.seeds[seedId] = {
      seed: seedId,
      seed_pair: seedData.seed_pair,
      whitelist: whitelist,
      available_legos_before_seed: availableLegos,
      legos: {}
    };

    // Process each LEGO in the seed
    const totalLegosInSeed = seedData.legos.length;

    for (let i = 0; i < totalLegosInSeed; i++) {
      const legoData = seedData.legos[i];
      const legoId = legoData.id;
      const isNew = legoData.new === true;
      const isFinalLego = (i === totalLegosInSeed - 1);

      // Get full LEGO data from registry
      const registryLego = getLegoFromRegistry(registry, legoId);

      if (!registryLego) {
        console.warn(`    ⚠️  LEGO ${legoId} not found in registry`);
        continue;
      }

      // Only create baskets for NEW LEGOs
      if (!isNew) {
        console.log(`    - ${legoId}: REFERENCE (skipping - already has basket)`);
        continue;
      }

      console.log(`    - ${legoId}: NEW LEGO (creating scaffold)`);

      // Create LEGO scaffold entry
      scaffold.seeds[seedId].legos[legoId] = {
        lego: [legoData.known, legoData.target],
        type: legoData.type,
        new: true,
        is_final_lego: isFinalLego,
        available_legos: availableLegos,

        // EMPTY - Agent will fill this
        practice_phrases: [],

        // Template for distribution (will be calculated after generation)
        phrase_distribution: {
          really_short_1_2: 0,
          quite_short_3: 0,
          longer_4_5: 0,
          long_6_plus: 0
        },

        // Metadata for agent reference
        _metadata: {
          spanish_words: registryLego.spanish_words,
          whitelist_size: whitelist.length,
          seed_context: seedData.seed_pair
        }
      };
    }
  }

  return scaffold;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node create_basket_scaffolds.cjs <agent_seeds.json> <output_scaffold.json>');
    console.error('');
    console.error('Example:');
    console.error('  node create_basket_scaffolds.cjs \\');
    console.error('    phase5_batch2_s0301_s0500/batch_input/agent_01_seeds.json \\');
    console.error('    phase5_batch2_s0301_s0500/scaffolds/agent_01_scaffold.json');
    process.exit(1);
  }

  const seedsPath = args[0];
  const outputPath = args[1];

  console.log('');
  console.log('=== Phase 5 Basket Scaffold Generator ===');
  console.log('');

  // Load agent seeds
  console.log(`Loading agent seeds: ${seedsPath}`);
  if (!fs.existsSync(seedsPath)) {
    console.error(`❌ Error: Seeds file not found: ${seedsPath}`);
    process.exit(1);
  }
  const agentSeeds = JSON.parse(fs.readFileSync(seedsPath, 'utf8'));
  console.log(`✅ Loaded ${agentSeeds.total_seeds} seeds for ${agentSeeds.agent_name}`);
  console.log('');

  // Load registry
  const registryPath = path.join(
    path.dirname(seedsPath),
    '..',
    'registry',
    'lego_registry_s0001_s0500.json'
  );
  console.log(`Loading LEGO registry: ${registryPath}`);
  if (!fs.existsSync(registryPath)) {
    console.error(`❌ Error: Registry not found: ${registryPath}`);
    process.exit(1);
  }
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  console.log(`✅ Loaded registry with ${registry.total_legos} LEGOs`);
  console.log('');

  // Generate scaffold
  console.log('Generating scaffold...');
  console.log('');
  const scaffold = generateScaffold(agentSeeds, registry);

  // Count what we generated
  let totalNewLegos = 0;
  for (const seedId in scaffold.seeds) {
    totalNewLegos += Object.keys(scaffold.seeds[seedId].legos).length;
  }

  console.log('');
  console.log('✅ Scaffold generation complete!');
  console.log(`   - Seeds: ${scaffold.total_seeds}`);
  console.log(`   - NEW LEGOs (need baskets): ${totalNewLegos}`);
  console.log('');

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    console.log(`Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  console.log(`Writing scaffold: ${outputPath}`);
  fs.writeFileSync(outputPath, JSON.stringify(scaffold, null, 2));
  console.log('✅ Scaffold written successfully');
  console.log('');
  console.log('=== NEXT STEP ===');
  console.log('');
  console.log('The scaffold is ready for phrase generation by LLM.');
  console.log('The LLM should:');
  console.log('  1. Read this scaffold JSON');
  console.log('  2. Fill in the practice_phrases arrays (10 phrases per LEGO)');
  console.log('  3. Use extended thinking for natural phrase creation');
  console.log('  4. Only use words from the whitelist array');
  console.log('  5. DO NOT modify any other fields');
  console.log('');
  console.log('After phrase generation, run validation:');
  console.log('  node scripts/validate_agent_baskets.cjs <filled_scaffold.json>');
  console.log('');
}

main();
