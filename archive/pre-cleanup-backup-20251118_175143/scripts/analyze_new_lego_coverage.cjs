#!/usr/bin/env node

/**
 * Analyze NEW LEGO basket coverage (S0101-S0200)
 *
 * Only checks coverage for NEW LEGOs (not references)
 * Reference LEGOs should use baskets from their original seeds (S0001-S0100)
 *
 * Usage: node scripts/analyze_new_lego_coverage.cjs
 */

const fs = require('fs');
const path = require('path');

const LEGO_PAIRS_FILE = path.join(__dirname, '../phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json');
const BATCH_OUTPUT_DIR = path.join(__dirname, '../phase5_batch1_s0101_s0300/batch_output');

console.log('🔍 Analyzing NEW LEGO Coverage: S0101-S0200');
console.log('='.repeat(70));
console.log('');

// Load lego_pairs extraction
const legoPairs = JSON.parse(fs.readFileSync(LEGO_PAIRS_FILE, 'utf8'));

// Build expected NEW LEGOs map
const expectedNewLEGOs = new Map();
const expectedByBatch = {};

for (const seed of legoPairs.seeds) {
  const seedId = seed.seed_id;
  const batchNum = Math.floor((parseInt(seedId.substring(1)) - 101) / 10) + 1;
  const batchKey = `batch_${String(batchNum).padStart(2, '0')}`;

  if (!expectedByBatch[batchKey]) {
    expectedByBatch[batchKey] = {
      batch_num: batchNum,
      seed_range: '',
      seeds: [],
      new_legos: []
    };
  }

  expectedByBatch[batchKey].seeds.push(seedId);

  // Only track NEW LEGOs
  for (const lego of seed.legos) {
    if (lego.new) {
      expectedNewLEGOs.set(lego.id, {
        seed: seedId,
        target: lego.target,
        known: lego.known,
        type: lego.type
      });

      expectedByBatch[batchKey].new_legos.push(lego.id);
    }
  }
}

// Set seed ranges
for (const batchKey of Object.keys(expectedByBatch).sort()) {
  const batch = expectedByBatch[batchKey];
  const seeds = batch.seeds.sort();
  batch.seed_range = `${seeds[0]}-${seeds[seeds.length - 1]}`;
}

console.log(`📊 Expected NEW LEGOs from Phase 3 Extraction:`);
console.log(`  Total seeds: ${legoPairs.total_seeds}`);
console.log(`  NEW LEGOs (S0101-S0200): ${legoPairs.new_legos_this_batch}`);
console.log(`  Reference LEGOs: ${legoPairs.cumulative_legos - legoPairs.new_legos_this_batch - 278} (not counted - use S0001-S0100 baskets)`);
console.log('');

// Load actual baskets
const foundNewLEGOs = new Set();
const foundByBatch = {};

const basketFiles = fs.readdirSync(BATCH_OUTPUT_DIR).filter(f => f.startsWith('lego_baskets_s') && f.endsWith('.json'));

for (const file of basketFiles) {
  const filePath = path.join(BATCH_OUTPUT_DIR, file);

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const key of Object.keys(data)) {
      if (key.includes('L') && expectedNewLEGOs.has(key)) {
        foundNewLEGOs.add(key);

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

console.log(`📦 Found NEW LEGO Baskets in Batch Output:`);
console.log(`  Basket files: ${basketFiles.length}`);
console.log(`  NEW LEGOs with baskets: ${foundNewLEGOs.size}/${expectedNewLEGOs.size}`);
console.log('');

// Analyze each batch
console.log('📋 Batch-by-Batch Analysis (NEW LEGOs only):');
console.log('='.repeat(70));
console.log('');

const batchReport = [];
const agentMap = {
  1: 'Agent 01',
  2: 'Agent 02',
  3: 'Agent 03',
  4: 'Agent 04',
  5: 'Agent 05',
  6: 'Agent 06',
  7: 'Agent 07',
  8: 'Agent 08',
  9: 'Agent 09',
  10: 'Agent 10'
};

for (let batchNum = 1; batchNum <= 10; batchNum++) {
  const batchKey = `batch_${String(batchNum).padStart(2, '0')}`;
  const expected = expectedByBatch[batchKey];

  if (!expected) continue;

  const found = foundByBatch[batchKey] || new Set();
  const missingNewLEGOs = expected.new_legos.filter(id => !found.has(id));
  const coverage = expected.new_legos.length > 0 ? ((found.size / expected.new_legos.length) * 100).toFixed(1) : '0.0';

  let status = '❌ FAILED';
  if (found.size === expected.new_legos.length) {
    status = '✅ COMPLETE';
  } else if (found.size > 0) {
    status = '🟡 INCOMPLETE';
  }

  console.log(`${status} ${agentMap[batchNum]}: ${expected.seed_range}`);
  console.log(`  Expected NEW LEGOs: ${expected.new_legos.length}`);
  console.log(`  Found baskets:      ${found.size} (${coverage}% coverage)`);
  console.log(`  Missing baskets:    ${missingNewLEGOs.length}`);

  if (missingNewLEGOs.length > 0 && missingNewLEGOs.length <= 15) {
    console.log(`  Missing: ${missingNewLEGOs.join(', ')}`);
  } else if (missingNewLEGOs.length > 15) {
    console.log(`  Missing: ${missingNewLEGOs.slice(0, 10).join(', ')} ... +${missingNewLEGOs.length - 10} more`);
  }

  console.log('');

  batchReport.push({
    batch: batchNum,
    agent: agentMap[batchNum],
    seed_range: expected.seed_range,
    expected_new_legos: expected.new_legos.length,
    found_legos: found.size,
    missing_legos: missingNewLEGOs.length,
    coverage_percent: parseFloat(coverage),
    status: status.includes('COMPLETE') ? 'complete' : status.includes('INCOMPLETE') ? 'incomplete' : 'failed',
    missing_ids: missingNewLEGOs
  });
}

// Summary
console.log('='.repeat(70));
console.log('📊 FINAL SUMMARY (NEW LEGOs Only):');
console.log('');

const totalExpected = expectedNewLEGOs.size;
const totalFound = foundNewLEGOs.size;
const totalMissing = totalExpected - totalFound;
const overallCoverage = ((totalFound / totalExpected) * 100).toFixed(1);

const completeBatches = batchReport.filter(b => b.status === 'complete').length;
const incompleteBatches = batchReport.filter(b => b.status === 'incomplete').length;
const failedBatches = batchReport.filter(b => b.status === 'failed').length;

console.log(`NEW LEGOs (S0101-S0200):`);
console.log(`  Expected:  ${totalExpected}`);
console.log(`  Found:     ${totalFound} (${overallCoverage}%)`);
console.log(`  Missing:   ${totalMissing} (${(100 - overallCoverage).toFixed(1)}%)`);
console.log('');

console.log(`Agent/Batch Status:`);
console.log(`  ✅ Complete:   ${completeBatches} agents (all NEW LEGOs have baskets)`);
console.log(`  🟡 Incomplete: ${incompleteBatches} agents (some NEW LEGOs missing baskets)`);
console.log(`  ❌ Failed:     ${failedBatches} agents (no baskets generated)`);
console.log('');

// Prioritized action list
console.log('🎯 ACTION PLAN:');
console.log('');

const failedAgents = batchReport.filter(b => b.status === 'failed');
const incompleteAgents = batchReport.filter(b => b.status === 'incomplete');

if (failedAgents.length > 0) {
  console.log('Priority 1: Re-generate FAILED agents (no output):');
  failedAgents.forEach(b => {
    console.log(`  ❌ ${b.agent}: ${b.seed_range} - ${b.expected_new_legos} NEW LEGOs needed`);
  });
  console.log('');
}

if (incompleteAgents.length > 0) {
  console.log('Priority 2: Complete INCOMPLETE agents (partial output):');
  incompleteAgents.forEach(b => {
    console.log(`  🟡 ${b.agent}: ${b.seed_range} - ${b.missing_legos}/${b.expected_new_legos} NEW LEGOs missing`);
  });
  console.log('');
}

const completeAgents = batchReport.filter(b => b.status === 'complete');
if (completeAgents.length > 0) {
  console.log('✅ Already Complete (no action needed):');
  completeAgents.forEach(b => {
    console.log(`  ✅ ${b.agent}: ${b.seed_range} - ${b.expected_new_legos} NEW LEGOs ✓`);
  });
  console.log('');
}

// Estimate effort
const totalMissingNew = batchReport.reduce((sum, b) => sum + b.missing_legos, 0);
const estimatedMinutes = (totalMissingNew * 10 * 2.5) / 60; // 2.5 min per phrase, 10 phrases per LEGO

console.log('⏱️  Estimated Effort:');
console.log(`  Missing NEW LEGOs: ${totalMissingNew}`);
console.log(`  Missing phrases: ~${totalMissingNew * 10} (10 per LEGO)`);
console.log(`  Estimated time: ~${estimatedMinutes.toFixed(0)} minutes using Claude Code Web parallel execution`);
console.log(`  (${failedBatches} failed agents + ${incompleteBatches} incomplete agents to re-run)`);
console.log('');

// Write report
const reportPath = path.join(BATCH_OUTPUT_DIR, 'NEW_LEGO_COVERAGE_REPORT.json');
const report = {
  generated_at: new Date().toISOString(),
  scope: 'NEW LEGOs only (S0101-S0200)',
  note: 'Reference LEGOs use baskets from original seeds (S0001-S0100)',
  summary: {
    total_new_legos_expected: totalExpected,
    total_found: totalFound,
    total_missing: totalMissing,
    coverage_percent: parseFloat(overallCoverage),
    complete_agents: completeBatches,
    incomplete_agents: incompleteBatches,
    failed_agents: failedBatches
  },
  batches: batchReport,
  action_plan: {
    priority_1_failed: failedAgents.map(b => ({
      agent: b.agent,
      seed_range: b.seed_range,
      new_legos_needed: b.expected_new_legos
    })),
    priority_2_incomplete: incompleteAgents.map(b => ({
      agent: b.agent,
      seed_range: b.seed_range,
      missing_legos: b.missing_legos,
      missing_ids: b.missing_ids
    }))
  }
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`💾 Detailed report: ${path.basename(reportPath)}`);
console.log('');

// Success if all NEW LEGOs have baskets
process.exit(totalMissing === 0 ? 0 : 1);
