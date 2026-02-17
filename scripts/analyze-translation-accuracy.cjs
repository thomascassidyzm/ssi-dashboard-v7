/**
 * Translation Accuracy Analyzer for SSi Courses
 *
 * Analyzes semantic equivalence between known_text and target_text pairs.
 * In SSi, every phrase pair MUST be a translation - no additions, no omissions.
 *
 * Samples 50 USE phrases per course and assesses:
 * - Exact semantic match
 * - Minor deviations (e.g., register differences)
 * - Significant mismatches (missing/added content)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Target courses for analysis
const TARGET_COURSES = [
  'eng_for_ara',  // Arabic speakers learning English
  'deu_for_eng',  // German for English speakers
  'ara_for_eng',  // Arabic for English speakers
  'eng_for_deu',  // German speakers learning English
  'bre_for_fra',  // Breton for French speakers
  'cym_s_for_eng',  // South Welsh for English speakers
  'cym_n_for_eng'   // North Welsh for English speakers
];

// Analysis ratings
const RATINGS = {
  EXACT_MATCH: 'EXACT_MATCH',
  MINOR_DEVIATION: 'MINOR_DEVIATION',
  SIGNIFICANT_MISMATCH: 'SIGNIFICANT_MISMATCH'
};

/**
 * Language-specific analysis rules
 * These help identify common patterns where translations might differ structurally
 * but are still semantically equivalent
 */
const LANGUAGE_RULES = {
  // Pro-drop languages where pronouns are optional
  'ara': { pronounsOptional: true, articles: ['ال', 'لل'], verbFirst: true },
  'spa': { pronounsOptional: true, articles: ['el', 'la', 'los', 'las'], verbFirst: false },

  // Languages with grammatical gender that might add articles
  'deu': { articles: ['der', 'die', 'das', 'den', 'dem', 'des'], caseSensitive: true },
  'fra': { articles: ['le', 'la', 'les', 'un', 'une', 'des'], genderMarking: true },

  // Celtic languages with mutations and no indefinite articles
  'cym': { mutations: true, noIndefiniteArticle: true, vso: true },
  'bre': { mutations: true, articles: ['ar', 'an', 'al'], vso: true },

  // English as baseline
  'eng': { articles: ['the', 'a', 'an'], svo: true }
};

/**
 * Analyze a single phrase pair for translation accuracy
 */
function analyzePhrasePair(known, target, knownLang, targetLang) {
  const issues = [];
  let rating = RATINGS.EXACT_MATCH;

  // Basic validation
  if (!known || !target) {
    return {
      rating: RATINGS.SIGNIFICANT_MISMATCH,
      issues: ['Empty or missing text'],
      knownTokenCount: 0,
      targetTokenCount: 0
    };
  }

  // Normalize for comparison
  const knownNorm = known.trim().toLowerCase();
  const targetNorm = target.trim().toLowerCase();

  // Tokenize (simple word-based)
  const knownTokens = knownNorm.split(/\s+/).filter(t => t.length > 0);
  const targetTokens = targetNorm.split(/\s+/).filter(t => t.length > 0);

  const knownCount = knownTokens.length;
  const targetCount = targetTokens.length;

  // Check for identical structure (same word count is a good sign for direct translation)
  const tokenDiff = Math.abs(knownCount - targetCount);
  const tokenRatio = Math.max(knownCount, targetCount) / Math.min(knownCount, targetCount);

  // Flag significant length discrepancies
  if (tokenRatio > 2.0) {
    rating = RATINGS.SIGNIFICANT_MISMATCH;
    issues.push(`Large word count mismatch: ${knownCount} vs ${targetCount} (ratio ${tokenRatio.toFixed(2)}x)`);
  } else if (tokenRatio > 1.5) {
    rating = RATINGS.MINOR_DEVIATION;
    issues.push(`Moderate word count difference: ${knownCount} vs ${targetCount}`);
  }

  // Check for common translation issues

  // 1. Pronoun presence (one has "I/you/we" but other doesn't)
  const pronouns = {
    eng: ['i', 'you', 'he', 'she', 'we', 'they'],
    ara: ['أنا', 'أنت', 'أنتِ', 'هو', 'هي', 'نحن', 'هم'],
    deu: ['ich', 'du', 'er', 'sie', 'wir', 'ihr'],
    fra: ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'],
    spa: ['yo', 'tú', 'él', 'ella', 'nosotros', 'vosotros', 'ellos'],
    cym: ['i', 'ti', 'fe', 'fo', 'ni', 'chi', 'nhw'],
    bre: ['me', 'te', 'eñ', 'hi', 'ni', 'c\'hoazh']
  };

  const knownHasPronoun = pronouns[knownLang]?.some(p => knownTokens.includes(p)) || false;
  const targetHasPronoun = pronouns[targetLang]?.some(p => targetTokens.includes(p)) || false;

  if (knownHasPronoun !== targetHasPronoun) {
    // Check if either language is pro-drop
    const knownRules = LANGUAGE_RULES[knownLang] || {};
    const targetRules = LANGUAGE_RULES[targetLang] || {};

    if ((targetRules.pronounsOptional && !targetHasPronoun) ||
        (knownRules.pronounsOptional && !knownHasPronoun)) {
      // This is acceptable in pro-drop languages
      if (rating === RATINGS.EXACT_MATCH) {
        rating = RATINGS.MINOR_DEVIATION;
      }
      const proDrop = targetRules.pronounsOptional ? targetLang : knownLang;
      issues.push(`Pronoun omitted in ${proDrop} (pro-drop language - acceptable)`);
    } else {
      rating = RATINGS.SIGNIFICANT_MISMATCH;
      issues.push(`Pronoun mismatch: known has pronoun but target doesn't (or vice versa)`);
    }
  }

  // 2. Article presence differences
  const knownHasArticle = LANGUAGE_RULES[knownLang]?.articles?.some(a => knownTokens.includes(a)) || false;
  const targetHasArticle = LANGUAGE_RULES[targetLang]?.articles?.some(a => targetTokens.includes(a)) || false;

  if (knownHasArticle !== targetHasArticle) {
    if (LANGUAGE_RULES[targetLang]?.noIndefiniteArticle && knownTokens.includes('a') || knownTokens.includes('an')) {
      // Welsh/Breton don't have indefinite articles - acceptable
      if (rating === RATINGS.EXACT_MATCH) {
        rating = RATINGS.MINOR_DEVIATION;
      }
      issues.push(`Indefinite article omitted in ${targetLang} (no indefinite article in language - acceptable)`);
    } else {
      rating = RATINGS.MINOR_DEVIATION;
      issues.push(`Article presence differs between languages`);
    }
  }

  // 3. Question marks - both should have or both should not have
  // Handle Unicode question marks: ASCII (U+003F), Arabic (U+061F), Greek (U+037E)
  const knownHasQuestion = known.includes('?') || known.includes('؟') || known.includes(';');
  const targetHasQuestion = target.includes('?') || target.includes('؟') || target.includes(';');

  if (knownHasQuestion !== targetHasQuestion) {
    rating = RATINGS.SIGNIFICANT_MISMATCH;
    issues.push(`Question mark mismatch: one is a question, the other is not`);
  }

  // 4. Check for obvious additions (e.g., "please", "actually", "really")
  const fillers = ['please', 'actually', 'really', 'just', 'very', 'quite', 'rather'];
  const knownHasFillers = fillers.some(f => knownNorm.includes(f));
  const targetFillers = {
    ara: ['من فضلك', 'حقا', 'فعلا', 'جدا'],
    deu: ['bitte', 'eigentlich', 'wirklich', 'sehr', 'ganz'],
    fra: ['s\'il vous plaît', 'vraiment', 'très', 'assez'],
    spa: ['por favor', 'realmente', 'muy', 'bastante'],
    cym: ['os gwelwch yn dda', 'wir', 'iawn', 'eithaf'],
    bre: ['mar plij', 'gwir', 'kalz', 'un tammig']
  };
  const targetHasFillers = targetFillers[targetLang]?.some(f => targetNorm.includes(f)) || false;

  if (knownHasFillers !== targetHasFillers) {
    if (rating === RATINGS.EXACT_MATCH) {
      rating = RATINGS.MINOR_DEVIATION;
    }
    issues.push(`Filler word (please/really/etc.) added or omitted`);
  }

  // 5. Punctuation consistency
  const knownPunct = known.replace(/[^\.\!\?\,\;\:]/g, '');
  const targetPunct = target.replace(/[^\.\!\?\,\;\:]/g, '');

  if (knownPunct !== targetPunct && knownPunct.length > 0 && targetPunct.length > 0) {
    if (rating === RATINGS.EXACT_MATCH) {
      rating = RATINGS.MINOR_DEVIATION;
    }
    issues.push(`Punctuation differs: "${knownPunct}" vs "${targetPunct}"`);
  }

  return {
    rating,
    issues: issues.length > 0 ? issues : ['No issues detected'],
    knownTokenCount: knownCount,
    targetTokenCount: targetCount,
    tokenRatio: tokenRatio.toFixed(2)
  };
}

/**
 * Extract language codes from course code
 * IMPORTANT: In SSi, course code format is TARGET_for_KNOWN
 * But in the database, known_text is in known_lang, target_text is in target_lang
 * We need to query the courses table for the actual language mapping
 */
async function getLanguageCodes(courseCode) {
  // Query the database for the correct language mapping
  const { data: course, error } = await supabase
    .from('courses')
    .select('known_lang, target_lang')
    .eq('course_code', courseCode)
    .single();

  if (error || !course) {
    console.error(`  Could not fetch language codes for ${courseCode}`);
    return { knownLang: 'unknown', targetLang: 'unknown' };
  }

  return {
    knownLang: course.known_lang,   // Language of known_text
    targetLang: course.target_lang  // Language of target_text
  };
}

/**
 * Analyze a single course
 */
async function analyzeCourse(courseCode) {
  console.log(`\nAnalyzing ${courseCode}...`);

  const { knownLang, targetLang } = await getLanguageCodes(courseCode);

  // Fetch 50 USE phrases randomly
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('id, known_text, target_text, seed_number, lego_index, phrase_role')
    .eq('course_code', courseCode)
    .eq('phrase_role', 'use')
    .limit(1000); // Get more than needed so we can randomly sample

  if (error) {
    console.error(`  Error fetching phrases: ${error.message}`);
    return null;
  }

  if (!phrases || phrases.length === 0) {
    console.log(`  No USE phrases found`);
    return null;
  }

  // Randomly sample 50 (or all if fewer)
  const sampleSize = Math.min(50, phrases.length);
  const shuffled = phrases.sort(() => 0.5 - Math.random());
  const sample = shuffled.slice(0, sampleSize);

  console.log(`  Sampled ${sample.length} USE phrases from ${phrases.length} total`);

  // Analyze each phrase
  const results = {
    courseCode,
    knownLang,
    targetLang,
    totalSampled: sample.length,
    ratings: {
      [RATINGS.EXACT_MATCH]: 0,
      [RATINGS.MINOR_DEVIATION]: 0,
      [RATINGS.SIGNIFICANT_MISMATCH]: 0
    },
    examples: {
      [RATINGS.EXACT_MATCH]: [],
      [RATINGS.MINOR_DEVIATION]: [],
      [RATINGS.SIGNIFICANT_MISMATCH]: []
    },
    commonPatterns: []
  };

  const issueFrequency = {};

  for (const phrase of sample) {
    const analysis = analyzePhrasePair(
      phrase.known_text,
      phrase.target_text,
      knownLang,
      targetLang
    );

    results.ratings[analysis.rating]++;

    // Track issue patterns
    for (const issue of analysis.issues) {
      if (issue !== 'No issues detected') {
        issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
      }
    }

    // Store examples (max 3 per rating)
    if (results.examples[analysis.rating].length < 3) {
      results.examples[analysis.rating].push({
        phraseId: phrase.id,
        seedNumber: phrase.seed_number,
        legoIndex: phrase.lego_index,
        knownText: phrase.known_text,
        targetText: phrase.target_text,
        issues: analysis.issues,
        tokenCounts: {
          known: analysis.knownTokenCount,
          target: analysis.targetTokenCount,
          ratio: analysis.tokenRatio
        }
      });
    }
  }

  // Calculate accuracy rate
  results.accuracyRate = {
    exact: ((results.ratings[RATINGS.EXACT_MATCH] / results.totalSampled) * 100).toFixed(1),
    acceptable: (((results.ratings[RATINGS.EXACT_MATCH] + results.ratings[RATINGS.MINOR_DEVIATION]) / results.totalSampled) * 100).toFixed(1),
    problematic: ((results.ratings[RATINGS.SIGNIFICANT_MISMATCH] / results.totalSampled) * 100).toFixed(1)
  };

  // Identify common patterns (issues appearing in >10% of samples)
  const patternThreshold = results.totalSampled * 0.1;
  results.commonPatterns = Object.entries(issueFrequency)
    .filter(([_, count]) => count >= patternThreshold)
    .sort((a, b) => b[1] - a[1])
    .map(([issue, count]) => ({
      issue,
      frequency: count,
      percentage: ((count / results.totalSampled) * 100).toFixed(1)
    }));

  console.log(`  Accuracy: ${results.accuracyRate.exact}% exact, ${results.accuracyRate.acceptable}% acceptable, ${results.accuracyRate.problematic}% problematic`);

  return results;
}

/**
 * Main analysis function
 */
async function main() {
  console.log('SSi Translation Accuracy Analysis');
  console.log('='.repeat(80));
  console.log(`Analyzing ${TARGET_COURSES.length} courses`);
  console.log(`Sample size: 50 USE phrases per course\n`);

  const allResults = [];

  for (const courseCode of TARGET_COURSES) {
    const result = await analyzeCourse(courseCode);
    if (result) {
      allResults.push(result);
    }
  }

  // Generate summary
  const summary = {
    timestamp: new Date().toISOString(),
    totalCoursesAnalyzed: allResults.length,
    overallStatistics: {
      averageExactMatch: 0,
      averageAcceptable: 0,
      averageProblematic: 0
    },
    courseResults: allResults,
    needsAttention: [],
    recommendations: []
  };

  // Calculate averages
  if (allResults.length > 0) {
    summary.overallStatistics.averageExactMatch = (
      allResults.reduce((sum, r) => sum + parseFloat(r.accuracyRate.exact), 0) / allResults.length
    ).toFixed(1);
    summary.overallStatistics.averageAcceptable = (
      allResults.reduce((sum, r) => sum + parseFloat(r.accuracyRate.acceptable), 0) / allResults.length
    ).toFixed(1);
    summary.overallStatistics.averageProblematic = (
      allResults.reduce((sum, r) => sum + parseFloat(r.accuracyRate.problematic), 0) / allResults.length
    ).toFixed(1);
  }

  // Identify courses needing attention (>10% problematic)
  summary.needsAttention = allResults
    .filter(r => parseFloat(r.accuracyRate.problematic) > 10)
    .sort((a, b) => parseFloat(b.accuracyRate.problematic) - parseFloat(a.accuracyRate.problematic))
    .map(r => ({
      courseCode: r.courseCode,
      problematicRate: r.accuracyRate.problematic,
      topIssues: r.commonPatterns.slice(0, 3).map(p => p.issue)
    }));

  // Generate recommendations
  const allPatterns = {};
  for (const result of allResults) {
    for (const pattern of result.commonPatterns) {
      if (!allPatterns[pattern.issue]) {
        allPatterns[pattern.issue] = {
          issue: pattern.issue,
          courses: [],
          totalOccurrences: 0
        };
      }
      allPatterns[pattern.issue].courses.push(result.courseCode);
      allPatterns[pattern.issue].totalOccurrences += pattern.frequency;
    }
  }

  summary.recommendations = Object.values(allPatterns)
    .filter(p => p.courses.length >= 2) // Issues appearing in 2+ courses
    .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
    .slice(0, 5)
    .map(p => ({
      issue: p.issue,
      affectedCourses: p.courses,
      suggestion: generateSuggestion(p.issue)
    }));

  // Save report
  const reportPath = path.join(__dirname, 'quality-reports', 'translation-accuracy.json');
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total courses analyzed: ${summary.totalCoursesAnalyzed}`);
  console.log(`Average exact match: ${summary.overallStatistics.averageExactMatch}%`);
  console.log(`Average acceptable: ${summary.overallStatistics.averageAcceptable}%`);
  console.log(`Average problematic: ${summary.overallStatistics.averageProblematic}%`);

  if (summary.needsAttention.length > 0) {
    console.log('\nCourses needing attention:');
    for (const course of summary.needsAttention) {
      console.log(`  - ${course.courseCode}: ${course.problematicRate}% problematic`);
      console.log(`    Top issues: ${course.topIssues.join(', ')}`);
    }
  } else {
    console.log('\nAll courses have good translation accuracy (<10% problematic)');
  }

  console.log(`\nFull report saved to: ${reportPath}`);
}

/**
 * Generate a suggestion based on the issue pattern
 */
function generateSuggestion(issue) {
  if (issue.includes('word count mismatch')) {
    return 'Review these phrase pairs for missing or added content. Translations should be semantically equivalent.';
  }
  if (issue.includes('Pronoun')) {
    return 'Check if pronoun usage is consistent with language grammar. Pro-drop languages can omit pronouns.';
  }
  if (issue.includes('Article')) {
    return 'Verify article usage is appropriate for target language. Some languages lack indefinite articles.';
  }
  if (issue.includes('Question mark')) {
    return 'CRITICAL: Both known and target should be questions or statements. Fix these immediately.';
  }
  if (issue.includes('Filler word')) {
    return 'Review if filler words (please, really, etc.) should be included in both languages or neither.';
  }
  return 'Review these phrase pairs for semantic equivalence.';
}

// Run the analysis
main().catch(console.error);
