#!/usr/bin/env node

/**
 * Course Completeness Analyzer
 *
 * Comprehensive analysis combining vocabulary frequency and pattern coverage
 * to assess overall course quality and pedagogical completeness.
 *
 * Dimensions analyzed:
 * 1. Vocabulary Coverage - Are all LEGOs practiced sufficiently?
 * 2. Pattern Coverage - Are LEGO combinations diverse and balanced?
 * 3. Distribution Quality - Is practice distribution even or skewed?
 * 4. Progression Quality - Does complexity increase appropriately?
 * 5. Gap Identification - What's missing or over-represented?
 *
 * Input:  vfs/courses/{course_code}/lego_pairs_deduplicated.json
 *         vfs/courses/{course_code}/lego_baskets_deduplicated.json
 * Output: Comprehensive JSON report with actionable insights
 *
 * Usage: node validators/analyze-completeness.cjs <course_code> [--output report.json]
 */

const fs = require('fs-extra');
const path = require('path');

const args = process.argv.slice(2);
const courseCode = args[0];
const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;

if (!courseCode) {
  console.error('❌ Usage: node validators/analyze-completeness.cjs <course_code> [--output report.json]');
  console.error('   Example: node validators/analyze-completeness.cjs spa_for_eng_20seeds');
  process.exit(1);
}

const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const basketsPath = path.join(courseDir, 'lego_baskets_deduplicated.json');
const basketsPathFallback = path.join(courseDir, 'lego_baskets.json');
const legoPath = path.join(courseDir, 'lego_pairs_deduplicated.json');
const legoPathFallback = path.join(courseDir, 'lego_pairs.json');

/**
 * Extract LEGO IDs from a phrase target text
 */
function extractLegosFromPhrase(phraseTarget, legoLookup, sortedLegoTargets) {
  const foundLegoIds = [];
  let remainingText = phraseTarget;

  for (const targetText of sortedLegoTargets) {
    if (remainingText.includes(targetText)) {
      const legoId = legoLookup[targetText];
      foundLegoIds.push(legoId);
      remainingText = remainingText.replace(targetText, '');
    }
  }

  return foundLegoIds.sort();
}

/**
 * Calculate Gini coefficient (measure of inequality)
 * 0 = perfect equality, 1 = perfect inequality
 */
function calculateGini(values) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  let sum = 0;

  for (let i = 0; i < n; i++) {
    sum += (2 * (i + 1) - n - 1) * sorted[i];
  }

  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  return sum / (n * n * mean);
}

/**
 * Calculate semantic diversity score based on LEGO types
 */
function calculateSemanticDiversity(legoMetadata) {
  const typeDistribution = {};

  for (const meta of Object.values(legoMetadata)) {
    const type = meta.type || 'BASE';
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;
  }

  // Calculate entropy (higher = more diverse)
  const total = Object.values(typeDistribution).reduce((a, b) => a + b, 0);
  let entropy = 0;

  for (const count of Object.values(typeDistribution)) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }

  return {
    types: typeDistribution,
    entropy: parseFloat(entropy.toFixed(3)),
    diversity_score: parseFloat((entropy / Math.log2(Object.keys(typeDistribution).length || 1) * 100).toFixed(2))
  };
}

async function analyzeCompleteness() {
  console.log(`\n🎯 Course Completeness Analysis`);
  console.log(`Course: ${courseCode}\n`);

  // Load LEGO pairs
  const lPath = await fs.pathExists(legoPath) ? legoPath : legoPathFallback;
  if (!await fs.pathExists(lPath)) {
    console.error(`❌ LEGO pairs not found at: ${lPath}`);
    process.exit(1);
  }

  const legoPairsData = await fs.readJson(lPath);
  const seeds = Array.isArray(legoPairsData) ? legoPairsData : legoPairsData.seeds;
  console.log(`📂 Loaded LEGO pairs from: ${path.basename(lPath)}`);

  // Build LEGO metadata
  const legoLookup = {};
  const legoMetadata = {};
  const allLegoIds = [];
  let legoIndex = 0;

  for (const seed of seeds) {
    const [seedId, pair, legos] = seed;
    for (const lego of legos) {
      const [legoId, type, target, known] = lego;
      legoLookup[target] = legoId;
      legoMetadata[legoId] = {
        id: legoId,
        type,
        target,
        known,
        index: legoIndex,
        seedId
      };
      allLegoIds.push(legoId);
      legoIndex++;
    }
  }

  const sortedLegoTargets = Object.keys(legoLookup).sort((a, b) => b.length - a.length);
  console.log(`📊 Total LEGOs: ${allLegoIds.length}`);

  // Load baskets
  const bPath = await fs.pathExists(basketsPath) ? basketsPath : basketsPathFallback;
  if (!await fs.pathExists(bPath)) {
    console.error(`❌ Baskets not found at: ${bPath}`);
    process.exit(1);
  }

  const basketsData = await fs.readJson(bPath);
  console.log(`📂 Loaded baskets from: ${path.basename(bPath)}\n`);

  // Extract baskets object (handle v7.7 format with wrapper)
  const baskets = basketsData.baskets || basketsData;

  // === 1. VOCABULARY COVERAGE ANALYSIS ===
  console.log(`📚 Analyzing vocabulary coverage...`);

  const frequencies = {};
  let totalEPhrases = 0;
  let totalDPhrases = 0;

  for (const [legoId, basket] of Object.entries(baskets)) {
    frequencies[legoId] = {
      e_count: 0,
      d_count: 0,
      total: 0
    };

    if (basket.e && Array.isArray(basket.e)) {
      frequencies[legoId].e_count = basket.e.length;
      totalEPhrases += basket.e.length;
    }

    if (basket.d && typeof basket.d === 'object') {
      for (const window of Object.keys(basket.d)) {
        if (Array.isArray(basket.d[window])) {
          frequencies[legoId].d_count += basket.d[window].length;
          totalDPhrases += basket.d[window].length;
        }
      }
    }

    frequencies[legoId].total = frequencies[legoId].e_count + frequencies[legoId].d_count;
  }

  const practiceCounts = Object.values(frequencies).map(f => f.total);
  const avgPractices = practiceCounts.reduce((a, b) => a + b, 0) / practiceCounts.length;
  const giniCoefficient = calculateGini(practiceCounts);

  const underPracticed = Object.entries(frequencies)
    .filter(([id, f]) => f.total < 3)
    .map(([id, f]) => ({ lego_id: id, ...legoMetadata[id], ...f }));

  const zeroPractice = Object.entries(frequencies)
    .filter(([id, f]) => f.total === 0)
    .map(([id, f]) => ({ lego_id: id, ...legoMetadata[id] }));

  // === 2. PATTERN COVERAGE ANALYSIS ===
  console.log(`🔍 Analyzing pattern coverage...`);

  const edgeFrequency = {};
  let totalPhrases = 0;

  for (const [legoId, basket] of Object.entries(baskets)) {
    const allPhrases = [];

    if (basket.e) allPhrases.push(...basket.e);
    if (basket.d) {
      for (const window of Object.keys(basket.d)) {
        if (Array.isArray(basket.d[window])) {
          allPhrases.push(...basket.d[window]);
        }
      }
    }

    for (const phrase of allPhrases) {
      const phraseTarget = phrase[0];
      const legosInPhrase = extractLegosFromPhrase(phraseTarget, legoLookup, sortedLegoTargets);

      for (let i = 0; i < legosInPhrase.length; i++) {
        for (let j = i + 1; j < legosInPhrase.length; j++) {
          const edge = [legosInPhrase[i], legosInPhrase[j]].sort().join('|||');
          edgeFrequency[edge] = (edgeFrequency[edge] || 0) + 1;
        }
      }
      totalPhrases++;
    }
  }

  // Calculate possible edges
  let possibleEdges = 0;
  for (let i = 1; i < allLegoIds.length; i++) {
    possibleEdges += i; // Each LEGO can combine with all previous LEGOs
  }

  const actualEdges = Object.keys(edgeFrequency).length;
  const patternDensity = (actualEdges / possibleEdges) * 100;
  const edgeCounts = Object.values(edgeFrequency);
  const avgEdgeCount = edgeCounts.reduce((a, b) => a + b, 0) / edgeCounts.length;
  const edgeGini = calculateGini(edgeCounts);

  // === 3. DISTRIBUTION QUALITY ===
  console.log(`📊 Analyzing distribution quality...`);

  const semanticDiversity = calculateSemanticDiversity(legoMetadata);

  // Calculate quartiles for practice distribution
  const sortedCounts = [...practiceCounts].sort((a, b) => a - b);
  const q1 = sortedCounts[Math.floor(sortedCounts.length * 0.25)];
  const q2 = sortedCounts[Math.floor(sortedCounts.length * 0.50)];
  const q3 = sortedCounts[Math.floor(sortedCounts.length * 0.75)];

  // === 4. PROGRESSION QUALITY ===
  console.log(`📈 Analyzing progression quality...`);

  // Check if complexity increases (phrase length, LEGO count)
  const phraseLengthByPosition = [];

  for (let i = 0; i < allLegoIds.length; i++) {
    const legoId = allLegoIds[i];
    const basket = basketsData[legoId];

    if (!basket) continue;

    const allPhrases = [];
    if (basket.e) allPhrases.push(...basket.e);
    if (basket.d) {
      for (const window of Object.keys(basket.d)) {
        if (Array.isArray(basket.d[window])) {
          allPhrases.push(...basket.d[window]);
        }
      }
    }

    if (allPhrases.length > 0) {
      const avgLength = allPhrases.reduce((sum, p) => {
        const legosInPhrase = extractLegosFromPhrase(p[0], legoLookup, sortedLegoTargets);
        return sum + legosInPhrase.length;
      }, 0) / allPhrases.length;

      phraseLengthByPosition.push(avgLength);
    }
  }

  // Calculate progression slope (simple linear regression)
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < phraseLengthByPosition.length; i++) {
    sumX += i;
    sumY += phraseLengthByPosition[i];
    sumXY += i * phraseLengthByPosition[i];
    sumXX += i * i;
  }
  const n = phraseLengthByPosition.length;
  const progressionSlope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // === 5. OVERALL QUALITY SCORES ===
  console.log(`🎯 Calculating quality scores...\n`);

  // Vocabulary score (0-100)
  const vocabCoverage = ((allLegoIds.length - zeroPractice.length) / allLegoIds.length) * 100;
  const vocabBalance = (1 - giniCoefficient) * 100; // Lower Gini = better balance
  const vocabScore = (vocabCoverage * 0.6 + vocabBalance * 0.4);

  // Pattern score (0-100)
  const patternCoverage = patternDensity;
  const patternBalance = (1 - edgeGini) * 100;
  const patternScore = (patternCoverage * 0.6 + patternBalance * 0.4);

  // Distribution score (0-100)
  const distributionScore = semanticDiversity.diversity_score;

  // Progression score (0-100)
  const progressionScore = Math.min(100, Math.max(0, progressionSlope * 50 + 50)); // Normalize to 0-100

  // Overall completeness score
  const overallScore = (
    vocabScore * 0.35 +
    patternScore * 0.35 +
    distributionScore * 0.15 +
    progressionScore * 0.15
  );

  // === BUILD REPORT ===
  const report = {
    course: courseCode,
    generated: new Date().toISOString(),

    overall: {
      completeness_score: parseFloat(overallScore.toFixed(2)),
      total_legos: allLegoIds.length,
      total_phrases: totalPhrases,
      total_seeds: seeds.length
    },

    vocabulary: {
      score: parseFloat(vocabScore.toFixed(2)),
      coverage_percent: parseFloat(vocabCoverage.toFixed(2)),
      balance_score: parseFloat(vocabBalance.toFixed(2)),
      total_e_phrases: totalEPhrases,
      total_d_phrases: totalDPhrases,
      avg_practices_per_lego: parseFloat(avgPractices.toFixed(2)),
      gini_coefficient: parseFloat(giniCoefficient.toFixed(3)),
      quartiles: { q1, q2, q3 },
      under_practiced_count: underPracticed.length,
      zero_practice_count: zeroPractice.length,
      zero_practice_legos: zeroPractice.map(l => ({
        lego_id: l.id,
        target: l.target,
        known: l.known,
        reason: l.index === 0 ? 'FIRST_LEGO (expected - no prior LEGOs available)' : 'MISSING_BASKET (error)'
      }))
    },

    patterns: {
      score: parseFloat(patternScore.toFixed(2)),
      density_percent: parseFloat(patternDensity.toFixed(2)),
      balance_score: parseFloat(patternBalance.toFixed(2)),
      possible_edges: possibleEdges,
      actual_edges: actualEdges,
      missing_edges: possibleEdges - actualEdges,
      avg_edge_frequency: parseFloat(avgEdgeCount.toFixed(2)),
      edge_gini: parseFloat(edgeGini.toFixed(3))
    },

    distribution: {
      score: parseFloat(distributionScore.toFixed(2)),
      semantic_diversity: semanticDiversity
    },

    progression: {
      score: parseFloat(progressionScore.toFixed(2)),
      complexity_slope: parseFloat(progressionSlope.toFixed(3)),
      trend: progressionSlope > 0.1 ? 'increasing' : progressionSlope < -0.1 ? 'decreasing' : 'stable'
    },

    recommendations: []
  };

  // Generate recommendations
  if (report.vocabulary.zero_practice_count > 1) {
    report.recommendations.push({
      priority: 'HIGH',
      area: 'Vocabulary',
      issue: `${report.vocabulary.zero_practice_count} LEGOs have zero practice (excluding first LEGO)`,
      action: 'Review basket generation - these LEGOs need practice phrases'
    });
  }

  if (report.vocabulary.gini_coefficient > 0.4) {
    report.recommendations.push({
      priority: 'MEDIUM',
      area: 'Vocabulary',
      issue: `High inequality in practice distribution (Gini: ${report.vocabulary.gini_coefficient})`,
      action: 'Balance practice phrase allocation across LEGOs'
    });
  }

  if (report.patterns.density_percent < 40) {
    report.recommendations.push({
      priority: 'HIGH',
      area: 'Patterns',
      issue: `Low pattern density (${report.patterns.density_percent.toFixed(1)}% of possible edges used)`,
      action: 'Increase LEGO combination diversity in practice phrases'
    });
  }

  if (report.patterns.edge_gini > 0.5) {
    report.recommendations.push({
      priority: 'MEDIUM',
      area: 'Patterns',
      issue: `Some LEGO pairs are overused (Gini: ${report.patterns.edge_gini})`,
      action: 'Distribute pattern usage more evenly'
    });
  }

  if (report.progression.slope < 0) {
    report.recommendations.push({
      priority: 'LOW',
      area: 'Progression',
      issue: 'Phrase complexity decreases over time',
      action: 'Review phrase generation to ensure increasing complexity'
    });
  }

  // Output report
  if (outputFile) {
    await fs.writeJson(outputFile, report, { spaces: 2 });
    console.log(`💾 Report saved to: ${outputFile}\n`);
  }

  // Console summary
  console.log(`\n✅ Completeness Analysis Complete\n`);
  console.log(`╔════════════════════════════════════════╗`);
  console.log(`║  OVERALL COMPLETENESS: ${report.overall.completeness_score.toFixed(1)}%${' '.repeat(14)}║`);
  console.log(`╚════════════════════════════════════════╝\n`);

  console.log(`📊 Dimension Scores:`);
  console.log(`   ├─ Vocabulary:    ${report.vocabulary.score.toFixed(1)}% (coverage: ${report.vocabulary.coverage_percent.toFixed(1)}%, balance: ${report.vocabulary.balance_score.toFixed(1)}%)`);
  console.log(`   ├─ Patterns:      ${report.patterns.score.toFixed(1)}% (density: ${report.patterns.density_percent.toFixed(1)}%, balance: ${report.patterns.balance_score.toFixed(1)}%)`);
  console.log(`   ├─ Distribution:  ${report.distribution.score.toFixed(1)}% (semantic diversity)`);
  console.log(`   └─ Progression:   ${report.progression.score.toFixed(1)}% (${report.progression.trend})\n`);

  if (report.recommendations.length > 0) {
    console.log(`⚠️  Recommendations (${report.recommendations.length}):`);
    report.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. [${rec.priority}] ${rec.area}: ${rec.issue}`);
      console.log(`      → ${rec.action}`);
    });
  } else {
    console.log(`✨ No major issues found! Course quality looks excellent.\n`);
  }

  console.log(`\n📈 Full analysis available in report JSON\n`);

  return report;
}

analyzeCompleteness().catch(err => {
  console.error('\n❌ Analysis failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
