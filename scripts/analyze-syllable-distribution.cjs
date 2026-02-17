#!/usr/bin/env node

/**
 * Syllable Distribution Analysis for SSi Courses
 *
 * Analyzes syllable/length distribution across courses to identify the "missing middle" problem.
 *
 * Context:
 * - SHORT (3-5 syllables): For DEBUT phase when LEGO is first introduced
 * - MEDIUM (6-9 syllables): For practice progression
 * - LONG (10+ syllables): For ETERNAL phase (spaced repetition)
 *
 * Known issue: Not enough medium-length phrases (the "missing middle")
 *
 * Output: JSON report at scripts/quality-reports/syllable-distribution.json
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { countSyllables, getLangFromCourse } = require('./syllable-counter.cjs');

// Target courses
const TARGET_COURSES = [
  'eng_for_ara',
  'deu_for_eng',
  'ara_for_eng',
  'eng_for_deu',
  'bre_for_fra',
  'cym_s_for_eng',
  'cym_n_for_eng',
  'eng_for_fra'
];

// Ideal distribution (from task description)
const IDEAL_DISTRIBUTION = {
  very_short: 0,     // 1-3 syllables (not mentioned, assume minimal)
  short: 10,         // 4-6 syllables (mapped from 3-5 → 4-6 for consistency)
  medium: 35,        // 7-12 syllables (mapped from 6-9 → 7-12 to match script buckets)
  long: 30,          // 13-18 syllables (mapped from 10+ → 13-18)
  very_long: 25      // 19+ syllables (extreme cases)
};

// Syllable buckets (aligned with existing analysis script)
const BUCKETS = {
  very_short: { min: 1, max: 3, label: 'Very Short (1-3)' },
  short: { min: 4, max: 6, label: 'Short (4-6)' },
  medium: { min: 7, max: 12, label: 'Medium (7-12)' },
  long: { min: 13, max: 18, label: 'Long (13-18)' },
  very_long: { min: 19, max: Infinity, label: 'Very Long (19+)' }
};

const MISSING_MIDDLE_THRESHOLD = 25; // Courses with < 25% medium are flagged

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Categorize syllable count into bucket
 */
function categorizeSyllables(count) {
  for (const [bucket, { min, max }] of Object.entries(BUCKETS)) {
    if (count >= min && count <= max) {
      return bucket;
    }
  }
  return 'very_long'; // Fallback for extreme cases
}

/**
 * Calculate distribution percentages
 */
function calculateDistribution(phrases) {
  const counts = {
    very_short: 0,
    short: 0,
    medium: 0,
    long: 0,
    very_long: 0
  };

  phrases.forEach(phrase => {
    if (phrase.syllables > 0) {
      const bucket = categorizeSyllables(phrase.syllables);
      counts[bucket]++;
    }
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const percentages = {};
  for (const [bucket, count] of Object.entries(counts)) {
    percentages[bucket] = total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0;
  }

  return { counts, percentages, total };
}

/**
 * Compare distribution to ideal
 */
function compareToIdeal(percentages) {
  const deviations = {};
  for (const [bucket, idealPct] of Object.entries(IDEAL_DISTRIBUTION)) {
    const actualPct = percentages[bucket] || 0;
    deviations[bucket] = Math.round((actualPct - idealPct) * 10) / 10;
  }
  return deviations;
}

/**
 * Analyze a single course
 */
async function analyzeCourse(courseCode) {
  console.log(`\nAnalyzing ${courseCode}...`);

  // Get target language code
  const targetLang = getLangFromCourse(courseCode, true);
  console.log(`  Target language: ${targetLang}`);

  // Fetch USE phrases (sample 500+, or all if less)
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, target_text, target_syllable_count, phrase_role')
    .eq('course_code', courseCode)
    .eq('phrase_role', 'use')
    .limit(1000); // Fetch up to 1000 to ensure we have enough data

  if (error) {
    console.error(`  ERROR: ${error.message}`);
    return null;
  }

  if (!phrases || phrases.length === 0) {
    console.log(`  No USE phrases found`);
    return null;
  }

  console.log(`  Found ${phrases.length} USE phrases`);

  // Calculate syllables for each phrase
  const phrasesWithSyllables = [];
  let missingCount = 0;
  let calculatedCount = 0;

  for (const phrase of phrases) {
    let syllables = phrase.target_syllable_count;

    // If syllable count is missing, calculate it
    if (!syllables || syllables === 0) {
      try {
        syllables = countSyllables(phrase.target_text, targetLang);
        calculatedCount++;
      } catch (err) {
        console.error(`    Error counting syllables for "${phrase.target_text}": ${err.message}`);
        missingCount++;
        continue;
      }
    }

    phrasesWithSyllables.push({
      id: phrase.id,
      text: phrase.target_text,
      syllables
    });
  }

  console.log(`  Syllable coverage: ${phrasesWithSyllables.length} with counts, ${calculatedCount} calculated, ${missingCount} missing`);

  if (phrasesWithSyllables.length === 0) {
    console.log(`  No phrases with syllable counts`);
    return null;
  }

  // Calculate distribution
  const { counts, percentages, total } = calculateDistribution(phrasesWithSyllables);
  const deviations = compareToIdeal(percentages);

  // Calculate stats
  const syllableCounts = phrasesWithSyllables.map(p => p.syllables);
  const sum = syllableCounts.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / syllableCounts.length) * 10) / 10;
  const sorted = [...syllableCounts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Check for missing middle
  const hasMissingMiddle = percentages.medium < MISSING_MIDDLE_THRESHOLD;

  console.log(`  Distribution: VS=${percentages.very_short}%, S=${percentages.short}%, M=${percentages.medium}%, L=${percentages.long}%, VL=${percentages.very_long}%`);
  console.log(`  Missing middle: ${hasMissingMiddle ? 'YES' : 'NO'} (${percentages.medium}% < ${MISSING_MIDDLE_THRESHOLD}%)`);

  return {
    course_code: courseCode,
    target_language: targetLang,
    sample_size: phrasesWithSyllables.length,
    syllable_coverage: {
      with_syllables: phrasesWithSyllables.length,
      calculated: calculatedCount,
      missing: missingCount,
      coverage_pct: Math.round((phrasesWithSyllables.length / phrases.length) * 100 * 10) / 10
    },
    statistics: {
      avg,
      median,
      min,
      max
    },
    distribution: {
      counts,
      percentages
    },
    deviations_from_ideal: deviations,
    flags: {
      missing_middle: hasMissingMiddle,
      medium_pct: percentages.medium
    }
  };
}

/**
 * Main analysis function
 */
async function main() {
  console.log('=' .repeat(80));
  console.log('SYLLABLE DISTRIBUTION ANALYSIS');
  console.log('=' .repeat(80));
  console.log(`\nTarget courses: ${TARGET_COURSES.join(', ')}`);
  console.log(`\nIdeal distribution:`);
  for (const [bucket, pct] of Object.entries(IDEAL_DISTRIBUTION)) {
    console.log(`  ${BUCKETS[bucket].label}: ${pct}%`);
  }
  console.log(`\nMissing middle threshold: < ${MISSING_MIDDLE_THRESHOLD}% medium`);

  const results = [];
  const flaggedCourses = [];

  for (const courseCode of TARGET_COURSES) {
    const result = await analyzeCourse(courseCode);
    if (result) {
      results.push(result);
      if (result.flags.missing_middle) {
        flaggedCourses.push({
          course_code: courseCode,
          medium_pct: result.flags.medium_pct,
          issue: `Only ${result.flags.medium_pct}% medium phrases (< ${MISSING_MIDDLE_THRESHOLD}%)`
        });
      }
    }
  }

  // Generate recommendations
  const recommendations = [];

  if (flaggedCourses.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      issue: 'Missing middle problem detected',
      courses: flaggedCourses.map(c => c.course_code),
      recommendation: 'Generate more medium-length phrases (7-12 syllables) for practice progression phase'
    });
  }

  // Identify courses with extreme distributions
  for (const result of results) {
    const { percentages } = result.distribution;

    if (percentages.very_short > 30) {
      recommendations.push({
        priority: 'MEDIUM',
        course: result.course_code,
        issue: `Too many very short phrases (${percentages.very_short}%)`,
        recommendation: 'Add longer context phrases to improve learning progression'
      });
    }

    if (percentages.very_long > 40) {
      recommendations.push({
        priority: 'MEDIUM',
        course: result.course_code,
        issue: `Too many very long phrases (${percentages.very_long}%)`,
        recommendation: 'Add more short and medium phrases for DEBUT phase'
      });
    }
  }

  // Calculate overall statistics
  const overallStats = {
    total_courses_analyzed: results.length,
    courses_with_missing_middle: flaggedCourses.length,
    avg_medium_pct: Math.round((results.reduce((sum, r) => sum + r.distribution.percentages.medium, 0) / results.length) * 10) / 10,
    avg_sample_size: Math.round(results.reduce((sum, r) => sum + r.sample_size, 0) / results.length)
  };

  // Generate report
  const report = {
    generated_at: new Date().toISOString(),
    analysis: 'Syllable/Length Distribution Analysis',
    purpose: 'Identify "missing middle" problem - insufficient medium-length phrases for practice progression',
    methodology: {
      sample_type: 'USE phrases only',
      target_sample_size: '500+ per course',
      syllable_counting: 'Language-specific algorithms (scripts/syllable-counter.cjs)',
      buckets: BUCKETS,
      ideal_distribution: IDEAL_DISTRIBUTION,
      missing_middle_threshold: `< ${MISSING_MIDDLE_THRESHOLD}% medium`
    },
    overall_statistics: overallStats,
    courses: results,
    flagged_courses: flaggedCourses,
    recommendations
  };

  // Write report to file
  const outputPath = path.join(__dirname, 'quality-reports', 'syllable-distribution.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log('\n' + '=' .repeat(80));
  console.log('SUMMARY');
  console.log('=' .repeat(80));
  console.log(`\nTotal courses analyzed: ${overallStats.total_courses_analyzed}`);
  console.log(`Courses with missing middle: ${overallStats.courses_with_missing_middle}`);
  console.log(`Average medium %: ${overallStats.avg_medium_pct}%`);
  console.log(`\nFlagged courses:`);
  if (flaggedCourses.length === 0) {
    console.log('  None - all courses have sufficient medium phrases');
  } else {
    flaggedCourses.forEach(c => {
      console.log(`  - ${c.course_code}: ${c.medium_pct}% medium`);
    });
  }
  console.log(`\nRecommendations: ${recommendations.length}`);
  recommendations.forEach((rec, i) => {
    console.log(`\n  ${i + 1}. [${rec.priority}] ${rec.issue}`);
    if (rec.course) {
      console.log(`     Course: ${rec.course}`);
    }
    if (rec.courses) {
      console.log(`     Courses: ${rec.courses.join(', ')}`);
    }
    console.log(`     → ${rec.recommendation}`);
  });
  console.log(`\nReport written to: ${outputPath}`);
  console.log('\n' + '=' .repeat(80));
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
