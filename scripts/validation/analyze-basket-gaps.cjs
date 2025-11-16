#!/usr/bin/env node

/**
 * Basket Gap Analyzer
 *
 * After LUT violations are fixed and LEGOs re-extracted, this script:
 * 1. Identifies which LEGO_IDs have baskets (existing)
 * 2. Identifies which LEGO_IDs need baskets (missing)
 * 3. Identifies which baskets reference deprecated LEGOs (need deletion)
 * 4. Generates Phase 5 regeneration manifest
 *
 * USAGE:
 * node analyze-basket-gaps.cjs <course_code>
 *
 * INPUTS:
 * - lego_pairs.json (current/updated registry)
 * - lego_baskets.json (existing baskets)
 * - lego_pairs_fd_report.json (collision report - optional)
 *
 * OUTPUTS:
 * - basket_gaps_report.json
 */

const fs = require('fs');
const path = require('path');

// Get course code from command line
const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Error: Course code required');
  console.error('Usage: node analyze-basket-gaps.cjs <course_code>');
  console.error('Example: node analyze-basket-gaps.cjs spa_for_eng');
  process.exit(1);
}

// Paths
const VFS_ROOT = path.join(__dirname, '../../public/vfs/courses');
const coursePath = path.join(VFS_ROOT, courseCode);
const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
const basketsPath = path.join(coursePath, 'lego_baskets.json');
const collisionReportPath = path.join(coursePath, 'lego_pairs_fd_report.json');

// Validate inputs
if (!fs.existsSync(legoPairsPath)) {
  console.error(`❌ Error: lego_pairs.json not found: ${legoPairsPath}`);
  process.exit(1);
}

console.log('🔍 Basket Gap Analysis\n');
console.log(`   Course: ${courseCode}`);
console.log(`   Analyzing LEGO → Basket coverage\n`);

// Load lego_pairs.json
const legoPairsData = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Extract all LEGO_IDs from lego_pairs.json
const allLegoIds = new Set();
if (legoPairsData.seeds && Array.isArray(legoPairsData.seeds)) {
  legoPairsData.seeds.forEach(seed => {
    if (seed.legos && Array.isArray(seed.legos)) {
      seed.legos.forEach(lego => {
        if (lego.id) {
          allLegoIds.add(lego.id);
        }
      });
    }
  });
}

console.log(`   Total LEGOs in lego_pairs.json: ${allLegoIds.size}\n`);

// Load lego_baskets.json (if exists)
let existingBaskets = new Set();
let basketsData = null;

if (fs.existsSync(basketsPath)) {
  basketsData = JSON.parse(fs.readFileSync(basketsPath, 'utf8'));

  if (basketsData.baskets && typeof basketsData.baskets === 'object') {
    // baskets is an object with LEGO_ID keys
    existingBaskets = new Set(Object.keys(basketsData.baskets));
  }

  console.log(`   Existing baskets: ${existingBaskets.size}\n`);
} else {
  console.log('   ⚠️  No lego_baskets.json found - all LEGOs need baskets\n');
}

// Load collision report (if exists) to identify deprecated LEGOs
let deprecatedLegoIds = new Set();

if (fs.existsSync(collisionReportPath)) {
  const collisionReport = JSON.parse(fs.readFileSync(collisionReportPath, 'utf8'));

  if (collisionReport.status === 'FAIL' && collisionReport.violations) {
    // Extract all LEGO_IDs from collisions (except first instance - the "debut")
    collisionReport.violations.forEach(violation => {
      violation.mappings.forEach((mapping, idx) => {
        if (idx > 0) {
          // Skip first mapping (debut), mark rest as deprecated
          mapping.legos.forEach(lego => {
            deprecatedLegoIds.add(lego.lego_id);
          });
        }
      });
    });
  }

  console.log(`   Deprecated LEGOs (from collisions): ${deprecatedLegoIds.size}\n`);
}

// Analysis
const missingBaskets = [];
const basketsToDelete = [];
const basketsToKeep = [];

// 1. Find LEGOs that need baskets (missing)
allLegoIds.forEach(legoId => {
  if (!existingBaskets.has(legoId)) {
    missingBaskets.push(legoId);
  }
});

// 2. Find baskets that reference deprecated LEGOs (need deletion)
// 3. Find baskets for current LEGOs (keep)
existingBaskets.forEach(legoId => {
  if (deprecatedLegoIds.has(legoId)) {
    basketsToDelete.push(legoId);
  } else if (allLegoIds.has(legoId)) {
    basketsToKeep.push(legoId);
  } else {
    // Basket exists but LEGO doesn't - orphaned basket
    basketsToDelete.push(legoId);
  }
});

// Sort for readability
missingBaskets.sort();
basketsToDelete.sort();
basketsToKeep.sort();

// Calculate stats
const totalLegoCount = allLegoIds.size;
const coveragePercentage = totalLegoCount > 0
  ? Math.round((basketsToKeep.length / totalLegoCount) * 100)
  : 0;

// Generate manifest
const manifest = {
  course_code: courseCode,
  timestamp: new Date().toISOString(),
  total_legos: totalLegoCount,
  existing_baskets: existingBaskets.size,
  coverage_percentage: coveragePercentage,
  analysis: {
    baskets_to_keep: basketsToKeep.length,
    baskets_to_delete: basketsToDelete.length,
    baskets_missing: missingBaskets.length
  },
  baskets_to_keep: basketsToKeep,
  baskets_to_delete: basketsToDelete,
  baskets_missing: missingBaskets,
  deprecated_legos: Array.from(deprecatedLegoIds).sort(),
  next_steps: [
    `1. Delete ${basketsToDelete.length} deprecated/orphaned baskets`,
    `2. Generate ${missingBaskets.length} new baskets`,
    `3. Verify ${basketsToKeep.length} existing baskets remain valid`
  ]
};

// Report results
console.log('📊 BASKET GAP ANALYSIS\n');
console.log(`   Total LEGOs: ${totalLegoCount}`);
console.log(`   Baskets to keep: ${basketsToKeep.length} (${coveragePercentage}% coverage)`);
console.log(`   Baskets to delete: ${basketsToDelete.length}`);
console.log(`   Baskets missing: ${missingBaskets.length}\n`);

if (basketsToDelete.length > 0) {
  console.log('🗑️  BASKETS TO DELETE:\n');
  console.log(`   ${basketsToDelete.slice(0, 10).join(', ')}`);
  if (basketsToDelete.length > 10) {
    console.log(`   ... and ${basketsToDelete.length - 10} more\n`);
  } else {
    console.log();
  }
}

if (missingBaskets.length > 0) {
  console.log('📝 MISSING BASKETS:\n');
  console.log(`   ${missingBaskets.slice(0, 10).join(', ')}`);
  if (missingBaskets.length > 10) {
    console.log(`   ... and ${missingBaskets.length - 10} more\n`);
  } else {
    console.log();
  }
}

// Write manifest
const outputPath = path.join(coursePath, 'basket_gaps_report.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log(`📄 Report saved: ${outputPath}\n`);

// Summary
console.log('📋 NEXT ACTIONS:');
manifest.next_steps.forEach((step, idx) => {
  console.log(`   ${step}`);
});
console.log();

// Exit code based on gaps
process.exit(missingBaskets.length > 0 || basketsToDelete.length > 0 ? 1 : 0);
