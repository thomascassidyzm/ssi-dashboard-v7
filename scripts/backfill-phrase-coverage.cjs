#!/usr/bin/env node
/**
 * Backfill Phrase Coverage Metadata
 *
 * This script populates the new phrase_role, connected_lego_ids, and lego_position
 * columns for existing practice phrases.
 *
 * Usage:
 *   node scripts/backfill-phrase-coverage.cjs <course_code>
 *   node scripts/backfill-phrase-coverage.cjs zho_for_eng
 *   node scripts/backfill-phrase-coverage.cjs --all  # Process all courses
 *
 * Options:
 *   --dry-run  Show what would be updated without making changes
 *   --verbose  Show detailed progress
 *
 * @version 1.0.0
 * @date 2026-01-18
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================================================
// HELPERS (copied from course-data-service.cjs)
// =============================================================================

function computePhraseRole(position) {
  if (position === 0) return 'component';
  if (position >= 8) return 'eternal_eligible';
  return 'practice';
}

function computeConnectedLegoIds(phraseTargetText, primaryLegoTarget, allLegos) {
  if (!allLegos || !Array.isArray(allLegos)) return [];

  const connectedIds = [];
  const normalizedPhrase = phraseTargetText.toLowerCase().trim();
  const normalizedPrimary = primaryLegoTarget.toLowerCase().trim();

  for (const lego of allLegos) {
    const legoTarget = (lego.target_text || lego.target || '').toLowerCase().trim();
    if (legoTarget === normalizedPrimary) continue;
    if (legoTarget.length < 2) continue;
    if (normalizedPhrase.includes(legoTarget)) {
      connectedIds.push(lego.lego_id);
    }
  }

  return connectedIds;
}

function computeLegoPosition(phraseTargetText, legoTargetText) {
  if (!phraseTargetText || !legoTargetText) return null;

  const phrase = phraseTargetText.trim();
  const lego = legoTargetText.trim();
  const index = phrase.indexOf(lego);
  if (index === -1) return null;

  const phraseLength = phrase.length;
  const legoLength = lego.length;
  const legoEndIndex = index + legoLength;
  const startPercent = index / phraseLength;
  const endPercent = legoEndIndex / phraseLength;
  const centerPercent = (startPercent + endPercent) / 2;

  if (centerPercent < 0.33) return 'start';
  if (centerPercent > 0.67) return 'end';
  return 'middle';
}

// =============================================================================
// MAIN LOGIC
// =============================================================================

async function getAllCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('course_code')
    .order('course_code');

  if (error) throw error;
  return data.map(c => c.course_code);
}

async function getAllLegosForCourse(courseCode) {
  const { data, error } = await supabase
    .from('course_legos')
    .select('lego_id, seed_number, lego_index, target_text')
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index');

  if (error) throw error;
  return data || [];
}

async function getPhrasesForCourse(courseCode) {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, position, target_text, phrase_role, connected_lego_ids, lego_position')
    .eq('course_code', courseCode)
    .order('seed_number')
    .order('lego_index')
    .order('position');

  if (error) throw error;
  return data || [];
}

async function updatePhrase(id, updates) {
  const { error } = await supabase
    .from('course_practice_phrases')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

async function backfillCourse(courseCode, options = {}) {
  const { dryRun, verbose } = options;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing course: ${courseCode}`);
  console.log('='.repeat(60));

  // Get all LEGOs for the course (needed for connected_lego_ids computation)
  const allLegos = await getAllLegosForCourse(courseCode);
  console.log(`Found ${allLegos.length} LEGOs`);

  // Create a map of seed_number+lego_index -> LEGO
  const legoMap = new Map();
  for (const lego of allLegos) {
    const key = `${lego.seed_number}-${lego.lego_index}`;
    legoMap.set(key, lego);
  }

  // Get all phrases
  const phrases = await getPhrasesForCourse(courseCode);
  console.log(`Found ${phrases.length} phrases to process`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const phrase of phrases) {
    try {
      const legoKey = `${phrase.seed_number}-${phrase.lego_index}`;
      const primaryLego = legoMap.get(legoKey);

      if (!primaryLego) {
        if (verbose) console.log(`  Warning: No LEGO found for phrase ${phrase.id}`);
        skippedCount++;
        continue;
      }

      // Get LEGOs introduced before this phrase's LEGO
      const introducedLegos = allLegos.filter(l =>
        l.seed_number < phrase.seed_number ||
        (l.seed_number === phrase.seed_number && l.lego_index < phrase.lego_index)
      );

      // Compute new values
      const newPhraseRole = computePhraseRole(phrase.position);
      const newConnectedIds = computeConnectedLegoIds(
        phrase.target_text,
        primaryLego.target_text,
        introducedLegos
      );
      const newLegoPosition = computeLegoPosition(
        phrase.target_text,
        primaryLego.target_text
      );

      // Check if update is needed
      const needsUpdate =
        phrase.phrase_role !== newPhraseRole ||
        JSON.stringify(phrase.connected_lego_ids || []) !== JSON.stringify(newConnectedIds) ||
        phrase.lego_position !== newLegoPosition;

      if (!needsUpdate) {
        skippedCount++;
        continue;
      }

      if (verbose) {
        console.log(`  Updating S${String(phrase.seed_number).padStart(4,'0')}L${String(phrase.lego_index).padStart(2,'0')} pos ${phrase.position}:`);
        console.log(`    phrase_role: ${phrase.phrase_role} -> ${newPhraseRole}`);
        console.log(`    connected_lego_ids: [${(phrase.connected_lego_ids || []).join(', ')}] -> [${newConnectedIds.join(', ')}]`);
        console.log(`    lego_position: ${phrase.lego_position} -> ${newLegoPosition}`);
      }

      if (!dryRun) {
        await updatePhrase(phrase.id, {
          phrase_role: newPhraseRole,
          connected_lego_ids: newConnectedIds,
          lego_position: newLegoPosition
        });
      }

      updatedCount++;
    } catch (err) {
      console.error(`  Error processing phrase ${phrase.id}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\nResults for ${courseCode}:`);
  console.log(`  Updated: ${updatedCount}`);
  console.log(`  Skipped (no change): ${skippedCount}`);
  console.log(`  Errors: ${errorCount}`);

  return { updated: updatedCount, skipped: skippedCount, errors: errorCount };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/backfill-phrase-coverage.cjs <course_code> [--dry-run] [--verbose]');
    console.log('       node scripts/backfill-phrase-coverage.cjs --all [--dry-run] [--verbose]');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const processAll = args.includes('--all');

  if (dryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  let courseCodes;
  if (processAll) {
    courseCodes = await getAllCourses();
    console.log(`Found ${courseCodes.length} courses to process`);
  } else {
    courseCodes = args.filter(a => !a.startsWith('--'));
  }

  const totals = { updated: 0, skipped: 0, errors: 0 };

  for (const courseCode of courseCodes) {
    const result = await backfillCourse(courseCode, { dryRun, verbose });
    totals.updated += result.updated;
    totals.skipped += result.skipped;
    totals.errors += result.errors;
  }

  console.log('\n' + '='.repeat(60));
  console.log('TOTALS:');
  console.log('='.repeat(60));
  console.log(`  Updated: ${totals.updated}`);
  console.log(`  Skipped: ${totals.skipped}`);
  console.log(`  Errors: ${totals.errors}`);

  if (dryRun) {
    console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
