/**
 * Populate lego_introductions table by matching presentation audio to LEGOs
 *
 * This script:
 * 1. Gets all presentation audio from course_audio
 * 2. Extracts the LEGO known_text from presentation text pattern
 * 3. Matches to lego_cycles to get lego_id
 * 4. Inserts into lego_introductions
 *
 * Usage: node scripts/populate-lego-introductions.cjs <course_code> [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function populateLegoIntroductions(courseCode, dryRun = false) {
  console.log(`\n=== Populating lego_introductions for ${courseCode} ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`);

  // 1. Get all presentation audio for this course
  const { data: presentations, error: presError } = await supabase
    .from('course_audio')
    .select('id, text, s3_key')
    .eq('course_code', courseCode)
    .eq('role', 'presentation');

  if (presError) {
    console.error('Error fetching presentations:', presError.message);
    return;
  }

  console.log(`Found ${presentations?.length || 0} presentation audio files`);

  // 2. Get unique LEGOs from lego_cycles
  const { data: legoCycles, error: legoError } = await supabase
    .from('lego_cycles')
    .select('lego_id, known_text, target_text')
    .eq('course_code', courseCode);

  if (legoError) {
    console.error('Error fetching LEGOs:', legoError.message);
    return;
  }

  // Build lookup map: normalized known_text -> lego_id
  const legoMap = new Map();
  for (const lego of legoCycles || []) {
    const normalized = lego.known_text.toLowerCase().trim();
    if (!legoMap.has(normalized)) {
      legoMap.set(normalized, lego.lego_id);
    }
  }
  console.log(`Found ${legoMap.size} unique LEGOs\n`);

  // 3. Match presentations to LEGOs
  const matchMap = new Map();  // lego_id -> match (dedupe, first wins)
  const unmatched = [];

  for (const pres of presentations || []) {
    // Extract known text from: "The German for 'X', as in 'Y', is:"
    // or "The German for 'X', is:"
    // Handle contractions like "I'm", "don't" by matching until ', as in' or ', is:'
    const match = pres.text.match(/The \w+ for '(.+?)'(?:,\s*(?:as in|is:))/);
    if (!match) {
      unmatched.push({ id: pres.id, text: pres.text, reason: 'no pattern match' });
      continue;
    }

    const extractedKnown = match[1].toLowerCase().trim();
    const legoId = legoMap.get(extractedKnown);

    if (!legoId) {
      unmatched.push({ id: pres.id, text: pres.text, extracted: match[1], reason: 'no LEGO match' });
      continue;
    }

    // Dedupe - first match wins
    if (!matchMap.has(legoId)) {
      matchMap.set(legoId, {
        course_code: courseCode,
        lego_id: legoId,
        presentation_audio_id: pres.id,
        audio_uuid: pres.id,
      });
    }
  }

  const matches = Array.from(matchMap.values());

  console.log(`Matched: ${matches.length}`);
  console.log(`Unmatched: ${unmatched.length}`);

  // Show sample matches
  console.log('\nSample matches:');
  for (const m of matches.slice(0, 5)) {
    console.log(`  ${m.course_code}/${m.lego_id} -> ${m.presentation_audio_id}`);
  }

  // Show unmatched (first 10)
  if (unmatched.length > 0) {
    console.log('\nUnmatched (first 10):');
    for (const u of unmatched.slice(0, 10)) {
      console.log(`  ${u.reason}: "${u.extracted || u.text.substring(0, 50)}..."`);
    }
  }

  // 4. Insert into lego_introductions
  if (!dryRun && matches.length > 0) {
    console.log(`\nInserting ${matches.length} records into lego_introductions...`);

    // Delete existing entries for this course first
    const { error: deleteError } = await supabase
      .from('lego_introductions')
      .delete()
      .eq('course_code', courseCode);

    if (deleteError) {
      console.error('Error deleting existing entries:', deleteError.message);
      return;
    }

    // Insert in batches of 500
    const batchSize = 500;
    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('lego_introductions')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError.message);
        return;
      }
      console.log(`  Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
    }

    console.log('\nDone!');
  } else if (dryRun) {
    console.log('\n[DRY RUN] Would insert these records - run without --dry-run to execute');
  }

  return { matched: matches.length, unmatched: unmatched.length };
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
