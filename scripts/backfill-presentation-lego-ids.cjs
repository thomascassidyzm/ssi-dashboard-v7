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

  // 1. Get ALL presentations (we'll fix any with wrong lego_id)
  const { data: presentations, error: presError } = await supabase
    .from('course_audio')
    .select('id, text, lego_id')
    .eq('course_code', courseCode)
    .eq('role', 'presentation');

  if (presError) {
    console.error('Error fetching presentations:', presError.message);
    return;
  }

  if (!presentations?.length) {
    console.log('No presentations found. Nothing to do!');
    return { updated: 0, failed: 0 };
  }

  console.log(`Found ${presentations.length} total presentations`);

  // 2. Get LEGOs with is_new=true (first occurrences only), ordered by seed_number
  const { data: legos, error: legoError } = await supabase
    .from('course_legos')
    .select('lego_id, known_text, seed_number')
    .eq('course_code', courseCode)
    .eq('is_new', true)
    .order('seed_number', { ascending: true });

  if (legoError) {
    console.error('Error fetching LEGOs:', legoError.message);
    return;
  }

  // Build lookup: normalized known_text -> lego_id (only first occurrences)
  const legoMap = new Map();
  for (const lego of legos || []) {
    const normalized = lego.known_text.toLowerCase().trim();
    if (!legoMap.has(normalized)) {
      legoMap.set(normalized, lego.lego_id);
    }
  }
  console.log(`Loaded ${legoMap.size} unique LEGOs (is_new=true only) for matching\n`);

  // 3. Match and collect updates (only those needing change)
  const updates = [];
  const alreadyCorrect = [];
  const failed = [];

  for (const pres of presentations) {
    const knownText = extractKnownText(pres.text);

    if (!knownText) {
      failed.push({ id: pres.id, text: pres.text, reason: 'could not parse' });
      continue;
    }

    const normalized = knownText.toLowerCase().trim();
    const correctLegoId = legoMap.get(normalized);

    if (!correctLegoId) {
      failed.push({ id: pres.id, text: pres.text, extracted: knownText, reason: 'no matching LEGO' });
      continue;
    }

    // Only update if lego_id is wrong or null
    if (pres.lego_id !== correctLegoId) {
      updates.push({
        id: pres.id,
        lego_id: correctLegoId,
        known_text: knownText,
        old_lego_id: pres.lego_id
      });
    } else {
      alreadyCorrect.push({ id: pres.id, lego_id: correctLegoId });
    }
  }

  console.log(`Already correct: ${alreadyCorrect.length}`);
  console.log(`Need update: ${updates.length}`);
  console.log(`Failed to match: ${failed.length}`);

  // Show samples
  if (updates.length > 0) {
    console.log('\nSample corrections:');
    for (const u of updates.slice(0, 10)) {
      console.log(`  "${u.known_text}": ${u.old_lego_id || 'null'} -> ${u.lego_id}`);
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
