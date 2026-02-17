#!/usr/bin/env node

/**
 * Populate syllable counts for all phrases across all courses
 * This is a one-time migration to add syllable data to existing phrases
 */

const { createClient } = require('@supabase/supabase-js');
const { countSyllables, getLangFromCourse } = require('./syllable-counter.cjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BATCH_SIZE = 500; // Update 500 phrases at a time

async function populateSyllableCounts(courseCode = null) {
  console.log('='.repeat(80));
  console.log('POPULATE SYLLABLE COUNTS');
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
        .select('id, target_text, target_syllable_count')
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

      // Calculate syllables for each phrase
      const updates = [];
      for (const phrase of phrases) {
        const syllables = countSyllables(phrase.target_text, targetLang);
        updates.push({
          id: phrase.id,
          target_syllable_count: syllables
        });
      }

      // Batch update in chunks
      console.log(`  Updating in batches of ${BATCH_SIZE}...`);
      let updated = 0;

      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);

        // Update each phrase in the batch
        for (const update of batch) {
          const { error: updateError } = await supabase
            .from('course_practice_phrases')
            .update({ target_syllable_count: update.target_syllable_count })
            .eq('id', update.id);

          if (updateError) {
            console.error(`    Error updating phrase ${update.id}: ${updateError.message}`);
            totalErrors++;
          } else {
            updated++;
          }
        }

        const progress = Math.min(i + BATCH_SIZE, updates.length);
        console.log(`    Progress: ${progress}/${updates.length} (${((progress / updates.length) * 100).toFixed(1)}%)`);
      }

      console.log(`  ✓ Updated ${updated} phrases`);
      totalProcessed += phrases.length;
      totalUpdated += updated;

    } catch (err) {
      console.error(`  ERROR processing ${course}: ${err.message}`);
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
