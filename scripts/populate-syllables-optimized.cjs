#!/usr/bin/env node

/**
 * Optimized Syllable Count Populator
 * Uses upsert for efficient batch updates
 */

const { createClient } = require('@supabase/supabase-js');
const { countSyllables, getLangFromCourse } = require('./syllable-counter.cjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BATCH_SIZE = 500; // Larger batches for upsert

async function populateSyllableCounts(courseCode = null) {
  console.log('='.repeat(80));
  console.log('POPULATE SYLLABLE COUNTS - OPTIMIZED (BATCH UPSERT)');
  console.log('='.repeat(80));
  console.log('');

  // Get courses
  let courseCodes = [];
  if (courseCode) {
    courseCodes = [courseCode];
  } else {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('code');

    if (error) {
      console.error('Error fetching courses:', error);
      return;
    }

    courseCodes = courses.map(c => c.code);
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
        .select('*')
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
      console.log(`  Calculating and updating in batches of ${BATCH_SIZE}...`);

      // Process in batches
      let updated = 0;
      for (let i = 0; i < phrases.length; i += BATCH_SIZE) {
        const batch = phrases.slice(i, i + BATCH_SIZE);

        // Create update objects with syllable counts
        const updates = batch.map(phrase => ({
          ...phrase, // Include all columns
          target_syllable_count: countSyllables(phrase.target_text, targetLang)
        }));

        // Use upsert for batch update
        const { error: updateError, data: updateData } = await supabase
          .from('course_practice_phrases')
          .upsert(updates, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select('id');

        if (updateError) {
          console.error(`    Error updating batch: ${updateError.message}`);
          totalErrors++;
        } else {
          updated += updates.length;
        }

        const progress = Math.min(i + BATCH_SIZE, phrases.length);
        console.log(`    Progress: ${progress}/${phrases.length} (${((progress / phrases.length) * 100).toFixed(1)}%)`);
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
