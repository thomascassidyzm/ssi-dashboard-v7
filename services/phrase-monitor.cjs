/**
 * Phrase Monitor - Statistical Analysis Tool
 *
 * Pure math/statistics - NO LLM calls. Analyzes LEGO usage patterns
 * and writes statistical flags to course_qa_flags for checkpoint review.
 *
 * Usage:
 *   node services/phrase-monitor.cjs --course por_for_eng --tally
 *   node services/phrase-monitor.cjs --course por_for_eng --analyze
 *   node services/phrase-monitor.cjs --course por_for_eng --report
 *
 * @version 2.0.0 - Simplified, no LLM calls
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// =============================================================================
// DATABASE QUERIES
// =============================================================================

async function getAllPhrases(courseCode, seedMin = 1, seedMax = 999) {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_id, known_text, target_text, phrase_role')
    .eq('course_code', courseCode)
    .gte('seed_number', seedMin)
    .lte('seed_number', seedMax);

  if (error) throw error;
  return data || [];
}

async function getLegos(courseCode) {
  const { data, error } = await supabase
    .from('course_legos')
    .select('lego_id, seed_number, type, known_text, target_text')
    .eq('course_code', courseCode);

  if (error) throw error;
  return data || [];
}

async function insertFlag(flag) {
  const { error } = await supabase
    .from('course_qa_flags')
    .upsert({
      course_code: flag.courseCode,
      phrase_id: flag.phraseId || null,
      seed_number: flag.seedNumber || null,
      lego_id: flag.legoId || null,
      check_type: flag.checkType,
      severity: flag.severity,
      issue: flag.issue,
      details: flag.details || {},
      flagged_at: new Date().toISOString()
    }, {
      onConflict: 'phrase_id,check_type',
      ignoreDuplicates: true
    });

  if (error && error.code !== '23505') { // Ignore duplicate key errors
    console.warn('Flag insert warning:', error.message);
  }
}

async function getExistingFlags(courseCode) {
  const { data, error } = await supabase
    .from('course_qa_flags')
    .select('*')
    .eq('course_code', courseCode)
    .eq('status', 'open');

  if (error) {
    if (error.code === '42P01') return []; // Table doesn't exist
    throw error;
  }
  return data || [];
}

// =============================================================================
// ANALYSIS FUNCTIONS (Pure Math - No LLM)
// =============================================================================

/**
 * Generate LEGO tally with reuse metrics
 */
function generateTally(phrases, legos, maxSeed = 260) {
  const legoInfo = {};
  for (const lego of legos) {
    legoInfo[lego.lego_id] = {
      seedNumber: lego.seed_number,
      type: lego.type,
      known: lego.known_text,
      target: lego.target_text
    };
  }

  const tally = {};

  for (const phrase of phrases) {
    const legoId = phrase.lego_id;
    if (!tally[legoId]) {
      const info = legoInfo[legoId] || {};
      tally[legoId] = {
        legoId,
        homeSeed: info.seedNumber,
        type: info.type,
        known: info.known,
        target: info.target,
        buildCount: 0,
        useCount: 0,
        totalCount: 0,
        seedsUsed: new Set()
      };
    }

    tally[legoId].totalCount++;
    tally[legoId].seedsUsed.add(phrase.seed_number);

    if (phrase.phrase_role === 'use') {
      tally[legoId].useCount++;
    } else {
      tally[legoId].buildCount++;
    }
  }

  // Calculate reuse metrics
  const tallyArray = Object.values(tally).map(t => {
    const seedsUsedArray = Array.from(t.seedsUsed);
    const runway = maxSeed - (t.homeSeed || 1);
    const reuseSeeds = seedsUsedArray.filter(s => s !== t.homeSeed).length;
    const reuseRate = runway > 0 ? Math.min(1, reuseSeeds / runway) * 100 : 0;

    return {
      ...t,
      seedsUsed: seedsUsedArray,
      spreadScore: seedsUsedArray.length,
      runway,
      reuseSeeds,
      reuseRate: reuseRate.toFixed(1)
    };
  });

  tallyArray.sort((a, b) => b.totalCount - a.totalCount);

  // Stats
  const totalPhrases = phrases.length;
  const totalLegos = tallyArray.length;
  const avgPerLego = totalLegos > 0 ? totalPhrases / totalLegos : 0;
  const useCounts = tallyArray.map(t => t.useCount);
  const avgUsePerLego = useCounts.length > 0 ? useCounts.reduce((a, b) => a + b, 0) / useCounts.length : 0;

  return {
    summary: {
      totalPhrases,
      totalLegos,
      avgPerLego: avgPerLego.toFixed(1),
      avgUsePerLego: avgUsePerLego.toFixed(1)
    },
    mostUsed: tallyArray.slice(0, 10),
    leastUsed: tallyArray.slice(-10).reverse(),
    fullTally: tallyArray
  };
}

/**
 * Detect workhorse LEGOs (few LEGOs carrying most USE phrases)
 */
function detectWorkhorses(tally) {
  const issues = [];
  const sortedByUse = [...tally.fullTally].sort((a, b) => b.useCount - a.useCount);
  const totalUse = sortedByUse.reduce((sum, l) => sum + l.useCount, 0);

  if (totalUse === 0 || sortedByUse.length < 10) return issues;

  const top10 = sortedByUse.slice(0, 10);
  const top10Total = top10.reduce((sum, l) => sum + l.useCount, 0);
  const top10Percent = (top10Total / totalUse) * 100;

  if (top10Percent > 50) {
    issues.push({
      checkType: 'lego_spread',
      severity: 'warning',
      issue: `Workhorse problem: top 10 LEGOs account for ${top10Percent.toFixed(0)}% of USE phrases`,
      details: {
        top10Percent: top10Percent.toFixed(1),
        totalUsePhrases: totalUse,
        workhorses: top10.slice(0, 5).map(l => ({
          legoId: l.legoId,
          known: l.known,
          useCount: l.useCount,
          percent: ((l.useCount / totalUse) * 100).toFixed(1)
        }))
      }
    });
  }

  return issues;
}

/**
 * Detect underused LEGOs (introduced early, barely reused)
 */
function detectUnderused(tally) {
  const issues = [];

  for (const lego of tally.fullTally) {
    // Early LEGOs with lots of runway but low reuse
    if (lego.runway > 150 && parseFloat(lego.reuseRate) < 2 && lego.useCount < 3) {
      issues.push({
        checkType: 'lego_spread',
        severity: 'info',
        legoId: lego.legoId,
        seedNumber: lego.homeSeed,
        issue: `Underused: "${lego.known}" introduced at S${lego.homeSeed}, only ${lego.reuseRate}% reuse`,
        details: {
          known: lego.known,
          target: lego.target,
          homeSeed: lego.homeSeed,
          runway: lego.runway,
          reuseRate: lego.reuseRate,
          useCount: lego.useCount
        }
      });
    }
  }

  return issues.slice(0, 20); // Cap at 20
}

/**
 * Detect LEGO frequency issues (too few or too many phrases)
 */
function detectFrequencyIssues(tally) {
  const issues = [];

  for (const lego of tally.fullTally) {
    if (lego.totalCount < 7 && lego.totalCount > 0) {
      issues.push({
        checkType: 'lego_frequency',
        severity: 'warning',
        legoId: lego.legoId,
        seedNumber: lego.homeSeed,
        issue: `LEGO "${lego.known}" has only ${lego.totalCount} phrases (min 7)`,
        details: { totalCount: lego.totalCount, useCount: lego.useCount }
      });
    }

    if (lego.useCount < 3 && lego.totalCount >= 7) {
      issues.push({
        checkType: 'lego_frequency',
        severity: 'info',
        legoId: lego.legoId,
        seedNumber: lego.homeSeed,
        issue: `LEGO "${lego.known}" has only ${lego.useCount} USE phrases (recommend 3+)`,
        details: { totalCount: lego.totalCount, useCount: lego.useCount }
      });
    }
  }

  return issues;
}

/**
 * Detect repetitive patterns in English phrases
 */
function detectPatterns(phrases) {
  const issues = [];
  const patterns = {};

  for (const phrase of phrases) {
    if (phrase.phrase_role !== 'use') continue;
    const text = phrase.known_text?.toLowerCase() || '';

    // Common pattern starters
    const starters = [
      'i want to', 'i need to', 'i can', "i can't", 'i have to',
      'she wants', 'he wants', 'we want', 'they want',
      'can you', 'do you', 'are you', 'will you'
    ];

    for (const starter of starters) {
      if (text.startsWith(starter)) {
        patterns[starter] = (patterns[starter] || 0) + 1;
      }
    }
  }

  // Flag overused patterns
  const totalUse = phrases.filter(p => p.phrase_role === 'use').length;
  for (const [pattern, count] of Object.entries(patterns)) {
    const percent = totalUse > 0 ? (count / totalUse) * 100 : 0;
    if (count > 10 && percent > 8) {
      issues.push({
        checkType: 'variety',
        severity: 'info',
        issue: `Pattern "${pattern}..." used ${count} times (${percent.toFixed(0)}% of USE phrases)`,
        details: { pattern, count, percent: percent.toFixed(1) }
      });
    }
  }

  return issues;
}

// =============================================================================
// MAIN COMMANDS
// =============================================================================

async function runTally(courseCode, seedMin = 1, seedMax = 999) {
  console.log(`\n=== LEGO TALLY: ${courseCode} ===\n`);

  const phrases = await getAllPhrases(courseCode, seedMin, seedMax);
  const legos = await getLegos(courseCode);

  if (phrases.length === 0) {
    console.log('No phrases found');
    return null;
  }

  const tally = generateTally(phrases, legos, seedMax);

  // Summary
  console.log('SUMMARY');
  console.log(`  Phrases: ${tally.summary.totalPhrases}`);
  console.log(`  LEGOs: ${tally.summary.totalLegos}`);
  console.log(`  Avg phrases/LEGO: ${tally.summary.avgPerLego}`);
  console.log(`  Avg USE/LEGO: ${tally.summary.avgUsePerLego}`);

  // Most used
  console.log('\nMOST USED (top 10)');
  for (const l of tally.mostUsed) {
    console.log(`  ${l.legoId}: ${l.totalCount} phrases (${l.useCount} USE), reuse: ${l.reuseRate}%`);
    console.log(`    "${l.known}" → "${l.target}"`);
  }

  // Least used
  console.log('\nLEAST USED (bottom 10)');
  for (const l of tally.leastUsed) {
    console.log(`  ${l.legoId}: ${l.totalCount} phrases (${l.useCount} USE), reuse: ${l.reuseRate}%`);
    console.log(`    "${l.known}" → "${l.target}"`);
  }

  // Workhorse check
  const useCounts = tally.fullTally.map(t => t.useCount).filter(c => c > 0);
  const totalUse = useCounts.reduce((a, b) => a + b, 0);
  const sortedByUse = [...tally.fullTally].sort((a, b) => b.useCount - a.useCount);
  const top10 = sortedByUse.slice(0, 10);
  const top10Total = top10.reduce((sum, l) => sum + l.useCount, 0);
  const top10Percent = totalUse > 0 ? (top10Total / totalUse) * 100 : 0;

  console.log('\nWORKHORSE CHECK');
  console.log(`  Top 10 LEGOs: ${top10Percent.toFixed(0)}% of USE phrases`);
  if (top10Percent > 50) {
    console.log('  ⚠️  Workhorse problem - consider diversifying');
  } else {
    console.log('  ✓ Distribution looks healthy');
  }

  // Distribution histogram
  console.log('\nUSAGE DISTRIBUTION');
  const buckets = { '1-3': 0, '4-6': 0, '7-9': 0, '10-13': 0, '14+': 0 };
  for (const l of tally.fullTally) {
    if (l.totalCount <= 3) buckets['1-3']++;
    else if (l.totalCount <= 6) buckets['4-6']++;
    else if (l.totalCount <= 9) buckets['7-9']++;
    else if (l.totalCount <= 13) buckets['10-13']++;
    else buckets['14+']++;
  }
  for (const [range, count] of Object.entries(buckets)) {
    const bar = '█'.repeat(Math.ceil(count / 3));
    console.log(`  ${range.padStart(5)}: ${bar} (${count})`);
  }

  return tally;
}

async function runAnalyze(courseCode, seedMin = 1, seedMax = 999) {
  console.log(`\n=== ANALYZE & FLAG: ${courseCode} ===\n`);

  const phrases = await getAllPhrases(courseCode, seedMin, seedMax);
  const legos = await getLegos(courseCode);

  if (phrases.length === 0) {
    console.log('No phrases found');
    return;
  }

  const tally = generateTally(phrases, legos, seedMax);

  // Collect all issues
  const allIssues = [
    ...detectWorkhorses(tally),
    ...detectUnderused(tally),
    ...detectFrequencyIssues(tally),
    ...detectPatterns(phrases)
  ];

  console.log(`Found ${allIssues.length} issues\n`);

  // Group by severity
  const bySeverity = { error: [], warning: [], info: [] };
  for (const issue of allIssues) {
    bySeverity[issue.severity].push(issue);
  }

  for (const [severity, issues] of Object.entries(bySeverity)) {
    if (issues.length === 0) continue;
    console.log(`${severity.toUpperCase()} (${issues.length}):`);
    for (const issue of issues.slice(0, 10)) {
      console.log(`  - ${issue.issue}`);
    }
    if (issues.length > 10) console.log(`  ... and ${issues.length - 10} more`);
    console.log('');
  }

  // Write flags to database
  console.log('Writing flags to database...');
  let written = 0;
  for (const issue of allIssues) {
    await insertFlag({
      courseCode,
      phraseId: issue.phraseId || null,
      seedNumber: issue.seedNumber || null,
      legoId: issue.legoId || null,
      checkType: issue.checkType,
      severity: issue.severity,
      issue: issue.issue,
      details: issue.details
    });
    written++;
  }
  console.log(`Wrote ${written} flags`);
}

async function runReport(courseCode) {
  console.log(`\n=== QA FLAGS REPORT: ${courseCode} ===\n`);

  const flags = await getExistingFlags(courseCode);

  if (flags.length === 0) {
    console.log('No open flags');
    return;
  }

  // Group by type
  const byType = {};
  const bySeverity = { error: 0, warning: 0, info: 0 };

  for (const flag of flags) {
    byType[flag.check_type] = (byType[flag.check_type] || 0) + 1;
    bySeverity[flag.severity]++;
  }

  console.log('BY SEVERITY:');
  console.log(`  error: ${bySeverity.error}`);
  console.log(`  warning: ${bySeverity.warning}`);
  console.log(`  info: ${bySeverity.info}`);

  console.log('\nBY TYPE:');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }

  console.log('\nRECENT FLAGS:');
  for (const flag of flags.slice(0, 15)) {
    console.log(`  [${flag.severity}] ${flag.issue}`);
  }
  if (flags.length > 15) {
    console.log(`  ... and ${flags.length - 15} more`);
  }
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const courseIdx = args.indexOf('--course');
  const courseCode = courseIdx >= 0 ? args[courseIdx + 1] : null;

  if (!courseCode) {
    console.log('Phrase Monitor - Statistical Analysis Tool\n');
    console.log('Usage:');
    console.log('  node services/phrase-monitor.cjs --course <code> --tally    # Show LEGO usage tally');
    console.log('  node services/phrase-monitor.cjs --course <code> --analyze  # Analyze and write flags');
    console.log('  node services/phrase-monitor.cjs --course <code> --report   # Show existing flags');
    process.exit(1);
  }

  // Parse seed range if provided
  let seedMin = 1, seedMax = 999;
  const seedsIdx = args.indexOf('--seeds');
  if (seedsIdx >= 0) {
    const range = args[seedsIdx + 1];
    [seedMin, seedMax] = range.split('-').map(Number);
  }

  if (args.includes('--tally')) {
    await runTally(courseCode, seedMin, seedMax);
  } else if (args.includes('--analyze')) {
    await runAnalyze(courseCode, seedMin, seedMax);
  } else if (args.includes('--report')) {
    await runReport(courseCode);
  } else {
    // Default to tally
    await runTally(courseCode, seedMin, seedMax);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

module.exports = { generateTally, detectWorkhorses, detectUnderused, detectPatterns };
