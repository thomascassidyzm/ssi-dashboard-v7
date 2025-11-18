#!/usr/bin/env node

/**
 * Delete Baskets for Colliding LEGOs (FCFS - Keep First, Delete Rest)
 *
 * When registry collisions are detected, we use FCFS (First-Come-First-Served):
 * - KEEP the FIRST LEGO with a given KNOWN phrase
 * - DELETE baskets for all SUBSEQUENT LEGOs with the same KNOWN phrase
 * - These will be re-extracted with chunking-up to avoid collision
 *
 * Example:
 * - "to practise speaking" → "practicar hablar" (S0005L03) ← KEEP (first)
 * - "to practise speaking" → "practicar hablar" (S0206L04) ← DELETE (duplicate)
 * - "to practise speaking" → "de practicar hablar" (S0206L03) ← DELETE (collision)
 *
 * USAGE:
 * node delete-colliding-baskets.cjs <course_code>
 *
 * INPUTS:
 * - lego_pairs_fd_report.json (has exact LEGO IDs with collision info)
 * - lego_baskets.json (baskets keyed by LEGO ID)
 *
 * OUTPUTS:
 * - lego_baskets.json (modified - baskets for subsequent/colliding LEGOs removed)
 * - deleted_baskets_backup.json (backup of deleted baskets)
 * - basket_deletion_report.json (FCFS decisions documented)
 */

const fs = require('fs');
const path = require('path');

// Get course code from command line
const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Error: Course code required');
  console.error('Usage: node delete-colliding-baskets.cjs <course_code>');
  console.error('Example: node delete-colliding-baskets.cjs spa_for_eng');
  process.exit(1);
}

// Paths
const VFS_ROOT = path.join(__dirname, '../../public/vfs/courses');
const coursePath = path.join(VFS_ROOT, courseCode);

const fdReportPath = path.join(coursePath, 'lego_pairs_fd_report.json');
const basketsPath = path.join(coursePath, 'lego_baskets.json');

// Validate inputs
if (!fs.existsSync(fdReportPath)) {
  console.error(`❌ Error: FD report not found: ${fdReportPath}`);
  console.error('   Run check-lego-fd-violations.cjs first to detect collisions.');
  process.exit(1);
}

if (!fs.existsSync(basketsPath)) {
  console.log('⚠️  Warning: lego_baskets.json not found.');
  console.log('   Phase 5 has not yet run. No baskets to delete.');
  console.log('   After Phase 3 re-extraction, proceed directly to Phase 5.\n');
  process.exit(0);
}

console.log('🗑️  Basket Deletion for Colliding LEGOs (FCFS Rule)\n');
console.log(`   Course: ${courseCode}\n`);

// Load data
const fdReport = JSON.parse(fs.readFileSync(fdReportPath, 'utf8'));
const baskets = JSON.parse(fs.readFileSync(basketsPath, 'utf8'));

console.log(`   Total collisions detected: ${fdReport.violation_count}`);
console.log(`   Total baskets before deletion: ${Object.keys(baskets.baskets).length}\n`);

// Process violations with FCFS logic
const legosToDelete = new Set();
const legosToKeep = new Set();
const fcfsDecisions = [];

fdReport.violations.forEach(violation => {
  const collisionKey = violation.known;

  // Flatten all LEGOs involved in this collision
  const allLegosForKey = [];
  violation.mappings.forEach(mapping => {
    mapping.legos.forEach(lego => {
      allLegosForKey.push({
        lego_id: lego.lego_id,
        seed_id: lego.seed_id,
        target: mapping.target,
        type: lego.type
      });
    });
  });

  // FCFS: Keep first, delete rest
  const firstLego = allLegosForKey[0];
  const subsequentLegos = allLegosForKey.slice(1);

  legosToKeep.add(firstLego.lego_id);

  subsequentLegos.forEach(lego => {
    legosToDelete.add(lego.lego_id);
  });

  fcfsDecisions.push({
    collision_key: collisionKey,
    kept_lego: {
      lego_id: firstLego.lego_id,
      seed_id: firstLego.seed_id,
      target: firstLego.target,
      reason: 'FCFS - First occurrence'
    },
    deleted_legos: subsequentLegos.map(lego => ({
      lego_id: lego.lego_id,
      seed_id: lego.seed_id,
      target: lego.target,
      reason: 'FCFS - Subsequent occurrence (will be re-extracted with chunking-up)'
    }))
  });
});

console.log(`   LEGOs to KEEP (first occurrence): ${legosToKeep.size}`);
console.log(`   LEGOs to DELETE (subsequent): ${legosToDelete.size}\n`);

if (legosToDelete.size === 0) {
  console.log('✅ No baskets to delete.');
  console.log('   This means either:');
  console.log('   - No collisions were found, OR');
  console.log('   - All collisions are first occurrences (no duplicates)\n');
  process.exit(0);
}

// Backup baskets that will be deleted
const deletedBaskets = {};
const deletionDetails = [];

legosToDelete.forEach(legoId => {
  if (baskets.baskets[legoId]) {
    deletedBaskets[legoId] = baskets.baskets[legoId];

    // Extract seed ID from LEGO ID
    const seedId = legoId.match(/^(S\d{4})/)?.[1];

    deletionDetails.push({
      lego_id: legoId,
      seed_id: seedId,
      basket_size_kb: Math.round(JSON.stringify(baskets.baskets[legoId]).length / 1024),
      reason: 'FCFS subsequent occurrence - will be re-extracted with chunking-up'
    });
  }
});

if (Object.keys(deletedBaskets).length === 0) {
  console.log('⚠️  No baskets found for LEGOs marked for deletion.');
  console.log('   Baskets may not have been generated for these LEGOs yet.\n');
  process.exit(0);
}

// Save backup
const backupPath = path.join(coursePath, 'deleted_baskets_backup.json');
fs.writeFileSync(backupPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  course_code: courseCode,
  reason: 'FCFS deletion of subsequent collision occurrences',
  fcfs_decisions: fcfsDecisions,
  baskets: deletedBaskets
}, null, 2));

console.log(`📦 Backup saved: ${backupPath}`);
console.log(`   Backed up ${Object.keys(deletedBaskets).length} baskets\n`);

// Delete baskets from lego_baskets.json
legosToDelete.forEach(legoId => {
  delete baskets.baskets[legoId];
});

// Update metadata
baskets.total_baskets = Object.keys(baskets.baskets).length;
baskets.last_modified = new Date().toISOString();
baskets.modification_reason = 'FCFS deletion: Removed baskets for subsequent collision occurrences';

// Save modified baskets
fs.writeFileSync(basketsPath, JSON.stringify(baskets, null, 2));

console.log(`✅ Deleted ${deletionDetails.length} baskets from lego_baskets.json`);
console.log(`   Kept ${legosToKeep.size} first-occurrence baskets`);
console.log(`   Remaining baskets: ${baskets.total_baskets}\n`);

// Generate deletion report
const report = {
  timestamp: new Date().toISOString(),
  course_code: courseCode,
  fcfs_rule: 'Keep first LEGO occurrence, delete subsequent collisions',
  collision_count: fdReport.violation_count,
  kept_legos_count: legosToKeep.size,
  deleted_baskets_count: deletionDetails.length,
  remaining_baskets_count: baskets.total_baskets,
  fcfs_decisions: fcfsDecisions,
  deletion_details: deletionDetails,
  next_steps: [
    '1. Re-run Phase 3 ONLY for seeds with deleted LEGOs (subsequent occurrences)',
    '2. In re-extraction, instruct: chunk UP these LEGOs to avoid collision',
    '3. Run deduplication (Phase 3.5)',
    '4. Validate no collisions remain (Phase 3.6)',
    '5. Re-run Phase 5 ONLY for re-extracted LEGOs to generate new baskets',
    '6. New baskets will use chunked-up LEGOs (no more collisions with FCFS winners)'
  ]
};

const reportPath = path.join(coursePath, 'basket_deletion_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`📄 Deletion report saved: ${reportPath}\n`);

// Summary
console.log('📋 SUMMARY (FCFS):');
console.log(`   Total baskets before: ${deletionDetails.length + baskets.total_baskets}`);
console.log(`   Baskets kept (first occurrence): ${legosToKeep.size}`);
console.log(`   Baskets deleted (subsequent): ${deletionDetails.length}`);
console.log(`   Baskets remaining: ${baskets.total_baskets}\n`);

console.log('✅ FCFS basket deletion complete!');
console.log('   First occurrences preserved.');
console.log('   Subsequent occurrences ready for chunking-up re-extraction.\n');
