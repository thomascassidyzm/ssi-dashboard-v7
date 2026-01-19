/**
 * Backfill lego_id on existing presentation audio records
 *
 * This is a ONE-TIME migration script. After running:
 * - Existing presentations will have lego_id set
 * - No audio regeneration needed
 * - populate-lego-introductions.cjs will work without regex
 *
 * Usage: node scripts/backfill-presentation-lego-ids.cjs <course_code> [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * Extract known_text from presentation text
 * Handles contractions like "don't", "I'm", "it's"
 *
 * Patterns:
 *   "The German for 'don't', as in 'I don't want to', is:"
 *   "The Chinese for 'I want', is:"
 *   "The Spanish for 'hello' is:"
 */
function extractKnownText(presentationText) {
  // Match: The {language} for '{known_text}'
  // Use greedy match up to the LAST single quote before ", as in" or ", is:" or " is:"

  // First, find "The X for '"
  const startMatch = presentationText.match(/^The \w+ for '/);
  if (!startMatch) return null;

  const afterStart = presentationText.slice(startMatch[0].length);

  // Find where the known_text ends - look for ', as in' or ', is:' or ' is:'
  // The known_text is everything up to that point
  const endPatterns = [
    "', as in '",  // "The X for 'Y', as in 'Z', is:"
    "', is:",      // "The X for 'Y', is:"
    "' is:",       // "The X for 'Y' is:"
    "',",          // Fallback: ends with quote-comma
  ];

  for (const pattern of endPatterns) {
    const idx = afterStart.indexOf(pattern);
    if (idx !== -1) {
      return afterStart.slice(0, idx);
    }
  }

  // Last resort: find the first "'" that's followed by space or comma or end
  const simpleMatch = afterStart.match(/^(.+?)'/);
  if (simpleMatch) {
    return simpleMatch[1];
  }

  return null;
}

async function backfillLegoIds(courseCode, dryRun = false) {
  console.log(`\n=== Backfilling lego_id for ${courseCode} presentations ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}\n`);

  // 1. Get presentations WITHOUT lego_id
  const { data: presentations, error: presError } = await supabase
    .from('course_audio')
    .select('id, text')
    .eq('course_code', courseCode)
    .eq('role', 'presentation')
    .is('lego_id', null);

  if (presError) {
    console.error('Error fetching presentations:', presError.message);
    return;
  }

  if (!presentations?.length) {
    console.log('No presentations missing lego_id. Nothing to do!');
    return { updated: 0, failed: 0 };
  }

  console.log(`Found ${presentations.length} presentations missing lego_id`);

  // 2. Get all LEGOs for lookup
  const { data: legos, error: legoError } = await supabase
    .from('lego_cycles')
    .select('lego_id, known_text')
    .eq('course_code', courseCode);

  if (legoError) {
    console.error('Error fetching LEGOs:', legoError.message);
    return;
  }

  // Build lookup: normalized known_text -> lego_id
  const legoMap = new Map();
  for (const lego of legos || []) {
    const normalized = lego.known_text.toLowerCase().trim();
    if (!legoMap.has(normalized)) {
      legoMap.set(normalized, lego.lego_id);
    }
  }
  console.log(`Loaded ${legoMap.size} unique LEGOs for matching\n`);

  // 3. Match and collect updates
  const updates = [];
  const failed = [];

  for (const pres of presentations) {
    const knownText = extractKnownText(pres.text);

    if (!knownText) {
      failed.push({ id: pres.id, text: pres.text, reason: 'could not parse' });
      continue;
    }

    const normalized = knownText.toLowerCase().trim();
    const legoId = legoMap.get(normalized);

    if (!legoId) {
      failed.push({ id: pres.id, text: pres.text, extracted: knownText, reason: 'no matching LEGO' });
      continue;
    }

    updates.push({ id: pres.id, lego_id: legoId, known_text: knownText });
  }

  console.log(`Matched: ${updates.length}`);
  console.log(`Failed: ${failed.length}`);

  // Show samples
  if (updates.length > 0) {
    console.log('\nSample matches:');
    for (const u of updates.slice(0, 5)) {
      console.log(`  "${u.known_text}" -> ${u.lego_id}`);
    }
  }

  if (failed.length > 0) {
    console.log('\nFailed to match:');
    for (const f of failed.slice(0, 10)) {
      console.log(`  ${f.reason}: "${f.extracted || f.text.substring(0, 60)}..."`);
    }
    if (failed.length > 10) {
      console.log(`  ... and ${failed.length - 10} more`);
    }
  }

  // 4. Apply updates
  if (!dryRun && updates.length > 0) {
    console.log(`\nUpdating ${updates.length} records...`);

    let successCount = 0;
    let errorCount = 0;

    // Update one at a time (Supabase doesn't support bulk UPDATE with different values)
    for (const update of updates) {
      const { error } = await supabase
        .from('course_audio')
        .update({ lego_id: update.lego_id })
        .eq('id', update.id);

      if (error) {
        console.error(`  Failed to update ${update.id}: ${error.message}`);
        errorCount++;
      } else {
        successCount++;
      }

      // Progress every 50
      if ((successCount + errorCount) % 50 === 0) {
        console.log(`  Progress: ${successCount + errorCount}/${updates.length}`);
      }
    }

    console.log(`\nDone! Updated: ${successCount}, Errors: ${errorCount}`);
    return { updated: successCount, failed: failed.length + errorCount };
  } else if (dryRun) {
    console.log('\n[DRY RUN] Would update these records - run without --dry-run to execute');
    return { updated: 0, failed: failed.length, wouldUpdate: updates.length };
  }
}

// Main
const args = process.argv.slice(2);
const courseCode = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!courseCode) {
  console.log('Usage: node scripts/backfill-presentation-lego-ids.cjs <course_code> [--dry-run]');
  console.log('Example: node scripts/backfill-presentation-lego-ids.cjs zho_for_eng --dry-run');
  process.exit(1);
}

backfillLegoIds(courseCode, dryRun);
