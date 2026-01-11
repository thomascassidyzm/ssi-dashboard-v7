#!/usr/bin/env node
/**
 * Recover Lost LEGOs from JSON to Database
 *
 * Finds LEGOs that exist in lego_baskets.json but are missing from
 * the course_practice_phrases database table, and imports them.
 *
 * Usage: node scripts/recover-json-to-db.cjs zho_for_eng [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const courseCode = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!courseCode) {
  console.error('Usage: node scripts/recover-json-to-db.cjs <courseCode> [--dry-run]');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log(`\n=== Recovering Lost LEGOs for ${courseCode} ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // Load JSON baskets
  const basketsPath = path.join(__dirname, '..', 'public', 'vfs', 'courses', courseCode, 'lego_baskets.json');
  if (!await fs.pathExists(basketsPath)) {
    console.error(`ERROR: ${basketsPath} not found`);
    process.exit(1);
  }

  const baskets = await fs.readJson(basketsPath);
  const jsonLegoIds = new Set(Object.keys(baskets));
  console.log(`JSON baskets: ${jsonLegoIds.size} LEGOs`);

  // Get NEW LEGOs from database
  const { data: newLegos, error: legoError } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index')
    .eq('course_code', courseCode)
    .eq('is_new', true);

  if (legoError) {
    console.error('Database error:', legoError);
    process.exit(1);
  }

  console.log(`DB NEW LEGOs: ${newLegos.length}`);

  // Get LEGOs with practice phrases in DB
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', courseCode);

  const dbPhraseLegos = new Set(
    (phrases || []).map(p =>
      `S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`
    )
  );
  console.log(`DB LEGOs with phrases: ${dbPhraseLegos.size}`);

  // Find NEW LEGOs that are in JSON but not in DB
  const recoverable = [];
  for (const lego of newLegos) {
    const legoId = `S${String(lego.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`;
    if (jsonLegoIds.has(legoId) && !dbPhraseLegos.has(legoId)) {
      recoverable.push({
        legoId,
        seedNumber: lego.seed_number,
        legoIndex: lego.lego_index,
        basket: baskets[legoId]
      });
    }
  }

  console.log(`\nRecoverable LEGOs (in JSON, not in DB): ${recoverable.length}`);

  if (recoverable.length === 0) {
    console.log('Nothing to recover!');
    return;
  }

  console.log('\nLEGOs to recover:');
  recoverable.forEach(r => console.log(`  - ${r.legoId}`));

  if (dryRun) {
    console.log('\n[DRY RUN] Would import these LEGOs to database');
    return;
  }

  // Import each basket to database
  console.log('\nImporting to database...');
  let imported = 0;
  let failed = 0;

  for (const item of recoverable) {
    const { legoId, seedNumber, legoIndex, basket } = item;

    if (!basket.practice_phrases || !Array.isArray(basket.practice_phrases)) {
      console.log(`  ⚠️  ${legoId}: No practice_phrases array, skipping`);
      failed++;
      continue;
    }

    try {
      // Delete any existing (partial) phrases for this LEGO
      await supabase
        .from('course_practice_phrases')
        .delete()
        .eq('course_code', courseCode)
        .eq('seed_number', seedNumber)
        .eq('lego_index', legoIndex);

      // Insert phrases
      const phrasesToInsert = basket.practice_phrases.map((phrase, idx) => ({
        course_code: courseCode,
        seed_number: seedNumber,
        lego_index: legoIndex,
        known_text: phrase.known,
        target_text: phrase.target,
        position: idx + 1,
        word_count: phrase.syllable_count || phrase.word_count || 0,
        lego_count: phrase.lego_count || 1,
        status: 'draft'
      }));

      const { error: insertError } = await supabase
        .from('course_practice_phrases')
        .insert(phrasesToInsert);

      if (insertError) {
        console.log(`  ❌ ${legoId}: ${insertError.message}`);
        failed++;
      } else {
        console.log(`  ✅ ${legoId}: ${phrasesToInsert.length} phrases imported`);
        imported++;
      }
    } catch (err) {
      console.log(`  ❌ ${legoId}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total recoverable: ${recoverable.length}`);
}

main().catch(console.error);
