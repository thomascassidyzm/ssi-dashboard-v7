#!/usr/bin/env node

/**
 * ZUT (Zero Untaught) COMPLIANCE ANALYZER
 *
 * Analyzes whether practice phrases only use vocabulary that has been introduced.
 *
 * ZUT Principle: Learners should NEVER see vocabulary they haven't learned.
 * Every word/character in a phrase must come from:
 * 1. Previously introduced LEGOs (by seed_number, lego_index)
 * 2. Components of the current M-type LEGO
 * 3. The current LEGO itself
 *
 * Courses to analyze (those with phrases):
 * - eng_for_ara (10,818 phrases)
 * - deu_for_eng (9,279 phrases)
 * - ara_for_eng (9,058 phrases)
 * - eng_for_deu (8,820 phrases)
 * - bre_for_fra (8,591 phrases)
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const COURSES_TO_ANALYZE = [
  'eng_for_ara',
  'deu_for_eng',
  'ara_for_eng',
  'eng_for_deu',
  'bre_for_fra'
];

/**
 * Tokenize text based on language type
 * - Character-based languages (ara, zho): split into characters
 * - Word-based languages (eng, deu, fra, spa, bre): split by whitespace/punctuation
 */
function tokenizeText(text, courseCode) {
  if (!text) return [];

  // Determine if this is the target language (second part of course_code)
  const targetLang = courseCode.split('_for_')[0];

  // Character-based languages (Arabic, Chinese)
  if (targetLang === 'ara' || targetLang === 'zho') {
    // Split into individual characters, filtering out whitespace and punctuation
    return text.split('').filter(char => {
      // Keep Arabic/Chinese characters, filter out spaces, punctuation, digits
      const code = char.charCodeAt(0);
      // Arabic: U+0600 to U+06FF, Chinese: U+4E00 to U+9FFF
      return (code >= 0x0600 && code <= 0x06FF) ||
             (code >= 0x4E00 && code <= 0x9FFF) ||
             (code >= 0x3400 && code <= 0x4DBF); // CJK Extension A
    });
  }

  // Word-based languages
  // Split by whitespace and punctuation, keep only alphabetic words
  return text.toLowerCase()
    .split(/[\s.,!?;:()\[\]{}"']+/)
    .filter(word => word.length > 0 && /[a-zàâäæçéèêëïîôùûüÿœ]/i.test(word));
}

/**
 * Build vocabulary set progressively for a course
 * Returns a map of { seed_lego_key -> Set<token> }
 */
async function buildVocabularyProgression(courseCode) {
  console.log(`\n📚 Building vocabulary progression for ${courseCode}...`);

  // Fetch all LEGOs for this course, ordered by seed_number, lego_index
  const { data: legos, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, target_text, components, type')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: true })
    .order('lego_index', { ascending: true });

  if (error) {
    console.error(`Error fetching LEGOs: ${error.message}`);
    return null;
  }

  console.log(`  Found ${legos.length} LEGOs`);

  // Build progressive vocabulary
  const vocabByPosition = new Map();
  const globalVocab = new Set();

  for (const lego of legos) {
    const key = `${lego.seed_number}_${lego.lego_index}`;

    // At this point, vocabulary includes:
    // 1. All previous LEGOs
    // 2. Components of current M-LEGO (if M-type)
    // 3. The current LEGO itself

    const currentVocab = new Set(globalVocab);

    // Add M-LEGO components first (available during component phrases)
    if (lego.type === 'M' && lego.components && Array.isArray(lego.components)) {
      for (const component of lego.components) {
        if (component.target) {
          const componentTokens = tokenizeText(component.target, courseCode);
          componentTokens.forEach(token => currentVocab.add(token));
        }
      }
    }

    // Add the LEGO itself
    const legoTokens = tokenizeText(lego.target_text, courseCode);
    legoTokens.forEach(token => currentVocab.add(token));

    // Store vocabulary snapshot at this position
    vocabByPosition.set(key, new Set(currentVocab));

    // Update global vocabulary for next LEGO
    legoTokens.forEach(token => globalVocab.add(token));
  }

  console.log(`  Final vocabulary size: ${globalVocab.size} tokens`);

  return vocabByPosition;
}

/**
 * Analyze ZUT compliance for all phrases in a course
 */
async function analyzeZUTCompliance(courseCode, vocabByPosition) {
  console.log(`\n🔍 Analyzing ZUT compliance for ${courseCode}...`);

  // Fetch all practice phrases for this course
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, target_text, position')
    .eq('course_code', courseCode)
    .order('seed_number', { ascending: true })
    .order('lego_index', { ascending: true })
    .order('position', { ascending: true });

  if (error) {
    console.error(`Error fetching phrases: ${error.message}`);
    return null;
  }

  console.log(`  Analyzing ${phrases.length} phrases...`);

  const violations = [];
  const violatingWords = new Map(); // word -> count
  const seedStats = new Map(); // seed -> { total, violations }
  const legoStats = new Map(); // lego_key -> { total, violations }

  let passCount = 0;
  let failCount = 0;

  for (const phrase of phrases) {
    const key = `${phrase.seed_number}_${phrase.lego_index}`;
    const vocab = vocabByPosition.get(key);

    if (!vocab) {
      console.warn(`  Warning: No vocabulary found for ${key}`);
      continue;
    }

    // Tokenize the phrase
    const tokens = tokenizeText(phrase.target_text, courseCode);

    // Check if all tokens are in vocabulary
    const unknownTokens = tokens.filter(token => !vocab.has(token));

    // Update stats
    const seedKey = `S${String(phrase.seed_number).padStart(4, '0')}`;
    if (!seedStats.has(seedKey)) {
      seedStats.set(seedKey, { total: 0, violations: 0 });
    }
    seedStats.get(seedKey).total++;

    const legoKey = `${seedKey}_L${phrase.lego_index}`;
    if (!legoStats.has(legoKey)) {
      legoStats.set(legoKey, { total: 0, violations: 0 });
    }
    legoStats.get(legoKey).total++;

    if (unknownTokens.length > 0) {
      failCount++;
      seedStats.get(seedKey).violations++;
      legoStats.get(legoKey).violations++;

      violations.push({
        seed_number: phrase.seed_number,
        lego_index: phrase.lego_index,
        position: phrase.position,
        phrase: phrase.target_text,
        unknown_tokens: unknownTokens,
        all_tokens: tokens,
        vocab_size: vocab.size
      });

      // Count violating words
      unknownTokens.forEach(token => {
        violatingWords.set(token, (violatingWords.get(token) || 0) + 1);
      });
    } else {
      passCount++;
    }
  }

  const passRate = (passCount / phrases.length * 100).toFixed(2);
  const failRate = (failCount / phrases.length * 100).toFixed(2);

  console.log(`  ✅ Pass: ${passCount} (${passRate}%)`);
  console.log(`  ❌ Fail: ${failCount} (${failRate}%)`);

  return {
    courseCode,
    totalPhrases: phrases.length,
    passCount,
    failCount,
    passRate: parseFloat(passRate),
    failRate: parseFloat(failRate),
    violations,
    violatingWords,
    seedStats,
    legoStats
  };
}

/**
 * Generate comprehensive ZUT compliance report
 */
async function generateReport() {
  console.log('🎯 ZUT (Zero Untaught) COMPLIANCE ANALYSIS');
  console.log('==========================================\n');

  const results = [];

  for (const courseCode of COURSES_TO_ANALYZE) {
    console.log(`\n📖 Processing ${courseCode}...`);

    // Build vocabulary progression
    const vocabByPosition = await buildVocabularyProgression(courseCode);
    if (!vocabByPosition) {
      console.error(`  Failed to build vocabulary progression`);
      continue;
    }

    // Analyze ZUT compliance
    const analysis = await analyzeZUTCompliance(courseCode, vocabByPosition);
    if (!analysis) {
      console.error(`  Failed to analyze ZUT compliance`);
      continue;
    }

    results.push(analysis);
  }

  // Generate report structure
  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      total_courses: results.length,
      overall_pass_rate: (results.reduce((sum, r) => sum + r.passRate, 0) / results.length).toFixed(2),
      overall_fail_rate: (results.reduce((sum, r) => sum + r.failRate, 0) / results.length).toFixed(2),
      total_phrases: results.reduce((sum, r) => sum + r.totalPhrases, 0),
      total_violations: results.reduce((sum, r) => sum + r.failCount, 0)
    },
    courses: results.map(r => ({
      course_code: r.courseCode,
      total_phrases: r.totalPhrases,
      pass_count: r.passCount,
      fail_count: r.failCount,
      pass_rate: r.passRate,
      fail_rate: r.failRate,
      unique_violating_words: r.violatingWords.size,

      // Top 20 violating words
      top_violating_words: Array.from(r.violatingWords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, count]) => ({ word, count })),

      // Seeds with most violations
      worst_seeds: Array.from(r.seedStats.entries())
        .filter(([_, stats]) => stats.violations > 0)
        .sort((a, b) => b[1].violations - a[1].violations)
        .slice(0, 10)
        .map(([seed, stats]) => ({
          seed,
          total: stats.total,
          violations: stats.violations,
          violation_rate: (stats.violations / stats.total * 100).toFixed(2)
        })),

      // LEGOs with most violations
      worst_legos: Array.from(r.legoStats.entries())
        .filter(([_, stats]) => stats.violations > 0)
        .sort((a, b) => b[1].violations - a[1].violations)
        .slice(0, 10)
        .map(([lego, stats]) => ({
          lego,
          total: stats.total,
          violations: stats.violations,
          violation_rate: (stats.violations / stats.total * 100).toFixed(2)
        })),

      // Sample violations (first 10)
      sample_violations: r.violations.slice(0, 10).map(v => ({
        location: `S${String(v.seed_number).padStart(4, '0')}_L${v.lego_index}_P${v.position}`,
        phrase: v.phrase,
        unknown_tokens: v.unknown_tokens,
        vocab_size_at_this_point: v.vocab_size
      }))
    })),

    // Detailed violations (all, for deep analysis)
    detailed_violations: results.flatMap(r =>
      r.violations.map(v => ({
        course_code: r.courseCode,
        seed_number: v.seed_number,
        lego_index: v.lego_index,
        position: v.position,
        phrase: v.phrase,
        unknown_tokens: v.unknown_tokens,
        all_tokens: v.all_tokens,
        vocab_size: v.vocab_size
      }))
    )
  };

  // Add severity assessment
  report.severity_assessment = assessSeverity(report);

  return report;
}

/**
 * Assess severity of ZUT violations
 */
function assessSeverity(report) {
  const overallFailRate = parseFloat(report.summary.overall_fail_rate);

  let severity = 'UNKNOWN';
  let recommendation = '';

  if (overallFailRate === 0) {
    severity = 'EXCELLENT';
    recommendation = 'Perfect ZUT compliance. All phrases use only taught vocabulary.';
  } else if (overallFailRate < 1) {
    severity = 'MINOR';
    recommendation = 'Very good ZUT compliance. Less than 1% of phrases have violations. Review and fix specific cases.';
  } else if (overallFailRate < 5) {
    severity = 'MODERATE';
    recommendation = 'Good ZUT compliance but needs attention. 1-5% of phrases have violations. Systematic review recommended.';
  } else if (overallFailRate < 10) {
    severity = 'SIGNIFICANT';
    recommendation = 'Concerning ZUT compliance. 5-10% of phrases have violations. Immediate systematic review required.';
  } else {
    severity = 'CRITICAL';
    recommendation = 'Poor ZUT compliance. Over 10% of phrases violate ZUT principle. Urgent comprehensive review needed.';
  }

  return {
    severity,
    overall_fail_rate: overallFailRate,
    recommendation,
    courses_by_severity: report.courses
      .sort((a, b) => b.fail_rate - a.fail_rate)
      .map(c => ({
        course_code: c.course_code,
        fail_rate: c.fail_rate,
        fail_count: c.fail_count
      }))
  };
}

/**
 * Main execution
 */
async function main() {
  try {
    const report = await generateReport();

    // Save to JSON file
    const outputPath = path.join(__dirname, 'quality-reports', 'zut-compliance.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log('\n\n✅ REPORT GENERATED');
    console.log('===================');
    console.log(`📄 Output: ${outputPath}`);
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total courses analyzed: ${report.summary.total_courses}`);
    console.log(`   Total phrases: ${report.summary.total_phrases.toLocaleString()}`);
    console.log(`   Overall pass rate: ${report.summary.overall_pass_rate}%`);
    console.log(`   Overall fail rate: ${report.summary.overall_fail_rate}%`);
    console.log(`   Total violations: ${report.summary.total_violations.toLocaleString()}`);
    console.log(`\n🎯 SEVERITY: ${report.severity_assessment.severity}`);
    console.log(`   ${report.severity_assessment.recommendation}`);

    console.log(`\n📋 PER-COURSE RESULTS:`);
    for (const course of report.courses) {
      console.log(`\n   ${course.course_code}:`);
      console.log(`     Total phrases: ${course.total_phrases.toLocaleString()}`);
      console.log(`     Pass rate: ${course.pass_rate}%`);
      console.log(`     Fail rate: ${course.fail_rate}%`);
      console.log(`     Unique violating words: ${course.unique_violating_words}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
