/**
 * Update syllable counts for Welsh (en-cy-north) practice phrases
 * Uses algorithmic Welsh syllable counting
 *
 * Usage:
 *   node scripts/update-syllable-counts.cjs --dry-run    # Preview
 *   node scripts/update-syllable-counts.cjs --execute    # Actually update
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Welsh diphthongs - count as single syllable
const DIPHTHONGS = [
  'ae', 'ai', 'au', 'aw',
  'ei', 'eu', 'ew',
  'oe', 'oi', 'ou', 'ow',
  'wy', 'yw', 'iw', 'uw'
];

// Welsh vowels (includes w and y which are vowels in Welsh)
const VOWELS = 'aeiouwy';

/**
 * Count syllables in a Welsh phrase
 * Welsh syllable rules:
 * - Each vowel (a, e, i, o, u, w, y) typically = 1 syllable
 * - Diphthongs (ae, ai, au, aw, ei, eu, ew, oe, oi, ou, ow, wy) = 1 syllable
 * - 'w' and 'y' are vowels in Welsh
 */
function countWelshSyllables(phrase) {
  // Normalize: lowercase, remove punctuation except apostrophes
  let text = phrase.toLowerCase()
    .replace(/[?!.,;:'"()]/g, '')
    .replace(/'/g, "'") // normalize apostrophes
    .trim();

  // Split into words
  const words = text.split(/\s+/);
  let totalSyllables = 0;

  for (const word of words) {
    totalSyllables += countWordSyllables(word);
  }

  return Math.max(1, totalSyllables); // At least 1 syllable
}

function countWordSyllables(word) {
  if (!word) return 0;

  let text = word.toLowerCase();
  let syllables = 0;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    // Check if current position starts a diphthong
    let foundDiphthong = false;
    for (const diph of DIPHTHONGS) {
      if (text.substring(i, i + diph.length) === diph) {
        syllables++;
        i += diph.length;
        foundDiphthong = true;
        break;
      }
    }

    if (!foundDiphthong) {
      // Check if it's a single vowel
      if (VOWELS.includes(char)) {
        syllables++;
      }
      i++;
    }
  }

  // Handle some edge cases
  // Contracted forms like 'di, 'n should not count the apostrophe part as syllables
  // But the word should have at least 1 syllable if it has vowels

  return Math.max(0, syllables);
}

async function getPhrasesNeedingCounts() {
  console.log('Fetching phrases needing syllable counts...');

  // Paginate to get all rows (Supabase default limit is 1000)
  const PAGE_SIZE = 1000;
  let allData = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('course_practice_phrases')
      .select('id, target_text, target_syllable_count')
      .eq('course_code', 'en-cy-north')
      .is('target_syllable_count', null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw error;

    allData = allData.concat(data);
    hasMore = data.length === PAGE_SIZE;
    page++;

    if (data.length > 0) {
      console.log(`  Fetched page ${page}: ${data.length} rows (total: ${allData.length})`);
    }
  }

  // Dedupe by target_text but keep all IDs
  const phraseMap = new Map();
  for (const row of allData) {
    if (!phraseMap.has(row.target_text)) {
      phraseMap.set(row.target_text, []);
    }
    phraseMap.get(row.target_text).push(row.id);
  }

  console.log(`Found ${phraseMap.size} unique phrases needing syllable counts (${allData.length} total rows)`);
  return phraseMap;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const execute = args.includes('--execute');

  if (!dryRun && !execute) {
    console.log('Usage:');
    console.log('  node scripts/update-syllable-counts.cjs --dry-run');
    console.log('  node scripts/update-syllable-counts.cjs --execute');
    process.exit(1);
  }

  const phraseMap = await getPhrasesNeedingCounts();

  if (phraseMap.size === 0) {
    console.log('All phrases already have syllable counts!');
    return;
  }

  // Calculate syllable counts
  const results = [];
  for (const [phrase, ids] of phraseMap) {
    const syllables = countWelshSyllables(phrase);
    results.push({ phrase, syllables, ids });
  }

  // Show sample results
  console.log('\nSample syllable counts:');
  results.slice(0, 20).forEach(r => {
    console.log(`  "${r.phrase}" → ${r.syllables} syllables`);
  });

  // Show distribution
  const dist = {};
  for (const r of results) {
    dist[r.syllables] = (dist[r.syllables] || 0) + 1;
  }
  console.log('\nSyllable distribution:');
  Object.entries(dist).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([syl, count]) => {
    console.log(`  ${syl} syllables: ${count} phrases`);
  });

  if (dryRun) {
    console.log('\n--- DRY RUN ---');
    console.log(`Would update ${results.reduce((sum, r) => sum + r.ids.length, 0)} rows`);
    console.log('Run with --execute to actually update the database.');
    return;
  }

  // Execute updates
  console.log('\nUpdating database...');
  let updated = 0;
  let errors = 0;

  for (const result of results) {
    for (const id of result.ids) {
      const { error } = await supabase
        .from('course_practice_phrases')
        .update({ target_syllable_count: result.syllables })
        .eq('id', id);

      if (error) {
        console.error(`Failed to update ${id}:`, error.message);
        errors++;
      } else {
        updated++;
      }
    }

    // Progress update every 100 phrases
    if (updated % 100 === 0 && updated > 0) {
      console.log(`  Updated ${updated} rows...`);
    }
  }

  console.log(`\nDone! Updated ${updated} rows (${errors} errors)`);
}

main().catch(console.error);
