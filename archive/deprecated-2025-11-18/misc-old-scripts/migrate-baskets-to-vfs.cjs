#!/usr/bin/env node

/**
 * Migration Script: Baskets to VFS Structure
 *
 * Migrates basket files from public/baskets/ and public/generated_baskets/
 * to the new VFS course structure.
 *
 * Output:
 * - vfs/courses/{courseCode}/lego_baskets.json
 * - vfs/courses/{courseCode}/lego_baskets_metadata.json
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const BASKETS_DIR = path.join(ROOT_DIR, 'public', 'baskets');
const GENERATED_BASKETS_DIR = path.join(ROOT_DIR, 'public', 'generated_baskets');
const VFS_COURSES_DIR = path.join(ROOT_DIR, 'vfs', 'courses');
const BACKUP_DIR = path.join(ROOT_DIR, 'backups', `migration-${new Date().toISOString().replace(/:/g, '-')}`);

// Course mapping
const COURSE_MAPPING = {
  spa_for_eng_20seeds: {
    seeds: ['S0001', 'S0002', 'S0003', 'S0004', 'S0005', 'S0006', 'S0007', 'S0008', 'S0009', 'S0010',
            'S0012', 'S0013', 'S0014', 'S0015', 'S0016', 'S0017', 'S0018', 'S0019', 'S0020'],
    source: 'baskets'
  },
  spa_for_eng_30seeds: {
    seeds: ['S0011', 'S0021', 'S0031'],
    source: 'generated_baskets',
    suffix: '_conversational'
  }
};

// Utility functions
function log(message, level = 'info') {
  const prefix = {
    info: '✓',
    warn: '⚠',
    error: '✗',
    section: '\n▶'
  }[level] || 'ℹ';

  console.log(`${prefix} ${message}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Created directory: ${dir}`);
  }
}

function getSeedNumber(seedId) {
  return seedId.replace('S', '');
}

function getBasketFilePath(seedId, source, suffix = '') {
  const seedNum = getSeedNumber(seedId).toLowerCase();
  const fileName = `lego_baskets_s${seedNum}${suffix}.json`;

  if (source === 'baskets') {
    return path.join(BASKETS_DIR, fileName);
  } else {
    return path.join(GENERATED_BASKETS_DIR, fileName);
  }
}

function readBasketFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(`Failed to read ${filePath}: ${error.message}`, 'error');
    return null;
  }
}

function extractLessonsFromBasket(basketData, seedId) {
  const lessons = {};
  const lessonKeys = Object.keys(basketData).filter(key => key.startsWith(seedId + 'L'));

  lessonKeys.forEach(lessonId => {
    lessons[lessonId] = basketData[lessonId];
  });

  return lessons;
}

function calculateConversationalRate(lessons) {
  let totalPhrases = 0;
  let conversationalPhrases = 0;

  Object.values(lessons).forEach(lesson => {
    if (lesson.practice_phrases) {
      totalPhrases += lesson.practice_phrases.length;
      // Count phrases with 3+ words as conversational
      conversationalPhrases += lesson.practice_phrases.filter(p => {
        if (Array.isArray(p) && p.length > 0) {
          const wordCount = p[0].split(' ').length;
          return wordCount >= 3;
        }
        return false;
      }).length;
    }
  });

  return totalPhrases > 0 ? Math.round((conversationalPhrases / totalPhrases) * 100) : 0;
}

function checkGateCompliance(basketData) {
  // Check for GATE compliance indicators
  if (basketData.note && basketData.note.includes('GATE')) {
    return true;
  }
  if (basketData.version && basketData.version.includes('GATE')) {
    return true;
  }
  // Check lessons for gate_compliance field
  const lessonKeys = Object.keys(basketData).filter(key => key.match(/L\d+$/));
  for (const lessonKey of lessonKeys) {
    const lesson = basketData[lessonKey];
    if (lesson.gate_compliance && lesson.gate_compliance.includes('STRICT')) {
      return true;
    }
  }
  return false;
}

function determineQualityScore(basketData, isCurated) {
  if (isCurated) {
    return 100; // Curated baskets are highest quality
  }

  // Calculate quality based on various factors
  let score = 70; // Base score

  if (checkGateCompliance(basketData)) {
    score += 20;
  }

  if (basketData.pattern_distribution_summary) {
    score += 10;
  }

  return Math.min(score, 95); // Max 95 for non-curated
}

function createBackup(filePath) {
  if (fs.existsSync(filePath)) {
    ensureDir(BACKUP_DIR);
    const fileName = path.basename(filePath);
    const backupPath = path.join(BACKUP_DIR, fileName);
    fs.copyFileSync(filePath, backupPath);
    log(`Backed up: ${fileName}`);
    return true;
  }
  return false;
}

function migrateCourse(courseCode, config) {
  log(`Migrating course: ${courseCode}`, 'section');

  const courseDir = path.join(VFS_COURSES_DIR, courseCode);
  ensureDir(courseDir);

  const outputBaskets = {
    version: "curated_v6",
    course_code: courseCode,
    baskets: {}
  };

  const outputMetadata = {
    version: "curated_v6",
    course_code: courseCode,
    total_baskets: 0,
    basket_metadata: {}
  };

  let processedCount = 0;
  let skippedCount = 0;

  // Process each seed
  config.seeds.forEach(seedId => {
    const suffix = config.suffix || '';
    const filePath = getBasketFilePath(seedId, config.source, suffix);

    if (!fs.existsSync(filePath)) {
      log(`  ⚠ Skipping ${seedId}: file not found at ${filePath}`, 'warn');
      skippedCount++;
      return;
    }

    log(`  Processing ${seedId} from ${path.basename(filePath)}`);

    const basketData = readBasketFile(filePath);
    if (!basketData) {
      skippedCount++;
      return;
    }

    // Extract basket structure
    const lessons = extractLessonsFromBasket(basketData, seedId);
    const isCurated = config.source === 'generated_baskets';

    outputBaskets.baskets[seedId] = {
      seed_pair: basketData.seed_pair || {},
      patterns_introduced: basketData.patterns_introduced || basketData.pattern_introduced || "",
      version: basketData.version || "unknown",
      cumulative_patterns: basketData.cumulative_patterns || [],
      cumulative_legos: basketData.cumulative_legos || 0,
      note: basketData.note || "",
      lessons: lessons
    };

    // Add curation metadata if present
    if (basketData.curation_metadata) {
      outputBaskets.baskets[seedId].curation_metadata = basketData.curation_metadata;
    }

    // Create metadata entry
    outputMetadata.basket_metadata[seedId] = {
      status: isCurated ? "curated" : "generated",
      quality_score: determineQualityScore(basketData, isCurated),
      conversational_rate: calculateConversationalRate(lessons),
      gate_compliance: checkGateCompliance(basketData),
      lesson_count: Object.keys(lessons).length,
      source_file: path.basename(filePath)
    };

    processedCount++;
  });

  outputMetadata.total_baskets = processedCount;

  // Write output files
  const basketsOutputPath = path.join(courseDir, 'lego_baskets.json');
  const metadataOutputPath = path.join(courseDir, 'lego_baskets_metadata.json');

  // Backup existing files
  createBackup(basketsOutputPath);
  createBackup(metadataOutputPath);

  // Write new files
  fs.writeFileSync(basketsOutputPath, JSON.stringify(outputBaskets, null, 2), 'utf8');
  log(`  ✓ Created: ${basketsOutputPath}`);

  fs.writeFileSync(metadataOutputPath, JSON.stringify(outputMetadata, null, 2), 'utf8');
  log(`  ✓ Created: ${metadataOutputPath}`);

  log(`  Summary: ${processedCount} baskets processed, ${skippedCount} skipped`);

  return { processed: processedCount, skipped: skippedCount };
}

function generateMigrationReport(results) {
  log('\nMigration Report', 'section');
  log('═══════════════════════════════════════════════════════');

  let totalProcessed = 0;
  let totalSkipped = 0;

  Object.entries(results).forEach(([courseCode, stats]) => {
    log(`\n${courseCode}:`);
    log(`  Processed: ${stats.processed}`);
    log(`  Skipped: ${stats.skipped}`);
    totalProcessed += stats.processed;
    totalSkipped += stats.skipped;
  });

  log('\n───────────────────────────────────────────────────────');
  log(`Total Processed: ${totalProcessed}`);
  log(`Total Skipped: ${totalSkipped}`);
  log(`Backups Location: ${BACKUP_DIR}`);
  log('═══════════════════════════════════════════════════════\n');
}

// Main execution
function main() {
  log('Starting Baskets to VFS Migration', 'section');
  log('═══════════════════════════════════════════════════════');

  // Verify directories exist
  if (!fs.existsSync(BASKETS_DIR)) {
    log(`Baskets directory not found: ${BASKETS_DIR}`, 'error');
    process.exit(1);
  }

  if (!fs.existsSync(GENERATED_BASKETS_DIR)) {
    log(`Generated baskets directory not found: ${GENERATED_BASKETS_DIR}`, 'warn');
  }

  if (!fs.existsSync(VFS_COURSES_DIR)) {
    log(`VFS courses directory not found: ${VFS_COURSES_DIR}`, 'error');
    process.exit(1);
  }

  // Migrate each course
  const results = {};

  Object.entries(COURSE_MAPPING).forEach(([courseCode, config]) => {
    results[courseCode] = migrateCourse(courseCode, config);
  });

  // Generate report
  generateMigrationReport(results);

  log('Migration completed successfully! ✓', 'info');
}

// Run if executed directly
if (require.main === module) {
  try {
    main();
  } catch (error) {
    log(`Migration failed: ${error.message}`, 'error');
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { main };
