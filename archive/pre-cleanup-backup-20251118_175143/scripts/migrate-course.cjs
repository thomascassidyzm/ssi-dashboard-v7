#!/usr/bin/env node

/**
 * SSi Course Migration Tool
 *
 * Converts old course format (simple seed pairs) to new APML v7.0 amino acid format
 *
 * Usage:
 *   node migrate-course.cjs <source-file> <course-code>
 *
 * Example:
 *   node migrate-course.cjs ../SSi_Course_Production/vfs/courses/mkd_for_eng_speakers/mkd_for_eng_speakers_readable.json mkd_for_eng_574seeds
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

// =============================================================================
// CONFIGURATION
// =============================================================================

const VFS_ROOT = path.join(__dirname, 'vfs', 'courses');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generates deterministic UUID from content
 */
function generateUUID(content) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(content));
  return hash.digest('hex').substring(0, 32);
}

/**
 * Converts old seed pair format to Phase 1 amino acid format
 */
function convertToTranslationAminoAcid(seedPair, courseCode) {
  const aminoAcid = {
    uuid: generateUUID({
      source: seedPair.known,
      target: seedPair.target,
      seed_id: seedPair.seed_id
    }),
    type: 'translation',
    seed_id: seedPair.seed_id,
    source: seedPair.known,
    target: seedPair.target,
    metadata: {
      course_code: courseCode,
      phase: 'phase_1',
      heuristics_applied: [
        'naturalness',
        'frequency',
        'clarity',
        'brevity',
        'consistency',
        'utility'
      ],
      created_at: new Date().toISOString(),
      migrated_from: 'legacy_format'
    }
  };

  return aminoAcid;
}

/**
 * Migrates course from old format to new amino acid structure
 */
async function migrateCourse(sourceFile, courseCode) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SSi Course Migration Tool - APML v7.0');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Source: ${sourceFile}`);
  console.log(`Course Code: ${courseCode}`);
  console.log('');

  // Read source course data
  console.log('📖 Reading source course...');
  const courseData = await fs.readJson(sourceFile);
  const seedPairs = courseData.seed_pairs || courseData.seeds || [];

  console.log(`   Found ${seedPairs.length} seed pairs`);
  console.log('');

  // Create course directory structure
  console.log('📁 Creating VFS directory structure...');
  const courseDir = path.join(VFS_ROOT, courseCode);
  const translationsDir = path.join(courseDir, 'amino_acids', 'translations');
  const phaseOutputsDir = path.join(courseDir, 'phase_outputs');

  await fs.ensureDir(translationsDir);
  await fs.ensureDir(phaseOutputsDir);

  console.log(`   Created: ${courseDir}`);
  console.log('');

  // Convert and save translation amino acids
  console.log('🧬 Converting to amino acid format...');
  let convertedCount = 0;

  for (const seedPair of seedPairs) {
    const aminoAcid = convertToTranslationAminoAcid(seedPair, courseCode);
    const aminoAcidPath = path.join(translationsDir, `${aminoAcid.uuid}.json`);

    await fs.writeJson(aminoAcidPath, aminoAcid, { spaces: 2 });
    convertedCount++;

    if (convertedCount % 50 === 0) {
      console.log(`   Converted ${convertedCount}/${seedPairs.length} translations...`);
    }
  }

  console.log(`   ✓ Converted all ${convertedCount} translations`);
  console.log('');

  // Create course metadata
  console.log('📋 Creating course metadata...');
  const metadata = {
    course_code: courseCode,
    version: '1.0.0',
    created_at: new Date().toISOString(),
    source_file: path.basename(sourceFile),
    total_seeds: seedPairs.length,
    phases_completed: ['phase_1'],
    status: 'ready_for_phase_2',
    amino_acids: {
      translations: convertedCount,
      legos: 0,
      legos_deduplicated: 0,
      baskets: 0,
      introductions: 0
    }
  };

  await fs.writeJson(
    path.join(courseDir, 'course_metadata.json'),
    metadata,
    { spaces: 2 }
  );

  console.log('   ✓ Metadata saved');
  console.log('');

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Migration Complete!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Course: ${courseCode}`);
  console.log(`Location: ${courseDir}`);
  console.log(`Translations: ${convertedCount} amino acids`);
  console.log(`Status: Ready for Phase 2`);
  console.log('');
  console.log('Next Steps:');
  console.log('  1. Visit: https://ssi-dashboard-v7.vercel.app/phase/2');
  console.log('  2. Copy the Phase 2 prompt');
  console.log(`  3. Run: cd ${courseDir}`);
  console.log('  4. Execute Phase 2 with Claude Code');
  console.log('  5. Repeat for Phases 3, 3.5, 4, 5, 6');
  console.log('');
  console.log('This will generate:');
  console.log('  • Corpus Intelligence (Phase 2)');
  console.log('  • LEGOs with provenance (Phase 3)');
  console.log('  • Graph structure (Phase 3.5)');
  console.log('  • Deduplicated LEGOs (Phase 4)');
  console.log('  • Pattern-aware baskets (Phase 5)');
  console.log('  • Known-only introductions (Phase 6)');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// =============================================================================
// MAIN
// =============================================================================

const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Usage: node migrate-course.cjs <source-file> <course-code>');
  console.error('');
  console.error('Example:');
  console.error('  node migrate-course.cjs \\');
  console.error('    ../SSi_Course_Production/vfs/courses/mkd_for_eng_speakers/mkd_for_eng_speakers_readable.json \\');
  console.error('    mkd_for_eng_574seeds');
  process.exit(1);
}

const [sourceFile, courseCode] = args;

if (!fs.existsSync(sourceFile)) {
  console.error(`Error: Source file not found: ${sourceFile}`);
  process.exit(1);
}

migrateCourse(sourceFile, courseCode)
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
