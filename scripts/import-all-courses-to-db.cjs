#!/usr/bin/env node
/**
 * Import All Courses to Database
 *
 * Fetches course data from S3 and imports into Supabase database.
 * Handles: seeds, legos, lego_components, basket_phrases
 *
 * Usage: node scripts/import-all-courses-to-db.cjs [--course=spa_for_eng_v2]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const courseDataService = require('../services/course-data-service.cjs');

// Local VFS directory
const VFS_ROOT = path.join(__dirname, '../public/vfs/courses');

function getLocalPath(courseCode, filename) {
  return path.join(VFS_ROOT, courseCode, filename);
}

function readLocalJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.log(`  [SKIP] ${path.basename(filePath)}: ${err.message}`);
    return null;
  }
}

async function importCourse(courseCode) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Importing: ${courseCode}`);
  console.log('='.repeat(60));

  // Ensure course exists in database
  try {
    await courseDataService.ensureCourse(courseCode);
  } catch (err) {
    console.log(`  [INFO] Course setup: ${err.message}`);
  }

  // Read lego_pairs.json (Phase 2 output - has is_new flags)
  const legoPairsPath = getLocalPath(courseCode, 'lego_pairs.json');
  console.log(`\n  Reading lego_pairs.json...`);
  const legoPairs = readLocalJson(legoPairsPath);

  if (!legoPairs || !legoPairs.seeds || legoPairs.seeds.length === 0) {
    console.log(`  [SKIP] No lego_pairs.json or empty seeds`);
    return { courseCode, status: 'skipped', reason: 'no lego_pairs.json' };
  }

  console.log(`  Found ${legoPairs.seeds.length} seeds in lego_pairs.json`);

  // Import seeds and legos
  let seedCount = 0;
  let legoCount = 0;
  let componentCount = 0;

  for (const seedData of legoPairs.seeds) {
    try {
      const result = await courseDataService.importSeedWithLegos(courseCode, seedData);
      if (result) {
        seedCount++;
        legoCount += result.legoCount || 0;
        componentCount += result.componentCount || 0;
      }
    } catch (err) {
      console.log(`  [ERROR] Seed ${seedData.seed_id}: ${err.message}`);
    }
  }

  console.log(`  Imported: ${seedCount} seeds, ${legoCount} legos, ${componentCount} components`);

  // Read lego_baskets.json (Phase 3 output)
  const legoBasketsPath = getLocalPath(courseCode, 'lego_baskets.json');
  console.log(`\n  Reading lego_baskets.json...`);
  const legoBaskets = readLocalJson(legoBasketsPath);

  let basketCount = 0;
  let phraseCount = 0;

  if (legoBaskets && legoBaskets.baskets) {
    const basketKeys = Object.keys(legoBaskets.baskets);
    console.log(`  Found ${basketKeys.length} baskets`);

    for (const legoId of basketKeys) {
      const basketData = legoBaskets.baskets[legoId];
      try {
        const result = await courseDataService.importBasket(courseCode, legoId, basketData);
        if (result) {
          basketCount++;
          phraseCount += result.phraseCount || 0;
        }
      } catch (err) {
        // This is expected for LEGOs that have is_new: false
        if (!err.message.includes('not found')) {
          console.log(`  [WARN] Basket ${legoId}: ${err.message}`);
        }
      }
    }

    console.log(`  Imported: ${basketCount} baskets, ${phraseCount} phrases`);
  } else {
    console.log(`  [SKIP] No lego_baskets.json`);
  }

  return {
    courseCode,
    status: 'imported',
    seeds: seedCount,
    legos: legoCount,
    components: componentCount,
    baskets: basketCount,
    phrases: phraseCount
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          Import All Courses to Database                    ║');
  console.log('║          APML v11.2.0 - Database First                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Check if specific course requested
  const courseArg = process.argv.find(a => a.startsWith('--course='));
  const specificCourse = courseArg ? courseArg.split('=')[1] : null;

  // Get list of courses from local VFS directory
  console.log('\nScanning local VFS directory...');
  let courses;
  try {
    const entries = fs.readdirSync(VFS_ROOT, { withFileTypes: true });
    courses = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => ({ code: e.name, name: e.name }));
  } catch (err) {
    console.error('Failed to scan VFS directory:', err.message);
    console.log(`Make sure ${VFS_ROOT} exists`);
    process.exit(1);
  }

  if (specificCourse) {
    courses = courses.filter(c => c.code === specificCourse);
    if (courses.length === 0) {
      console.error(`Course not found: ${specificCourse}`);
      process.exit(1);
    }
  }

  // Filter out test courses
  const realCourses = courses.filter(c =>
    !c.code.startsWith('test_') &&
    !c.code.includes('_test') &&
    !c.code.includes('empty')
  );

  console.log(`Found ${realCourses.length} courses to import (excluding test courses)`);

  const results = [];
  for (const course of realCourses) {
    try {
      const result = await importCourse(course.code);
      results.push(result);
    } catch (err) {
      console.error(`\n[FATAL] ${course.code}: ${err.message}`);
      results.push({ courseCode: course.code, status: 'error', error: err.message });
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('═'.repeat(60));

  const imported = results.filter(r => r.status === 'imported');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');

  console.log(`\nImported: ${imported.length} courses`);
  console.log(`Skipped:  ${skipped.length} courses`);
  console.log(`Errors:   ${errors.length} courses`);

  if (imported.length > 0) {
    console.log('\nImported courses:');
    for (const r of imported) {
      console.log(`  ${r.courseCode}: ${r.seeds} seeds, ${r.legos} legos, ${r.baskets} baskets, ${r.phrases} phrases`);
    }
  }

  if (skipped.length > 0) {
    console.log('\nSkipped courses:');
    for (const r of skipped) {
      console.log(`  ${r.courseCode}: ${r.reason}`);
    }
  }

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const r of errors) {
      console.log(`  ${r.courseCode}: ${r.error}`);
    }
  }

  // Total stats
  const totalSeeds = imported.reduce((sum, r) => sum + (r.seeds || 0), 0);
  const totalLegos = imported.reduce((sum, r) => sum + (r.legos || 0), 0);
  const totalBaskets = imported.reduce((sum, r) => sum + (r.baskets || 0), 0);
  const totalPhrases = imported.reduce((sum, r) => sum + (r.phrases || 0), 0);

  console.log('\n' + '─'.repeat(60));
  console.log(`TOTALS: ${totalSeeds} seeds, ${totalLegos} legos, ${totalBaskets} baskets, ${totalPhrases} phrases`);
  console.log('─'.repeat(60));
}

main().catch(console.error);
