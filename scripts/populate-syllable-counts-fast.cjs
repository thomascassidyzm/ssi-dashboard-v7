#!/usr/bin/env node

/**
 * Populate syllable counts for all phrases - FAST VERSION
 * Uses bulk update with PostgreSQL unnest
 */

const { createClient } = require('@supabase/supabase-js');
const { countSyllables, getLangFromCourse } = require('./syllable-counter.cjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const FETCH_BATCH_SIZE = 5000; // Fetch 5000 phrases at a time
const UPDATE_BATCH_SIZE = 1000; // Update 1000 at a time with SQL

async function populateSyllableCounts(courseCode = null) {
  console.log('='.repeat(80));
  console.log('POPULATE SYLLABLE COUNTS - FAST VERSION');
  console.log('='.repeat(80));
  console.log('');

  // Get all courses or specific course
  let courseCodes = [];
  if (courseCode) {
    courseCodes = [courseCode];
  } else {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('course_code');

    if (error) {
      console.error('Error fetching courses:', error);
      return;
    }

    courseCodes = courses.map(c => c.course_code);
  }

  console.log(`Processing ${courseCodes.length} courses...\n`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const course of courseCodes) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Processing: ${course}`);
    console.log('='.repeat(80));

    try {
      // Get target language code
      const targetLang = getLangFromCourse(course, true);

      // Fetch all phrases for this course that don't have syllable counts
      const { data: phrases, error: fetchError } = await supabase
        .from('course_practice_phrases')
        .select('id, target_text')
        .eq('course_code', course)
        .is('target_syllable_count', null);

      if (fetchError) {
        console.error(`  Error fetching phrases: ${fetchError.message}`);
        totalErrors++;
        continue;
      }

      if (!phrases || phrases.length === 0) {
        console.log(`  ✓ No phrases need syllable counts (already populated)`);
        continue;
      }

      console.log(`  Found ${phrases.length} phrases without syllable counts`);
      console.log(`  Calculating syllables...`);

      // Calculate syllables for all phrases
      const updates = phrases.map(phrase => ({
        id: phrase.id,
        syllables: countSyllables(phrase.target_text, targetLang)
      }));

      console.log(`  Updating database in batches of ${UPDATE_BATCH_SIZE}...`);

      // Update phrases in batches using individual updates (no RPC available)
      let updated = 0;
      const SUPABASE_BATCH_SIZE = 100; // Update 100 at a time to balance speed vs load

      for (let i = 0; i < updates.length; i += SUPABASE_BATCH_SIZE) {
        const batch = updates.slice(i, i + SUPABASE_BATCH_SIZE);

        // Update each phrase individually
        for (const update of batch) {
          const { error: singleError } = await supabase
            .from('course_practice_phrases')
            .update({ target_syllable_count: update.syllables })
            .eq('id', update.id);

          if (!singleError) {
            updated++;
          }
        }

        // Log progress every 500 updates
        if ((updated % 500 === 0 && updated > 0) || i + SUPABASE_BATCH_SIZE >= updates.length) {
          const progress = Math.min(i + SUPABASE_BATCH_SIZE, updates.length);
          console.log(`    Progress: ${progress}/${updates.length} (${((progress / updates.length) * 100).toFixed(1)}%)`);
        }
      }

      console.log(`  ✓ Updated ${updated} phrases`);
      totalProcessed += phrases.length;
      totalUpdated += updated;

    } catch (err) {
      console.error(`  ERROR processing ${course}: ${err.message}`);
      console.error(err.stack);
      totalErrors++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Courses processed: ${courseCodes.length}`);
  console.log(`Phrases processed: ${totalProcessed}`);
  console.log(`Phrases updated: ${totalUpdated}`);
  console.log(`Errors: ${totalErrors}`);
  console.log('');
}

// Run
const courseArg = process.argv[2];
populateSyllableCounts(courseArg).catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
