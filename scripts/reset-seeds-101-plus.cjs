#!/usr/bin/env node
/**
 * Reset seeds 101-668 for zho_for_eng course
 * - Deletes LEGOs and phrases for seeds 101+
 * - Clears target_text for seeds 101+
 * - Repopulates known_text from canonical_seeds
 *
 * Seeds 1-100 are NOT touched.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const COURSE_CODE = 'zho_for_eng';
const START_SEED = 101;
const END_SEED = 668;

async function reset() {
  console.log(`\n🧹 Resetting ${COURSE_CODE} seeds ${START_SEED}-${END_SEED}...\n`);

  // 1. Delete phrases for seeds 101+
  console.log('1. Deleting practice phrases for seeds 101+...');
  const { error: phraseErr, count: phraseCount } = await supabase
    .from('course_practice_phrases')
    .delete({ count: 'exact' })
    .eq('course_code', COURSE_CODE)
    .gte('seed_number', START_SEED);

  if (phraseErr) throw phraseErr;
  console.log(`   Deleted ${phraseCount || 0} phrases`);

  // 2. Delete LEGOs for seeds 101+
  console.log('\n2. Deleting LEGOs for seeds 101+...');
  const { error: legoErr, count: legoCount } = await supabase
    .from('course_legos')
    .delete({ count: 'exact' })
    .eq('course_code', COURSE_CODE)
    .gte('seed_number', START_SEED);

  if (legoErr) throw legoErr;
  console.log(`   Deleted ${legoCount || 0} LEGOs`);

  // 3. Clear target_text for seeds 101+
  console.log('\n3. Clearing target_text for seeds 101+...');
  const { error: clearErr, count: clearCount } = await supabase
    .from('course_seeds')
    .update({ target_text: '' }, { count: 'exact' })
    .eq('course_code', COURSE_CODE)
    .gte('seed_number', START_SEED);

  if (clearErr) throw clearErr;
  console.log(`   Cleared ${clearCount || 0} seed translations`);

  // 4. Fetch canonical seeds and ensure known_text is populated
  console.log('\n4. Repopulating known_text from canonical_seeds...');
  const { data: canonical, error: canonErr } = await supabase
    .from('canonical_seeds')
    .select('seed_number, seed_id, source_text')
    .gte('seed_number', START_SEED)
    .lte('seed_number', END_SEED)
    .order('seed_number');

  if (canonErr) throw canonErr;
  console.log(`   Found ${canonical?.length || 0} canonical seeds`);

  // Upsert course_seeds with known_text
  let upserted = 0;
  for (const seed of canonical || []) {
    const { error: upsertErr } = await supabase
      .from('course_seeds')
      .upsert({
        course_code: COURSE_CODE,
        seed_number: seed.seed_number,
        seed_id: seed.seed_id,
        known_text: seed.source_text.replace('{target}', 'Chinese'),
        target_text: ''
      }, { onConflict: 'course_code,seed_number' });

    if (upsertErr) {
      console.error(`   Error upserting seed ${seed.seed_number}:`, upsertErr.message);
    } else {
      upserted++;
    }
  }
  console.log(`   Upserted ${upserted} seeds with known_text`);

  // 5. Verify
  console.log('\n5. Verification...');
  const { count: totalSeeds } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE);

  const { count: totalLegos } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE);

  const { count: totalPhrases } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE_CODE);

  console.log(`   Total seeds: ${totalSeeds}`);
  console.log(`   Total LEGOs: ${totalLegos} (should be from seeds 1-100 only)`);
  console.log(`   Total phrases: ${totalPhrases} (should be from seeds 1-100 only)`);

  console.log('\n✅ Reset complete! Seeds 101-668 are ready for fresh content.\n');
}

reset().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
