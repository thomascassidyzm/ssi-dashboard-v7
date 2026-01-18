/**
 * Populate lego_introductions table from course_audio.lego_id
 *
 * This script uses the direct lego_id column in course_audio (no regex parsing!)
 *
 * For presentations WITH lego_id:
 *   - Direct insert into lego_introductions
 *
 * For presentations WITHOUT lego_id (legacy):
 *   - Reports them for manual review or regeneration
 *
 * Usage: node scripts/populate-lego-introductions.cjs <course_code> [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function populateLegoIntroductions(courseCode, dryRun = false) {
  console.log(`\n=== Populating lego_introductions for ${courseCode} ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`);

  // Get all presentation audio for this course
  const { data: presentations, error: presError } = await supabase
    .from('course_audio')
    .select('id, text, s3_key, lego_id')
    .eq('course_code', courseCode)
    .eq('role', 'presentation');

  if (presError) {
    console.error('Error fetching presentations:', presError.message);
    return;
  }

  console.log(`Found ${presentations?.length || 0} presentation audio files`);

  // Split into those with lego_id and those without
  const withLegoId = presentations?.filter(p => p.lego_id) || [];
  const withoutLegoId = presentations?.filter(p => !p.lego_id) || [];

  console.log(`  With lego_id: ${withLegoId.length} (ready to link)`);
  console.log(`  Without lego_id: ${withoutLegoId.length} (need regeneration)`);

  // Build records for insert (dedupe by lego_id, first wins)
  const seen = new Set();
  const records = [];

  for (const pres of withLegoId) {
    if (seen.has(pres.lego_id)) continue;
    seen.add(pres.lego_id);

    records.push({
      course_code: courseCode,
      lego_id: pres.lego_id,
      presentation_audio_id: pres.id,
      audio_uuid: pres.id,
    });
  }

  console.log(`\nRecords to insert: ${records.length}`);

  // Show sample
  console.log('\nSample records:');
  for (const r of records.slice(0, 5)) {
    console.log(`  ${r.lego_id} -> ${r.presentation_audio_id}`);
  }

  // Show presentations missing lego_id
  if (withoutLegoId.length > 0) {
    console.log(`\n⚠️  ${withoutLegoId.length} presentations missing lego_id:`);
    for (const p of withoutLegoId.slice(0, 10)) {
      console.log(`  ${p.id}: "${p.text.substring(0, 60)}..."`);
    }
    if (withoutLegoId.length > 10) {
      console.log(`  ... and ${withoutLegoId.length - 10} more`);
    }
    console.log('\nTo fix: regenerate presentations via phase8 /regenerate-presentations endpoint');
  }

  // Insert
  if (!dryRun && records.length > 0) {
    console.log(`\nInserting ${records.length} records into lego_introductions...`);

    // Upsert (update if exists)
    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('lego_introductions')
        .upsert(batch, {
          onConflict: 'course_code,lego_id',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error(`Error upserting batch ${Math.floor(i / batchSize) + 1}:`, insertError.message);
        return;
      }
      console.log(`  Upserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)`);
    }

    console.log('\nDone!');
  } else if (dryRun) {
    console.log('\n[DRY RUN] Would upsert these records - run without --dry-run to execute');
  }

  return {
    linked: records.length,
    missingLegoId: withoutLegoId.length
  };
}

// Main
const args = process.argv.slice(2);
const courseCode = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!courseCode) {
  console.log('Usage: node scripts/populate-lego-introductions.cjs <course_code> [--dry-run]');
  console.log('Example: node scripts/populate-lego-introductions.cjs deu_for_eng --dry-run');
  process.exit(1);
}

populateLegoIntroductions(courseCode, dryRun);
