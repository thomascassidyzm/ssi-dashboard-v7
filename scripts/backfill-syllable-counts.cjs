/**
 * Backfill syllable counts for Welsh (en-cy-north) practice phrases
 * Uses Claude API to count syllables in batches
 *
 * Usage:
 *   node scripts/backfill-syllable-counts.cjs --dry-run    # Preview what will be done
 *   node scripts/backfill-syllable-counts.cjs --execute    # Actually update the database
 *   node scripts/backfill-syllable-counts.cjs --batch=0    # Process batch 0 only (for parallel runs)
 */

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic();

const BATCH_SIZE = 50; // Phrases per LLM call
const COURSE_CODE = 'en-cy-north';

async function getUniquePhrases() {
  console.log('Fetching unique target phrases...');

  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, target_text, target_syllable_count')
    .eq('course_code', COURSE_CODE)
    .is('target_syllable_count', null); // Only those without syllable count

  if (error) throw error;

  // Dedupe by target_text but keep all IDs
  const phraseMap = new Map();
  for (const row of data) {
    if (!phraseMap.has(row.target_text)) {
      phraseMap.set(row.target_text, []);
    }
    phraseMap.get(row.target_text).push(row.id);
  }

  console.log(`Found ${phraseMap.size} unique phrases needing syllable counts`);
  return phraseMap;
}

async function countSyllablesWithLLM(phrases) {
  const phraseList = phrases.map((p, i) => `${i + 1}. ${p}`).join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Count the syllables in each Welsh phrase below. Return ONLY a JSON array of numbers, one per phrase, in order.

Welsh syllable rules:
- Each vowel (a, e, i, o, u, w, y) typically = 1 syllable
- 'w' and 'y' can be vowels in Welsh
- Diphthongs (ae, ai, au, aw, ei, eu, ew, oe, oi, ou, ow, wy) = 1 syllable
- 'll', 'ch', 'dd', 'ff', 'ng', 'ph', 'rh', 'th' are single consonants

Phrases:
${phraseList}

Return ONLY the JSON array, e.g. [2, 3, 1, 4]`
    }]
  });

  const text = response.content[0].text.trim();
  // Extract JSON array from response
  const match = text.match(/\[[\d,\s]+\]/);
  if (!match) {
    console.error('Failed to parse LLM response:', text);
    throw new Error('Invalid LLM response format');
  }

  return JSON.parse(match[0]);
}

async function updateDatabase(phraseToIds, syllableCounts) {
  const updates = [];
  const entries = [...phraseToIds.entries()];

  for (let i = 0; i < entries.length; i++) {
    const [phrase, ids] = entries[i];
    const syllableCount = syllableCounts[i];

    for (const id of ids) {
      updates.push({ id, target_syllable_count: syllableCount });
    }
  }

  console.log(`Updating ${updates.length} rows...`);

  // Batch update in chunks of 100
  for (let i = 0; i < updates.length; i += 100) {
    const batch = updates.slice(i, i + 100);

    for (const update of batch) {
      const { error } = await supabase
        .from('course_practice_phrases')
        .update({ target_syllable_count: update.target_syllable_count })
        .eq('id', update.id);

      if (error) {
        console.error(`Failed to update ${update.id}:`, error.message);
      }
    }

    console.log(`  Updated ${Math.min(i + 100, updates.length)} / ${updates.length}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');
  const batchArg = args.find(a => a.startsWith('--batch='));
  const specificBatch = batchArg ? parseInt(batchArg.split('=')[1]) : null;

  if (!dryRun && !execute) {
    console.log('Usage:');
    console.log('  node scripts/backfill-syllable-counts.cjs --dry-run');
    console.log('  node scripts/backfill-syllable-counts.cjs --execute');
    console.log('  node scripts/backfill-syllable-counts.cjs --execute --batch=0');
    process.exit(1);
  }

  // Get unique phrases needing counts
  const phraseMap = await getUniquePhrases();
  const phrases = [...phraseMap.keys()];

  if (phrases.length === 0) {
    console.log('All phrases already have syllable counts!');
    return;
  }

  // Split into batches
  const batches = [];
  for (let i = 0; i < phrases.length; i += BATCH_SIZE) {
    batches.push(phrases.slice(i, i + BATCH_SIZE));
  }

  console.log(`Split into ${batches.length} batches of ~${BATCH_SIZE} phrases each`);

  if (dryRun) {
    console.log('\n--- DRY RUN ---');
    console.log('Would process these batches:');
    batches.forEach((batch, i) => {
      console.log(`  Batch ${i}: ${batch.length} phrases`);
      if (i === 0) {
        console.log('    Sample:', batch.slice(0, 3).join(', '));
      }
    });
    console.log('\nRun with --execute to actually update the database.');
    return;
  }

  // Process batches
  const batchesToProcess = specificBatch !== null ? [batches[specificBatch]] : batches;
  const startIdx = specificBatch !== null ? specificBatch : 0;

  for (let i = 0; i < batchesToProcess.length; i++) {
    const batchIdx = startIdx + i;
    const batch = batchesToProcess[i];

    console.log(`\nProcessing batch ${batchIdx + 1}/${batches.length} (${batch.length} phrases)...`);

    try {
      // Get syllable counts from LLM
      const syllableCounts = await countSyllablesWithLLM(batch);

      if (syllableCounts.length !== batch.length) {
        console.error(`Mismatch: got ${syllableCounts.length} counts for ${batch.length} phrases`);
        continue;
      }

      // Build subset of phraseMap for this batch
      const batchPhraseMap = new Map();
      for (const phrase of batch) {
        batchPhraseMap.set(phrase, phraseMap.get(phrase));
      }

      // Show some results
      console.log('  Sample results:');
      batch.slice(0, 3).forEach((p, j) => {
        console.log(`    "${p}" → ${syllableCounts[j]} syllables`);
      });

      // Update database
      await updateDatabase(batchPhraseMap, syllableCounts);

      console.log(`  Batch ${batchIdx + 1} complete!`);

      // Small delay between batches to avoid rate limits
      if (i < batchesToProcess.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.error(`  Batch ${batchIdx + 1} failed:`, err.message);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
