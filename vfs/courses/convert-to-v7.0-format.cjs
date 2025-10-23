#!/usr/bin/env node

/**
 * Convert Old Format Courses to APML v7.0 Current Format (Oct 22, 2024)
 *
 * OLD FORMATS:
 * - Oct 10: amino acid model (individual UUID files)
 * - Oct 15: translations.json + LEGO_BREAKDOWNS_COMPLETE.json (verbose objects)
 * - Pre-Oct: seed_pairs.json with nested {version, translations}
 *
 * CURRENT FORMAT (Oct 22):
 * - seed_pairs.json: {version: "7.0", translations: {"S0001": [target, known]}}
 * - lego_pairs.json: {version: "7.0", seeds: [[seed_id, [t,k], [[lego_id, type, t, k]]]]}
 * - lego_baskets.json: {version: "7.0", baskets: {lego_id: [[lego], [e-phrases], [d-phrases]]}}
 *
 * Reference: /schemas/examples/*.json and test_for_eng_5seeds/
 *
 * Usage:
 *   node convert-to-v7.0-format.cjs <course_code>
 */

const fs = require('fs-extra');
const path = require('path');

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Usage: node convert-to-v7.0-format.cjs <course_code>');
  process.exit(1);
}

const courseDir = path.join(__dirname, courseCode);

async function convertCourse() {
  console.log(`\n🔄 Converting ${courseCode} to APML v7.0 format (Oct 22, 2024)...\n`);

  // Check if course exists
  if (!await fs.pathExists(courseDir)) {
    console.error(`❌ Course directory not found: ${courseDir}`);
    process.exit(1);
  }

  // === STEP 1: Convert to seed_pairs.json ===
  console.log('📝 Step 1: Converting to seed_pairs.json');

  let translations = {};

  // Try multiple possible source files
  const possibleSources = [
    'seed_pairs.json',         // Already correct name
    'translations.json',        // Oct 15 interim format
    'seed_pairs_original.json', // Backup
    '_backup_old_format/seed_pairs.json'
  ];

  let sourceFile = null;
  for (const file of possibleSources) {
    const filePath = path.join(courseDir, file);
    if (await fs.pathExists(filePath)) {
      sourceFile = filePath;
      console.log(`  📂 Found source: ${file}`);
      break;
    }
  }

  if (!sourceFile) {
    console.error(`❌ No source file found. Tried: ${possibleSources.join(', ')}`);
    process.exit(1);
  }

  const sourceData = await fs.readJson(sourceFile);

  // Extract translations from various formats
  if (sourceData.translations) {
    // Format: {version, translations: {...}}
    translations = sourceData.translations;
  } else {
    // Format: {"S0001": [...], "S0002": [...]}
    translations = sourceData;
  }

  // Clean {target} placeholders if they exist
  const cleanedTranslations = {};
  for (const [seedId, value] of Object.entries(translations)) {
    if (Array.isArray(value) && value.length === 2) {
      const [target, known] = value;
      // Remove placeholder patterns like {target}, {TARGET}, etc.
      const cleanKnown = known.replace(/\{target\}/gi, 'TARGET_LANG').replace(/\{known\}/gi, 'KNOWN_LANG');
      cleanedTranslations[seedId] = [target, cleanKnown];
    }
  }

  // Write in v7.0 format
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
  const seedPairsData = {
    version: "7.0",
    translations: cleanedTranslations
  };

  await fs.writeJson(seedPairsPath, seedPairsData, { spaces: 2 });
  console.log(`✅ Created seed_pairs.json with ${Object.keys(cleanedTranslations).length} seed pairs`);

  // === STEP 2: Convert to lego_pairs.json ===
  console.log('\n📝 Step 2: Converting to lego_pairs.json');

  // Try to find LEGO source
  const legoPossibleSources = [
    'lego_pairs.json',              // Already correct
    'LEGO_BREAKDOWNS_COMPLETE.json', // Oct 15 format
    '_backup_old_format/lego_pairs_inventory.json'
  ];

  let legoSourceFile = null;
  for (const file of legoPossibleSources) {
    const filePath = path.join(courseDir, file);
    if (await fs.pathExists(filePath)) {
      legoSourceFile = filePath;
      console.log(`  📂 Found LEGO source: ${file}`);
      break;
    }
  }

  if (!legoSourceFile) {
    console.warn(`⚠️  No LEGO source found - creating STUBs`);
    console.warn(`    Tried: ${legoPossibleSources.join(', ')}`);
    console.warn(`    Course will need Phase 3 regeneration for real LEGOs\n`);

    // Create STUB lego_pairs.json
    const seeds = [];
    for (const [seedId, [target, known]] of Object.entries(cleanedTranslations)) {
      seeds.push([
        seedId,
        [target, known],
        [
          [`${seedId}L01`, "C", target, known] // Whole sentence as single COMPOSITE LEGO (STUB)
        ]
      ]);
    }

    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    await fs.writeJson(legoPairsPath, {
      version: "7.0",
      seeds: seeds
    }, { spaces: 2 });

    console.log(`✅ Created lego_pairs.json with ${seeds.length} STUB breakdowns`);
  } else {
    // Convert existing LEGO data
    const legoData = await fs.readJson(legoSourceFile);
    const seeds = [];

    if (legoData.lego_breakdowns) {
      // Oct 15 format: {lego_breakdowns: [{seed_id, lego_pairs: [...]}]}
      for (const breakdown of legoData.lego_breakdowns) {
        const seedId = breakdown.seed_id;
        const target = breakdown.original_target;
        const known = breakdown.original_known;

        const legos = [];
        for (const lego of (breakdown.lego_pairs || [])) {
          const legoId = lego.lego_id;
          const type = lego.lego_type === "BASE" ? "B" : lego.lego_type === "COMPOSITE" ? "C" : "B";
          const targetChunk = lego.target_chunk;
          const knownChunk = lego.known_chunk;

          // Check if COMPOSITE has componentization (feeders)
          if (type === "C" && breakdown.feeder_pairs && breakdown.feeder_pairs.length > 0) {
            const feeders = breakdown.feeder_pairs.map(f => [
              f.feeder_id,
              "F",
              f.target_chunk,
              f.known_chunk
            ]);
            legos.push([legoId, type, targetChunk, knownChunk, feeders]);
          } else {
            legos.push([legoId, type, targetChunk, knownChunk]);
          }
        }

        seeds.push([seedId, [target, known], legos]);
      }
    } else if (legoData.seeds) {
      // Already in v7.0 format
      seeds = legoData.seeds;
    }

    const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
    await fs.writeJson(legoPairsPath, {
      version: "7.0",
      seeds: seeds
    }, { spaces: 2 });

    console.log(`✅ Created lego_pairs.json with ${seeds.length} breakdowns`);
  }

  // === STEP 3: Handle lego_baskets.json ===
  console.log('\n📝 Step 3: Checking lego_baskets.json');

  const basketsPossibleSources = [
    'lego_baskets.json',    // Already correct
    'baskets.json'          // Needs rename
  ];

  let basketsSourceFile = null;
  for (const file of basketsPossibleSources) {
    const filePath = path.join(courseDir, file);
    if (await fs.pathExists(filePath)) {
      basketsSourceFile = filePath;
      console.log(`  📂 Found baskets source: ${file}`);
      break;
    }
  }

  if (basketsSourceFile) {
    const basketsData = await fs.readJson(basketsSourceFile);

    // Check if already in v7.0 format
    if (basketsData.version === "7.0" && basketsData.baskets) {
      console.log(`✅ lego_baskets.json already in v7.0 format`);

      // Just ensure it's named correctly
      const basketsPath = path.join(courseDir, 'lego_baskets.json');
      if (basketsSourceFile !== basketsPath) {
        await fs.writeJson(basketsPath, basketsData, { spaces: 2 });
        console.log(`  📝 Renamed ${path.basename(basketsSourceFile)} → lego_baskets.json`);
      }
    } else {
      console.log(`⚠️  Baskets file exists but format unclear - keeping as-is`);
    }
  } else {
    console.log(`ℹ️  No baskets file found - Phase 5 not yet run`);
  }

  // === STEP 4: Backup old files ===
  console.log('\n📦 Step 4: Backing up old format files');
  const backupDir = path.join(courseDir, '_backup_pre_v7.0');
  await fs.ensureDir(backupDir);

  const filesToBackup = [
    'translations.json',
    'LEGO_BREAKDOWNS_COMPLETE.json',
    'baskets.json',
    'seed_pairs_original.json',
    'seed_pairs_regenerated.json',
    'lego_pairs_inventory.json',
    'composability_analysis.json',
    'lego_decomposition_guide.json'
  ];

  let backedUpCount = 0;
  for (const file of filesToBackup) {
    const filePath = path.join(courseDir, file);
    if (await fs.pathExists(filePath)) {
      // Don't backup if it's already the correct v7.0 file
      if (file === 'seed_pairs.json' || file === 'lego_pairs.json' || file === 'lego_baskets.json') {
        continue;
      }

      await fs.move(filePath, path.join(backupDir, file), { overwrite: true });
      console.log(`  📁 Backed up: ${file}`);
      backedUpCount++;
    }
  }

  if (backedUpCount === 0) {
    console.log(`  ℹ️  No old files to backup`);
  }

  console.log(`\n✅ Conversion complete!`);
  console.log(`\n📋 Summary:`);
  console.log(`   - seed_pairs.json: ${Object.keys(cleanedTranslations).length} seed pairs ✅`);
  console.log(`   - lego_pairs.json: Created ✅`);
  console.log(`   - lego_baskets.json: ${basketsSourceFile ? 'Present' : 'Not generated yet'}`);
  console.log(`   - Old files backed up to: _backup_pre_v7.0/`);
  console.log(`\n📖 Format Spec: /docs/APML_v7.0_CURRENT_FORMAT.md\n`);
}

convertCourse().catch(err => {
  console.error('\n❌ Conversion failed:', err);
  process.exit(1);
});
