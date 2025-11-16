#!/usr/bin/env node

/**
 * Phase 3 LEGO FD Violation Checker
 *
 * Validates Functional Determinism at LEGO level:
 * "When learner hears KNOWN LEGO phrase X, do they know without ambiguity
 *  what to produce for TARGET LEGO phrase X?"
 *
 * Same principle as Phase 2 (seed-level FD check), but applied to LEGOs.
 *
 * VIOLATION: Same KNOWN LEGO → Multiple different TARGET LEGOs
 *
 * Usage: node check-lego-fd-violations.cjs <lego_pairs_path>
 * Example: node check-lego-fd-violations.cjs public/vfs/courses/spa_for_eng/phase_3/lego_pairs.json
 */

const fs = require('fs');
const path = require('path');

// Get input file from command line
const legoPairsPath = process.argv[2];

if (!legoPairsPath) {
  console.error('❌ Error: lego_pairs.json path required');
  console.error('Usage: node check-lego-fd-violations.cjs <lego_pairs_path>');
  console.error('Example: node check-lego-fd-violations.cjs public/vfs/courses/spa_for_eng/phase_3/lego_pairs.json');
  process.exit(1);
}

if (!fs.existsSync(legoPairsPath)) {
  console.error(`❌ Error: File not found: ${legoPairsPath}`);
  process.exit(1);
}

console.log('🔍 Phase 3: LEGO FD Violation Check (Learner Uncertainty Test)\n');
console.log(`Reading: ${legoPairsPath}\n`);

// Load lego_pairs
const data = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Build collision map: KNOWN → [{target, seed_id, lego_id, type}]
const collisionMap = new Map();
let totalLegos = 0;

// Process each seed
data.seeds.forEach((seed) => {
  const seedId = seed.seed_id;

  if (!seed.legos || !Array.isArray(seed.legos)) {
    return;
  }

  seed.legos.forEach((lego) => {
    totalLegos++;

    const targetNorm = lego.target.toLowerCase().trim();
    const knownNorm = lego.known.toLowerCase().trim();

    if (!collisionMap.has(knownNorm)) {
      collisionMap.set(knownNorm, []);
    }

    collisionMap.get(knownNorm).push({
      target: targetNorm,
      seed_id: seedId,
      lego_id: lego.id,
      type: lego.type
    });
  });
});

// Find FD violations (same KNOWN → multiple TARGETs)
const violations = [];

collisionMap.forEach((targets, known) => {
  // Get unique targets for this known LEGO phrase
  const uniqueTargets = [...new Set(targets.map(t => t.target))];

  if (uniqueTargets.length > 1) {
    violations.push({
      known,
      mappings: uniqueTargets.map(target => {
        const legos = targets
          .filter(t => t.target === target)
          .map(t => ({
            seed_id: t.seed_id,
            lego_id: t.lego_id,
            type: t.type
          }));
        return { target, legos };
      })
    });
  }
});

// Report results
if (violations.length === 0) {
  console.log('✅ PASS: No LEGO FD violations detected\n');
  console.log(`   Total unique KNOWN LEGOs: ${collisionMap.size}`);
  console.log(`   Total LEGOs: ${totalLegos}`);
  console.log(`   All KNOWN LEGOs map to exactly one TARGET\n`);
  console.log('   🎓 Learners have ZERO UNCERTAINTY - when they hear a KNOWN LEGO,');
  console.log('      they always know exactly what TARGET LEGO to produce!\n');

  // Write report
  const report = {
    status: 'PASS',
    timestamp: new Date().toISOString(),
    input_file: legoPairsPath,
    total_legos: totalLegos,
    unique_known_legos: collisionMap.size,
    violations: []
  };

  const reportFile = legoPairsPath.replace('.json', '_fd_report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved: ${reportFile}`);

  process.exit(0);
} else {
  console.log(`❌ FAIL: ${violations.length} LEGO FD violation(s) detected\n`);
  console.log(`   🚨 LEARNER UNCERTAINTY DETECTED!\n`);

  violations.forEach((v, idx) => {
    console.log(`${idx + 1}. KNOWN LEGO: "${v.known}"`);
    console.log(`   Maps to ${v.mappings.length} different TARGETs:\n`);

    v.mappings.forEach(m => {
      console.log(`   → TARGET: "${m.target}"`);
      m.legos.forEach(lego => {
        console.log(`      ${lego.seed_id} ${lego.lego_id} (${lego.type})`);
      });
      console.log();
    });

    console.log(`   ⚠️  When learner hears "${v.known}", which TARGET should they produce?`);
    console.log(`       This creates AMBIGUITY and violates zero-variation pedagogy!\n`);
  });

  console.log('⚠️  ACTION REQUIRED:');
  console.log('   Review violations and either:');
  console.log('   1. Modify LEGO pairs to use different wording');
  console.log('   2. Add disambiguating context to KNOWN LEGOs');
  console.log('   3. Consolidate duplicate/conflicting LEGOs');
  console.log('   4. Ensure consistent translation choices across all seeds\n');

  // Write detailed report
  const report = {
    status: 'FAIL',
    timestamp: new Date().toISOString(),
    input_file: legoPairsPath,
    total_legos: totalLegos,
    unique_known_legos: collisionMap.size,
    violation_count: violations.length,
    violations: violations
  };

  const reportFile = legoPairsPath.replace('.json', '_fd_report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved: ${reportFile}\n`);

  process.exit(1);
}
