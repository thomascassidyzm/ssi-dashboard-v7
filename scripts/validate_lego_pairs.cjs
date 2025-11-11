#!/usr/bin/env node

/**
 * Validate lego_pairs.json quality
 *
 * Checks:
 * 1. Seed reconstruction (all seeds rebuildable from LEGOs)
 * 2. FD compliance (spot-check for ambiguous chunks)
 * 3. Complete tiling (new + ref LEGOs shown)
 * 4. Componentization (M-types have all words)
 * 5. Reference integrity (refs point to earlier seeds)
 *
 * Usage:
 *   node scripts/validate_lego_pairs.cjs <path_to_lego_pairs.json>
 */

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node validate_lego_pairs.cjs <path_to_lego_pairs.json>');
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`Error: File not found: ${inputPath}`);
  process.exit(1);
}

console.log('🔍 Validating LEGO extraction quality...');
console.log('='.repeat(60));
console.log(`File: ${path.basename(inputPath)}`);
console.log('');

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

let totalSeeds = 0;
let totalLEGOs = 0;
let newLEGOs = 0;
let refLEGOs = 0;
let atomicLEGOs = 0;
let molecularLEGOs = 0;
let errors = [];
let warnings = [];

// Track all LEGO IDs to check for duplicates
const seenIDs = new Map();
const legoRegistry = new Map(); // targetKey → first occurrence seed

console.log('📊 Running validation checks...');
console.log('');

for (const seed of data.seeds) {
  totalSeeds++;
  const seedId = seed.seed_id;
  const targetText = seed.seed_pair.target || seed.seed_pair[0]; // Handle both formats
  const knownText = seed.seed_pair.known || seed.seed_pair[1];

  // Check 1: Seed reconstruction
  const reconstructed = seed.legos.map(l => l.target).join(' ');
  const normalized = (text) => text.toLowerCase().replace(/[¿?¡!.,;:]/g, '').trim();

  if (normalized(reconstructed) !== normalized(targetText)) {
    errors.push({
      seed: seedId,
      type: 'RECONSTRUCTION_FAILED',
      message: `Seed cannot be reconstructed from LEGOs`,
      expected: targetText,
      actual: reconstructed
    });
  }

  // Process each LEGO
  let hasNew = false;
  let hasRef = false;

  for (const lego of seed.legos) {
    totalLEGOs++;

    // Check 2: Duplicate IDs
    if (seenIDs.has(lego.id)) {
      const firstSeen = seenIDs.get(lego.id);
      if (lego.new) {
        errors.push({
          seed: seedId,
          type: 'DUPLICATE_NEW_ID',
          message: `LEGO ID ${lego.id} marked "new" but already seen in ${firstSeen}`,
          lego: lego.target
        });
      }
    } else {
      seenIDs.set(lego.id, seedId);
    }

    // Check 3: New vs Reference consistency
    if (lego.new) {
      newLEGOs++;
      hasNew = true;

      // Register this LEGO
      const targetKey = lego.target.toLowerCase();
      if (legoRegistry.has(targetKey)) {
        errors.push({
          seed: seedId,
          type: 'DUPLICATE_TARGET',
          message: `LEGO "${lego.target}" marked "new" but already introduced in ${legoRegistry.get(targetKey)}`,
          id: lego.id
        });
      } else {
        legoRegistry.set(targetKey, seedId);
      }
    } else if (lego.ref) {
      refLEGOs++;
      hasRef = true;

      // Check reference points to earlier seed
      const refNum = parseInt(lego.ref.substring(1));
      const currentNum = parseInt(seedId.substring(1));

      if (refNum >= currentNum) {
        errors.push({
          seed: seedId,
          type: 'INVALID_REFERENCE',
          message: `LEGO "${lego.target}" references ${lego.ref} which is not earlier than ${seedId}`,
          id: lego.id
        });
      }

      // Check target exists in registry
      const targetKey = lego.target.toLowerCase();
      if (!legoRegistry.has(targetKey)) {
        warnings.push({
          seed: seedId,
          type: 'REFERENCE_NOT_FOUND',
          message: `LEGO "${lego.target}" references ${lego.ref} but target not in registry`,
          id: lego.id
        });
      }
    }

    // Check 4: Type classification
    if (lego.type === 'A') {
      atomicLEGOs++;
    } else if (lego.type === 'M') {
      molecularLEGOs++;

      // Check 5: M-type componentization
      if (!lego.components || lego.components.length === 0) {
        errors.push({
          seed: seedId,
          type: 'MISSING_COMPONENTS',
          message: `M-type LEGO "${lego.target}" missing components`,
          id: lego.id
        });
      } else {
        // Check all words accounted for
        const targetWords = lego.target.split(/\s+/);
        const componentWords = lego.components.map(c => c[0]).join(' ').split(/\s+/);

        if (componentWords.length < targetWords.length) {
          warnings.push({
            seed: seedId,
            type: 'INCOMPLETE_COMPONENTS',
            message: `M-type LEGO "${lego.target}" may be missing words in components (${componentWords.length}/${targetWords.length})`,
            id: lego.id
          });
        }
      }
    } else {
      errors.push({
        seed: seedId,
        type: 'INVALID_TYPE',
        message: `LEGO "${lego.target}" has invalid type "${lego.type}" (must be A or M)`,
        id: lego.id
      });
    }

    // Check 6: LEARNER UNCERTAINTY - FD compliance
    // Question: "If learner hears KNOWN, is there ANY ambiguity about TARGET?"
    // If YES → FAIL - LEGO too small, must chunk up

    const thisLegoTarget = lego.target.toLowerCase().trim();
    const thisLegoKnown = lego.known.toLowerCase().trim();

    // Check if this LEGO appears as part of OR adjacent to a larger M-type
    for (const otherLego of seed.legos) {
      if (otherLego.id === lego.id) continue;
      if (otherLego.type !== 'M') continue;

      const mTarget = otherLego.target.toLowerCase().trim();
      const mKnown = otherLego.known.toLowerCase().trim();

      // Case 1: A-type appears INSIDE M-type
      if (mTarget.includes(thisLegoTarget) && mKnown.includes(thisLegoKnown)) {
        errors.push({
          seed: seedId,
          type: 'LEARNER_UNCERTAINTY',
          message: `LEGO "${lego.known}" = "${lego.target}" creates ambiguity - it appears inside M-type "${otherLego.known}" = "${otherLego.target}". Consider extracting only the larger M-type.`,
          id: lego.id,
          conflictsWith: otherLego.id
        });
      }

      // Case 2: Check if they're adjacent in the sentence and form incomplete phrase
      // Get the full sentence to check adjacency
      const fullTarget = seed.seed_pair[0].toLowerCase();
      const fullKnown = seed.seed_pair[1].toLowerCase();

      // Are M-type and A-type consecutive in the sentence?
      const mThenA_target = fullTarget.includes(`${mTarget} ${thisLegoTarget}`);
      const mThenA_known = fullKnown.includes(`${mKnown} ${thisLegoKnown}`);
      const aThenM_target = fullTarget.includes(`${thisLegoTarget} ${mTarget}`);
      const aThenM_known = fullKnown.includes(`${thisLegoKnown} ${mKnown}`);

      if ((mThenA_target && mThenA_known) || (aThenM_target && aThenM_known)) {
        warnings.push({
          seed: seedId,
          type: 'POSSIBLE_LEARNER_UNCERTAINTY',
          message: `LEGOs "${lego.known}" and "${otherLego.known}" are adjacent in sentence. Verify they shouldn't be ONE M-type: "${mThenA_known ? mKnown + ' ' + thisLegoKnown : thisLegoKnown + ' ' + mKnown}" = "${mThenA_target ? mTarget + ' ' + thisLegoTarget : thisLegoTarget + ' ' + mTarget}"`,
          id: lego.id,
          adjacentTo: otherLego.id
        });
      }
    }
  }

  // Check 7: Complete tiling (should have both new and ref in later seeds)
  const seedNum = parseInt(seedId.substring(1));
  if (seedNum > 20 && !hasRef) {
    warnings.push({
      seed: seedId,
      type: 'NO_REFERENCES',
      message: `Seed ${seedId} has no references (unusual for mid-course seed)`,
      count: seed.legos.length
    });
  }
}

// Summary statistics
console.log('✅ Validation complete!');
console.log('');
console.log('📊 Statistics:');
console.log(`  Total seeds: ${totalSeeds}`);
console.log(`  Total LEGOs: ${totalLEGOs} (${newLEGOs} new, ${refLEGOs} ref)`);
console.log(`  Atomic: ${atomicLEGOs} (${Math.round(atomicLEGOs / totalLEGOs * 100)}%)`);
console.log(`  Molecular: ${molecularLEGOs} (${Math.round(molecularLEGOs / totalLEGOs * 100)}%)`);
console.log(`  Reuse rate: ${Math.round(refLEGOs / totalLEGOs * 100)}%`);
console.log('');

// Report errors
if (errors.length > 0) {
  console.log(`❌ ERRORS (${errors.length}):`);
  console.log('');
  for (const err of errors.slice(0, 10)) {
    console.log(`  [${err.type}] ${err.seed}: ${err.message}`);
  }
  if (errors.length > 10) {
    console.log(`  ... and ${errors.length - 10} more errors`);
  }
  console.log('');
}

// Report warnings
if (warnings.length > 0) {
  console.log(`⚠️  WARNINGS (${warnings.length}):`);
  console.log('');
  for (const warn of warnings.slice(0, 10)) {
    console.log(`  [${warn.type}] ${warn.seed}: ${warn.message}`);
  }
  if (warnings.length > 10) {
    console.log(`  ... and ${warnings.length - 10} more warnings`);
  }
  console.log('');
}

// Final verdict
if (errors.length === 0 && warnings.length === 0) {
  console.log('🎉 PERFECT! No errors or warnings found.');
  console.log('');
  console.log('Quality assessment: ✅ EXCELLENT');
  process.exit(0);
} else if (errors.length === 0) {
  console.log('✅ PASS - No critical errors, but review warnings.');
  console.log('');
  console.log('Quality assessment: ⚠️  GOOD (with minor issues)');
  process.exit(0);
} else {
  console.log('❌ FAIL - Critical errors found. Review and fix before proceeding.');
  console.log('');
  console.log('Quality assessment: ❌ NEEDS WORK');
  process.exit(1);
}
