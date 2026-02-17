#!/usr/bin/env node
/**
 * Insert new USE phrases from JSON file into database
 *
 * Usage: node scripts/insert-use-phrases.cjs <json-file> [--dry-run]
 *
 * Example:
 *   node scripts/insert-use-phrases.cjs temp/fra_for_eng_use_phrase_additions_v2.json --dry-run
 *   node scripts/insert-use-phrases.cjs temp/fra_for_eng_use_phrase_additions_v2.json
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const args = process.argv.slice(2);
  const jsonFile = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  if (!jsonFile) {
    console.error('Usage: node scripts/insert-use-phrases.cjs <json-file> [--dry-run]');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), jsonFile);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const courseCode = data.course_code;
  const additions = data.additions;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`INSERT USE PHRASES${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`${'='.repeat(70)}\n`);
  console.log(`Course: ${courseCode}`);
  console.log(`Additions: ${additions.length} LEGOs\n`);

  // Get all existing phrases to find max position per LEGO
  const { data: existingPhrases, error: fetchError } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, position')
    .eq('course_code', courseCode);

  if (fetchError) {
    console.error('Error fetching existing phrases:', fetchError);
    process.exit(1);
  }

  // Build map of max position per LEGO
  const maxPositionMap = {};
  for (const p of existingPhrases) {
    const key = `${p.seed_number}-${p.lego_index}`;
    maxPositionMap[key] = Math.max(maxPositionMap[key] || 0, p.position);
  }

  // Get LEGO indices by known/target text
  const { data: legos, error: legoError } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text')
    .eq('course_code', courseCode);

  if (legoError) {
    console.error('Error fetching LEGOs:', legoError);
    process.exit(1);
  }

  // Build lookup map
  const legoLookup = {};
  for (const l of legos) {
    const key = `${l.seed_number}-${l.known_text.toLowerCase()}-${l.target_text.toLowerCase()}`;
    legoLookup[key] = l;
  }

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const addition of additions) {
    const { seed_number, lego_known, lego_target, new_use_phrases } = addition;

    // Skip if no phrases to add
    if (!new_use_phrases || new_use_phrases.length === 0) {
      continue;
    }

    // Find the LEGO
    const lookupKey = `${seed_number}-${lego_known.toLowerCase()}-${lego_target.toLowerCase()}`;
    const lego = legoLookup[lookupKey];

    if (!lego) {
      console.log(`  SKIP: LEGO not found: S${String(seed_number).padStart(4, '0')} "${lego_known}" / "${lego_target}"`);
      totalSkipped += new_use_phrases.length;
      continue;
    }

    const legoKey = `${seed_number}-${lego.lego_index}`;
    let nextPosition = (maxPositionMap[legoKey] || 0) + 1;

    console.log(`S${String(seed_number).padStart(4, '0')} L${String(lego.lego_index).padStart(2, '0')} "${lego_known}" → adding ${new_use_phrases.length} phrases`);

    for (const phrase of new_use_phrases) {
      const record = {
        course_code: courseCode,
        seed_number: seed_number,
        lego_index: lego.lego_index,
        position: nextPosition,
        known_text: phrase.known,
        target_text: phrase.target,
        word_count: phrase.target.split(/\s+/).length,
        lego_count: 1,
        phrase_role: 'use',
        status: 'draft',
        metadata: { source: 'use-phrase-backfill', length: phrase.length }
      };

      if (dryRun) {
        console.log(`    [DRY RUN] P${nextPosition}: "${phrase.known}" → "${phrase.target}"`);
      } else {
        const { error: insertError } = await supabase
          .from('course_practice_phrases')
          .insert(record);

        if (insertError) {
          console.error(`    ERROR inserting: ${insertError.message}`);
          totalErrors++;
        } else {
          console.log(`    ✓ P${nextPosition}: "${phrase.known}" → "${phrase.target}"`);
          totalInserted++;
        }
      }

      nextPosition++;
    }

    // Update max position map for next iteration
    maxPositionMap[legoKey] = nextPosition - 1;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`SUMMARY${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Inserted: ${totalInserted}`);
  console.log(`Skipped:  ${totalSkipped}`);
  console.log(`Errors:   ${totalErrors}`);

  if (dryRun) {
    console.log(`\nRun without --dry-run to actually insert phrases.`);
  }
}

main().catch(console.error);
