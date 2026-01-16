#!/usr/bin/env node
/**
 * Reset seeds 61-668 for zho_for_eng course
 * - Deletes LEGOs and phrases for seeds 61+
 * - Clears target_text for seeds 61+
 * - Repopulates known_text from canonical_seeds with {target} replaced dynamically
 *
 * Seeds 1-60 are NOT touched (these are the high-quality seeds).
 */

const { createClient } = require('@supabase/supabase-js');
const { parseCourseCode } = require('../services/language-code-service.cjs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const COURSE_CODE = 'zho_for_eng';
const START_SEED = 61;
const END_SEED = 668;

// Map course target codes to display names (handles zho → Chinese since CSV has cmn)
const TARGET_DISPLAY_NAMES = {
  'zho': 'Chinese',
  'cmn': 'Chinese',
  'spa': 'Spanish',
  'ita': 'Italian',
  'fra': 'French',
  'deu': 'German',
  'por': 'Portuguese',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'cym': 'Welsh'
};

async function reset() {
  // Get target language name dynamically
  const courseInfo = parseCourseCode(COURSE_CODE);
  if (!courseInfo) {
    throw new Error(`Invalid course code: ${COURSE_CODE}`);
  }

  // Use explicit mapping for display name, fallback to service name
  const targetLanguageName = TARGET_DISPLAY_NAMES[courseInfo.targetLegacy] || courseInfo.targetName;
  console.log(`\n🧹 Resetting ${COURSE_CODE} seeds ${START_SEED}-${END_SEED}...`);
  console.log(`   Target language: ${targetLanguageName} (will replace {target} placeholder)\n`);

  // 1. Delete phrases for seeds 61+
  console.log('1. Deleting practice phrases for seeds 61+...');
  const { error: phraseErr, count: phraseCount } = await supabase
    .from('course_practice_phrases')
    .delete({ count: 'exact' })
    .eq('course_code', COURSE_CODE)
    .gte('seed_number', START_SEED);

  if (phraseErr) throw phraseErr;
  console.log(`   Deleted ${phraseCount || 0} phrases`);

  // 2. Delete LEGOs for seeds 61+
  console.log('\n2. Deleting LEGOs for seeds 61+...');
  const { error: legoErr, count: legoCount } = await supabase
    .from('course_legos')
    .delete({ count: 'exact' })
    .eq('course_code', COURSE_CODE)
    .gte('seed_number', START_SEED);

  if (legoErr) throw legoErr;
  console.log(`   Deleted ${legoCount || 0} LEGOs`);

  // 3. Clear target_text for seeds 61+
  console.log('\n3. Clearing target_text for seeds 61+...');
  const { error: clearErr, count: clearCount } = await supabase
    .from('course_seeds')
    .update({ target_text: '' }, { count: 'exact' })
    .eq('course_code', COURSE_CODE)
    .gte('seed_number', START_SEED);

  if (clearErr) throw clearErr;
  console.log(`   Cleared ${clearCount || 0} seed translations`);

  // 4. Fetch canonical seeds and repopulate known_text with {target} replaced
  console.log('\n4. Repopulating known_text from canonical_seeds...');
  const { data: canonical, error: canonErr } = await supabase
    .from('canonical_seeds')
    .select('seed_number, seed_id, source_text')
    .gte('seed_number', START_SEED)
    .lte('seed_number', END_SEED)
    .order('seed_number');

  if (canonErr) throw canonErr;
  console.log(`   Found ${canonical?.length || 0} canonical seeds`);

  // Upsert course_seeds with known_text (dynamic {target} replacement)
  let upserted = 0;
  let targetReplaced = 0;
  for (const seed of canonical || []) {
    const knownText = seed.source_text.replace(/{target}/g, targetLanguageName);
    if (knownText !== seed.source_text) {
      targetReplaced++;
    }

    const { error: upsertErr } = await supabase
      .from('course_seeds')
      .upsert({
        course_code: COURSE_CODE,
        seed_number: seed.seed_number,
        seed_id: seed.seed_id,
        known_text: knownText,
        target_text: ''
      }, { onConflict: 'course_code,seed_number' });

    if (upsertErr) {
      console.error(`   Error upserting seed ${seed.seed_number}:`, upsertErr.message);
    } else {
      upserted++;
    }
  }
  console.log(`   Upserted ${upserted} seeds with known_text`);
  console.log(`   Replaced {target} → "${targetLanguageName}" in ${targetReplaced} seeds`);

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
  console.log(`   Total LEGOs: ${totalLegos} (should be from seeds 1-60 only)`);
  console.log(`   Total phrases: ${totalPhrases} (should be from seeds 1-60 only)`);

  // Show sample of seeds with {target} replacement
  console.log('\n6. Sample seeds with {target} replacement:');
  const { data: sampleSeeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text')
    .eq('course_code', COURSE_CODE)
    .gte('seed_number', START_SEED)
    .order('seed_number')
    .limit(5);

  for (const s of sampleSeeds || []) {
    console.log(`   S${String(s.seed_number).padStart(4, '0')}: ${s.known_text}`);
  }

  console.log('\n✅ Reset complete! Seeds 61-668 are ready for fresh content generation.\n');
}

reset().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
