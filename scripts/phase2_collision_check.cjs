#!/usr/bin/env node

/**
 * Phase 2: Collision Avoidance Check
 *
 * Validates that seed pairs don't create FD violations by checking
 * if the same KNOWN phrase maps to multiple different TARGET phrases.
 *
 * Usage: node phase2_collision_check.cjs <seed_pairs_file>
 */

const fs = require('fs');
const path = require('path');

// Get input file from command line or use default
const inputFile = process.argv[2] || 'seed_pairs.json';

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: File not found: ${inputFile}`);
  console.error('Usage: node phase2_collision_check.cjs <seed_pairs_file>');
  process.exit(1);
}

console.log('🔍 Phase 2: Collision Avoidance Check\n');
console.log(`Reading: ${inputFile}\n`);

// Load seed pairs
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Handle both array format and object format
let seedPairs;
if (Array.isArray(data)) {
  // Flat array format: [[target, known], ...]
  seedPairs = data.map((pair, index) => ({
    seed_id: `S${String(index + 1).padStart(4, '0')}`,
    target: pair[0],
    known: pair[1]
  }));
} else if (data.translations) {
  // Object format: {translations: {S0001: [target, known] OR {known, target}, ...}}
  seedPairs = Object.entries(data.translations).map(([seed_id, pair]) => {
    if (Array.isArray(pair)) {
      // Array format (v7.x): [target, known]
      return { seed_id, target: pair[0], known: pair[1] };
    } else {
      // Object format (v8.2.0): {known, target}
      return { seed_id, target: pair.target, known: pair.known };
    }
  });
} else {
  console.error('❌ Error: Unrecognized seed pairs format');
  process.exit(1);
}

// Build collision map: KNOWN → [{target, seed_id}]
const collisionMap = new Map();

seedPairs.forEach(({seed_id, target, known}) => {
  const targetNorm = target.toLowerCase().trim();
  const knownNorm = known.toLowerCase().trim();

  if (!collisionMap.has(knownNorm)) {
    collisionMap.set(knownNorm, []);
  }

  collisionMap.get(knownNorm).push({ target: targetNorm, seed_id });
});

// Find FD violations (same KNOWN → multiple TARGETs)
const violations = [];

collisionMap.forEach((targets, known) => {
  // Get unique targets for this known phrase
  const uniqueTargets = [...new Set(targets.map(t => t.target))];

  if (uniqueTargets.length > 1) {
    violations.push({
      known,
      mappings: uniqueTargets.map(target => {
        const seeds = targets
          .filter(t => t.target === target)
          .map(t => t.seed_id);
        return { target, seeds };
      })
    });
  }
});

// Report results
if (violations.length === 0) {
  console.log('✅ PASS: No FD violations detected\n');
  console.log(`   Total unique KNOWN phrases: ${collisionMap.size}`);
  console.log(`   Total seed pairs: ${seedPairs.length}`);
  console.log(`   All KNOWN phrases map to exactly one TARGET\n`);

  // Write report
  const report = {
    status: 'PASS',
    timestamp: new Date().toISOString(),
    input_file: inputFile,
    total_seeds: seedPairs.length,
    unique_known_phrases: collisionMap.size,
    violations: []
  };

  const reportFile = inputFile.replace('.json', '_phase2_report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved: ${reportFile}`);

  process.exit(0);
} else {
  console.log(`❌ FAIL: ${violations.length} FD violation(s) detected\n`);

  violations.forEach((v, idx) => {
    console.log(`${idx + 1}. KNOWN: "${v.known}"`);
    console.log(`   Maps to ${v.mappings.length} different TARGETs:\n`);

    v.mappings.forEach(m => {
      console.log(`   → "${m.target}" (${m.seeds.join(', ')})`);
    });
    console.log();
  });

  console.log('⚠️  ACTION REQUIRED:');
  console.log('   Review violations and either:');
  console.log('   1. Modify seed pairs to use different wording');
  console.log('   2. Add disambiguating context to KNOWN phrases');
  console.log('   3. Remove duplicate/conflicting seeds\n');

  // Write detailed report
  const report = {
    status: 'FAIL',
    timestamp: new Date().toISOString(),
    input_file: inputFile,
    total_seeds: seedPairs.length,
    unique_known_phrases: collisionMap.size,
    violation_count: violations.length,
    violations: violations
  };

  const reportFile = inputFile.replace('.json', '_phase2_report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved: ${reportFile}\n`);

  process.exit(1);
}
