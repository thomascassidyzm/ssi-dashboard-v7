#!/usr/bin/env node
/**
 * M-LEGO COMPONENT QUALITY ANALYSIS
 *
 * Analyzes M-type (Molecular) LEGOs to check if they have proper component breakdowns.
 * Components are the building blocks that should be taught BEFORE the full phrase.
 *
 * CRITICAL RULES:
 * 1. Components must be REAL WORDS, not grammar explanations
 * 2. Long M-LEGOs (4+ characters) should have 2+ components
 * 3. Components should enable mental construction of the M-LEGO
 *
 * Output: JSON report at scripts/quality-reports/mlego-components.json
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Courses to analyze (with most LEGOs)
const TARGET_COURSES = [
  'zho_for_eng',  // Chinese - 2,084 LEGOs
  'nld_for_eng',  // Dutch - 1,723 LEGOs
  'gle_for_eng',  // Irish - 1,234 LEGOs
  'deu_for_eng',  // German - 1,194 LEGOs
  'kor_for_eng',  // Korean - 1,120 LEGOs
  'ara_for_eng'   // Arabic - 1,078 LEGOs
];

// Grammar explanation patterns (these are BAD components)
const GRAMMAR_PATTERNS = [
  /\(.*\)/,                    // (classifier), (particle), (plural)
  /\[.*\]/,                    // [verb], [noun]
  /particle/i,
  /classifier/i,
  /plural/i,
  /possessive/i,
  /marker/i,
  /tense/i,
  /aspect/i,
  /question word/i,
  /pronoun/i,
  /^-/,                        // Suffixes like "-s", "-ed"
  /[A-Z]{2,}/                  // Abbreviations like "PL", "PAST"
];

function isGrammarExplanation(text) {
  if (!text || typeof text !== 'string') return false;
  return GRAMMAR_PATTERNS.some(pattern => pattern.test(text));
}

function getCharacterCount(text, language) {
  if (!text) return 0;

  // For CJK languages, count characters directly
  if (['zho', 'jpn', 'kor'].includes(language)) {
    return text.length;
  }

  // For other languages, count words
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function componentsAppearInTarget(components, targetText) {
  if (!components || !Array.isArray(components) || components.length === 0) return null;

  const appearances = [];
  for (const comp of components) {
    const compTarget = comp.target || comp;
    if (typeof compTarget === 'string' && compTarget.trim()) {
      const appears = targetText.includes(compTarget);
      appearances.push({
        component: compTarget,
        appears: appears
      });
    }
  }

  return appearances;
}

async function analyzeCourse(courseCode) {
  console.log(`\nAnalyzing ${courseCode}...`);

  // Get all M-type LEGOs for this course
  const { data: mLegos, error: legoError } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, type, components, is_new')
    .eq('course_code', courseCode)
    .eq('type', 'M')
    .order('seed_number')
    .order('lego_index');

  if (legoError) {
    console.error(`  Error fetching LEGOs: ${legoError.message}`);
    return null;
  }

  console.log(`  Found ${mLegos.length} M-type LEGOs`);

  // Get course info to determine target language
  const { data: course } = await supabase
    .from('courses')
    .select('target_lang')
    .eq('course_code', courseCode)
    .single();

  const targetLang = course?.target_lang || courseCode.split('_')[0];

  // Analysis variables
  const stats = {
    total: mLegos.length,
    withComponents: 0,
    withoutComponents: 0,
    emptyComponents: 0,
    longWithoutSufficient: 0,
    grammarExplanations: 0,
    componentsNotInTarget: 0,
    goodDecompositions: 0
  };

  const examples = {
    missing: [],
    insufficient: [],
    grammarExplanations: [],
    componentsNotInTarget: [],
    good: []
  };

  for (const lego of mLegos) {
    const components = lego.components || [];
    const targetLength = getCharacterCount(lego.target_text, targetLang);
    const hasComponents = components.length > 0;

    // Check 1: Does it have components?
    if (!hasComponents) {
      stats.withoutComponents++;
      if (examples.missing.length < 10) {
        examples.missing.push({
          seed: lego.seed_number,
          lego: lego.lego_index,
          known: lego.known_text,
          target: lego.target_text,
          targetLength: targetLength,
          isNew: lego.is_new
        });
      }
      continue;
    }

    // Check if components are empty/null
    const validComponents = components.filter(c => {
      if (!c) return false;
      const target = c.target || c;
      return target && typeof target === 'string' && target.trim().length > 0;
    });

    if (validComponents.length === 0) {
      stats.emptyComponents++;
      stats.withoutComponents++;
      if (examples.missing.length < 10) {
        examples.missing.push({
          seed: lego.seed_number,
          lego: lego.lego_index,
          known: lego.known_text,
          target: lego.target_text,
          targetLength: targetLength,
          components: components,
          issue: 'empty_components',
          isNew: lego.is_new
        });
      }
      continue;
    }

    stats.withComponents++;

    // Check 2: For long targets (4+ chars), do we have 2+ components?
    const isLong = targetLength >= 4;
    const hasSufficientComponents = validComponents.length >= 2;

    if (isLong && !hasSufficientComponents) {
      stats.longWithoutSufficient++;
      if (examples.insufficient.length < 10) {
        examples.insufficient.push({
          seed: lego.seed_number,
          lego: lego.lego_index,
          known: lego.known_text,
          target: lego.target_text,
          targetLength: targetLength,
          componentCount: validComponents.length,
          components: validComponents,
          isNew: lego.is_new
        });
      }
    }

    // Check 3: Are components real words or grammar explanations?
    let hasGrammarExplanations = false;
    const grammarIssues = [];

    for (const comp of validComponents) {
      const compKnown = comp.known || comp;
      const compTarget = comp.target || comp;

      if (isGrammarExplanation(compKnown) || isGrammarExplanation(compTarget)) {
        hasGrammarExplanations = true;
        grammarIssues.push({
          known: compKnown,
          target: compTarget
        });
      }
    }

    if (hasGrammarExplanations) {
      stats.grammarExplanations++;
      if (examples.grammarExplanations.length < 10) {
        examples.grammarExplanations.push({
          seed: lego.seed_number,
          lego: lego.lego_index,
          known: lego.known_text,
          target: lego.target_text,
          components: validComponents,
          grammarIssues: grammarIssues,
          isNew: lego.is_new
        });
      }
    }

    // Check 4: Do components actually appear in the target text?
    const appearances = componentsAppearInTarget(validComponents, lego.target_text);
    const missingComponents = appearances.filter(a => !a.appears);

    if (missingComponents.length > 0) {
      stats.componentsNotInTarget++;
      if (examples.componentsNotInTarget.length < 10) {
        examples.componentsNotInTarget.push({
          seed: lego.seed_number,
          lego: lego.lego_index,
          known: lego.known_text,
          target: lego.target_text,
          components: validComponents,
          missingComponents: missingComponents,
          isNew: lego.is_new
        });
      }
    }

    // Check 5: Is this a GOOD decomposition?
    const isGood = !hasGrammarExplanations &&
                   missingComponents.length === 0 &&
                   (!isLong || hasSufficientComponents);

    if (isGood) {
      stats.goodDecompositions++;
      if (examples.good.length < 10) {
        examples.good.push({
          seed: lego.seed_number,
          lego: lego.lego_index,
          known: lego.known_text,
          target: lego.target_text,
          targetLength: targetLength,
          components: validComponents,
          isNew: lego.is_new
        });
      }
    }
  }

  // Calculate percentages
  const metrics = {
    total: stats.total,
    withComponents: stats.withComponents,
    withoutComponents: stats.withoutComponents,
    emptyComponents: stats.emptyComponents,
    percentMissing: stats.total > 0 ? (stats.withoutComponents / stats.total * 100).toFixed(1) : 0,
    longWithoutSufficient: stats.longWithoutSufficient,
    grammarExplanations: stats.grammarExplanations,
    componentsNotInTarget: stats.componentsNotInTarget,
    goodDecompositions: stats.goodDecompositions,
    percentGood: stats.total > 0 ? (stats.goodDecompositions / stats.total * 100).toFixed(1) : 0,
    qualityScore: stats.total > 0 ? (stats.goodDecompositions / stats.total * 100).toFixed(1) : 0
  };

  console.log(`  ✓ Quality Score: ${metrics.qualityScore}% good decompositions`);
  console.log(`  ✓ Missing components: ${stats.withoutComponents}/${stats.total} (${metrics.percentMissing}%)`);
  console.log(`  ✓ Grammar explanations: ${stats.grammarExplanations}`);
  console.log(`  ✓ Components not in target: ${stats.componentsNotInTarget}`);

  return {
    courseCode,
    targetLang,
    metrics,
    examples
  };
}

async function main() {
  console.log('M-LEGO COMPONENT QUALITY ANALYSIS');
  console.log('='.repeat(80));
  console.log('');
  console.log('Analyzing component quality for M-type LEGOs...');
  console.log('Target courses:', TARGET_COURSES.join(', '));

  const results = [];

  for (const courseCode of TARGET_COURSES) {
    const result = await analyzeCourse(courseCode);
    if (result) {
      results.push(result);
    }
  }

  // Generate overall summary
  const summary = {
    totalCourses: results.length,
    totalMLegos: results.reduce((sum, r) => sum + r.metrics.total, 0),
    totalWithComponents: results.reduce((sum, r) => sum + r.metrics.withComponents, 0),
    totalWithoutComponents: results.reduce((sum, r) => sum + r.metrics.withoutComponents, 0),
    totalGoodDecompositions: results.reduce((sum, r) => sum + r.metrics.goodDecompositions, 0),
    averageQualityScore: (results.reduce((sum, r) => sum + parseFloat(r.metrics.qualityScore), 0) / results.length).toFixed(1)
  };

  summary.percentMissing = summary.totalMLegos > 0
    ? (summary.totalWithoutComponents / summary.totalMLegos * 100).toFixed(1)
    : 0;

  summary.percentGood = summary.totalMLegos > 0
    ? (summary.totalGoodDecompositions / summary.totalMLegos * 100).toFixed(1)
    : 0;

  // Create report
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    courseResults: results,
    recommendations: generateRecommendations(results)
  };

  // Write report
  const outputDir = path.join(__dirname, 'quality-reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'mlego-components.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('OVERALL SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total courses analyzed: ${summary.totalCourses}`);
  console.log(`Total M-type LEGOs: ${summary.totalMLegos}`);
  console.log(`With components: ${summary.totalWithComponents} (${(100 - parseFloat(summary.percentMissing)).toFixed(1)}%)`);
  console.log(`Without components: ${summary.totalWithoutComponents} (${summary.percentMissing}%)`);
  console.log(`Good decompositions: ${summary.totalGoodDecompositions} (${summary.percentGood}%)`);
  console.log(`Average quality score: ${summary.averageQualityScore}%`);
  console.log('');
  console.log(`✓ Report saved to: ${outputPath}`);
  console.log('');

  // Print course rankings
  console.log('COURSE QUALITY RANKINGS (by quality score)');
  console.log('='.repeat(80));
  const ranked = [...results].sort((a, b) => parseFloat(b.metrics.qualityScore) - parseFloat(a.metrics.qualityScore));
  for (const result of ranked) {
    console.log(`${result.courseCode.padEnd(20)} ${result.metrics.qualityScore}%`.padStart(10) +
                ` (${result.metrics.goodDecompositions}/${result.metrics.total})`);
  }
  console.log('');
}

function generateRecommendations(results) {
  const recommendations = [];

  for (const result of results) {
    const courseRecs = [];

    if (result.metrics.withoutComponents > 0) {
      courseRecs.push({
        priority: 'HIGH',
        issue: 'Missing components',
        count: result.metrics.withoutComponents,
        description: `${result.metrics.withoutComponents} M-LEGOs have no component breakdowns. These should be decomposed into building blocks.`,
        action: 'Add component breakdowns showing the pieces that make up each M-LEGO.'
      });
    }

    if (result.metrics.longWithoutSufficient > 0) {
      courseRecs.push({
        priority: 'MEDIUM',
        issue: 'Insufficient components for long phrases',
        count: result.metrics.longWithoutSufficient,
        description: `${result.metrics.longWithoutSufficient} long M-LEGOs (4+ chars) have fewer than 2 components.`,
        action: 'Break down long phrases into 2+ meaningful components.'
      });
    }

    if (result.metrics.grammarExplanations > 0) {
      courseRecs.push({
        priority: 'HIGH',
        issue: 'Grammar explanations in components',
        count: result.metrics.grammarExplanations,
        description: `${result.metrics.grammarExplanations} M-LEGOs use grammar explanations instead of real words.`,
        action: 'Replace grammar explanations with actual word components that learners can use.'
      });
    }

    if (result.metrics.componentsNotInTarget > 0) {
      courseRecs.push({
        priority: 'CRITICAL',
        issue: 'Components not in target text',
        count: result.metrics.componentsNotInTarget,
        description: `${result.metrics.componentsNotInTarget} M-LEGOs have components that don\'t appear in the target text.`,
        action: 'Fix component definitions to match actual pieces in the target text.'
      });
    }

    if (courseRecs.length > 0) {
      recommendations.push({
        courseCode: result.courseCode,
        qualityScore: result.metrics.qualityScore,
        recommendations: courseRecs
      });
    }
  }

  return recommendations;
}

main().catch(console.error);
