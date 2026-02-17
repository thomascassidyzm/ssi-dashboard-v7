/**
 * Translation Accuracy Analyzer v2 - Structural Issues Only
 *
 * Focuses on OBJECTIVE, measurable translation problems:
 * - Empty/missing text
 * - Extreme length mismatches (>2x word count difference)
 * - Question vs statement mismatches
 * - Truncated text (ends mid-word)
 * - Obvious duplications
 *
 * Does NOT attempt linguistic analysis of pronoun/article differences
 * (those require native speaker expertise)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const TARGET_COURSES = [
  'eng_for_ara',
  'deu_for_eng',
  'ara_for_eng',
  'eng_for_deu',
  'bre_for_fra',
  'cym_s_for_eng',
  'cym_n_for_eng'
];

const SEVERITY = {
  CRITICAL: 'CRITICAL',    // Must be fixed immediately
  HIGH: 'HIGH',            // Should be fixed soon
  MODERATE: 'MODERATE',    // Review recommended
  ACCEPTABLE: 'ACCEPTABLE' // No issues
};

/**
 * Check if text is a question (supports multiple punctuation systems)
 */
function isQuestion(text) {
  // ASCII: ?, Greek: ;, Arabic: ؟, Spanish inverted: ¿
  return /[\?\؟\;¿]/.test(text);
}

/**
 * Analyze a phrase pair for structural issues only
 */
function analyzePhrasePair(known, target) {
  const issues = [];
  let severity = SEVERITY.ACCEPTABLE;

  // 1. CRITICAL: Empty or missing text
  if (!known || !target || known.trim().length === 0 || target.trim().length === 0) {
    severity = SEVERITY.CRITICAL;
    issues.push({
      type: 'EMPTY_TEXT',
      severity: SEVERITY.CRITICAL,
      description: 'One or both texts are empty',
      known: known || '[EMPTY]',
      target: target || '[EMPTY]'
    });
    return { severity, issues, metrics: {} };
  }

  const knownNorm = known.trim();
  const targetNorm = target.trim();

  // Calculate metrics
  const knownTokens = knownNorm.split(/\s+/).filter(t => t.length > 0);
  const targetTokens = targetNorm.split(/\s+/).filter(t => t.length > 0);
  const knownChars = knownNorm.length;
  const targetChars = targetNorm.length;

  const tokenRatio = Math.max(knownTokens.length, targetTokens.length) /
                     Math.min(knownTokens.length, targetTokens.length);
  const charRatio = Math.max(knownChars, targetChars) / Math.min(knownChars, targetChars);

  const metrics = {
    knownWords: knownTokens.length,
    targetWords: targetTokens.length,
    knownChars,
    targetChars,
    tokenRatio: tokenRatio.toFixed(2),
    charRatio: charRatio.toFixed(2)
  };

  // 2. CRITICAL: Question/statement mismatch
  const knownIsQ = isQuestion(knownNorm);
  const targetIsQ = isQuestion(targetNorm);

  if (knownIsQ !== targetIsQ) {
    severity = SEVERITY.CRITICAL;
    issues.push({
      type: 'QUESTION_MISMATCH',
      severity: SEVERITY.CRITICAL,
      description: `One is a question, the other is not`,
      detail: knownIsQ ? 'Known is question, target is statement' : 'Known is statement, target is question'
    });
  }

  // 3. HIGH: Extreme length mismatch (>2.5x difference)
  if (tokenRatio > 2.5) {
    if (severity === SEVERITY.ACCEPTABLE) severity = SEVERITY.HIGH;
    issues.push({
      type: 'EXTREME_LENGTH_MISMATCH',
      severity: SEVERITY.HIGH,
      description: `Extreme word count difference: ${knownTokens.length} vs ${targetTokens.length} (${tokenRatio}x)`,
      detail: 'Possible missing or added content'
    });
  }

  // 4. MODERATE: Large length mismatch (>2x difference)
  else if (tokenRatio > 2.0) {
    if (severity === SEVERITY.ACCEPTABLE) severity = SEVERITY.MODERATE;
    issues.push({
      type: 'LARGE_LENGTH_MISMATCH',
      severity: SEVERITY.MODERATE,
      description: `Large word count difference: ${knownTokens.length} vs ${targetTokens.length} (${tokenRatio}x)`,
      detail: 'Verify all content is translated'
    });
  }

  // 5. HIGH: Truncated text (ends with incomplete word, ellipsis, or hyphen)
  if (/[\-…]$/.test(knownNorm) || /[\-…]$/.test(targetNorm)) {
    if (severity === SEVERITY.ACCEPTABLE) severity = SEVERITY.HIGH;
    issues.push({
      type: 'TRUNCATED_TEXT',
      severity: SEVERITY.HIGH,
      description: 'Text appears truncated (ends with hyphen or ellipsis)',
      detail: `Known ends: "${knownNorm.slice(-10)}", Target ends: "${targetNorm.slice(-10)}"`
    });
  }

  // 6. HIGH: Identical text (translation not done)
  if (knownNorm.toLowerCase() === targetNorm.toLowerCase()) {
    if (severity === SEVERITY.ACCEPTABLE) severity = SEVERITY.HIGH;
    issues.push({
      type: 'IDENTICAL_TEXT',
      severity: SEVERITY.HIGH,
      description: 'Known and target are identical (not translated)',
      detail: 'Translation missing'
    });
  }

  // 7. MODERATE: Very short translation for long phrase
  if (knownTokens.length > 8 && targetTokens.length < 3) {
    if (severity === SEVERITY.ACCEPTABLE) severity = SEVERITY.MODERATE;
    issues.push({
      type: 'SUSPICIOUSLY_SHORT',
      severity: SEVERITY.MODERATE,
      description: `Long phrase (${knownTokens.length} words) has very short translation (${targetTokens.length} words)`,
      detail: 'Verify translation is complete'
    });
  }

  // 8. MODERATE: Repeated words (possible duplication error)
  const knownWords = knownTokens.map(t => t.toLowerCase());
  const targetWords = targetTokens.map(t => t.toLowerCase());

  const knownDupes = knownWords.filter((w, i, arr) => w.length > 3 && arr.indexOf(w, i + 1) !== -1);
  const targetDupes = targetWords.filter((w, i, arr) => w.length > 3 && arr.indexOf(w, i + 1) !== -1);

  if (knownDupes.length > 0 || targetDupes.length > 0) {
    if (severity === SEVERITY.ACCEPTABLE) severity = SEVERITY.MODERATE;
    issues.push({
      type: 'REPEATED_WORDS',
      severity: SEVERITY.MODERATE,
      description: 'Contains repeated words (possible duplication)',
      detail: `Known: [${[...new Set(knownDupes)].join(', ')}], Target: [${[...new Set(targetDupes)].join(', ')}]`
    });
  }

  return { severity, issues, metrics };
}

/**
 * Analyze a single course
 */
async function analyzeCourse(courseCode) {
  console.log(`\nAnalyzing ${courseCode}...`);

  // Get language info
  const { data: course } = await supabase
    .from('courses')
    .select('known_lang, target_lang, display_name')
    .eq('course_code', courseCode)
    .single();

  if (!course) {
    console.log(`  Course not found in database`);
    return null;
  }

  // Fetch 100 USE phrases randomly (larger sample)
  const { data: allPhrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, known_text, target_text, seed_number, lego_index, phrase_role')
    .eq('course_code', courseCode)
    .eq('phrase_role', 'use')
    .limit(1000);

  if (error) {
    console.error(`  Error fetching phrases: ${error.message}`);
    return null;
  }

  if (!allPhrases || allPhrases.length === 0) {
    console.log(`  No USE phrases found`);
    return null;
  }

  // Random sample
  const sampleSize = Math.min(100, allPhrases.length);
  const shuffled = allPhrases.sort(() => 0.5 - Math.random());
  const sample = shuffled.slice(0, sampleSize);

  console.log(`  Sampled ${sample.length} USE phrases from ${allPhrases.length} total`);

  // Analyze
  const results = {
    courseCode,
    courseName: course.display_name,
    knownLang: course.known_lang,
    targetLang: course.target_lang,
    totalSampled: sample.length,
    severityCounts: {
      [SEVERITY.CRITICAL]: 0,
      [SEVERITY.HIGH]: 0,
      [SEVERITY.MODERATE]: 0,
      [SEVERITY.ACCEPTABLE]: 0
    },
    issuesByType: {},
    examples: {
      [SEVERITY.CRITICAL]: [],
      [SEVERITY.HIGH]: [],
      [SEVERITY.MODERATE]: []
    }
  };

  for (const phrase of sample) {
    const analysis = analyzePhrasePair(phrase.known_text, phrase.target_text);

    results.severityCounts[analysis.severity]++;

    // Track issue types
    for (const issue of analysis.issues) {
      if (!results.issuesByType[issue.type]) {
        results.issuesByType[issue.type] = {
          count: 0,
          severity: issue.severity,
          description: issue.description
        };
      }
      results.issuesByType[issue.type].count++;
    }

    // Store examples (max 3 per severity)
    if (analysis.severity !== SEVERITY.ACCEPTABLE &&
        results.examples[analysis.severity].length < 3) {
      results.examples[analysis.severity].push({
        phraseId: phrase.id,
        seedNumber: phrase.seed_number,
        legoIndex: phrase.lego_index,
        knownText: phrase.known_text,
        targetText: phrase.target_text,
        issues: analysis.issues,
        metrics: analysis.metrics
      });
    }
  }

  // Calculate rates
  results.qualityRate = {
    critical: ((results.severityCounts[SEVERITY.CRITICAL] / results.totalSampled) * 100).toFixed(1),
    high: ((results.severityCounts[SEVERITY.HIGH] / results.totalSampled) * 100).toFixed(1),
    moderate: ((results.severityCounts[SEVERITY.MODERATE] / results.totalSampled) * 100).toFixed(1),
    acceptable: ((results.severityCounts[SEVERITY.ACCEPTABLE] / results.totalSampled) * 100).toFixed(1)
  };

  console.log(`  Quality: ${results.qualityRate.acceptable}% acceptable, ${results.qualityRate.critical}% critical, ${results.qualityRate.high}% high, ${results.qualityRate.moderate}% moderate`);

  return results;
}

/**
 * Main
 */
async function main() {
  console.log('SSi Translation Accuracy Analysis v2 - Structural Issues');
  console.log('='.repeat(80));
  console.log(`Analyzing ${TARGET_COURSES.length} courses`);
  console.log(`Sample size: 100 USE phrases per course`);
  console.log(`Focus: Critical structural issues only\n`);

  const allResults = [];

  for (const courseCode of TARGET_COURSES) {
    const result = await analyzeCourse(courseCode);
    if (result) {
      allResults.push(result);
    }
  }

  // Summary
  const summary = {
    timestamp: new Date().toISOString(),
    totalCoursesAnalyzed: allResults.length,
    overallStatistics: {
      averageCritical: 0,
      averageHigh: 0,
      averageModerate: 0,
      averageAcceptable: 0
    },
    courseResults: allResults,
    criticalIssues: [],
    recommendations: []
  };

  // Calculate averages
  if (allResults.length > 0) {
    summary.overallStatistics.averageCritical = (
      allResults.reduce((sum, r) => sum + parseFloat(r.qualityRate.critical), 0) / allResults.length
    ).toFixed(1);
    summary.overallStatistics.averageHigh = (
      allResults.reduce((sum, r) => sum + parseFloat(r.qualityRate.high), 0) / allResults.length
    ).toFixed(1);
    summary.overallStatistics.averageModerate = (
      allResults.reduce((sum, r) => sum + parseFloat(r.qualityRate.moderate), 0) / allResults.length
    ).toFixed(1);
    summary.overallStatistics.averageAcceptable = (
      allResults.reduce((sum, r) => sum + parseFloat(r.qualityRate.acceptable), 0) / allResults.length
    ).toFixed(1);
  }

  // Identify courses with critical issues
  summary.criticalIssues = allResults
    .filter(r => parseFloat(r.qualityRate.critical) > 0 || parseFloat(r.qualityRate.high) > 5)
    .sort((a, b) => parseFloat(b.qualityRate.critical) - parseFloat(a.qualityRate.critical))
    .map(r => ({
      courseCode: r.courseCode,
      courseName: r.courseName,
      criticalRate: r.qualityRate.critical,
      highRate: r.qualityRate.high,
      topIssues: Object.entries(r.issuesByType)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([type, data]) => ({ type, count: data.count, severity: data.severity }))
    }));

  // Generate recommendations
  const allIssueTypes = {};
  for (const result of allResults) {
    for (const [type, data] of Object.entries(result.issuesByType)) {
      if (!allIssueTypes[type]) {
        allIssueTypes[type] = {
          type,
          severity: data.severity,
          courses: [],
          totalCount: 0
        };
      }
      allIssueTypes[type].courses.push(result.courseCode);
      allIssueTypes[type].totalCount += data.count;
    }
  }

  summary.recommendations = Object.values(allIssueTypes)
    .filter(i => i.severity === SEVERITY.CRITICAL || i.totalCount >= 5)
    .sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === SEVERITY.CRITICAL ? -1 : 1;
      }
      return b.totalCount - a.totalCount;
    })
    .map(i => ({
      issueType: i.type,
      severity: i.severity,
      totalOccurrences: i.totalCount,
      affectedCourses: i.courses,
      action: getActionForIssueType(i.type, i.severity)
    }));

  // Save report
  const reportPath = path.join(__dirname, 'quality-reports', 'translation-accuracy.json');
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total courses analyzed: ${summary.totalCoursesAnalyzed}`);
  console.log(`Average acceptable: ${summary.overallStatistics.averageAcceptable}%`);
  console.log(`Average critical: ${summary.overallStatistics.averageCritical}%`);
  console.log(`Average high: ${summary.overallStatistics.averageHigh}%`);
  console.log(`Average moderate: ${summary.overallStatistics.averageModerate}%`);

  if (summary.criticalIssues.length > 0) {
    console.log('\nCourses with issues:');
    for (const course of summary.criticalIssues) {
      console.log(`  - ${course.courseCode} (${course.courseName}): ${course.criticalRate}% critical, ${course.highRate}% high`);
      if (course.topIssues.length > 0) {
        console.log(`    Top issues: ${course.topIssues.map(i => `${i.type} (${i.count})`).join(', ')}`);
      }
    }
  } else {
    console.log('\nNo critical or high-severity issues found across all courses!');
  }

  if (summary.recommendations.length > 0) {
    console.log('\nRecommended Actions:');
    for (const rec of summary.recommendations.slice(0, 5)) {
      console.log(`  - [${rec.severity}] ${rec.issueType}: ${rec.totalOccurrences} occurrences`);
      console.log(`    Action: ${rec.action}`);
      console.log(`    Courses: ${rec.affectedCourses.join(', ')}`);
    }
  }

  console.log(`\nFull report saved to: ${reportPath}`);
}

function getActionForIssueType(type, severity) {
  const actions = {
    'EMPTY_TEXT': 'IMMEDIATE FIX REQUIRED: Fill in missing translations',
    'QUESTION_MISMATCH': 'IMMEDIATE FIX REQUIRED: Ensure both texts are questions or both are statements',
    'EXTREME_LENGTH_MISMATCH': 'Review for missing or added content. Verify semantic equivalence.',
    'LARGE_LENGTH_MISMATCH': 'Review translations. Some variation is acceptable due to language structure.',
    'TRUNCATED_TEXT': 'Complete the truncated translations',
    'IDENTICAL_TEXT': 'Provide proper translation (text not translated)',
    'SUSPICIOUSLY_SHORT': 'Verify translation is complete',
    'REPEATED_WORDS': 'Check for accidental duplications'
  };
  return actions[type] || 'Review and correct';
}

main().catch(console.error);
