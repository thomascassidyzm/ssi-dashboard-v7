/**
 * Backfill: Add "empty" seed sentences as USE phrases.
 *
 * An "empty" seed is one where ALL words in its target are already in vocab
 * from prior seeds (no new vocabulary introduced).
 *
 * For each empty seed:
 *   1. For each word in the seed target, find which is_new=true LEGO introduced it
 *   2. The highest-indexed such LEGO is the "newest" word in the seed
 *   3. Add the seed sentence as a USE phrase to that LEGO
 *
 * Usage: node scripts/backfill-seed-use-phrases.cjs [course_code]
 *   If no course_code, runs for ALL courses.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function backfill(courseCode) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Backfilling empty-seed USE phrases for: ${courseCode || 'ALL COURSES'}`);
  console.log(`${'='.repeat(60)}\n`);

  // 1. Get all courses (or just the specified one)
  let courses;
  if (courseCode) {
    courses = [{ course_code: courseCode }];
  } else {
    const { data } = await supabase
      .from('courses')
      .select('course_code')
      .not('course_code', 'is', null);
    courses = data || [];
  }

  let totalAdded = 0;

  for (const { course_code } of courses) {
    console.log(`\n--- ${course_code} ---`);

    // 2. Get all seeds
    const { data: seeds } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', course_code)
      .order('seed_number');

    if (!seeds || seeds.length === 0) {
      console.log('  No seeds found, skipping.');
      continue;
    }

    // 3. Get all is_new=true LEGOs — these are the vocabulary introductions
    const { data: newLegos } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, target_text')
      .eq('course_code', course_code)
      .eq('is_new', true)
      .order('seed_number');

    if (!newLegos || newLegos.length === 0) continue;

    // 4. Build word→LEGO map: for each word, which LEGO introduced it?
    //    First LEGO (lowest seed_number) that contains the word wins.
    const wordIntroducedBy = {};  // word → { seed_number, lego_index, target_text }
    for (const l of newLegos) {
      const words = l.target_text.toLowerCase().replace(/[.,!?;:'"¿¡]/g, '').split(/\s+/).filter(Boolean);
      for (const w of words) {
        if (!wordIntroducedBy[w]) {
          wordIntroducedBy[w] = { seed_number: l.seed_number, lego_index: l.lego_index, target_text: l.target_text };
        }
      }
    }

    // 5. Build cumulative vocab set at each seed point
    const vocabBySeed = new Map();  // seed_number → Set of words available before this seed
    const cumulativeVocab = new Set();
    let seedIdx = 0;
    for (const l of newLegos) {
      // Record vocab state before each seed we haven't passed yet
      while (seedIdx < seeds.length && seeds[seedIdx].seed_number <= l.seed_number) {
        vocabBySeed.set(seeds[seedIdx].seed_number, new Set(cumulativeVocab));
        seedIdx++;
      }
      const words = l.target_text.toLowerCase().replace(/[.,!?;:'"¿¡]/g, '').split(/\s+/).filter(Boolean);
      for (const w of words) cumulativeVocab.add(w);
    }
    // Fill remaining seeds
    while (seedIdx < seeds.length) {
      vocabBySeed.set(seeds[seedIdx].seed_number, new Set(cumulativeVocab));
      seedIdx++;
    }

    // 6. Find empty seeds and match them to LEGOs
    let addedForCourse = 0;
    const toInsert = [];
    const positionOffsets = {};

    for (const seed of seeds) {
      const priorVocab = vocabBySeed.get(seed.seed_number);
      if (!priorVocab) continue;

      const seedWords = seed.target_text.toLowerCase().replace(/[.,!?;:'"¿¡]/g, '').split(/\s+/).filter(Boolean);

      // Check if ALL words are already in prior vocab
      const allInVocab = seedWords.every(w => priorVocab.has(w));
      if (!allInVocab) continue;

      // Find the highest-indexed introducing LEGO among all words in this seed
      let bestSeed = -1;
      let bestIdx = -1;
      let bestTarget = null;

      for (const w of seedWords) {
        const intro = wordIntroducedBy[w];
        if (!intro) continue;
        if (intro.seed_number > bestSeed ||
            (intro.seed_number === bestSeed && intro.lego_index > bestIdx)) {
          bestSeed = intro.seed_number;
          bestIdx = intro.lego_index;
          bestTarget = intro.target_text;
        }
      }

      if (bestSeed < 0) {
        console.log(`  S${String(seed.seed_number).padStart(4,'0')}: No introducing LEGO found, skipping`);
        continue;
      }

      const legoId = `S${String(bestSeed).padStart(4,'0')}L${String(bestIdx).padStart(2,'0')}`;

      // Check if already exists
      const { data: existing } = await supabase
        .from('course_practice_phrases')
        .select('id')
        .eq('course_code', course_code)
        .eq('seed_number', bestSeed)
        .eq('lego_index', bestIdx)
        .eq('known_text', seed.known_text)
        .eq('target_text', seed.target_text)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Find max position
      const legoKey = `${bestSeed}:${bestIdx}`;
      if (!(legoKey in positionOffsets)) {
        const { data: maxPosData } = await supabase
          .from('course_practice_phrases')
          .select('position')
          .eq('course_code', course_code)
          .eq('seed_number', bestSeed)
          .eq('lego_index', bestIdx)
          .order('position', { ascending: false })
          .limit(1);
        positionOffsets[legoKey] = maxPosData?.[0]?.position || 0;
      }
      positionOffsets[legoKey]++;

      toInsert.push({
        course_code,
        seed_number: bestSeed,
        lego_index: bestIdx,
        position: positionOffsets[legoKey],
        known_text: seed.known_text,
        target_text: seed.target_text,
        word_count: seed.target_text.length,
        lego_count: (seed.known_text.match(/\s+/g) || []).length + 1,
        phrase_role: 'use',
        connected_lego_ids: [],
        metadata: {
          format: 'build_use',
          source: 'seed_sentence',
          source_seed: seed.seed_number,
          score: 8
        },
        status: 'draft',
        version: 1
      });

      console.log(`  S${String(seed.seed_number).padStart(4,'0')}: "${seed.known_text}" / "${seed.target_text}" → ${legoId} (${bestTarget})`);
      addedForCourse++;
    }

    // Batch insert
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('course_practice_phrases')
        .insert(toInsert);

      if (error) {
        console.error(`  ERROR inserting phrases: ${error.message}`);
      } else {
        console.log(`\n  ✓ Added ${addedForCourse} seed-as-USE-phrases for ${course_code}`);
        totalAdded += addedForCourse;
      }
    } else {
      console.log('  No empty seeds need backfilling.');
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOTAL: ${totalAdded} seed sentences added as USE phrases`);
  console.log(`${'='.repeat(60)}\n`);
}

const courseArg = process.argv[2];
backfill(courseArg).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
