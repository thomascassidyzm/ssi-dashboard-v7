#!/usr/bin/env node

/**
 * LEGO Frequency Analyzer
 *
 * Analyzes how often each LEGO appears in practice phrases (e-PHRASES and d-PHRASES).
 * Identifies under-practiced and over-practiced LEGOs to ensure balanced coverage.
 *
 * Input:  vfs/courses/{course_code}/lego_baskets.json (or deduplicated)
 *         vfs/courses/{course_code}/lego_pairs.json (for LEGO metadata)
 * Output: JSON report to stdout or file
 *
 * Usage: node validators/analyze-lego-frequency.cjs <course_code> [--output report.json]
 */

const fs = require('fs-extra');
const path = require('path');

const args = process.argv.slice(2);
const courseCode = args[0];
const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;

if (!courseCode) {
  console.error('❌ Usage: node validators/analyze-lego-frequency.cjs <course_code> [--output report.json]');
  console.error('   Example: node validators/analyze-lego-frequency.cjs spa_for_eng_20seeds');
  process.exit(1);
}

const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
const basketsPath = path.join(courseDir, 'lego_baskets_deduplicated.json');
const basketsPathFallback = path.join(courseDir, 'lego_baskets.json');
const legoPath = path.join(courseDir, 'lego_pairs_deduplicated.json');
const legoPathFallback = path.join(courseDir, 'lego_pairs.json');

/**
 * Extract all LEGOs from a practice phrase
 * Strategy: Match any LEGO target text that appears in the phrase
 */
function extractLegosFromPhrase(phraseTarget, allLegos) {
  const foundLegos = [];

  // Sort LEGOs by length (descending) to match longer phrases first
  const sortedLegos = [...allLegos].sort((a, b) => b.target.length - a.target.length);

  for (const lego of sortedLegos) {
    if (phraseTarget.includes(lego.target)) {
      foundLegos.push(lego.id);
    }
  }

  return foundLegos;
}

async function analyzeFrequency() {
  console.log(`\n📊 LEGO Frequency Analysis`);
  console.log(`Course: ${courseCode}\n`);

  // Load baskets
  const bPath = await fs.pathExists(basketsPath) ? basketsPath : basketsPathFallback;
  if (!await fs.pathExists(bPath)) {
    console.error(`❌ Baskets not found at: ${bPath}`);
    process.exit(1);
  }

  const basketsData = await fs.readJson(bPath);
  console.log(`📂 Loaded baskets from: ${path.basename(bPath)}`);

  // Load LEGO pairs for metadata
  const lPath = await fs.pathExists(legoPath) ? legoPath : legoPathFallback;
  if (!await fs.pathExists(lPath)) {
    console.error(`❌ LEGO pairs not found at: ${lPath}`);
    process.exit(1);
  }

  const legoPairsData = await fs.readJson(lPath);
  const seeds = Array.isArray(legoPairsData) ? legoPairsData : legoPairsData.seeds;

  // Build LEGO lookup: id → {target, known}
  const legoLookup = {};
  const allLegos = [];

  for (const seed of seeds) {
    const [seedId, pair, legos] = seed;
    for (const lego of legos) {
      const [legoId, type, target, known] = lego;
      legoLookup[legoId] = { id: legoId, type, target, known };
      allLegos.push({ id: legoId, target, known });
    }
  }

  console.log(`📊 Total LEGOs: ${Object.keys(legoLookup).length}\n`);

  // Count frequencies
  const frequencies = {};

  for (const [legoId, basket] of Object.entries(basketsData)) {
    if (!frequencies[legoId]) {
      frequencies[legoId] = {
        lego: basket.lego,
        e_count: 0,
        d_count: 0,
        total: 0,
        e_phrases: [],
        d_phrases: []
      };
    }

    // Count e-PHRASES
    if (basket.e && Array.isArray(basket.e)) {
      frequencies[legoId].e_count = basket.e.length;
      frequencies[legoId].e_phrases = basket.e;
    }

    // Count d-PHRASES (across all windows)
    if (basket.d && typeof basket.d === 'object') {
      for (const window of Object.keys(basket.d)) {
        if (Array.isArray(basket.d[window])) {
          frequencies[legoId].d_count += basket.d[window].length;
          frequencies[legoId].d_phrases.push(...basket.d[window]);
        }
      }
    }

    frequencies[legoId].total = frequencies[legoId].e_count + frequencies[legoId].d_count;
  }

  // Calculate statistics
  const totalLegos = Object.keys(frequencies).length;
  const totalPractices = Object.values(frequencies).reduce((sum, f) => sum + f.total, 0);
  const avgPractices = totalPractices / totalLegos;

  // Sort by total frequency
  const sortedFrequencies = Object.entries(frequencies)
    .map(([id, data]) => ({ lego_id: id, ...data }))
    .sort((a, b) => a.total - b.total);

  // Identify under-practiced (< 3 total practices)
  const underPracticed = sortedFrequencies.filter(f => f.total < 3);

  // Identify over-practiced (> 2 * average)
  const overPracticed = sortedFrequencies.filter(f => f.total > avgPractices * 2).reverse();

  // Identify zero-practice (should not happen if baskets are well-formed)
  const zeroPractice = sortedFrequencies.filter(f => f.total === 0);

  // Build report
  const report = {
    course: courseCode,
    generated: new Date().toISOString(),
    summary: {
      total_legos: totalLegos,
      total_e_phrases: Object.values(frequencies).reduce((sum, f) => sum + f.e_count, 0),
      total_d_phrases: Object.values(frequencies).reduce((sum, f) => sum + f.d_count, 0),
      total_practices: totalPractices,
      avg_practices_per_lego: parseFloat(avgPractices.toFixed(2)),
      min_practices: sortedFrequencies[0]?.total || 0,
      max_practices: sortedFrequencies[sortedFrequencies.length - 1]?.total || 0
    },
    under_practiced: underPracticed.map(f => ({
      lego_id: f.lego_id,
      lego: f.lego,
      e_count: f.e_count,
      d_count: f.d_count,
      total: f.total
    })),
    over_practiced: overPracticed.map(f => ({
      lego_id: f.lego_id,
      lego: f.lego,
      e_count: f.e_count,
      d_count: f.d_count,
      total: f.total
    })),
    zero_practice: zeroPractice.map(f => ({
      lego_id: f.lego_id,
      lego: f.lego
    })),
    frequency_distribution: sortedFrequencies.map(f => ({
      lego_id: f.lego_id,
      lego: f.lego,
      total: f.total
    }))
  };

  // Output report
  if (outputFile) {
    await fs.writeJson(outputFile, report, { spaces: 2 });
    console.log(`💾 Report saved to: ${outputFile}\n`);
  }

  // Console summary
  console.log(`\n✅ Analysis Complete\n`);
  console.log(`📊 Summary:`);
  console.log(`   - Total LEGOs: ${report.summary.total_legos}`);
  console.log(`   - Total e-PHRASES: ${report.summary.total_e_phrases}`);
  console.log(`   - Total d-PHRASES: ${report.summary.total_d_phrases}`);
  console.log(`   - Total practices: ${report.summary.total_practices}`);
  console.log(`   - Average per LEGO: ${report.summary.avg_practices_per_lego}`);
  console.log(`   - Range: ${report.summary.min_practices} to ${report.summary.max_practices}\n`);

  console.log(`⚠️  Under-practiced LEGOs (< 3): ${underPracticed.length}`);
  if (underPracticed.length > 0) {
    console.log(`   Top 5:`);
    underPracticed.slice(0, 5).forEach(f => {
      console.log(`   - ${f.lego_id}: "${f.lego[0]}" / "${f.lego[1]}" (${f.total} practices)`);
    });
  }

  console.log(`\n🔥 Over-practiced LEGOs (> ${Math.round(avgPractices * 2)}): ${overPracticed.length}`);
  if (overPracticed.length > 0) {
    console.log(`   Top 5:`);
    overPracticed.slice(0, 5).forEach(f => {
      console.log(`   - ${f.lego_id}: "${f.lego[0]}" / "${f.lego[1]}" (${f.total} practices)`);
    });
  }

  if (zeroPractice.length > 0) {
    console.log(`\n❌ Zero-practice LEGOs: ${zeroPractice.length}`);
    console.log(`   This should NOT happen - all LEGOs should have baskets!`);
  }

  console.log(`\n📈 Full distribution available in report JSON\n`);

  return report;
}

analyzeFrequency().catch(err => {
  console.error('\n❌ Analysis failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
