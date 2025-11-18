#!/usr/bin/env node

/**
 * Find all LEGOs that need baskets generated
 *
 * Compares LEGO registry against existing basket files to identify gaps
 *
 * Usage: node scripts/find_missing_baskets.cjs <registry_file> <baskets_dir>
 */

const fs = require('fs');
const path = require('path');

const registryFile = process.argv[2] || path.join(__dirname, '../phase5_batch1_s0101_s0300/registry/lego_registry_s0001_s0300.json');
const basketsDir = process.argv[3] || path.join(__dirname, '../phase5_batch1_s0101_s0300/batch_output');

if (!fs.existsSync(registryFile)) {
  console.error(`❌ Registry file not found: ${registryFile}`);
  process.exit(1);
}

if (!fs.existsSync(basketsDir)) {
  console.error(`❌ Baskets directory not found: ${basketsDir}`);
  process.exit(1);
}

console.log('🔍 Finding LEGOs without baskets');
console.log('='.repeat(60));
console.log(`Registry: ${path.basename(registryFile)}`);
console.log(`Baskets dir: ${path.basename(basketsDir)}`);
console.log('');

// Load registry
const registryData = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
const registry = registryData.legos || registryData; // Handle both formats

// Build map of all LEGOs from registry
const allLEGOs = {};
const seedLEGOMap = {}; // Map seed → [LEGOs]

for (const [legoId, legoData] of Object.entries(registry)) {
  if (!legoId.includes('L')) continue; // Skip non-LEGO entries

  const seedId = legoId.substring(0, 5); // S0111L01 → S0111

  allLEGOs[legoId] = {
    seed: seedId,
    target: legoData.target || '',
    known: legoData.known || '',
    type: legoData.type || 'unknown',
    new: legoData.new || false
  };

  if (!seedLEGOMap[seedId]) {
    seedLEGOMap[seedId] = [];
  }
  seedLEGOMap[seedId].push(legoId);
}

console.log(`📊 Registry loaded:`);
console.log(`  Total LEGOs: ${Object.keys(allLEGOs).length}`);
console.log(`  Total seeds: ${Object.keys(seedLEGOMap).length}`);
console.log('');

// Load existing baskets
const existingBaskets = new Set();
const basketFiles = fs.readdirSync(basketsDir).filter(f => f.startsWith('lego_baskets_s') && f.endsWith('.json'));

for (const basketFile of basketFiles) {
  const filePath = path.join(basketsDir, basketFile);

  try {
    const basketData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Check for LEGO-level keys
    for (const key of Object.keys(basketData)) {
      if (key.includes('L')) {
        existingBaskets.add(key);
      }
    }
  } catch (err) {
    console.warn(`⚠️  Error reading ${basketFile}: ${err.message}`);
  }
}

console.log(`📦 Existing baskets:`);
console.log(`  Basket files: ${basketFiles.length}`);
console.log(`  LEGOs with baskets: ${existingBaskets.size}`);
console.log('');

// Find missing baskets
const missingLEGOs = [];
const missingByType = { A: 0, M: 0 };
const missingNewLEGOs = [];

for (const [legoId, legoData] of Object.entries(allLEGOs)) {
  if (!existingBaskets.has(legoId)) {
    missingLEGOs.push(legoId);
    missingByType[legoData.type] = (missingByType[legoData.type] || 0) + 1;

    if (legoData.new) {
      missingNewLEGOs.push(legoId);
    }
  }
}

// Group missing LEGOs by seed
const missingSeedMap = {};
for (const legoId of missingLEGOs) {
  const seedId = legoId.substring(0, 5);
  if (!missingSeedMap[seedId]) {
    missingSeedMap[seedId] = [];
  }
  missingSeedMap[seedId].push(legoId);
}

console.log('❌ Missing baskets:');
console.log(`  Total missing LEGOs: ${missingLEGOs.length}`);
console.log(`  Missing new LEGOs: ${missingNewLEGOs.length}`);
console.log(`  Missing reference LEGOs: ${missingLEGOs.length - missingNewLEGOs.length}`);
console.log(`  Missing by type: A=${missingByType.A || 0}, M=${missingByType.M || 0}`);
console.log(`  Seeds with missing baskets: ${Object.keys(missingSeedMap).length}`);
console.log('');

// Identify completely missing seeds (all LEGOs missing baskets)
const completelyMissingSeeds = [];
const partiallyMissingSeeds = [];

for (const [seedId, legos] of Object.entries(seedLEGOMap)) {
  const seedLEGOCount = legos.length;
  const missingCount = (missingSeedMap[seedId] || []).length;

  if (missingCount === seedLEGOCount) {
    completelyMissingSeeds.push(seedId);
  } else if (missingCount > 0) {
    partiallyMissingSeeds.push(seedId);
  }
}

console.log('📋 Missing seeds breakdown:');
console.log(`  Completely missing: ${completelyMissingSeeds.length} seeds (all LEGOs need baskets)`);
console.log(`  Partially missing: ${partiallyMissingSeeds.length} seeds (some LEGOs need baskets)`);
console.log('');

// Show completely missing seeds in ranges
if (completelyMissingSeeds.length > 0) {
  console.log('🔴 Completely missing seeds:');
  const sorted = completelyMissingSeeds.sort();

  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    const currentNum = current ? parseInt(current.substring(1)) : null;
    const endNum = parseInt(rangeEnd.substring(1));

    if (currentNum === endNum + 1) {
      rangeEnd = current;
    } else {
      if (rangeStart === rangeEnd) {
        console.log(`  ${rangeStart} (${seedLEGOMap[rangeStart].length} LEGOs)`);
      } else {
        console.log(`  ${rangeStart}-${rangeEnd}`);
      }
      rangeStart = current;
      rangeEnd = current;
    }
  }
  console.log('');
}

// Show partially missing seeds
if (partiallyMissingSeeds.length > 0) {
  console.log('🟡 Partially missing seeds:');
  for (const seedId of partiallyMissingSeeds.sort()) {
    const missing = missingSeedMap[seedId];
    const total = seedLEGOMap[seedId].length;
    console.log(`  ${seedId}: ${missing.length}/${total} LEGOs missing`);
  }
  console.log('');
}

// Summary statistics
const coveragePercent = ((existingBaskets.size / Object.keys(allLEGOs).length) * 100).toFixed(1);

console.log('📊 Coverage Summary:');
console.log(`  Total LEGOs in registry: ${Object.keys(allLEGOs).length}`);
console.log(`  LEGOs with baskets: ${existingBaskets.size} (${coveragePercent}%)`);
console.log(`  LEGOs without baskets: ${missingLEGOs.length} (${(100 - coveragePercent).toFixed(1)}%)`);
console.log('');

// Write detailed report
const reportPath = path.join(basketsDir, 'MISSING_BASKETS_REPORT.json');
const report = {
  generated_at: new Date().toISOString(),
  registry_file: path.basename(registryFile),
  baskets_directory: path.basename(basketsDir),
  summary: {
    total_legos: Object.keys(allLEGOs).length,
    legos_with_baskets: existingBaskets.size,
    legos_without_baskets: missingLEGOs.length,
    coverage_percent: parseFloat(coveragePercent),
    completely_missing_seeds: completelyMissingSeeds.length,
    partially_missing_seeds: partiallyMissingSeeds.length
  },
  completely_missing_seeds: completelyMissingSeeds.sort(),
  partially_missing_seeds: partiallyMissingSeeds.sort().map(seedId => ({
    seed: seedId,
    missing_legos: missingSeedMap[seedId].sort(),
    missing_count: missingSeedMap[seedId].length,
    total_count: seedLEGOMap[seedId].length
  })),
  missing_legos: missingLEGOs.sort().map(legoId => ({
    lego_id: legoId,
    seed: allLEGOs[legoId].seed,
    target: allLEGOs[legoId].target,
    known: allLEGOs[legoId].known,
    type: allLEGOs[legoId].type,
    new: allLEGOs[legoId].new
  }))
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`💾 Detailed report written to: ${path.basename(reportPath)}`);
console.log('');

// Exit with error code if missing baskets found
process.exit(missingLEGOs.length > 0 ? 1 : 0);
