#!/usr/bin/env node

/**
 * Generate Phase 3 Re-extraction Manifest with Collision Avoidance
 *
 * Instead of programmatic upchunking, leverage Claude's understanding:
 * 1. Identify seeds containing subsequent collisions (FCFS: keep first, re-extract rest)
 * 2. Generate re-extraction manifest with collision avoidance instructions
 * 3. Phase 3 will re-extract these seeds with explicit instruction to AVOID
 *    extracting the colliding phrases as standalone LEGOs
 *
 * Example instruction for S0206 (subsequent collision on "to practise speaking"):
 *   "DO NOT extract 'to practise speaking' as a standalone LEGO.
 *    It collides with S0005L03. Instead, chunk it with adjacent context:
 *    e.g., 'chance to practise speaking' or 'to practise speaking with others'"
 *
 * USAGE:
 * node generate-collision-aware-reextraction.cjs <course_code>
 *
 * INPUTS:
 * - lego_pairs_fd_report.json (collision details with LEGO IDs)
 * - seed_pairs.json (original sentences for re-extraction)
 *
 * OUTPUTS:
 * - phase3_collision_reextraction_manifest.json (seeds + avoidance instructions)
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Error: Course code required');
  console.error('Usage: node generate-collision-aware-reextraction.cjs <course_code>');
  console.error('Example: node generate-collision-aware-reextraction.cjs spa_for_eng');
  process.exit(1);
}

const VFS_ROOT = path.join(__dirname, '../../public/vfs/courses');
const coursePath = path.join(VFS_ROOT, courseCode);

const fdReportPath = path.join(coursePath, 'lego_pairs_fd_report.json');
const seedPairsPath = path.join(coursePath, 'seed_pairs.json');

// Validate inputs
if (!fs.existsSync(fdReportPath)) {
  console.error(`❌ Error: FD report not found: ${fdReportPath}`);
  console.error('   Run check-lego-fd-violations.cjs first.');
  process.exit(1);
}

if (!fs.existsSync(seedPairsPath)) {
  console.error(`❌ Error: seed_pairs.json not found`);
  process.exit(1);
}

console.log('📋 Generating Collision-Aware Re-extraction Manifest\n');
console.log(`   Course: ${courseCode}\n`);

// Load data
const fdReport = JSON.parse(fs.readFileSync(fdReportPath, 'utf8'));
const seedPairs = JSON.parse(fs.readFileSync(seedPairsPath, 'utf8'));

// Build seed map
const seedMap = new Map();
if (seedPairs.translations) {
  Object.entries(seedPairs.translations).forEach(([seedId, [known, target]]) => {
    seedMap.set(seedId, { seed_id: seedId, known, target });
  });
}

// Track which seeds need re-extraction and why
const seedReextractionMap = new Map();

console.log('🔍 Processing collisions with FCFS rule...\n');

fdReport.violations.forEach(violation => {
  const collisionKey = violation.known;

  // Get all LEGOs involved in this collision
  const allLegos = [];
  violation.mappings.forEach(mapping => {
    mapping.legos.forEach(lego => {
      allLegos.push({
        lego_id: lego.lego_id,
        seed_id: lego.seed_id,
        target: mapping.target,
        known: collisionKey
      });
    });
  });

  // FCFS: First is kept, rest need re-extraction
  const firstLego = allLegos[0];
  const subsequentLegos = allLegos.slice(1);

  console.log(`Collision: "${collisionKey}"`);
  console.log(`  KEEP: ${firstLego.seed_id} (${firstLego.lego_id})`);
  console.log(`  RE-EXTRACT: ${subsequentLegos.map(l => l.seed_id).join(', ')}\n`);

  // Add subsequent seeds to re-extraction list
  subsequentLegos.forEach(lego => {
    if (!seedReextractionMap.has(lego.seed_id)) {
      const seed = seedMap.get(lego.seed_id);
      if (seed) {
        seedReextractionMap.set(lego.seed_id, {
          seed_id: lego.seed_id,
          known: seed.known,
          target: seed.target,
          avoid_phrases: []
        });
      }
    }

    // Add collision phrase to avoidance list for this seed
    const seedReextraction = seedReextractionMap.get(lego.seed_id);
    if (seedReextraction) {
      seedReextraction.avoid_phrases.push({
        phrase: collisionKey,
        lego_id: lego.lego_id,
        reason: `Collides with ${firstLego.seed_id}:${firstLego.lego_id}`,
        fcfs_winner: {
          seed_id: firstLego.seed_id,
          lego_id: firstLego.lego_id,
          target: firstLego.target
        }
      });
    }
  });
});

// Generate re-extraction manifest
const reextractionSeeds = Array.from(seedReextractionMap.values()).map(seed => ({
  seed_id: seed.seed_id,
  known: seed.known,
  target: seed.target,
  collision_avoidance_instructions: seed.avoid_phrases.map(avoid =>
    `DO NOT extract "${avoid.phrase}" as standalone LEGO (${avoid.lego_id}). ` +
    `Reason: Registry collision with ${avoid.fcfs_winner.seed_id}:${avoid.fcfs_winner.lego_id} ("${avoid.fcfs_winner.target}"). ` +
    `Solution: Chunk "${avoid.phrase}" UP with adjacent words from this sentence to create a larger, unique LEGO. ` +
    `Use ONLY words from the source sentence - do not add new words.`
  ).join('\n')
}));

const manifest = {
  timestamp: new Date().toISOString(),
  course_code: courseCode,
  reason: 'COLLISION_RESOLUTION_VIA_REEXTRACTION',
  strategy: 'FCFS + Collision-Aware Prompting',
  total_collisions: fdReport.violation_count,
  seeds_to_reextract: reextractionSeeds.length,
  seeds: reextractionSeeds,
  master_instructions: [
    'These seeds contain LEGOs that collide with earlier LEGO occurrences (FCFS rule).',
    'For each seed, specific phrases are marked for COLLISION AVOIDANCE.',
    'When extracting LEGOs:',
    '  1. DO NOT extract the listed phrases as standalone LEGOs',
    '  2. Instead, CHUNK UP by including adjacent words from the sentence',
    '  3. Use ONLY words present in the source sentence',
    '  4. Expand boundaries until the phrase becomes unique (no collision)',
    '',
    'Example:',
    '  ❌ AVOID: "you are correct" (collides with S0042)',
    '  ✅ CHUNK UP: "I think you are correct" (unique, no collision)',
    '',
    'The goal: Create LEGOs that preserve meaning while ensuring registry uniqueness.'
  ].join('\n')
};

// Save manifest
const manifestPath = path.join(coursePath, 'phase3_collision_reextraction_manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`\n📊 SUMMARY:`);
console.log(`   Total collisions: ${fdReport.violation_count}`);
console.log(`   Seeds requiring re-extraction: ${reextractionSeeds.length}`);
console.log(`   Manifest saved: ${manifestPath}\n`);

console.log('✅ Re-extraction manifest generated!');
console.log('\n📝 Next steps:');
console.log('   1. Review manifest (especially collision_avoidance_instructions)');
console.log('   2. Send to Phase 3 agent with manifest as context');
console.log('   3. Phase 3 will re-extract with collision awareness');
console.log('   4. Run deduplication (Phase 3.5)');
console.log('   5. Re-validate (should have 0 collisions)\n');

// Also generate a seed IDs list for easy Phase 3 triggering
const seedIdsList = reextractionSeeds.map(s => s.seed_id).sort();
const seedIdsPath = path.join(coursePath, 'collision_reextraction_seed_ids.txt');
fs.writeFileSync(seedIdsPath, seedIdsList.join('\n'));

console.log(`📄 Seed IDs list saved: ${seedIdsPath}`);
console.log(`   (${seedIdsList.length} seeds)\n`);
