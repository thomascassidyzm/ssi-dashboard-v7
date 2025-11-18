#!/usr/bin/env node

/**
 * Convert Agent 20 special format to LEGO_LEVEL format
 *
 * Agent 20 has a unique structure with 49 LEGO-level keys spread across 10 seeds.
 * Need to group LEGOs back into their parent seeds.
 *
 * INPUT FORMAT:
 * {
 *   "agent_id": 20,
 *   "seed_range": "S0291-S0300",
 *   "S0291L01": { lego basket },
 *   "S0291L02": { lego basket },
 *   "S0001": { lego basket - reference LEGO },
 *   ...
 * }
 *
 * OUTPUT FORMAT (one file per seed):
 * {
 *   "version": "curated_v7_spanish",
 *   "seed": "S0291",
 *   "seed_pair": {...},
 *   "cumulative_legos": X,
 *   "S0291L01": { lego basket },
 *   "S0291L02": { lego basket }
 * }
 *
 * Usage: node scripts/convert_agent20_format.cjs <agent_file> <registry_file> <output_dir>
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
const registryFile = process.argv[3] || path.join(__dirname, '../phase5_batch1_s0101_s0300/registry/lego_registry_s0001_s0300.json');
const outputDir = process.argv[4] || path.join(__dirname, '../phase5_batch1_s0101_s0300/batch_output');

if (!inputFile) {
  console.error('❌ Usage: node convert_agent20_format.cjs <agent_file> [registry_file] [output_dir]');
  console.error('   Example: node scripts/convert_agent20_format.cjs phase5_batch1_s0101_s0300/batch_output/agent_20_baskets.json');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Input file not found: ${inputFile}`);
  process.exit(1);
}

if (!fs.existsSync(registryFile)) {
  console.error(`❌ Registry file not found: ${registryFile}`);
  console.error('   Registry needed to get seed_pair and cumulative_legos info');
  process.exit(1);
}

console.log('🔄 Converting Agent 20 special format to LEGO_LEVEL format');
console.log('='.repeat(60));
console.log(`Input: ${path.basename(inputFile)}`);
console.log(`Registry: ${path.basename(registryFile)}`);
console.log(`Output dir: ${outputDir}`);
console.log('');

// Load input file and registry
const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));

// Build registry lookup by seed ID
const registryLookup = {};
for (const [legoId, legoData] of Object.entries(registry)) {
  if (legoId.includes('L')) {
    const seedId = legoId.substring(0, 5); // S0291L01 → S0291
    if (!registryLookup[seedId]) {
      registryLookup[seedId] = {
        seed_pair: legoData.seed_pair || { known: '', target: '' },
        cumulative_legos: legoData.cumulative || 0,
        patterns: legoData.patterns || []
      };
    }
  }
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Group LEGOs by seed
const seedGroups = {};

for (const [key, value] of Object.entries(inputData)) {
  // Skip metadata fields
  if (!key.startsWith('S0')) {
    continue;
  }

  // Determine if this is a LEGO ID (e.g., S0291L01) or seed reference (e.g., S0001)
  if (key.includes('L')) {
    // LEGO ID - extract seed
    const seedId = key.substring(0, 5);
    if (!seedGroups[seedId]) {
      seedGroups[seedId] = {};
    }
    seedGroups[seedId][key] = value;
  }
  // Else: reference LEGO (like S0001) - these appear in final LEGO phrases, ignore at top level
}

console.log(`Found ${Object.keys(seedGroups).length} seeds to convert`);
console.log('');

let totalSeeds = 0;
let totalLEGOs = 0;
let totalPhrases = 0;

// Create output files for each seed
for (const [seedId, legos] of Object.entries(seedGroups).sort()) {
  // Get metadata from registry
  const seedInfo = registryLookup[seedId] || {
    seed_pair: { known: '', target: '' },
    cumulative_legos: 0,
    patterns: []
  };

  // Build output file in correct format
  const outputFile = {
    version: 'curated_v7_spanish',
    seed: seedId,
    course_direction: 'Spanish for English speakers',
    mapping: 'KNOWN (English) → TARGET (Spanish)',
    seed_pair: seedInfo.seed_pair,
    patterns_introduced: '',
    cumulative_patterns: seedInfo.patterns,
    cumulative_legos: seedInfo.cumulative_legos,
    curation_metadata: {
      curated_at: new Date().toISOString(),
      curated_by: 'Claude Code - Agent 20 (converted from special format)',
      original_file: path.basename(inputFile),
      conversion_date: new Date().toISOString(),
      notes: 'Agent 20 GATE violations fixed per report (2 violations corrected)'
    }
  };

  let legoCount = 0;
  let phraseCount = 0;

  // Add all LEGO baskets at top level
  for (const [legoId, legoBasket] of Object.entries(legos)) {
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
console.log('Note: Agent 20 had 2 GATE violations that were already fixed per AGENT_20_REPORT.md');
console.log('');
