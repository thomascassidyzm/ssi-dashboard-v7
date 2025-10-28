#!/usr/bin/env node

/**
 * LEGO Pattern Coverage Analyzer
 *
 * Analyzes which LEGO pairs (edges) appear together in practice phrases.
 * Identifies missing edges and over-used combinations to ensure balanced pattern coverage.
 *
 * Key concepts:
 * - ABSOLUTE GATE: LEGO N can only combine with LEGOs 1 to N-1
 * - Edges: Pairs of LEGOs that appear together in a phrase
 * - Pattern density: Ratio of actual edges to possible edges
 *
 * Input:  vfs/courses/{course_code}/lego_pairs_deduplicated.json (for LEGO order/gate)
 *         vfs/courses/{course_code}/lego_baskets_deduplicated.json (for practice phrases)
 * Output: JSON report to stdout or file
 *
 * Usage: node validators/analyze-pattern-coverage.cjs <course_code> [--output report.json]
 */

const fs = require('fs-extra');
const path = require('path');

const args = process.argv.slice(2);
const courseCode = args[0];
const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;

if (!courseCode) {
  console.error('❌ Usage: node validators/analyze-pattern-coverage.cjs <course_code> [--output report.json]');
  console.error('   Example: node validators/analyze-pattern-coverage.cjs spa_for_eng_20seeds');
  process.exit(1);
}

const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const basketsPath = path.join(courseDir, 'lego_baskets_deduplicated.json');
const basketsPathFallback = path.join(courseDir, 'lego_baskets.json');
const legoPath = path.join(courseDir, 'lego_pairs_deduplicated.json');
const legoPathFallback = path.join(courseDir, 'lego_pairs.json');

/**
 * Extract LEGO IDs from a phrase target text
 * Strategy: Match known LEGOs by their target text (sorted by length descending)
 */
function extractLegosFromPhrase(phraseTarget, legoLookup, sortedLegoTargets) {
  const foundLegoIds = [];
  let remainingText = phraseTarget;

  // Use greedy matching (longest first) to find LEGOs
  for (const targetText of sortedLegoTargets) {
    if (remainingText.includes(targetText)) {
      const legoId = legoLookup[targetText];
      foundLegoIds.push(legoId);
      // Remove matched text to avoid double-counting
      remainingText = remainingText.replace(targetText, '');
    }
  }

  return foundLegoIds.sort(); // Sort for consistent edge ordering
}

/**
 * Generate all possible edges for a given LEGO based on GATE constraint
 */
function getPossibleEdges(legoIndex, allLegoIds) {
  const currentLegoId = allLegoIds[legoIndex];
  const possibleEdges = [];

  // LEGO at index N can combine with LEGOs at indices 0 to N-1
  for (let i = 0; i < legoIndex; i++) {
    const partnerLegoId = allLegoIds[i];
    // Create edge key (sorted pair for undirected graph)
    const edge = [partnerLegoId, currentLegoId].sort().join('|||');
    possibleEdges.push({ edge, legos: [partnerLegoId, currentLegoId] });
  }

  return possibleEdges;
}

async function analyzePatternCoverage() {
  console.log(`\n🔍 LEGO Pattern Coverage Analysis`);
  console.log(`Course: ${courseCode}\n`);

  // Load LEGO pairs (for order and GATE constraint)
  const lPath = await fs.pathExists(legoPath) ? legoPath : legoPathFallback;
  if (!await fs.pathExists(lPath)) {
    console.error(`❌ LEGO pairs not found at: ${lPath}`);
    process.exit(1);
  }

  const legoPairsData = await fs.readJson(lPath);
  const seeds = Array.isArray(legoPairsData) ? legoPairsData : legoPairsData.seeds;
  console.log(`📂 Loaded LEGO pairs from: ${path.basename(lPath)}`);

  // Build LEGO lookup and ordered list
  const legoLookup = {}; // target → legoId
  const legoMetadata = {}; // legoId → {target, known, index}
  const allLegoIds = [];
  let legoIndex = 0;

  for (const seed of seeds) {
    const [seedId, pair, legos] = seed;
    for (const lego of legos) {
      const [legoId, type, target, known] = lego;
      legoLookup[target] = legoId;
      legoMetadata[legoId] = {
        id: legoId,
        target,
        known,
        index: legoIndex,
        lego: [target, known]
      };
      allLegoIds.push(legoId);
      legoIndex++;
    }
  }

  const sortedLegoTargets = Object.keys(legoLookup).sort((a, b) => b.length - a.length);
  console.log(`📊 Total LEGOs: ${allLegoIds.length}\n`);

  // Load baskets
  const bPath = await fs.pathExists(basketsPath) ? basketsPath : basketsPathFallback;
  if (!await fs.pathExists(bPath)) {
    console.error(`❌ Baskets not found at: ${bPath}`);
    process.exit(1);
  }

  const basketsData = await fs.readJson(bPath);
  console.log(`📂 Loaded baskets from: ${path.basename(bPath)}`);

  // Extract all edges from practice phrases
  const edgeFrequency = {}; // edge → count
  const edgeExamples = {}; // edge → [phrases]
  let totalPhrases = 0;

  for (const [legoId, basket] of Object.entries(basketsData)) {
    // Process e-PHRASES
    if (basket.e && Array.isArray(basket.e)) {
      for (const phrase of basket.e) {
        const phraseTarget = phrase[0];
        const legosInPhrase = extractLegosFromPhrase(phraseTarget, legoLookup, sortedLegoTargets);

        // Generate all edges (pairs) from LEGOs in this phrase
        for (let i = 0; i < legosInPhrase.length; i++) {
          for (let j = i + 1; j < legosInPhrase.length; j++) {
            const edge = [legosInPhrase[i], legosInPhrase[j]].sort().join('|||');
            edgeFrequency[edge] = (edgeFrequency[edge] || 0) + 1;

            if (!edgeExamples[edge]) {
              edgeExamples[edge] = [];
            }
            if (edgeExamples[edge].length < 3) { // Keep up to 3 examples
              edgeExamples[edge].push(phraseTarget);
            }
          }
        }
        totalPhrases++;
      }
    }

    // Process d-PHRASES
    if (basket.d && typeof basket.d === 'object') {
      for (const window of Object.keys(basket.d)) {
        if (Array.isArray(basket.d[window])) {
          for (const phrase of basket.d[window]) {
            const phraseTarget = phrase[0];
            const legosInPhrase = extractLegosFromPhrase(phraseTarget, legoLookup, sortedLegoTargets);

            for (let i = 0; i < legosInPhrase.length; i++) {
              for (let j = i + 1; j < legosInPhrase.length; j++) {
                const edge = [legosInPhrase[i], legosInPhrase[j]].sort().join('|||');
                edgeFrequency[edge] = (edgeFrequency[edge] || 0) + 1;

                if (!edgeExamples[edge]) {
                  edgeExamples[edge] = [];
                }
                if (edgeExamples[edge].length < 3) {
                  edgeExamples[edge].push(phraseTarget);
                }
              }
            }
            totalPhrases++;
          }
        }
      }
    }
  }

  console.log(`📊 Total phrases analyzed: ${totalPhrases}`);
  console.log(`📊 Unique edges found: ${Object.keys(edgeFrequency).length}\n`);

  // Calculate possible edges based on GATE constraint
  const possibleEdges = new Set();
  for (let i = 0; i < allLegoIds.length; i++) {
    const edges = getPossibleEdges(i, allLegoIds);
    for (const { edge } of edges) {
      possibleEdges.add(edge);
    }
  }

  console.log(`📊 Possible edges (GATE constraint): ${possibleEdges.size}\n`);

  // Identify missing edges
  const missingEdges = [];
  for (const edge of possibleEdges) {
    if (!edgeFrequency[edge]) {
      const [lego1, lego2] = edge.split('|||');
      missingEdges.push({
        edge,
        legos: [lego1, lego2],
        lego1_data: legoMetadata[lego1],
        lego2_data: legoMetadata[lego2]
      });
    }
  }

  // Identify over-used edges (> 3 standard deviations above mean)
  const edgeCounts = Object.values(edgeFrequency);
  const meanEdgeCount = edgeCounts.reduce((sum, c) => sum + c, 0) / edgeCounts.length;
  const variance = edgeCounts.reduce((sum, c) => sum + Math.pow(c - meanEdgeCount, 2), 0) / edgeCounts.length;
  const stdDev = Math.sqrt(variance);
  const overusedThreshold = meanEdgeCount + (3 * stdDev);

  const overusedEdges = [];
  for (const [edge, count] of Object.entries(edgeFrequency)) {
    if (count > overusedThreshold) {
      const [lego1, lego2] = edge.split('|||');
      overusedEdges.push({
        edge,
        count,
        legos: [lego1, lego2],
        lego1_data: legoMetadata[lego1],
        lego2_data: legoMetadata[lego2],
        examples: edgeExamples[edge]
      });
    }
  }

  // Calculate pattern density
  const actualEdges = Object.keys(edgeFrequency).length;
  const patternDensity = (actualEdges / possibleEdges.size) * 100;

  // Build edge distribution
  const edgeDistribution = Object.entries(edgeFrequency)
    .map(([edge, count]) => {
      const [lego1, lego2] = edge.split('|||');
      return {
        edge,
        legos: [lego1, lego2],
        lego1_data: legoMetadata[lego1],
        lego2_data: legoMetadata[lego2],
        count,
        examples: edgeExamples[edge]
      };
    })
    .sort((a, b) => b.count - a.count);

  // Build report
  const report = {
    course: courseCode,
    generated: new Date().toISOString(),
    summary: {
      total_legos: allLegoIds.length,
      total_phrases: totalPhrases,
      possible_edges: possibleEdges.size,
      actual_edges: actualEdges,
      missing_edges: missingEdges.length,
      pattern_density: parseFloat(patternDensity.toFixed(2)),
      mean_edge_count: parseFloat(meanEdgeCount.toFixed(2)),
      std_dev: parseFloat(stdDev.toFixed(2)),
      overused_threshold: parseFloat(overusedThreshold.toFixed(2)),
      overused_edges: overusedEdges.length
    },
    missing_edges: missingEdges.slice(0, 50), // Limit to top 50 for readability
    overused_edges: overusedEdges,
    edge_distribution: edgeDistribution.slice(0, 100) // Top 100 edges
  };

  // Output report
  if (outputFile) {
    await fs.writeJson(outputFile, report, { spaces: 2 });
    console.log(`💾 Report saved to: ${outputFile}\n`);
  }

  // Console summary
  console.log(`\n✅ Pattern Coverage Analysis Complete\n`);
  console.log(`📊 Summary:`);
  console.log(`   - Total LEGOs: ${report.summary.total_legos}`);
  console.log(`   - Total phrases: ${report.summary.total_phrases}`);
  console.log(`   - Possible edges (GATE): ${report.summary.possible_edges}`);
  console.log(`   - Actual edges found: ${report.summary.actual_edges}`);
  console.log(`   - Missing edges: ${report.summary.missing_edges}`);
  console.log(`   - Pattern density: ${report.summary.pattern_density}%\n`);

  console.log(`⚠️  Missing Edges: ${missingEdges.length}`);
  if (missingEdges.length > 0) {
    console.log(`   Top 5 missing combinations:`);
    missingEdges.slice(0, 5).forEach(({ lego1_data, lego2_data }) => {
      console.log(`   - ${lego1_data.id} "${lego1_data.target}" + ${lego2_data.id} "${lego2_data.target}"`);
    });
  }

  console.log(`\n🔥 Over-used Edges (> ${Math.round(overusedThreshold)}): ${overusedEdges.length}`);
  if (overusedEdges.length > 0) {
    console.log(`   Top 5 over-used combinations:`);
    overusedEdges.slice(0, 5).forEach(({ lego1_data, lego2_data, count }) => {
      console.log(`   - ${lego1_data.id} "${lego1_data.target}" + ${lego2_data.id} "${lego2_data.target}" (${count} times)`);
    });
  }

  console.log(`\n📊 Edge Statistics:`);
  console.log(`   - Mean edge count: ${report.summary.mean_edge_count}`);
  console.log(`   - Std deviation: ${report.summary.std_dev}`);
  console.log(`   - Most used edge: ${edgeDistribution[0]?.count || 0} occurrences`);
  console.log(`   - Least used edge: ${edgeDistribution[edgeDistribution.length - 1]?.count || 0} occurrences\n`);

  console.log(`📈 Full distribution available in report JSON\n`);

  return report;
}

analyzePatternCoverage().catch(err => {
  console.error('\n❌ Analysis failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
