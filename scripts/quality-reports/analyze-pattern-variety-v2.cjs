/**
 * Pattern Variety Analyzer v2
 *
 * IMPROVEMENT: Handles bilingual courses correctly by detecting the language
 * being taught and analyzing the appropriate text field.
 *
 * For courses like "eng_for_ara", this analyzes the TARGET (English) text,
 * not the KNOWN (Arabic) text.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const COURSES = [
  'deu_for_eng',
  'ara_for_eng',
  'eng_for_ara',
  'eng_for_deu',
  'cym_s_for_eng'
];

// Pattern detection helpers
const PATTERNS = {
  // Question patterns
  questionWords: ['what', 'where', 'when', 'why', 'who', 'how', 'which', 'whose'],
  questionStarts: ['do ', 'does ', 'did ', 'is ', 'are ', 'was ', 'were ', 'have ', 'has ', 'had ', 'will ', 'would ', 'can ', 'could ', 'should ', 'shall ', 'may ', 'might'],

  // Negation patterns
  negationWords: ["don't", "doesn't", "didn't", "not", "never", "no ", "neither", "nor", "nothing", "nobody", "nowhere", "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't", "won't", "wouldn't", "can't", "couldn't", "shouldn't"],

  // Subject patterns
  firstPerson: [' i ', ' i\'', ' my ', ' me ', ' mine ', ' we ', ' our ', ' us ', ' ours '],
  secondPerson: [' you ', ' your ', ' yours '],
  thirdPerson: [' he ', ' she ', ' it ', ' they ', ' him ', ' her ', ' them ', ' his ', ' hers ', ' their ', ' theirs '],

  // Command patterns (imperative)
  imperativeStarts: ['go ', 'come ', 'take ', 'give ', 'tell ', 'show ', 'help ', 'try ', 'think ', 'look ', 'listen ', 'wait ', 'stop ', 'start ', 'make ', 'get ', 'put ', 'open ', 'close ', 'please '],

  // Common sentence openings (to detect repetition)
  commonOpenings: ['i want', 'i need', 'i\'m trying', 'i would like', 'i have', 'i\'m going', 'can you', 'could you', 'would you', 'do you', 'are you', 'will you', 'he wants', 'she wants', 'they want', 'we want', 'we need']
};

/**
 * Detect which language is being taught (for reverse courses)
 */
function detectTargetLanguage(courseCode) {
  // Format: {target}_for_{known}
  // eng_for_ara = English for Arabic speakers (teaching English)
  const parts = courseCode.split('_for_');
  return {
    target_lang: parts[0],
    known_lang: parts[1],
    is_teaching_english: parts[0] === 'eng'
  };
}

/**
 * Normalize text for pattern matching
 */
function normalizeText(text) {
  return ` ${text.toLowerCase().trim()} `;
}

/**
 * Detect if phrase is a question
 */
function isQuestion(text) {
  const normalized = normalizeText(text);

  // Check for question mark
  if (text.includes('?')) return true;

  // Check for question words
  if (PATTERNS.questionWords.some(word => normalized.includes(` ${word} `))) {
    return true;
  }

  // Check for inverted question starts
  if (PATTERNS.questionStarts.some(start => normalized.startsWith(` ${start}`))) {
    return true;
  }

  return false;
}

/**
 * Detect if phrase is a negation
 */
function isNegation(text) {
  const normalized = normalizeText(text);
  return PATTERNS.negationWords.some(neg => normalized.includes(neg));
}

/**
 * Detect subject type
 */
function detectSubject(text) {
  const normalized = normalizeText(text);

  if (PATTERNS.firstPerson.some(word => normalized.includes(word))) {
    return 'first_person';
  }
  if (PATTERNS.secondPerson.some(word => normalized.includes(word))) {
    return 'second_person';
  }
  if (PATTERNS.thirdPerson.some(word => normalized.includes(word))) {
    return 'third_person';
  }
  return 'unknown';
}

/**
 * Detect if phrase is a command (imperative)
 */
function isCommand(text) {
  const normalized = normalizeText(text);

  // Commands often start with verb
  if (PATTERNS.imperativeStarts.some(start => normalized.startsWith(` ${start}`))) {
    return true;
  }

  // Commands typically don't have subject pronouns at start
  const firstWord = normalized.trim().split(' ')[0];
  if (firstWord && !['i', 'you', 'he', 'she', 'it', 'we', 'they', 'the', 'a', 'an'].includes(firstWord)) {
    // Might be a command
    return true;
  }

  return false;
}

/**
 * Get sentence opening (first 2-3 words)
 */
function getSentenceOpening(text) {
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/).slice(0, 3);
  return words.join(' ');
}

/**
 * Check if text is likely English
 */
function isLikelyEnglish(text) {
  // Simple heuristic: check if text uses Latin alphabet and common English words
  const hasLatinAlphabet = /^[\x00-\x7F\s]+$/.test(text); // ASCII only
  const commonWords = ['i', 'you', 'the', 'a', 'to', 'want', 'like', 'have', 'do'];
  const normalized = normalizeText(text);
  const hasCommonWords = commonWords.some(word => normalized.includes(` ${word} `));

  return hasLatinAlphabet && hasCommonWords;
}

/**
 * Categorize a phrase
 */
function categorizePhrase(text) {
  // Only attempt categorization if text is likely English
  if (!isLikelyEnglish(text)) {
    return {
      is_question: false,
      is_negation: false,
      is_command: false,
      subject: 'non_english',
      opening: getSentenceOpening(text),
      primary_type: 'non_english'
    };
  }

  const categories = {
    is_question: isQuestion(text),
    is_negation: isNegation(text),
    is_command: isCommand(text),
    subject: detectSubject(text),
    opening: getSentenceOpening(text)
  };

  // Determine primary type
  if (categories.is_command && !categories.is_question) {
    categories.primary_type = 'command';
  } else if (categories.is_question) {
    categories.primary_type = 'question';
  } else if (categories.is_negation) {
    categories.primary_type = 'negation';
  } else {
    categories.primary_type = 'statement';
  }

  return categories;
}

/**
 * Analyze pattern variety for a single course
 */
async function analyzeCourse(courseCode) {
  console.log(`\n📊 Analyzing ${courseCode}...`);

  const langInfo = detectTargetLanguage(courseCode);
  console.log(`   Target language: ${langInfo.target_lang}`);
  console.log(`   Known language: ${langInfo.known_lang}`);

  // Fetch USE phrases from database
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('known_text, target_text')
    .eq('course_code', courseCode)
    .eq('phrase_role', 'use')
    .limit(1000);

  if (error) {
    console.error(`   ❌ Error fetching phrases: ${error.message}`);
    return null;
  }

  if (!phrases || phrases.length === 0) {
    console.log(`   ⚠️  No USE phrases found`);
    return null;
  }

  console.log(`   ✓ Analyzing ${phrases.length} USE phrases`);

  // CRITICAL FIX: For courses teaching English, analyze target_text (English output)
  // For courses teaching other languages, analyze known_text (English input)
  const textField = langInfo.is_teaching_english ? 'target_text' : 'known_text';
  console.log(`   📝 Analyzing: ${textField} (${langInfo.is_teaching_english ? 'learner output' : 'learner input'})`);

  // Categorize all phrases
  const categorizations = phrases.map(p => ({
    known_text: p.known_text,
    target_text: p.target_text,
    analyzed_text: p[textField],
    ...categorizePhrase(p[textField])
  }));

  // Check how many non-English phrases we got
  const nonEnglishCount = categorizations.filter(c => c.primary_type === 'non_english').length;
  if (nonEnglishCount > categorizations.length * 0.8) {
    console.log(`   ⚠️  WARNING: ${nonEnglishCount}/${categorizations.length} phrases appear non-English`);
    console.log(`   💡 This may indicate incorrect text field selection`);
  }

  // Calculate distributions
  const stats = {
    total_phrases: categorizations.length,
    non_english_phrases: nonEnglishCount,
    text_field_analyzed: textField,

    // Primary types
    by_type: {
      statement: categorizations.filter(c => c.primary_type === 'statement').length,
      question: categorizations.filter(c => c.primary_type === 'question').length,
      negation: categorizations.filter(c => c.primary_type === 'negation').length,
      command: categorizations.filter(c => c.primary_type === 'command').length,
      non_english: nonEnglishCount
    },

    // Subject distribution
    by_subject: {
      first_person: categorizations.filter(c => c.subject === 'first_person').length,
      second_person: categorizations.filter(c => c.subject === 'second_person').length,
      third_person: categorizations.filter(c => c.subject === 'third_person').length,
      unknown: categorizations.filter(c => c.subject === 'unknown').length,
      non_english: categorizations.filter(c => c.subject === 'non_english').length
    },

    // Opening patterns (top 20 most common)
    opening_patterns: {}
  };

  // Count opening patterns
  categorizations.forEach(c => {
    const opening = c.opening;
    stats.opening_patterns[opening] = (stats.opening_patterns[opening] || 0) + 1;
  });

  // Convert to percentages and sort
  const total = stats.total_phrases;

  const typePercentages = {};
  Object.entries(stats.by_type).forEach(([type, count]) => {
    typePercentages[type] = {
      count,
      percentage: ((count / total) * 100).toFixed(1)
    };
  });

  const subjectPercentages = {};
  Object.entries(stats.by_subject).forEach(([subject, count]) => {
    subjectPercentages[subject] = {
      count,
      percentage: ((count / total) * 100).toFixed(1)
    };
  });

  // Top 20 openings with percentages
  const topOpenings = Object.entries(stats.opening_patterns)
    .map(([opening, count]) => ({
      opening,
      count,
      percentage: ((count / total) * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Calculate variety score (0-100, higher = more diverse)
  const varietyScore = calculateVarietyScore(typePercentages, subjectPercentages, topOpenings, total, nonEnglishCount);

  // Identify issues
  const issues = identifyIssues(typePercentages, subjectPercentages, topOpenings);

  return {
    course_code: courseCode,
    language_info: langInfo,
    total_phrases: total,
    non_english_phrases: nonEnglishCount,
    text_field_analyzed: textField,
    variety_score: varietyScore,
    by_type: typePercentages,
    by_subject: subjectPercentages,
    top_openings: topOpenings,
    issues,
    sample_phrases: {
      questions: categorizations.filter(c => c.is_question).slice(0, 5).map(c => c.analyzed_text),
      negations: categorizations.filter(c => c.is_negation).slice(0, 5).map(c => c.analyzed_text),
      commands: categorizations.filter(c => c.is_command && c.primary_type !== 'non_english').slice(0, 5).map(c => c.analyzed_text),
      third_person: categorizations.filter(c => c.subject === 'third_person').slice(0, 5).map(c => c.analyzed_text)
    }
  };
}

/**
 * Calculate variety score (0-100)
 */
function calculateVarietyScore(typePercentages, subjectPercentages, topOpenings, total, nonEnglishCount) {
  // If more than 50% non-English, return low score with warning
  if (nonEnglishCount > total * 0.5) {
    return Math.max(0, 50 - (nonEnglishCount / total * 100));
  }

  let score = 100;

  // Penalize if any type is > 70% or < 5%
  Object.entries(typePercentages).forEach(([type, { percentage }]) => {
    if (type === 'non_english') return; // Skip non-English category
    const pct = parseFloat(percentage);
    if (pct > 70) score -= (pct - 70) * 0.5;
    if (pct < 5 && pct > 0) score -= 5;
  });

  // Penalize if any subject is > 70%
  Object.entries(subjectPercentages).forEach(([subject, { percentage }]) => {
    if (subject === 'non_english') return;
    const pct = parseFloat(percentage);
    if (pct > 70) score -= (pct - 70) * 0.3;
  });

  // Penalize if top opening is > 15% of phrases
  if (topOpenings.length > 0) {
    const topPct = parseFloat(topOpenings[0].percentage);
    if (topPct > 15) score -= (topPct - 15) * 0.8;
  }

  // Penalize if top 5 openings account for > 40% of phrases
  if (topOpenings.length >= 5) {
    const top5Pct = topOpenings.slice(0, 5).reduce((sum, o) => sum + parseFloat(o.percentage), 0);
    if (top5Pct > 40) score -= (top5Pct - 40) * 0.4;
  }

  return Math.max(0, Math.round(score));
}

/**
 * Identify specific issues
 */
function identifyIssues(typePercentages, subjectPercentages, topOpenings) {
  const issues = {
    overused_patterns: [],
    underused_patterns: [],
    recommendations: []
  };

  // Check type distributions
  Object.entries(typePercentages).forEach(([type, { count, percentage }]) => {
    if (type === 'non_english') return;
    const pct = parseFloat(percentage);
    if (pct > 30) {
      issues.overused_patterns.push({
        pattern: type,
        percentage: pct,
        severity: pct > 50 ? 'high' : 'medium'
      });
    }
    if (pct < 5 && pct > 0) {
      issues.underused_patterns.push({
        pattern: type,
        percentage: pct,
        severity: 'low'
      });
    }
  });

  // Check subject distributions
  Object.entries(subjectPercentages).forEach(([subject, { count, percentage }]) => {
    if (subject === 'non_english' || subject === 'unknown') return;
    const pct = parseFloat(percentage);
    if (pct > 50) {
      issues.overused_patterns.push({
        pattern: subject,
        percentage: pct,
        severity: pct > 70 ? 'high' : 'medium'
      });
    }
    if (pct < 5 && pct > 0) {
      issues.underused_patterns.push({
        pattern: subject,
        percentage: pct,
        severity: 'low'
      });
    }
  });

  // Check opening repetition
  if (topOpenings.length > 0) {
    const topPct = parseFloat(topOpenings[0].percentage);
    if (topPct > 15) {
      issues.overused_patterns.push({
        pattern: `opening: "${topOpenings[0].opening}"`,
        percentage: topPct,
        severity: topPct > 25 ? 'high' : 'medium'
      });
    }
  }

  // Generate recommendations
  if (issues.overused_patterns.length > 0) {
    issues.recommendations.push('Reduce repetitive patterns by varying sentence structures');
  }
  if (issues.underused_patterns.length > 0) {
    issues.recommendations.push('Add more diverse patterns to improve learner engagement');
  }

  // Specific recommendations
  const statementPct = parseFloat(typePercentages.statement.percentage);
  const questionPct = parseFloat(typePercentages.question.percentage);
  const negationPct = parseFloat(typePercentages.negation.percentage);
  const commandPct = parseFloat(typePercentages.command.percentage);

  if (statementPct > 60) {
    issues.recommendations.push('Add more questions and commands to break monotony');
  }
  if (questionPct < 10) {
    issues.recommendations.push('Include more question patterns for natural conversation');
  }
  if (negationPct < 10) {
    issues.recommendations.push('Add more negation patterns (don\'t, can\'t, never, etc.)');
  }
  if (commandPct < 5) {
    issues.recommendations.push('Include imperative forms for practical communication');
  }

  const firstPersonPct = parseFloat(subjectPercentages.first_person.percentage);
  const thirdPersonPct = parseFloat(subjectPercentages.third_person.percentage);

  if (firstPersonPct > 60) {
    issues.recommendations.push('Diversify subjects - add "you", "he/she", "they" perspectives');
  }
  if (thirdPersonPct < 10) {
    issues.recommendations.push('Include more third-person constructions for storytelling');
  }

  return issues;
}

/**
 * Generate comparison across courses
 */
function generateComparison(results) {
  const validResults = results.filter(r => r !== null);

  if (validResults.length === 0) {
    return { error: 'No valid course data to compare' };
  }

  // Find best and worst variety scores
  const sortedByScore = [...validResults].sort((a, b) => b.variety_score - a.variety_score);

  return {
    best_variety: sortedByScore[0].course_code,
    worst_variety: sortedByScore[sortedByScore.length - 1].course_code,
    average_score: (sortedByScore.reduce((sum, r) => sum + r.variety_score, 0) / sortedByScore.length).toFixed(1),
    score_range: {
      highest: sortedByScore[0].variety_score,
      lowest: sortedByScore[sortedByScore.length - 1].variety_score
    },
    overall_trends: {
      avg_statement_pct: (validResults.reduce((sum, r) => sum + parseFloat(r.by_type.statement.percentage), 0) / validResults.length).toFixed(1),
      avg_question_pct: (validResults.reduce((sum, r) => sum + parseFloat(r.by_type.question.percentage), 0) / validResults.length).toFixed(1),
      avg_first_person_pct: (validResults.reduce((sum, r) => sum + parseFloat(r.by_subject.first_person.percentage), 0) / validResults.length).toFixed(1)
    }
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 SSi Pattern Variety Analysis v2');
  console.log('===================================\n');
  console.log('✨ NEW: Bilingual course support - analyzes correct language field\n');
  console.log('Analyzing sentence pattern diversity across courses...');

  const results = [];

  for (const courseCode of COURSES) {
    const result = await analyzeCourse(courseCode);
    if (result) {
      results.push(result);
    }
  }

  console.log('\n\n📈 Generating comparison...');
  const comparison = generateComparison(results);

  // Generate final report
  const report = {
    generated_at: new Date().toISOString(),
    version: '2.0',
    analysis_type: 'pattern_variety',
    description: 'Analyzes sentence pattern diversity with bilingual course support',
    improvements: [
      'Detects target language being taught',
      'Analyzes appropriate text field (known_text vs target_text)',
      'Flags non-English text with language detection'
    ],
    courses_analyzed: results.length,
    comparison,
    courses: results
  };

  // Write report
  const outputPath = path.join(__dirname, 'pattern-variety-v2.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`\n✅ Report saved to: ${outputPath}`);
  console.log('\n📊 Summary:');
  console.log(`   Total courses: ${results.length}`);
  console.log(`   Best variety: ${comparison.best_variety} (score: ${comparison.score_range.highest})`);
  console.log(`   Worst variety: ${comparison.worst_variety} (score: ${comparison.score_range.lowest})`);
  console.log(`   Average score: ${comparison.average_score}/100`);

  // Print key findings
  console.log('\n🔍 Key Findings:');
  results.forEach(r => {
    console.log(`\n   ${r.course_code} (variety score: ${r.variety_score}/100):`);
    console.log(`      - Text analyzed: ${r.text_field_analyzed}`);
    console.log(`      - Statements: ${r.by_type.statement.percentage}%`);
    console.log(`      - Questions: ${r.by_type.question.percentage}%`);
    console.log(`      - Negations: ${r.by_type.negation.percentage}%`);
    console.log(`      - First person: ${r.by_subject.first_person.percentage}%`);

    if (r.non_english_phrases > 0) {
      console.log(`      ⚠️  Non-English phrases: ${r.non_english_phrases} (${((r.non_english_phrases/r.total_phrases)*100).toFixed(1)}%)`);
    }

    if (r.issues.overused_patterns.length > 0) {
      const topIssue = r.issues.overused_patterns[0];
      console.log(`      ⚠️  Overused: ${topIssue.pattern} (${topIssue.percentage}%)`);
    }
    if (r.top_openings.length > 0) {
      console.log(`      🔝 Top opening: "${r.top_openings[0].opening}" (${r.top_openings[0].percentage}%)`);
    }
  });

  console.log('\n✅ Analysis complete!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
