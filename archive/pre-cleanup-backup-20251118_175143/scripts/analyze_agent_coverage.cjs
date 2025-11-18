#!/usr/bin/env node

/**
 * Analyze agent basket generation coverage against lego_pairs extraction
 *
 * For S0101-S0200 (100 seeds in 10-seed batches):
 * - Compare what was extracted (lego_pairs_s0101_s0200.json)
 * - Against what has baskets (batch_output/*.json + individual files)
 * - Identify missing LEGOs per batch
 *
 * Usage: node scripts/analyze_agent_coverage.cjs
 */

const fs = require('fs');
const path = require('path');

const LEGO_PAIRS_FILE = path.join(__dirname, '../phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json');
const BATCH_OUTPUT_DIR = path.join(__dirname, '../phase5_batch1_s0101_s0300/batch_output');

console.log('🔍 Analyzing Agent Coverage: S0101-S0200');
console.log('='.repeat(70));
console.log('');

// Load lego_pairs extraction
if (!fs.existsSync(LEGO_PAIRS_FILE)) {
  console.error(`❌ LEGO pairs file not found: ${LEGO_PAIRS_FILE}`);
  process.exit(1);
}

const legoPairs = JSON.parse(fs.readFileSync(LEGO_PAIRS_FILE, 'utf8'));

// Build expected LEGOs map from extraction
const expectedLEGOs = new Map(); // legoId → { seed, target, known, type, new }
const expectedByBatch = {}; // Batch → { seeds: [], new_legos: [], all_legos: [] }

for (const seed of legoPairs.seeds) {
  const seedId = seed.seed_id;
  const batchNum = Math.floor((parseInt(seedId.substring(1)) - 101) / 10) + 1;
  const batchKey = `batch_${String(batchNum).padStart(2, '0')}`;

  if (!expectedByBatch[batchKey]) {
    expectedByBatch[batchKey] = {
      batch_num: batchNum,
      seed_range: '',
      seeds: [],
      new_legos: [],
      all_legos: [],
      ref_legos: []
    };
  }

  expectedByBatch[batchKey].seeds.push(seedId);

  for (const lego of seed.legos) {
    expectedLEGOs.set(lego.id, {
      seed: seedId,
      target: lego.target,
      known: lego.known,
      type: lego.type,
      new: lego.new || false
    });

    expectedByBatch[batchKey].all_legos.push(lego.id);

    if (lego.new) {
      expectedByBatch[batchKey].new_legos.push(lego.id);
    } else {
      expectedByBatch[batchKey].ref_legos.push(lego.id);
    }
  }
}

// Set seed ranges for batches
for (const batchKey of Object.keys(expectedByBatch).sort()) {
  const batch = expectedByBatch[batchKey];
  const seeds = batch.seeds.sort();
  batch.seed_range = `${seeds[0]}-${seeds[seeds.length - 1]}`;
}

console.log(`📊 Expected from Phase 3 Extraction:`);
console.log(`  Total seeds: ${legoPairs.total_seeds}`);
console.log(`  Total LEGOs: ${legoPairs.cumulative_legos}`);
console.log(`  New LEGOs (S0101-S0200): ${legoPairs.new_legos_this_batch}`);
console.log('');

// Load actual baskets from batch_output
const foundLEGOs = new Set();
const foundByBatch = {}; // Batch → Set of LEGO IDs

// Check individual basket files
const basketFiles = fs.readdirSync(BATCH_OUTPUT_DIR).filter(f => f.startsWith('lego_baskets_s') && f.endsWith('.json'));

for (const file of basketFiles) {
  const filePath = path.join(BATCH_OUTPUT_DIR, file);

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const key of Object.keys(data)) {
      if (key.includes('L')) { // LEGO ID
        foundLEGOs.add(key);

        // Determine batch
        const seedId = key.substring(0, 5);
        const batchNum = Math.floor((parseInt(seedId.substring(1)) - 101) / 10) + 1;
        const batchKey = `batch_${String(batchNum).padStart(2, '0')}`;

        if (!foundByBatch[batchKey]) {
          foundByBatch[batchKey] = new Set();
        }
        foundByBatch[batchKey].add(key);
      }
    }
  } catch (err) {
    console.warn(`⚠️  Error reading ${file}: ${err.message}`);
  }
}

console.log(`📦 Found in Batch Output:`);
console.log(`  Basket files: ${basketFiles.length}`);
console.log(`  LEGOs with baskets: ${foundLEGOs.size}`);
console.log('');

// Analyze each batch (10 seeds each)
console.log('📋 Batch-by-Batch Analysis (10 seeds per batch):');
console.log('='.repeat(70));
console.log('');

const batchReport = [];

for (let batchNum = 1; batchNum <= 10; batchNum++) {
  const batchKey = `batch_${String(batchNum).padStart(2, '0')}`;
  const expected = expectedByBatch[batchKey];

  if (!expected) {
    console.log(`⚠️  Batch ${batchNum}: No extraction data found`);
    continue;
  }

  const found = foundByBatch[batchKey] || new Set();

  // Calculate missing
  const missingLEGOs = expected.all_legos.filter(id => !found.has(id));
  const missingNewLEGOs = expected.new_legos.filter(id => !found.has(id));
  const missingRefLEGOs = expected.ref_legos.filter(id => !found.has(id));

  const coverage = ((found.size / expected.all_legos.length) * 100).toFixed(1);

  // Status indicator
  let status = '❌ MISSING';
  if (found.size === expected.all_legos.length) {
    status = '✅ COMPLETE';
  } else if (found.size > 0) {
    status = '🟡 PARTIAL';
  }

  console.log(`${status} Batch ${String(batchNum).padStart(2, ' ')}: ${expected.seed_range}`);
  console.log(`  Expected: ${expected.all_legos.length} LEGOs (${expected.new_legos.length} new, ${expected.ref_legos.length} ref)`);
  console.log(`  Found:    ${found.size} LEGOs (${coverage}% coverage)`);
  console.log(`  Missing:  ${missingLEGOs.length} LEGOs (${missingNewLEGOs.length} new, ${missingRefLEGOs.length} ref)`);

  if (missingLEGOs.length > 0 && missingLEGOs.length <= 20) {
    console.log(`  Missing IDs: ${missingLEGOs.join(', ')}`);
  } else if (missingLEGOs.length > 20) {
    console.log(`  Missing IDs: ${missingLEGOs.slice(0, 10).join(', ')} ... and ${missingLEGOs.length - 10} more`);
  }

  console.log('');

  batchReport.push({
    batch: batchNum,
    seed_range: expected.seed_range,
    expected_legos: expected.all_legos.length,
    expected_new: expected.new_legos.length,
    expected_ref: expected.ref_legos.length,
    found_legos: found.size,
    missing_legos: missingLEGOs.length,
    missing_new: missingNewLEGOs.length,
    missing_ref: missingRefLEGOs.length,
    coverage_percent: parseFloat(coverage),
    status: status.includes('COMPLETE') ? 'complete' : status.includes('PARTIAL') ? 'partial' : 'missing',
    missing_ids: missingLEGOs
  });
}

// Summary statistics
console.log('='.repeat(70));
console.log('📊 SUMMARY:');
console.log('');

const totalExpected = Array.from(expectedLEGOs.keys()).length;
const totalFound = foundLEGOs.size;
const totalMissing = totalExpected - totalFound;
const overallCoverage = ((totalFound / totalExpected) * 100).toFixed(1);

const completeBatches = batchReport.filter(b => b.status === 'complete').length;
const partialBatches = batchReport.filter(b => b.status === 'partial').length;
const missingBatches = batchReport.filter(b => b.status === 'missing').length;

console.log(`Total LEGOs (S0101-S0200):`);
console.log(`  Expected (from extraction): ${totalExpected}`);
console.log(`  Found (in baskets):         ${totalFound} (${overallCoverage}%)`);
console.log(`  Missing:                    ${totalMissing} (${(100 - overallCoverage).toFixed(1)}%)`);
console.log('');

console.log(`Batch Status (10 batches × 10 seeds):`);
console.log(`  ✅ Complete: ${completeBatches} batches`);
console.log(`  🟡 Partial:  ${partialBatches} batches`);
console.log(`  ❌ Missing:  ${missingBatches} batches`);
console.log('');

// Identify agent assignments (assuming 10 seeds per agent)
console.log('👥 Agent Assignments:');
console.log('');

const agentMap = {
  1: 'S0101-S0110',
  2: 'S0111-S0120',
  3: 'S0121-S0130',
  4: 'S0131-S0140',
  5: 'S0141-S0150',
  6: 'S0151-S0160',
  7: 'S0161-S0170',
  8: 'S0171-S0180',
  9: 'S0181-S0190',
  10: 'S0191-S0200'
};

for (let agent = 1; agent <= 10; agent++) {
  const batch = batchReport[agent - 1];
  if (batch) {
    const statusEmoji = batch.status === 'complete' ? '✅' : batch.status === 'partial' ? '🟡' : '❌';
    console.log(`  ${statusEmoji} Agent ${String(agent).padStart(2, ' ')}: ${agentMap[agent]} - ${batch.found_legos}/${batch.expected_legos} LEGOs (${batch.coverage_percent}%)`);
  }
}

console.log('');

// Write detailed report
const reportPath = path.join(BATCH_OUTPUT_DIR, 'AGENT_COVERAGE_REPORT.json');
const report = {
  generated_at: new Date().toISOString(),
  source_extraction: path.basename(LEGO_PAIRS_FILE),
  batch_output_dir: path.basename(BATCH_OUTPUT_DIR),
  summary: {
    total_expected: totalExpected,
    total_found: totalFound,
    total_missing: totalMissing,
    coverage_percent: parseFloat(overallCoverage),
    complete_batches: completeBatches,
    partial_batches: partialBatches,
    missing_batches: missingBatches
  },
  batches: batchReport
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`💾 Detailed report: ${path.basename(reportPath)}`);
console.log('');

// Exit with error if missing LEGOs
process.exit(totalMissing > 0 ? 1 : 0);
