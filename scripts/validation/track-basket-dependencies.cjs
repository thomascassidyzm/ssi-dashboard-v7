#!/usr/bin/env node

/**
 * Basket Dependency Tracker
 *
 * Analyzes cascade impact when LEGOs are re-extracted with chunking-up.
 * Maps affected LEGOs → Baskets to determine regeneration scope.
 *
 * USAGE:
 * node track-basket-dependencies.cjs <course_code>
 *
 * INPUTS:
 * - lego_pairs_reextraction_manifest.json (from collision detector)
 * - baskets.json (Phase 5 output)
 *
 * OUTPUTS:
 * - basket_regeneration_manifest.json
 *
 * REGENERATION STRATEGY:
 * - If affected_baskets < 30% of total → Selective regeneration
 * - If affected_baskets >= 30% of total → Full regeneration recommended
 */

const fs = require('fs');
const path = require('path');

// Get course code from command line
const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Error: Course code required');
  console.error('Usage: node track-basket-dependencies.cjs <course_code>');
  console.error('Example: node track-basket-dependencies.cjs spa_for_eng');
  process.exit(1);
}

// Determine VFS root
const VFS_ROOT = path.join(__dirname, '../../public/vfs/courses');
const coursePath = path.join(VFS_ROOT, courseCode);

// Input files - check both locations for re-extraction manifest
let reextractionManifestPath = path.join(coursePath, 'phase_3', 'lego_pairs_reextraction_manifest.json');
if (!fs.existsSync(reextractionManifestPath)) {
  // Try root course directory (where collision checker initially writes it)
  reextractionManifestPath = path.join(coursePath, 'lego_pairs_reextraction_manifest.json');
}

const basketsPath = path.join(coursePath, 'phase_5', 'baskets.json');

// Validate inputs
if (!fs.existsSync(reextractionManifestPath)) {
  console.error(`❌ Error: Re-extraction manifest not found: ${reextractionManifestPath}`);
  console.error('   Run check-lego-fd-violations.cjs first to generate collision report.');
  process.exit(1);
}

if (!fs.existsSync(basketsPath)) {
  console.log('⚠️  Warning: baskets.json not found. Phase 5 not yet run.');
  console.log('   Cascade impact analysis will be limited to LEGO-level only.\n');

  // Generate minimal manifest
  const reextractionManifest = JSON.parse(fs.readFileSync(reextractionManifestPath, 'utf8'));
  const minimalManifest = {
    course_code: courseCode,
    timestamp: new Date().toISOString(),
    baskets_status: 'NOT_YET_GENERATED',
    affected_legos_count: reextractionManifest.affected_seeds.length,
    affected_seeds: reextractionManifest.affected_seeds,
    regeneration_strategy: 'FULL',
    note: 'Phase 5 not yet run. When baskets are generated, they will automatically incorporate chunked-up LEGOs.'
  };

  const outputPath = path.join(coursePath, 'phase_5', 'basket_regeneration_manifest.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(minimalManifest, null, 2));

  console.log(`📄 Minimal manifest saved: ${outputPath}`);
  process.exit(0);
}

console.log('🔍 Basket Dependency Analysis\n');
console.log(`   Course: ${courseCode}`);
console.log(`   Analyzing cascade impact from LEGO chunking-up\n`);

// Load data
const reextractionManifest = JSON.parse(fs.readFileSync(reextractionManifestPath, 'utf8'));
const baskets = JSON.parse(fs.readFileSync(basketsPath, 'utf8'));

// Extract affected seed IDs
const affectedSeeds = new Set(reextractionManifest.affected_seeds);

console.log(`   Affected seeds: ${affectedSeeds.size}`);
console.log(`   Total baskets: ${baskets.baskets.length}\n`);

// Map baskets to affected LEGOs
const affectedBaskets = [];
let totalAffectedLegos = 0;

baskets.baskets.forEach(basket => {
  const affectedLegosInBasket = [];

  basket.legos.forEach(lego => {
    // Extract seed ID from LEGO ID (format: S0042L05)
    const seedId = lego.id.match(/^(S\d{4})/)?.[1];

    if (seedId && affectedSeeds.has(seedId)) {
      affectedLegosInBasket.push({
        lego_id: lego.id,
        seed_id: seedId,
        current_known: lego.known,
        current_target: lego.target
      });
      totalAffectedLegos++;
    }
  });

  if (affectedLegosInBasket.length > 0) {
    affectedBaskets.push({
      basket_id: basket.id,
      basket_title: basket.title,
      total_legos: basket.legos.length,
      affected_legos_count: affectedLegosInBasket.length,
      affected_legos: affectedLegosInBasket,
      impact_percentage: Math.round((affectedLegosInBasket.length / basket.legos.length) * 100)
    });
  }
});

// Sort by impact percentage (highest first)
affectedBaskets.sort((a, b) => b.impact_percentage - a.impact_percentage);

// Calculate regeneration strategy
const basketImpactPercentage = Math.round((affectedBaskets.length / baskets.baskets.length) * 100);
const regenerationStrategy = basketImpactPercentage < 30 ? 'SELECTIVE' : 'FULL';

// Generate manifest
const manifest = {
  course_code: courseCode,
  timestamp: new Date().toISOString(),
  total_baskets: baskets.baskets.length,
  affected_baskets_count: affectedBaskets.length,
  basket_impact_percentage: basketImpactPercentage,
  total_affected_legos: totalAffectedLegos,
  regeneration_strategy: regenerationStrategy,
  regeneration_rationale: regenerationStrategy === 'SELECTIVE'
    ? `Only ${basketImpactPercentage}% of baskets affected. Selective regeneration is efficient.`
    : `${basketImpactPercentage}% of baskets affected. Full regeneration recommended for cleaner rebuild.`,
  affected_baskets: affectedBaskets,
  next_steps: regenerationStrategy === 'SELECTIVE'
    ? [
        '1. Re-run Phase 3 for affected seeds with chunking-up instructions',
        '2. Run deduplication (Phase 3.5)',
        '3. Delete affected baskets from baskets.json',
        '4. Re-run Phase 5 ONLY for affected basket themes',
        '5. Merge regenerated baskets back into baskets.json',
        '6. Re-run Phase 6 for affected seeds',
        '7. Re-run Phase 8 for affected seeds'
      ]
    : [
        '1. Re-run Phase 3 for affected seeds with chunking-up instructions',
        '2. Run deduplication (Phase 3.5)',
        '3. Delete baskets.json entirely',
        '4. Re-run Phase 5 for full course',
        '5. Re-run Phase 6 for full course',
        '6. Re-run Phase 8 for full course'
      ]
};

// Report results
console.log('📊 CASCADE IMPACT ANALYSIS\n');

if (affectedBaskets.length === 0) {
  console.log('✅ No baskets affected by LEGO collisions');
  console.log('   All colliding LEGOs are in seeds not yet added to baskets\n');
} else {
  console.log(`⚠️  ${affectedBaskets.length} basket(s) contain colliding LEGOs`);
  console.log(`   (${basketImpactPercentage}% of total baskets)\n`);

  console.log('   TOP 10 MOST IMPACTED BASKETS:\n');
  affectedBaskets.slice(0, 10).forEach((basket, idx) => {
    console.log(`   ${idx + 1}. ${basket.basket_id}: "${basket.basket_title}"`);
    console.log(`      ${basket.affected_legos_count}/${basket.total_legos} LEGOs affected (${basket.impact_percentage}%)`);
    console.log(`      Sample affected LEGOs: ${basket.affected_legos.slice(0, 3).map(l => l.lego_id).join(', ')}`);
    console.log();
  });

  console.log(`🎯 RECOMMENDED STRATEGY: ${regenerationStrategy} REGENERATION\n`);
  console.log(`   ${manifest.regeneration_rationale}\n`);
}

// Write manifest
const outputPath = path.join(coursePath, 'phase_5', 'basket_regeneration_manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log(`📄 Manifest saved: ${outputPath}\n`);

// Summary
console.log('📋 SUMMARY:');
console.log(`   Total baskets: ${manifest.total_baskets}`);
console.log(`   Affected baskets: ${manifest.affected_baskets_count} (${basketImpactPercentage}%)`);
console.log(`   Total affected LEGOs: ${manifest.total_affected_legos}`);
console.log(`   Regeneration strategy: ${regenerationStrategy}\n`);

if (affectedBaskets.length > 0) {
  console.log('⚠️  ACTION REQUIRED:');
  console.log('   1. Review basket_regeneration_manifest.json');
  console.log('   2. Decide on regeneration approach (selective vs full)');
  console.log('   3. Execute remediation workflow (see PHASE5_CASCADE_IMPACT.md)\n');
}
