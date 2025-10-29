#!/usr/bin/env node

/**
 * Convert Old Format Courses to New Simplified APML v7.6 Format
 *
 * OLD FORMAT:
 * - seed_pairs.json with { version, translations: {...} }
 * - lego_pairs_inventory.json (word-based, not seed-based)
 *
 * NEW FORMAT:
 * - translations.json (simple { "S0001": ["target", "known"], ... })
 * - LEGO_BREAKDOWNS_COMPLETE.json (seed-based breakdowns)
 *
 * Usage:
 *   node convert-old-to-new-format.cjs <course_code>
 *   node convert-old-to-new-format.cjs ita_for_eng_668seeds
 */

const fs = require('fs-extra');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Usage: node convert-old-to-new-format.cjs <course_code>');
  process.exit(1);
}

const courseDir = path.join(__dirname, courseCode);

async function convertCourse() {
  console.log(`\n🔄 Converting ${courseCode} to new APML v7.6 format...\n`);

  // Check if course exists
  if (!await fs.pathExists(courseDir)) {
    console.error(`❌ Course directory not found: ${courseDir}`);
    process.exit(1);
  }

  // === STEP 1: Convert seed_pairs.json → translations.json ===
  console.log('📝 Step 1: Converting seed_pairs.json → translations.json');

  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
  if (!await fs.pathExists(seedPairsPath)) {
    console.error(`❌ seed_pairs.json not found in ${courseDir}`);
    process.exit(1);
  }

  const oldFormat = await fs.readJson(seedPairsPath);
  const translations = oldFormat.translations || {};

  // Remove {target} placeholders if they exist
  const cleanedTranslations = {};
  for (const [seedId, [target, known]] of Object.entries(translations)) {
    const cleanKnown = known.replace(/\{target\}/g, 'Italian'); // Generic replacement
    cleanedTranslations[seedId] = [target, cleanKnown];
  }

  const translationsPath = path.join(courseDir, 'translations.json');
  await fs.writeJson(translationsPath, cleanedTranslations, { spaces: 2 });
  console.log(`✅ Created translations.json with ${Object.keys(cleanedTranslations).length} seed pairs`);

  // === STEP 2: Generate LEGO_BREAKDOWNS_COMPLETE.json ===
  console.log('\n📝 Step 2: Generating LEGO_BREAKDOWNS_COMPLETE.json');
  console.log('⚠️  Note: This is a STUB file - actual LEGO decomposition requires Phase 3');
  console.log('    The course will need to be regenerated through Phase 3 for real LEGOs');

  // Parse course code
  const match = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_(\d+)seeds$/);
  if (!match) {
    console.error(`❌ Invalid course code format: ${courseCode}`);
    process.exit(1);
  }

  const targetLang = match[1];
  const knownLang = match[2];
  const seedCount = parseInt(match[3]);

  const legoBreakdowns = {
    course_metadata: {
      lang_pair: `${targetLang}_for_${knownLang}`,
      target_language: getLanguageName(targetLang),
      known_language: getLanguageName(knownLang),
      phase: 3,
      seeds_count: seedCount
    },
    lego_breakdowns: []
  };

  // Create stub LEGO breakdowns (will be replaced by actual Phase 3 generation)
  for (const [seedId, [target, known]] of Object.entries(cleanedTranslations)) {
    legoBreakdowns.lego_breakdowns.push({
      seed_id: seedId,
      original_target: target,
      original_known: known,
      lego_pairs: [
        {
          lego_id: `${seedId}L01`,
          lego_type: "COMPOSITE",
          target_chunk: target,
          known_chunk: known,
          fd_validated: false,
          note: "STUB - Needs Phase 3 regeneration for real LEGO decomposition"
        }
      ]
    });
  }

  const legosPath = path.join(courseDir, 'LEGO_BREAKDOWNS_COMPLETE.json');
  await fs.writeJson(legosPath, legoBreakdowns, { spaces: 2 });
  console.log(`✅ Created LEGO_BREAKDOWNS_COMPLETE.json with ${legoBreakdowns.lego_breakdowns.length} seed breakdowns (STUB)`);

  // === STEP 3: Backup old files ===
  console.log('\n📦 Step 3: Backing up old format files');
  const backupDir = path.join(courseDir, '_backup_old_format');
  await fs.ensureDir(backupDir);

  const oldFiles = [
    'seed_pairs.json',
    'seed_pairs_original.json',
    'seed_pairs_regenerated.json',
    'lego_pairs_inventory.json',
    'composability_analysis.json',
    'lego_decomposition_guide.json'
  ];

  for (const file of oldFiles) {
    const filePath = path.join(courseDir, file);
    if (await fs.pathExists(filePath)) {
      await fs.move(filePath, path.join(backupDir, file), { overwrite: true });
      console.log(`  📁 Backed up: ${file}`);
    }
  }

  console.log(`\n✅ Conversion complete!`);
  console.log(`\n📋 Summary:`);
  console.log(`   - translations.json: ${Object.keys(cleanedTranslations).length} seed pairs`);
  console.log(`   - LEGO_BREAKDOWNS_COMPLETE.json: ${legoBreakdowns.lego_breakdowns.length} breakdowns (STUB)`);
  console.log(`   - Old files backed up to: _backup_old_format/`);
  console.log(`\n⚠️  IMPORTANT: LEGOs are STUB entries - course should be regenerated through Phase 3 for real decomposition\n`);
}

function getLanguageName(code) {
  const names = {
    'eng': 'English',
    'ita': 'Italian',
    'spa': 'Spanish',
    'fra': 'French',
    'gle': 'Irish',
    'cym': 'Welsh',
    'cmn': 'Mandarin Chinese',
    'mkd': 'Macedonian'
  };
  return names[code] || code.toUpperCase();
}

convertCourse().catch(err => {
  console.error('\n❌ Conversion failed:', err);
  process.exit(1);
});
