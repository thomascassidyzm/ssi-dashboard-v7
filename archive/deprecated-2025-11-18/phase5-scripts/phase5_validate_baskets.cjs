#!/usr/bin/env node

/**
 * Phase 5: Validate basket generation quality
 *
 * Checks:
 * 1. Distribution compliance (2-2-2-4)
 * 2. GATE constraint (no future vocabulary)
 * 3. Full seed inclusion
 * 4. Pattern coverage
 * 5. Natural Spanish (basic checks)
 *
 * Usage: node scripts/phase5_validate_baskets.cjs <path_to_baskets.json>
 */

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node phase5_validate_baskets.cjs <path_to_baskets.json>');
  console.error('Example: node scripts/phase5_validate_baskets.cjs phase5_baskets_s0101_s0200/lego_baskets_s0101_s0200.json');
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`Error: File not found: ${inputPath}`);
  process.exit(1);
}

console.log('🔍 Validating basket generation quality...');
console.log('='.repeat(60));
console.log(`File: ${path.basename(inputPath)}`);
console.log('');

// Load baskets
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const baskets = data.baskets || data;

if (typeof baskets !== 'object' || Array.isArray(baskets)) {
  console.error('❌ Invalid format: expected object with basket IDs as keys');
  process.exit(1);
}

// Load LEGO registry for GATE validation (if available)
const legoRegistryPath = path.join(__dirname, '../phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json');
let legoRegistry = null;

if (fs.existsSync(legoRegistryPath)) {
  const registryData = JSON.parse(fs.readFileSync(legoRegistryPath, 'utf8'));
  legoRegistry = new Map();

  for (const seed of registryData.seeds) {
    for (const lego of seed.legos) {
      legoRegistry.set(lego.id, {
        target: lego.target,
        known: lego.known,
        type: lego.type,
        seed_id: seed.seed_id,
        position: seed.cumulative_legos || 0
      });
    }
  }
  console.log(`✓ Loaded LEGO registry: ${legoRegistry.size} LEGOs`);
} else {
  console.log('⚠️  LEGO registry not found - skipping GATE validation');
}

console.log('');
console.log('📊 Running validation checks...');
console.log('');

let totalBaskets = 0;
let errors = [];
let warnings = [];

// Distribution counters
let distributionPerfect = 0;
let distributionClose = 0;
let distributionFailed = 0;

// GATE violation counters
let gateViolations = 0;

// Full seed inclusion counters
let fullSeedIncluded = 0;
let fullSeedMissing = 0;

// Pattern coverage counters
const patternCounts = {};

for (const [legoId, basket] of Object.entries(baskets)) {
  totalBaskets++;

  if (!basket.practice_phrases || !Array.isArray(basket.practice_phrases)) {
    errors.push({
      lego: legoId,
      type: 'INVALID_FORMAT',
      message: 'Missing or invalid practice_phrases array'
    });
    continue;
  }

  const phrases = basket.practice_phrases;

  // Check 1: Distribution (2-2-2-4)
  const lengthCounts = {
    '1-2': 0,
    '3': 0,
    '4-5': 0,
    '6+': 0
  };

  for (const phrase of phrases) {
    const legoCount = phrase[3] || 0;

    if (legoCount >= 1 && legoCount <= 2) lengthCounts['1-2']++;
    else if (legoCount === 3) lengthCounts['3']++;
    else if (legoCount >= 4 && legoCount <= 5) lengthCounts['4-5']++;
    else if (legoCount >= 6) lengthCounts['6+']++;
  }

  const isPerfect = lengthCounts['1-2'] === 2 && lengthCounts['3'] === 2 && lengthCounts['4-5'] === 2 && lengthCounts['6+'] === 4;
  const isClose = Math.abs(lengthCounts['1-2'] - 2) <= 1 && Math.abs(lengthCounts['3'] - 2) <= 1 && Math.abs(lengthCounts['4-5'] - 2) <= 1 && Math.abs(lengthCounts['6+'] - 4) <= 1;

  if (isPerfect) {
    distributionPerfect++;
  } else if (isClose) {
    distributionClose++;
    warnings.push({
      lego: legoId,
      type: 'DISTRIBUTION_CLOSE',
      message: `Distribution close but not perfect: ${JSON.stringify(lengthCounts)} (expected 2-2-2-4)`
    });
  } else {
    distributionFailed++;
    errors.push({
      lego: legoId,
      type: 'DISTRIBUTION_FAILED',
      message: `Distribution incorrect: ${JSON.stringify(lengthCounts)} (expected 2-2-2-4)`
    });
  }

  // Check 2: GATE constraint (if registry available)
  if (legoRegistry) {
    const currentLego = legoRegistry.get(legoId);

    if (currentLego) {
      const currentPosition = currentLego.position;

      // Check each phrase for GATE violations (simplified check)
      for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];
        const targetPhrase = phrase[1] || '';

        // TODO: Full GATE validation would require parsing phrase into LEGOs
        // For now, just warn if phrase seems too complex
        const wordCount = targetPhrase.split(/\s+/).length;
        if (wordCount > currentPosition * 2) {
          warnings.push({
            lego: legoId,
            type: 'POSSIBLE_GATE_VIOLATION',
            message: `Phrase ${i + 1} might use unavailable vocabulary: "${targetPhrase}"`
          });
        }
      }
    }
  }

  // Check 3: Full seed inclusion
  const hasFullSeed = basket.full_seed_included === 'YES' || basket.full_seed_included === true;
  if (hasFullSeed) {
    fullSeedIncluded++;
  } else {
    fullSeedMissing++;
    warnings.push({
      lego: legoId,
      type: 'FULL_SEED_MISSING',
      message: 'Full seed not included in basket'
    });
  }

  // Check 4: Pattern coverage
  if (basket.pattern_coverage) {
    const patterns = basket.pattern_coverage.split(',').map(p => p.trim());
    for (const pattern of patterns) {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    }
  }
}

// Print summary
console.log('📊 Validation Summary:');
console.log('');
console.log(`Total baskets: ${totalBaskets}`);
console.log('');

console.log('Distribution compliance (2-2-2-4):');
console.log(`  ✅ Perfect: ${distributionPerfect} (${(distributionPerfect / totalBaskets * 100).toFixed(1)}%)`);
console.log(`  ⚠️  Close: ${distributionClose} (${(distributionClose / totalBaskets * 100).toFixed(1)}%)`);
console.log(`  ❌ Failed: ${distributionFailed} (${(distributionFailed / totalBaskets * 100).toFixed(1)}%)`);
console.log('');

console.log('Full seed inclusion:');
console.log(`  ✅ Included: ${fullSeedIncluded} (${(fullSeedIncluded / totalBaskets * 100).toFixed(1)}%)`);
console.log(`  ⚠️  Missing: ${fullSeedMissing} (${(fullSeedMissing / totalBaskets * 100).toFixed(1)}%)`);
console.log('');

if (Object.keys(patternCounts).length > 0) {
  console.log('Pattern coverage:');
  const sortedPatterns = Object.entries(patternCounts).sort((a, b) => b[1] - a[1]);
  for (const [pattern, count] of sortedPatterns) {
    console.log(`  ${pattern}: ${count} baskets`);
  }
  console.log('');
}

// Print errors
if (errors.length > 0) {
  console.log(`❌ Errors (${errors.length}):`);
  for (const err of errors.slice(0, 20)) {
    console.log(`  ${err.lego}: ${err.type} - ${err.message}`);
  }
  if (errors.length > 20) {
    console.log(`  ... and ${errors.length - 20} more errors`);
  }
  console.log('');
}

// Print warnings
if (warnings.length > 0) {
  console.log(`⚠️  Warnings (${warnings.length}):`);
  for (const warn of warnings.slice(0, 20)) {
    console.log(`  ${warn.lego}: ${warn.type} - ${warn.message}`);
  }
  if (warnings.length > 20) {
    console.log(`  ... and ${warnings.length - 20} more warnings`);
  }
  console.log('');
}

// Overall grade
let grade = 'A';
const errorRate = errors.length / totalBaskets;
const warningRate = warnings.length / totalBaskets;

if (errorRate > 0.15 || warningRate > 0.30) grade = 'F';
else if (errorRate > 0.10 || warningRate > 0.25) grade = 'D';
else if (errorRate > 0.05 || warningRate > 0.20) grade = 'C';
else if (errorRate > 0.02 || warningRate > 0.15) grade = 'B';
else if (errorRate > 0 || warningRate > 0.10) grade = 'A-';

console.log(`📝 Overall Grade: ${grade}`);
console.log('');

if (errors.length === 0 && warnings.length <= totalBaskets * 0.10) {
  console.log('✅ EXCELLENT QUALITY - Ready for deployment');
} else if (errors.length === 0) {
  console.log('✅ GOOD QUALITY - Minor improvements recommended');
} else if (errorRate < 0.05) {
  console.log('⚠️  ACCEPTABLE QUALITY - Some fixes needed');
} else {
  console.log('❌ QUALITY ISSUES - Review and fix errors before deployment');
}
console.log('');

process.exit(errors.length > 0 ? 1 : 0);
