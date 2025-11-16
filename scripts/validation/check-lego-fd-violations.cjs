#!/usr/bin/env node

/**
 * Phase 3 LEGO Registry Collision Checker
 *
 * Validates LEGO registry integrity where KNOWN acts as unique lookup key.
 *
 * THE REGISTRY CONSTRAINT:
 * - KNOWN field acts as lookup key in LEGO registry
 * - One key → one value (one-to-one mapping)
 * - Duplicate keys → collision → breaks the system
 *
 * EXAMPLE COLLISION:
 * ❌ S0042L05: { target: "你是对的", known: "you are correct" }
 * ❌ S0087L12: { target: "你们是对的", known: "you are correct" } ← COLLISION!
 *
 * When learner hears "you are correct", which target? Ambiguous!
 *
 * EXAMPLE FIX:
 * ✅ S0042L05: { target: "你是对的", known: "you are correct" }
 * ✅ S0087L12: { target: "你们是对的", known: "you are all correct" } ← Distinct!
 *
 * REMEDIATION: Re-extract affected seeds with instruction to disambiguate
 * KNOWN phrases (e.g., "you are correct" vs "you are all correct")
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

console.log('🔍 Phase 3: LEGO Registry Collision Check\n');
console.log(`   Validating: KNOWN field uniqueness (one key → one value)\n`);
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
  console.log('✅ PASS: No registry collisions detected\n');
  console.log(`   Total unique KNOWN keys: ${collisionMap.size}`);
  console.log(`   Total LEGOs: ${totalLegos}`);
  console.log(`   All KNOWN keys map to exactly one TARGET value\n`);
  console.log('   🗂️  LEGO registry integrity maintained!');
  console.log('      One key → One value (one-to-one mapping)\n');

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
  console.log(`❌ FAIL: ${violations.length} registry collision(s) detected\n`);
  console.log(`   🚨 REGISTRY INTEGRITY VIOLATED!\n`);

  violations.forEach((v, idx) => {
    console.log(`${idx + 1}. COLLISION KEY: "${v.known}"`);
    console.log(`   ❌ One key → Multiple values (registry collision)\n`);

    v.mappings.forEach(m => {
      console.log(`   → TARGET: "${m.target}"`);
      m.legos.forEach(lego => {
        console.log(`      ${lego.seed_id} ${lego.lego_id} (${lego.type})`);
      });
      console.log();
    });

    console.log(`   ⚠️  Registry lookup ambiguity: "${v.known}" → Which TARGET?`);
    console.log(`       Violates one-to-one mapping constraint!\n`);
  });

  // Generate re-extraction manifest for affected seeds
  const affectedSeeds = new Set();
  violations.forEach(v => {
    v.mappings.forEach(m => {
      m.legos.forEach(lego => {
        affectedSeeds.add(lego.seed_id);
      });
    });
  });

  const reExtractionManifest = {
    reason: 'FD_VIOLATIONS',
    affected_seeds: Array.from(affectedSeeds).sort(),
    violations_by_seed: {}
  };

  // Group violations by seed for detailed instructions
  affectedSeeds.forEach(seedId => {
    const seedViolations = violations.filter(v =>
      v.mappings.some(m => m.legos.some(lego => lego.seed_id === seedId))
    );

    reExtractionManifest.violations_by_seed[seedId] = seedViolations.map(v => ({
      collision_key: v.known,
      conflicting_targets: v.mappings.map(m => m.target),
      instruction: `Registry collision: KNOWN key "${v.known}" maps to multiple TARGET values. When re-extracting, disambiguate the KNOWN phrase to create distinct keys (e.g., "you are correct" vs "you are all correct").`
    }));
  });

  const manifestPath = legoPairsPath.replace('.json', '_reextraction_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(reExtractionManifest, null, 2));

  console.log('⚠️  ACTION REQUIRED:');
  console.log(`   ${affectedSeeds.size} seeds need Phase 3 re-extraction`);
  console.log(`   📋 Re-extraction manifest: ${manifestPath}\n`);
  console.log('   REMEDIATION STRATEGY:');
  console.log('   1. Re-run Phase 3 for affected seeds only');
  console.log('   2. Include collision details in the master prompt');
  console.log('   3. Instruct Claude to disambiguate KNOWN phrases');
  console.log('      (e.g., "you are correct" → "you are all correct")');
  console.log('   4. Ensure each KNOWN key maps to exactly one TARGET value\n');

  // Write detailed report
  const report = {
    status: 'FAIL',
    timestamp: new Date().toISOString(),
    input_file: legoPairsPath,
    total_legos: totalLegos,
    unique_known_legos: collisionMap.size,
    violation_count: violations.length,
    affected_seeds_count: affectedSeeds.size,
    violations: violations,
    reextraction_manifest: reExtractionManifest
  };

  const reportFile = legoPairsPath.replace('.json', '_fd_report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved: ${reportFile}\n`);

  process.exit(1);
}
