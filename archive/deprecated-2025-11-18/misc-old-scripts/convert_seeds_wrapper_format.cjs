#!/usr/bin/env node

/**
 * Convert SEEDS_WRAPPER format to LEGO_LEVEL format
 *
 * Handles agents: 10, 14, 16, 17
 *
 * INPUT FORMAT:
 * {
 *   "seeds": {
 *     "S0191": {
 *       "seed_pair": {...},
 *       "cumulative_legos": 550,
 *       "legos": {
 *         "S0191L01": { lego basket },
 *         "S0191L02": { lego basket }
 *       }
 *     }
 *   }
 * }
 *
 * OUTPUT FORMAT (one file per seed):
 * {
 *   "version": "curated_v7_spanish",
 *   "seed": "S0191",
 *   "seed_pair": {...},
 *   "cumulative_legos": 550,
 *   "S0191L01": { lego basket },
 *   "S0191L02": { lego basket }
 * }
 *
 * Usage: node scripts/convert_seeds_wrapper_format.cjs <agent_file> <output_dir>
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
const outputDir = process.argv[3] || path.join(__dirname, '../phase5_batch1_s0101_s0300/batch_output');

if (!inputFile) {
  console.error('❌ Usage: node convert_seeds_wrapper_format.cjs <agent_file> [output_dir]');
  console.error('   Example: node scripts/convert_seeds_wrapper_format.cjs phase5_batch1_s0101_s0300/batch_output/agent_10_baskets.json');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log('🔄 Converting SEEDS_WRAPPER format to LEGO_LEVEL format');
console.log('='.repeat(60));
console.log(`Input: ${path.basename(inputFile)}`);
console.log(`Output dir: ${outputDir}`);
console.log('');

// Load input file
const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Extract agent info
const agentId = inputData.agent_id || inputData.agent_name || path.basename(inputFile, '_baskets.json').replace('agent_', '');
const batchInfo = inputData.batch_info || {};

console.log(`Agent: ${agentId}`);
console.log(`Batch: ${batchInfo.batch_number || 'unknown'}`);
console.log('');

// Check for "seeds" wrapper
if (!inputData.seeds || typeof inputData.seeds !== 'object') {
  console.error('❌ No "seeds" object found in input file');
  console.error('   Expected format: { "seeds": { "S0191": {...} } }');
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let totalSeeds = 0;
let totalLEGOs = 0;
let totalPhrases = 0;

// Process each seed inside the "seeds" wrapper
for (const [seedId, seedData] of Object.entries(inputData.seeds)) {
  // Only process seed IDs (e.g., S0191)
  if (!seedId.startsWith('S0') || seedId.length !== 5) {
    continue;
  }

  // Validate seed structure
  if (!seedData.legos || typeof seedData.legos !== 'object') {
    console.warn(`⚠️  Skipping ${seedId}: no valid "legos" object found`);
    continue;
  }

  // Build output file in correct format
  const outputFile = {
    version: 'curated_v7_spanish',
    seed: seedId,
    course_direction: 'Spanish for English speakers',
    mapping: 'KNOWN (English) → TARGET (Spanish)',
    seed_pair: seedData.seed_pair || { known: '', target: '' },
    patterns_introduced: seedData.patterns_introduced || '',
    cumulative_patterns: seedData.cumulative_patterns || [],
    cumulative_legos: seedData.cumulative_legos || 0,
    curation_metadata: {
      curated_at: new Date().toISOString(),
      curated_by: `Claude Code - Agent ${agentId} (converted from SEEDS_WRAPPER format)`,
      original_file: path.basename(inputFile),
      conversion_date: new Date().toISOString()
    }
  };

  let legoCount = 0;
  let phraseCount = 0;

  // Add all LEGO baskets at top level
  for (const [legoId, legoBasket] of Object.entries(seedData.legos)) {
    outputFile[legoId] = legoBasket;
    legoCount++;

    if (legoBasket.practice_phrases) {
      phraseCount += legoBasket.practice_phrases.length;
    }
  }

  // Write individual seed file
  const outputFilePath = path.join(outputDir, `lego_baskets_${seedId.toLowerCase()}.json`);
  fs.writeFileSync(outputFilePath, JSON.stringify(outputFile, null, 2), 'utf8');

  console.log(`✓ ${seedId}: ${legoCount} LEGOs, ${phraseCount} phrases → ${path.basename(outputFilePath)}`);

  totalSeeds++;
  totalLEGOs += legoCount;
  totalPhrases += phraseCount;
}

console.log('');
console.log('📊 Conversion Summary:');
console.log(`  Seeds converted: ${totalSeeds}`);
console.log(`  Total LEGOs: ${totalLEGOs}`);
console.log(`  Total phrases: ${totalPhrases}`);
console.log('');
console.log('✅ Conversion complete!');
console.log('');
