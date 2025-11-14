#!/usr/bin/env node
/**
 * Fix M-LEGO translation errors
 *
 * Applies the 82 corrections identified in mlego_translation_errors.json
 * - Only modifies the M-LEGO "known" field
 * - Does NOT modify components
 * - Does NOT modify A-LEGOs
 * - Verifies each change matches exactly before applying
 */

const fs = require('fs-extra');

async function fixTranslations() {
  console.log('🔧 Fixing M-LEGO translation errors...\n');

  // Load the error report
  const errorsPath = 'public/vfs/courses/spa_for_eng/mlego_translation_errors.json';
  const errors = await fs.readJson(errorsPath);

  console.log(`Found ${errors.total_issues} M-LEGOs to fix\n`);

  // Load lego_pairs.json
  const legoPairsPath = 'public/vfs/courses/spa_for_eng/lego_pairs.json';
  const data = await fs.readJson(legoPairsPath);

  // Build lookup map for fast access
  const legoMap = new Map();
  for (const seed of data.seeds) {
    for (const lego of seed.legos) {
      legoMap.set(lego.id, { seed, lego });
    }
  }

  // Apply fixes
  let fixed = 0;
  let skipped = 0;
  const changes = [];

  for (const issue of errors.issues) {
    const { lego_id, target, known, suggested } = issue;

    const entry = legoMap.get(lego_id);
    if (!entry) {
      console.warn(`⚠️  LEGO ${lego_id} not found - skipping`);
      skipped++;
      continue;
    }

    const { seed, lego } = entry;

    // Verify it matches before fixing
    if (lego.target !== target || lego.known !== known) {
      console.warn(`⚠️  LEGO ${lego_id} doesn't match expected values - skipping`);
      console.warn(`     Expected: "${target}" = "${known}"`);
      console.warn(`     Found:    "${lego.target}" = "${lego.known}"`);
      skipped++;
      continue;
    }

    // Apply fix
    const oldKnown = lego.known;
    lego.known = suggested;
    fixed++;

    changes.push({
      lego_id,
      seed_id: seed.seed_id,
      target,
      old_known: oldKnown,
      new_known: suggested
    });

    if (fixed <= 10) {
      console.log(`✅ ${lego_id}: "${target}"`);
      console.log(`   Old: "${oldKnown}"`);
      console.log(`   New: "${suggested}"`);
    }
  }

  if (fixed > 10) {
    console.log(`   ... and ${fixed - 10} more`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${errors.total_issues}`);

  if (skipped > 0) {
    console.log(`\n⚠️  Warning: ${skipped} fixes were skipped due to mismatches`);
    console.log(`   Review the warnings above before proceeding`);
    return;
  }

  // Write updated lego_pairs.json
  console.log(`\n💾 Writing updated lego_pairs.json...`);
  await fs.writeJson(legoPairsPath, data, { spaces: 2 });

  console.log(`✅ Wrote ${legoPairsPath}`);

  // Run compact formatter
  console.log('\n📐 Running compact formatter...');
  const { execSync } = require('child_process');
  execSync(`node scripts/compact_json_format.cjs ${legoPairsPath}`, { stdio: 'inherit' });

  // Write change log
  const changeLogPath = 'public/vfs/courses/spa_for_eng/mlego_fix_changelog.json';
  await fs.writeJson(changeLogPath, {
    fixed_at: new Date().toISOString(),
    total_fixes: fixed,
    changes
  }, { spaces: 2 });

  console.log(`\n✅ Change log written to: ${changeLogPath}`);
  console.log(`\n✅ All ${fixed} M-LEGO translations fixed successfully!`);
}

fixTranslations().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
