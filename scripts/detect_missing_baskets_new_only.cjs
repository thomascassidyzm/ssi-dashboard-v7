#!/usr/bin/env node

/**
 * Detect Missing Phase 5 Baskets (new: true LEGOs only)
 *
 * CORRECT Logic:
 * - new: true = First appearance → NEEDS basket
 * - new: false = Recycled → Already HAS basket from first appearance
 *
 * This script:
 * 1. Reads lego_pairs.json
 * 2. Finds all LEGOs where new: true
 * 3. Checks if those LEGOs have baskets in phase5_outputs
 * 4. Reports only genuinely missing baskets
 *
 * Usage:
 *   node scripts/detect_missing_baskets_new_only.cjs <course_code>
 *
 * Example:
 *   node scripts/detect_missing_baskets_new_only.cjs cmn_for_eng
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const courseCode = process.argv[2];

if (!courseCode) {
  console.error('Usage: node scripts/detect_missing_baskets_new_only.cjs <course_code>');
  console.error('Example: node scripts/detect_missing_baskets_new_only.cjs cmn_for_eng');
  process.exit(1);
}

const coursePath = path.join(__dirname, '..', 'public', 'vfs', 'courses', courseCode);
const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
const phase5OutputsDir = path.join(coursePath, 'phase5_outputs');

// Validate paths
if (!fs.existsSync(legoPairsPath)) {
  console.error(`❌ lego_pairs.json not found: ${legoPairsPath}`);
  process.exit(1);
}

if (!fs.existsSync(phase5OutputsDir)) {
  console.error(`❌ phase5_outputs directory not found: ${phase5OutputsDir}`);
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('PHASE 5 MISSING BASKETS DETECTION (new: true only)');
console.log('═══════════════════════════════════════════════════════════');
console.log();
console.log(`Course: ${courseCode}`);
console.log();

// ============================================================================
// STEP 1: Load lego_pairs.json and find all new: true LEGOs
// ============================================================================

console.log('Step 1: Loading lego_pairs.json...');

const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
const newLegos = new Map(); // Map<legoId, {seedId, known, target}>

let totalLegos = 0;
let newLegoCount = 0;
let recycledLegoCount = 0;

legoPairs.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    totalLegos++;

    if (lego.new === true) {
      newLegoCount++;
      newLegos.set(lego.id, {
        seedId: seed.seed_id,
        known: lego.known,
        target: lego.target,
        type: lego.type || 'unknown'
      });
    } else {
      recycledLegoCount++;
    }
  });
});

console.log(`  Total LEGOs in course: ${totalLegos}`);
console.log(`  new: true (need baskets): ${newLegoCount}`);
console.log(`  new: false (recycled, already have baskets): ${recycledLegoCount}`);
console.log();

// ============================================================================
// STEP 2: Check which new: true LEGOs have baskets
// ============================================================================

console.log('Step 2: Checking for existing baskets...');

const basketFiles = fs.readdirSync(phase5OutputsDir)
  .filter(f => f.match(/^seed_S\d{4}_baskets\.json$/))
  .sort();

const legosWithBaskets = new Set();

basketFiles.forEach(filename => {
  const basketPath = path.join(phase5OutputsDir, filename);
  const basketData = JSON.parse(fs.readFileSync(basketPath, 'utf8'));

  Object.keys(basketData).forEach(legoId => {
    legosWithBaskets.add(legoId);
  });
});

console.log(`  Found ${basketFiles.length} basket files`);
console.log(`  Containing ${legosWithBaskets.size} LEGOs with baskets`);
console.log();

// ============================================================================
// STEP 3: Find missing baskets (new: true LEGOs without baskets)
// ============================================================================

console.log('Step 3: Identifying missing baskets...');

const missingBaskets = [];
const seedsAffected = new Set();

newLegos.forEach((legoInfo, legoId) => {
  if (!legosWithBaskets.has(legoId)) {
    missingBaskets.push({
      legoId,
      seedId: legoInfo.seedId,
      known: legoInfo.known,
      target: legoInfo.target,
      type: legoInfo.type
    });
    seedsAffected.add(legoInfo.seedId);
  }
});

// Sort by seed ID, then by LEGO ID
missingBaskets.sort((a, b) => {
  if (a.seedId !== b.seedId) {
    return a.seedId.localeCompare(b.seedId);
  }
  return a.legoId.localeCompare(b.legoId);
});

console.log();
console.log('═══════════════════════════════════════════════════════════');
console.log('RESULTS');
console.log('═══════════════════════════════════════════════════════════');
console.log();
console.log(`Total new: true LEGOs:           ${newLegoCount}`);
console.log(`LEGOs with baskets:              ${newLegoCount - missingBaskets.length}`);
console.log(`Missing baskets:                 ${missingBaskets.length}`);
console.log(`Seeds affected:                  ${seedsAffected.size}`);
console.log();

if (missingBaskets.length === 0) {
  console.log('✅ All new: true LEGOs have baskets!');
  console.log();
  process.exit(0);
}

// ============================================================================
// STEP 4: Group by seed and show details
// ============================================================================

console.log('Missing baskets by seed:');
console.log();

const bySeed = {};
missingBaskets.forEach(item => {
  if (!bySeed[item.seedId]) {
    bySeed[item.seedId] = [];
  }
  bySeed[item.seedId].push(item);
});

Object.entries(bySeed).forEach(([seedId, items]) => {
  console.log(`  ${seedId}: ${items.length} missing LEGO${items.length > 1 ? 's' : ''}`);
  items.forEach(item => {
    console.log(`    ${item.legoId}: "${item.known}" → "${item.target}"`);
  });
  console.log();
});

// ============================================================================
// STEP 5: Save structured output
// ============================================================================

const output = {
  course: courseCode,
  timestamp: new Date().toISOString(),
  summary: {
    total_new_legos: newLegoCount,
    legos_with_baskets: newLegoCount - missingBaskets.length,
    missing_baskets: missingBaskets.length,
    seeds_affected: seedsAffected.size
  },
  missing_baskets: missingBaskets,
  seeds_affected: Array.from(seedsAffected).sort()
};

const outputPath = path.join(coursePath, 'phase5_missing_baskets_new_only.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log('═══════════════════════════════════════════════════════════');
console.log(`📄 Saved detailed report: ${outputPath}`);
console.log('═══════════════════════════════════════════════════════════');
console.log();

if (missingBaskets.length > 0) {
  console.log('Next steps:');
  console.log('  1. Generate scaffolds for missing LEGOs');
  console.log('  2. Run Phase 5 basket generation');
  console.log('  3. Validate with GATE/LUT/Grammar validators');
  console.log();
}
