#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Phase 3: Merge Segment LEGOs
 *
 * Combines multiple segmented course lego_pairs.json files into a single master file.
 *
 * Usage:
 *   node scripts/phase3_merge_segments.cjs <output_course_code> <segment1> <segment2> ...
 *
 * Example:
 *   node scripts/phase3_merge_segments.cjs spa_for_eng_s0001-0668 \
 *     spa_for_eng_s0001-0100 \
 *     spa_for_eng_s0101-0200 \
 *     spa_for_eng_s0201-0300 \
 *     spa_for_eng_s0301-0400 \
 *     spa_for_eng_s0401-0500 \
 *     spa_for_eng_s0501-0600 \
 *     spa_for_eng_s0601-0668
 */

console.log('🔀 Phase 3: Merging Segment LEGOs\n');

// Parse command line arguments
const outputCourseCode = process.argv[2];
const segmentCourseCodes = process.argv.slice(3);

if (!outputCourseCode || segmentCourseCodes.length === 0) {
  console.error('Usage: node phase3_merge_segments.cjs <output_course_code> <segment1> <segment2> ...');
  console.error('Example: node phase3_merge_segments.cjs spa_for_eng_s0001-0668 spa_for_eng_s0001-0100 spa_for_eng_s0101-0200 ...');
  process.exit(1);
}

const vfsRoot = path.join(__dirname, '../public/vfs/courses');

console.log(`Output course: ${outputCourseCode}`);
console.log(`Segments to merge: ${segmentCourseCodes.length}\n`);

// Load all segment files
const segments = [];
for (const segmentCode of segmentCourseCodes) {
  const segmentPath = path.join(vfsRoot, segmentCode, 'lego_pairs.json');

  if (!fs.existsSync(segmentPath)) {
    console.error(`❌ Error: Segment not found: ${segmentPath}`);
    process.exit(1);
  }

  try {
    const segmentData = JSON.parse(fs.readFileSync(segmentPath, 'utf8'));
    segments.push({
      code: segmentCode,
      data: segmentData,
      seedCount: segmentData.seeds.length
    });
    console.log(`✅ Loaded ${segmentCode}: ${segmentData.seeds.length} seeds`);
  } catch (error) {
    console.error(`❌ Error loading ${segmentCode}: ${error.message}`);
    process.exit(1);
  }
}

console.log('\n📊 Validation:\n');

// Validate segments
let totalSeeds = 0;
let totalLegos = 0;
const seedIds = new Set();

for (const segment of segments) {
  totalSeeds += segment.seedCount;

  for (const seed of segment.data.seeds) {
    // Check for duplicate seed IDs
    if (seedIds.has(seed.seed_id)) {
      console.error(`❌ Error: Duplicate seed ID found: ${seed.seed_id}`);
      console.error(`   This seed appears in multiple segments!`);
      process.exit(1);
    }
    seedIds.add(seed.seed_id);

    totalLegos += seed.legos.length;
  }
}

console.log(`✅ Total seeds: ${totalSeeds}`);
console.log(`✅ Total LEGOs: ${totalLegos}`);
console.log(`✅ No duplicate seed IDs found\n`);

// Extract seed range from course code
const rangeMatch = outputCourseCode.match(/s(\d+)-(\d+)$/);
if (!rangeMatch) {
  console.error(`❌ Error: Output course code must end with seed range (e.g., s0001-0668)`);
  process.exit(1);
}

const startSeed = parseInt(rangeMatch[1]);
const endSeed = parseInt(rangeMatch[2]);

console.log(`📝 Merging into: ${outputCourseCode}`);
console.log(`   Seed range: ${startSeed}-${endSeed}\n`);

// Merge all segments
const mergedSeeds = segments
  .flatMap(s => s.data.seeds)
  .sort((a, b) => a.seed_id.localeCompare(b.seed_id));

// Verify seed range matches
const firstSeed = mergedSeeds[0].seed_id;
const lastSeed = mergedSeeds[mergedSeeds.length - 1].seed_id;
const firstSeedNum = parseInt(firstSeed.replace('S', ''));
const lastSeedNum = parseInt(lastSeed.replace('S', ''));

if (firstSeedNum !== startSeed || lastSeedNum !== endSeed) {
  console.error(`⚠️  Warning: Seed range mismatch!`);
  console.error(`   Expected: S${String(startSeed).padStart(4, '0')} - S${String(endSeed).padStart(4, '0')}`);
  console.error(`   Got:      ${firstSeed} - ${lastSeed}`);
  console.error('   Continuing anyway...\n');
}

// Create merged output
const mergedOutput = {
  version: segments[0].data.version,
  course_id: outputCourseCode.replace(/_s\d+-\d+$/, ''), // Remove seed range for course_id
  seed_range: {
    start: startSeed,
    end: endSeed
  },
  total_seeds: mergedSeeds.length,
  seeds: mergedSeeds,
  _merge_metadata: {
    merged_at: new Date().toISOString(),
    source_segments: segmentCourseCodes,
    total_seeds: mergedSeeds.length,
    total_legos: totalLegos
  }
};

// Create output directory
const outputDir = path.join(vfsRoot, outputCourseCode);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✅ Created output directory: ${outputDir}`);
}

// Write merged file
const outputPath = path.join(outputDir, 'lego_pairs.json');
fs.writeFileSync(outputPath, JSON.stringify(mergedOutput, null, 2));

console.log(`\n✅ Merge complete!`);
console.log(`   Output: ${outputPath}`);
console.log(`   Seeds: ${mergedSeeds.length}`);
console.log(`   LEGOs: ${totalLegos}`);

// Summary by segment
console.log(`\n📊 Segment Summary:\n`);
for (const segment of segments) {
  const firstSeed = segment.data.seeds[0].seed_id;
  const lastSeed = segment.data.seeds[segment.data.seeds.length - 1].seed_id;
  const legoCount = segment.data.seeds.reduce((sum, s) => sum + s.legos.length, 0);
  console.log(`   ${segment.code}:`);
  console.log(`      Seeds: ${firstSeed} - ${lastSeed} (${segment.seedCount} total)`);
  console.log(`      LEGOs: ${legoCount}`);
}

console.log(`\n🎯 Next step: Run deduplication on merged file`);
console.log(`   node scripts/deduplicate_legos.cjs public/vfs/courses/${outputCourseCode}`);
