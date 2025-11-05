#!/usr/bin/env node
/**
 * Conversational Quality Validator
 *
 * Validates baskets against the critical conversational requirements:
 * 1. At least 5 phrases with 5+ LEGOs
 * 2. 40%+ conjunction usage
 * 3. GATE compliance
 * 4. Pattern variety
 */

const fs = require('fs');
const path = require('path');

// Spanish conjunctions (GOLD for conversation)
const CONJUNCTIONS = {
  'pero': 'but',
  'y': 'and',
  'porque': 'because',
  'o': 'or',
  'así que': 'so',
  'cuando': 'when',
  'si': 'if',
  'aunque': 'although',
  'mientras': 'while',
  'entonces': 'then'
};

/**
 * Check if phrase contains a conjunction
 */
function hasConjunction(phrase) {
  const [known, target] = phrase;
  const targetLower = target.toLowerCase();
  const knownLower = known.toLowerCase();

  for (const [spanish, english] of Object.entries(CONJUNCTIONS)) {
    if (targetLower.includes(` ${spanish} `) || knownLower.includes(` ${english} `)) {
      return spanish;
    }
  }

  return null;
}

/**
 * Count LEGOs in a phrase (from the 4th element)
 */
function getLegoCount(phrase) {
  return phrase[3] || 1;
}

/**
 * Validate conversational quality of phrases
 */
function validateConversationalQuality(phrases) {
  const total = phrases.length;

  // Count conversational phrases (5+ LEGOs)
  const conversational = phrases.filter(p => getLegoCount(p) >= 5);
  const conversationalCount = conversational.length;

  // Count conjunction usage
  const withConjunctions = phrases.map(p => ({
    phrase: p,
    conjunction: hasConjunction(p)
  })).filter(p => p.conjunction);

  const conjunctionCount = withConjunctions.length;
  const conjunctionPercentage = (conjunctionCount / total) * 100;

  // Calculate scores
  const conversationalScore = conversationalCount >= 5 ? 100 : (conversationalCount / 5) * 100;
  const conjunctionScore = conjunctionPercentage >= 40 ? 100 : (conjunctionPercentage / 40) * 100;

  // Overall pass/fail
  const pass = conversationalCount >= 5 && conjunctionPercentage >= 40;

  return {
    total_phrases: total,
    conversational_phrases: conversationalCount,
    conversational_score: Math.round(conversationalScore),
    conjunction_count: conjunctionCount,
    conjunction_percentage: Math.round(conjunctionPercentage),
    conjunction_score: Math.round(conjunctionScore),
    conjunctions_used: withConjunctions.map(p => p.conjunction),
    pass,
    conversational_examples: conversational.slice(0, 3).map(p => ({
      phrase: p[0],
      target: p[1],
      lego_count: getLegoCount(p),
      conjunction: hasConjunction(p)
    }))
  };
}

/**
 * Analyze phrase length distribution
 */
function analyzePhraseDistribution(phrases) {
  const distribution = {
    minimal: 0,      // 1-2 LEGOs
    pattern: 0,      // 3-4 LEGOs
    conversational: 0 // 5+ LEGOs
  };

  for (const phrase of phrases) {
    const count = getLegoCount(phrase);
    if (count <= 2) distribution.minimal++;
    else if (count <= 4) distribution.pattern++;
    else distribution.conversational++;
  }

  return distribution;
}

/**
 * Generate retry feedback for failed baskets
 */
function generateRetryFeedback(result) {
  const feedback = [];

  if (result.conversational_score < 100) {
    feedback.push(`❌ CONVERSATIONAL: Only ${result.conversational_phrases}/${result.total_phrases} phrases have 5+ LEGOs (need 5+)`);
    feedback.push(`   → Add ${5 - result.conversational_phrases} more complex phrases chaining thoughts with conjunctions`);
  }

  if (result.conjunction_score < 100) {
    feedback.push(`❌ CONJUNCTIONS: Only ${result.conjunction_percentage}% use conjunctions (need 40%+)`);
    feedback.push(`   → Use more: pero (but), y (and), porque (because), si (if)`);
  }

  if (feedback.length === 0) {
    feedback.push('✅ All conversational requirements met!');
  }

  return feedback;
}

/**
 * Validate a single LEGO basket
 */
function validateLegoBasket(seedId, legoId, basket) {
  const legoData = basket[legoId];

  if (!legoData) {
    return { error: `LEGO ${legoId} not found in basket` };
  }

  const phrases = legoData.practice_phrases || [];
  const qualityResult = validateConversationalQuality(phrases);
  const distribution = analyzePhraseDistribution(phrases);
  const feedback = generateRetryFeedback(qualityResult);

  return {
    seedId,
    legoId,
    lego: legoData.lego,
    ...qualityResult,
    distribution,
    feedback
  };
}

/**
 * Validate an entire seed basket
 */
function validateSeedBasket(seedId, basketPath) {
  if (!fs.existsSync(basketPath)) {
    return { error: `Basket not found: ${basketPath}` };
  }

  const basket = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  const results = [];

  // Get all LEGO IDs from basket
  const legoIds = Object.keys(basket).filter(k => k.match(/^S\d{4}L\d{2}$/));

  for (const legoId of legoIds) {
    const result = validateLegoBasket(seedId, legoId, basket);
    results.push(result);
  }

  // Calculate aggregate scores
  const totalPhrases = results.reduce((sum, r) => sum + (r.total_phrases || 0), 0);
  const totalConversational = results.reduce((sum, r) => sum + (r.conversational_phrases || 0), 0);
  const totalConjunctions = results.reduce((sum, r) => sum + (r.conjunction_count || 0), 0);

  const avgConversationalScore = Math.round(
    results.reduce((sum, r) => sum + (r.conversational_score || 0), 0) / results.length
  );
  const avgConjunctionScore = Math.round(
    results.reduce((sum, r) => sum + (r.conjunction_score || 0), 0) / results.length
  );

  const allPass = results.every(r => r.pass);

  return {
    seedId,
    legos: results,
    summary: {
      total_legos: results.length,
      total_phrases: totalPhrases,
      total_conversational: totalConversational,
      total_conjunctions: totalConjunctions,
      avg_conversational_score: avgConversationalScore,
      avg_conjunction_score: avgConjunctionScore,
      pass: allPass
    }
  };
}

/**
 * Print detailed report
 */
function printReport(results, options = {}) {
  const { brief = false } = options;

  console.log('\n' + '='.repeat(70));
  console.log('CONVERSATIONAL QUALITY REPORT');
  console.log('='.repeat(70));

  if (Array.isArray(results)) {
    // Multiple seeds
    let totalPass = 0;
    let totalFail = 0;

    for (const result of results) {
      const status = result.summary?.pass ? '✅' : '❌';
      console.log(`\n${status} ${result.seedId}:`);
      console.log(`   Conversational: ${result.summary?.avg_conversational_score}/100`);
      console.log(`   Conjunctions: ${result.summary?.avg_conjunction_score}/100`);

      if (result.summary?.pass) totalPass++;
      else totalFail++;

      if (!brief && !result.summary?.pass) {
        // Show failing LEGOs
        const failing = result.legos.filter(l => !l.pass);
        for (const lego of failing) {
          console.log(`   ${lego.legoId}:`);
          lego.feedback.forEach(f => console.log(`      ${f}`));
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`SUMMARY: ${totalPass} passed, ${totalFail} failed`);

  } else {
    // Single seed
    const result = results;
    console.log(`\nSeed: ${result.seedId}`);
    console.log(`LEGOs: ${result.summary.total_legos}`);
    console.log(`Phrases: ${result.summary.total_phrases}`);
    console.log(`\n📊 Conversational Score: ${result.summary.avg_conversational_score}/100`);
    console.log(`📊 Conjunction Score: ${result.summary.avg_conjunction_score}/100`);

    if (!brief) {
      console.log('\n' + '='.repeat(70));
      console.log('LEGO DETAILS');
      console.log('='.repeat(70));

      for (const lego of result.legos) {
        const status = lego.pass ? '✅' : '❌';
        console.log(`\n${status} ${lego.legoId}: "${lego.lego[0]}" → "${lego.lego[1]}"`);
        console.log(`   Phrases: ${lego.total_phrases} total, ${lego.conversational_phrases} conversational (5+ LEGOs)`);
        console.log(`   Conjunctions: ${lego.conjunction_count} (${lego.conjunction_percentage}%)`);
        console.log(`   Distribution: ${lego.distribution.minimal} minimal, ${lego.distribution.pattern} pattern, ${lego.distribution.conversational} conversational`);

        if (lego.conversational_examples.length > 0) {
          console.log('   Examples:');
          lego.conversational_examples.forEach(ex => {
            const conj = ex.conjunction ? ` [${ex.conjunction}]` : '';
            console.log(`      "${ex.phrase}" (${ex.lego_count} LEGOs)${conj}`);
          });
        }

        if (!lego.pass) {
          console.log('   Feedback:');
          lego.feedback.forEach(f => console.log(`      ${f}`));
        }
      }
    }
  }

  console.log('='.repeat(70) + '\n');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Conversational Quality Validator\n');
    console.log('Validates baskets against conversational requirements:');
    console.log('  - At least 5 phrases with 5+ LEGOs');
    console.log('  - 40%+ conjunction usage\n');
    console.log('Usage:');
    console.log('  node validate_conversational_quality.cjs <seed_id>          # Single seed');
    console.log('  node validate_conversational_quality.cjs S0001-S0020        # Range');
    console.log('  node validate_conversational_quality.cjs --all              # All seeds');
    console.log('  node validate_conversational_quality.cjs S0010 --brief      # Brief output');
    process.exit(1);
  }

  const brief = args.includes('--brief');
  const seedArgs = args.filter(a => a !== '--brief');

  // Parse seed IDs
  let seedIds = [];
  if (seedArgs[0] === '--all') {
    // Find all basket files
    const BASKETS_DIR = path.join(__dirname, 'public/baskets');
    const files = fs.readdirSync(BASKETS_DIR).filter(f => f.match(/^lego_baskets_s\d{4}\.json$/));
    seedIds = files.map(f => f.match(/s(\d{4})/)[1]).map(n => `S${n}`);
  } else if (seedArgs[0].includes('-')) {
    // Range
    const [start, end] = seedArgs[0].split('-');
    const startNum = parseInt(start.replace('S', ''));
    const endNum = parseInt(end.replace('S', ''));
    for (let i = startNum; i <= endNum; i++) {
      seedIds.push(`S${String(i).padStart(4, '0')}`);
    }
  } else {
    seedIds = seedArgs;
  }

  const BASKETS_DIR = path.join(__dirname, 'public/baskets');

  if (seedIds.length === 1) {
    // Single seed detailed report
    const seedId = seedIds[0];
    const basketPath = path.join(BASKETS_DIR, `lego_baskets_${seedId.toLowerCase()}.json`);
    const result = validateSeedBasket(seedId, basketPath);
    printReport(result, { brief });
    process.exit(result.summary.pass ? 0 : 1);
  } else {
    // Multiple seeds summary
    const results = seedIds.map(seedId => {
      const basketPath = path.join(BASKETS_DIR, `lego_baskets_${seedId.toLowerCase()}.json`);
      return validateSeedBasket(seedId, basketPath);
    });
    printReport(results, { brief });
    const allPass = results.every(r => r.summary?.pass);
    process.exit(allPass ? 0 : 1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateConversationalQuality,
  validateLegoBasket,
  validateSeedBasket
};
