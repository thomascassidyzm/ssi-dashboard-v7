#!/usr/bin/env node

/**
 * Convert SEED_GROUPED format to LEGO_LEVEL format
 *
 * Handles agents: 02, 03, 05, 06, 07, 08, 11, 13, 19
 *
 * INPUT FORMAT:
 * {
 *   "S0111": {
 *     "seed_pair": {...},
 *     "cumulative_legos": 317,
 *     "legos": {
 *       "S0111L01": { lego basket },
 *       "S0111L02": { lego basket }
 *     }
 *   }
 * }
 *
 * OUTPUT FORMAT (one file per seed):
 * {
 *   "version": "curated_v7_spanish",
 *   "seed": "S0111",
 *   "seed_pair": {...},
 *   "cumulative_legos": 317,
 *   "S0111L01": { lego basket },
 *   "S0111L02": { lego basket }
 * }
 *
 * Usage: node scripts/convert_seed_grouped_format.cjs <agent_file> <output_dir>
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
const outputDir = process.argv[3] || path.join(__dirname, '../phase5_batch1_s0101_s0300/batch_output');

if (!inputFile) {
  console.error('❌ Usage: node convert_seed_grouped_format.cjs <agent_file> [output_dir]');
  console.error('   Example: node scripts/convert_seed_grouped_format.cjs phase5_batch1_s0101_s0300/batch_output/agent_02_baskets.json');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log('🔄 Converting SEED_GROUPED format to LEGO_LEVEL format');
console.log('='.repeat(60));
console.log(`Input: ${path.basename(inputFile)}`);
console.log(`Output dir: ${outputDir}`);
console.log('');

// Load input file
const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Extract agent info
const agentId = inputData.agent_id || inputData.agent_name || path.basename(inputFile, '_baskets.json').replace('agent_', '');
const seedRange = inputData.seed_range || 'unknown';

console.log(`Agent: ${agentId}`);
console.log(`Seed range: ${seedRange}`);
console.log('');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let totalSeeds = 0;
let totalLEGOs = 0;
let totalPhrases = 0;

// Process each seed
for (const [key, value] of Object.entries(inputData)) {
  // Skip metadata fields
  if (!key.startsWith('S0') || key.length !== 5) {
    continue;
  }

  const seedId = key;
  const seedData = value;

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
      curated_by: `Claude Code - Agent ${agentId} (converted from SEED_GROUPED format)`,
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
