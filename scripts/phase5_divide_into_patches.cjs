#!/usr/bin/env node

/**
 * Phase 5: Divide Course into 12 Master Agent Patches
 *
 * Simple division: 668 seeds ÷ 12 = ~56 seeds per patch
 * Each master agent owns a patch and handles ALL missing LEGOs in their range.
 *
 * Usage: node scripts/phase5_divide_into_patches.cjs <course_code>
 * Example: node scripts/phase5_divide_into_patches.cjs cmn_for_eng
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'cmn_for_eng';
const coursePath = path.join(__dirname, '..', 'public', 'vfs', 'courses', courseCode);
const missingBasketsPath = path.join(coursePath, 'phase5_missing_baskets_new_only.json');

if (!fs.existsSync(missingBasketsPath)) {
  console.error(`❌ Missing baskets file not found: ${missingBasketsPath}`);
  console.error('Run: node scripts/detect_missing_baskets_new_only.cjs <course_code>');
  process.exit(1);
}

const missingData = JSON.parse(fs.readFileSync(missingBasketsPath, 'utf8'));
const allMissingLegos = missingData.missing_baskets;

console.log('📊 Phase 5 Patch Division');
console.log('═'.repeat(60));
console.log();
console.log(`Course: ${courseCode}`);
console.log(`Total missing LEGOs: ${allMissingLegos.length}`);
console.log(`Master agents: 12`);
console.log();

// Divide 668 seeds into 12 patches (~56 seeds each)
const TOTAL_SEEDS = 668;
const NUM_MASTERS = 12;
const SEEDS_PER_PATCH = Math.ceil(TOTAL_SEEDS / NUM_MASTERS);

const patches = [];

for (let i = 0; i < NUM_MASTERS; i++) {
  const startSeed = i * SEEDS_PER_PATCH + 1;
  const endSeed = Math.min((i + 1) * SEEDS_PER_PATCH, TOTAL_SEEDS);

  // Filter missing LEGOs for this patch
  const patchLegos = allMissingLegos.filter(lego => {
    const seedNum = parseInt(lego.seedId.substring(1));
    return seedNum >= startSeed && seedNum <= endSeed;
  });

  patches.push({
    patch_id: i + 1,
    start_seed: `S${String(startSeed).padStart(4, '0')}`,
    end_seed: `S${String(endSeed).padStart(4, '0')}`,
    seed_count: endSeed - startSeed + 1,
    missing_legos: patchLegos.length,
    lego_ids: patchLegos.map(l => l.legoId)
  });
}

// Print summary
console.log('Patch Division:');
console.log();

patches.forEach(patch => {
  console.log(`Patch ${patch.patch_id}: ${patch.start_seed}-${patch.end_seed} (${patch.seed_count} seeds)`);
  console.log(`  Missing LEGOs: ${patch.missing_legos}`);
  console.log();
});

// Save patch manifest
const outputPath = path.join(coursePath, 'phase5_patch_manifest.json');
fs.writeFileSync(outputPath, JSON.stringify({
  course: courseCode,
  timestamp: new Date().toISOString(),
  total_seeds: TOTAL_SEEDS,
  num_masters: NUM_MASTERS,
  total_missing_legos: allMissingLegos.length,
  patches: patches
}, null, 2));

console.log('═'.repeat(60));
console.log(`✅ Saved patch manifest: ${outputPath}`);
console.log();
console.log('Next step: Launch 12 master agents (one per patch)');
console.log();
