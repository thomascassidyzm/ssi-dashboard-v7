#!/usr/bin/env node

/**
 * Gender Markup Tool
 *
 * Batch process course data to add gender markers to text.
 * This tool analyzes target language phrases and marks gender-variable
 * words with notation like "cansado(a)" so they can be expanded by the
 * gender-expansion-service during TTS generation.
 *
 * Usage:
 *   node tools/generators/gender-markup-tool.cjs spa_for_eng --dry-run
 *   node tools/generators/gender-markup-tool.cjs spa_for_eng --execute
 *   node tools/generators/gender-markup-tool.cjs spa_for_eng --report
 *
 * Options:
 *   --dry-run   Show what would be marked without making changes (default)
 *   --execute   Actually update the database with marked text
 *   --report    Generate a detailed report of all gender-variable words
 *   --limit N   Limit processing to N phrases (default: all)
 *
 * @module gender-markup-tool
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { createClient } = require('@supabase/supabase-js');
const genderAnalyzer = require('../../services/gender-analyzer.cjs');

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get all practice phrases for a course
 */
async function getPracticePhrasesForCourse(courseCode, limit = null) {
  const PAGE_SIZE = 1000;
  const phrases = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('course_practice_phrases')
      .select('id, target_text, known_text')
      .eq('course_code', courseCode)
      .range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      phrases.push(...data);
      hasMore = data.length === PAGE_SIZE;
      offset += PAGE_SIZE;

      if (limit && phrases.length >= limit) {
        return phrases.slice(0, limit);
      }
    } else {
      hasMore = false;
    }
  }

  return phrases;
}

/**
 * Get course info
 */
async function getCourseInfo(courseCode) {
  const { data, error } = await supabase
    .from('courses')
    .select('course_code, display_name, target_lang, known_lang')
    .eq('course_code', courseCode)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a phrase with marked text
 */
async function updatePhraseWithMarkedText(phraseId, markedText) {
  const { error } = await supabase
    .from('course_practice_phrases')
    .update({ target_text: markedText })
    .eq('id', phraseId);

  if (error) throw error;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Analyze all phrases in a course for gender-variable words
 */
async function analyzeCoursePhrases(courseCode, options = {}) {
  const { limit = null, execute = false, report = false } = options;

  // Get course info
  const course = await getCourseInfo(courseCode);
  if (!course) {
    console.error(`Course not found: ${courseCode}`);
    process.exit(1);
  }

  console.log(`\nAnalyzing course: ${course.display_name} (${courseCode})`);
  console.log(`Target language: ${course.target_lang}`);

  // Check if language is supported
  const supportedLangs = genderAnalyzer.getSupportedLanguages();
  if (!supportedLangs.includes(course.target_lang)) {
    console.log(`\nLanguage '${course.target_lang}' is not supported for gender analysis.`);
    console.log(`Supported languages: ${supportedLangs.join(', ')}`);
    process.exit(0);
  }

  // Get all phrases
  console.log(`\nFetching practice phrases${limit ? ` (limit: ${limit})` : ''}...`);
  const phrases = await getPracticePhrasesForCourse(courseCode, limit);
  console.log(`Found ${phrases.length} phrases to analyze.`);

  // Analyze each phrase
  const results = {
    total: phrases.length,
    withGenderVariants: 0,
    alreadyMarked: 0,
    unchanged: 0,
    updated: 0,
    errors: 0,
    details: []
  };

  for (const phrase of phrases) {
    try {
      // Check if already marked
      if (genderAnalyzer.hasExistingMarkers(phrase.target_text)) {
        results.alreadyMarked++;
        if (report) {
          results.details.push({
            id: phrase.id,
            original: phrase.target_text,
            status: 'already_marked'
          });
        }
        continue;
      }

      // Analyze for gender variants
      const analysis = genderAnalyzer.analyzeForGender(phrase.target_text, course.target_lang);

      if (analysis.hasGenderVariants) {
        results.withGenderVariants++;

        if (report) {
          results.details.push({
            id: phrase.id,
            original: phrase.target_text,
            marked: analysis.markedText,
            matches: analysis.matches,
            masculine: analysis.variants.m,
            feminine: analysis.variants.f,
            status: 'gender_variable'
          });
        }

        // Update if in execute mode
        if (execute) {
          await updatePhraseWithMarkedText(phrase.id, analysis.markedText);
          results.updated++;
          console.log(`Updated: "${phrase.target_text}" → "${analysis.markedText}"`);
        }
      } else {
        results.unchanged++;
        if (report) {
          results.details.push({
            id: phrase.id,
            original: phrase.target_text,
            status: 'no_gender_variants'
          });
        }
      }
    } catch (err) {
      results.errors++;
      console.error(`Error processing phrase ${phrase.id}: ${err.message}`);
    }
  }

  return results;
}

/**
 * Print results summary
 */
function printSummary(results, execute) {
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total phrases analyzed: ${results.total}`);
  console.log(`Already marked:         ${results.alreadyMarked}`);
  console.log(`Gender-variable:        ${results.withGenderVariants}`);
  console.log(`Unchanged:              ${results.unchanged}`);
  console.log(`Errors:                 ${results.errors}`);

  if (execute) {
    console.log(`\nUpdated in database:    ${results.updated}`);
  } else {
    console.log(`\nWould update:           ${results.withGenderVariants}`);
    console.log('\nRun with --execute to apply changes.');
  }
}

/**
 * Print detailed report
 */
function printDetailedReport(results) {
  const genderVariables = results.details.filter(d => d.status === 'gender_variable');

  if (genderVariables.length === 0) {
    console.log('\nNo gender-variable phrases found.');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('GENDER-VARIABLE PHRASES');
  console.log('='.repeat(60));

  for (const item of genderVariables.slice(0, 50)) {
    console.log(`\n[${item.id}]`);
    console.log(`  Original:  ${item.original}`);
    console.log(`  Marked:    ${item.marked}`);
    console.log(`  Matches:   ${item.matches.join(', ')}`);
    console.log(`  Masculine: ${item.masculine}`);
    console.log(`  Feminine:  ${item.feminine}`);
  }

  if (genderVariables.length > 50) {
    console.log(`\n... and ${genderVariables.length - 50} more gender-variable phrases.`);
  }

  // Word frequency analysis
  const wordFreq = {};
  for (const item of genderVariables) {
    for (const match of item.matches) {
      const word = match.toLowerCase();
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }

  const sortedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  console.log('\n' + '='.repeat(60));
  console.log('MOST COMMON GENDER-VARIABLE WORDS');
  console.log('='.repeat(60));

  for (const [word, count] of sortedWords) {
    console.log(`  ${word}: ${count} occurrences`);
  }
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Gender Markup Tool

Usage:
  node tools/generators/gender-markup-tool.cjs <course_code> [options]

Options:
  --dry-run   Show what would be marked without making changes (default)
  --execute   Actually update the database with marked text
  --report    Generate a detailed report of all gender-variable words
  --limit N   Limit processing to N phrases

Examples:
  node tools/generators/gender-markup-tool.cjs spa_for_eng --dry-run
  node tools/generators/gender-markup-tool.cjs ita_for_eng --execute
  node tools/generators/gender-markup-tool.cjs fra_for_eng --report --limit 100
`);
    process.exit(0);
  }

  const courseCode = args[0];
  const execute = args.includes('--execute');
  const report = args.includes('--report');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : null;

  if (!courseCode) {
    console.error('Error: course_code is required');
    process.exit(1);
  }

  try {
    console.log('\n' + '='.repeat(60));
    console.log('GENDER MARKUP TOOL');
    console.log('='.repeat(60));
    console.log(`Mode: ${execute ? 'EXECUTE (will update database)' : 'DRY-RUN (preview only)'}`);

    const results = await analyzeCoursePhrases(courseCode, {
      limit,
      execute,
      report
    });

    printSummary(results, execute);

    if (report) {
      printDetailedReport(results);
    }

    console.log('\nDone.');
    process.exit(0);

  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

main();
