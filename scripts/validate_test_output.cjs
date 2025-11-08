#!/usr/bin/env node

/**
 * Validate Test Output
 *
 * Checks GATE compliance, distribution, and format
 */

const fs = require('fs');
const path = require('path');

function tokenizeSpanish(text) {
  return text
    .toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

function validateGATE(phrases, whitelist) {
  const whitelistSet = new Set(whitelist.map(w => w.toLowerCase()));
  const violations = [];

  for (const phrase of phrases) {
    const spanish = phrase[1];
    const words = tokenizeSpanish(spanish);

    for (const word of words) {
      if (!whitelistSet.has(word)) {
        violations.push({
          phrase: spanish,
          word: word,
          issue: 'not_in_whitelist'
        });
      }
    }
  }

  return violations;
}

function validateDistribution(phrases) {
  const dist = {
    really_short_1_2: 0,
    quite_short_3: 0,
    longer_4_5: 0,
    long_6_plus: 0
  };

  for (const phrase of phrases) {
    const wordCount = phrase[3];
    if (wordCount <= 2) dist.really_short_1_2++;
    else if (wordCount === 3) dist.quite_short_3++;
    else if (wordCount >= 4 && wordCount <= 5) dist.longer_4_5++;
    else if (wordCount >= 6) dist.long_6_plus++;
  }

  const target = {really_short_1_2: 2, quite_short_3: 2, longer_4_5: 2, long_6_plus: 4};
  const warnings = [];

  for (const key in target) {
    if (dist[key] < target[key] - 1 || dist[key] > target[key] + 1) {
      warnings.push({
        category: key,
        expected: target[key],
        actual: dist[key]
      });
    }
  }

  return {distribution: dist, warnings};
}

function validateTestOutput(outputPath) {
  console.log('Validating test output...\n');

  const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  let totalLegos = 0;
  let totalPhrases = 0;
  let totalViolations = 0;
  let totalDistWarnings = 0;

  console.log(`Test ID: ${output.test_id}`);
  console.log(`Seed range: ${output.seed_range}\n`);

  for (const seedId in output.seeds) {
    const seed = output.seeds[seedId];
    console.log(`\n${seedId}:`);
    console.log(`  Recency focus: ${seed.recency_focus || 'N/A'}`);

    for (const legoId in seed.legos) {
      const lego = seed.legos[legoId];
      totalLegos++;

      console.log(`\n  ${legoId}: ${lego.lego[0]}`);
      console.log(`    Phrases: ${lego.practice_phrases.length}`);

      // GATE validation
      const violations = validateGATE(lego.practice_phrases, seed.whitelist || []);
      if (violations.length > 0) {
        console.log(`    ❌ GATE violations: ${violations.length}`);
        violations.slice(0, 3).forEach(v => {
          console.log(`       - "${v.word}" in "${v.phrase}"`);
        });
        totalViolations += violations.length;
      } else {
        console.log(`    ✅ GATE: compliant`);
      }

      // Distribution
      const {distribution, warnings} = validateDistribution(lego.practice_phrases);
      if (warnings.length > 0) {
        console.log(`    ⚠️  Distribution warnings: ${warnings.length}`);
        warnings.forEach(w => {
          console.log(`       - ${w.category}: expected ${w.expected}, got ${w.actual}`);
        });
        totalDistWarnings += warnings.length;
      } else {
        console.log(`    ✅ Distribution: 2-2-2-4`);
      }

      // Final LEGO check
      if (lego.is_final_lego) {
        const finalPhrase = lego.practice_phrases[9];
        const expectedFinal = seed.seed_pair.target;
        if (finalPhrase[1] === expectedFinal) {
          console.log(`    ✅ Final phrase: correct`);
        } else {
          console.log(`    ❌ Final phrase mismatch`);
          console.log(`       Expected: ${expectedFinal}`);
          console.log(`       Got: ${finalPhrase[1]}`);
        }
      }

      totalPhrases += lego.practice_phrases.length;
    }
  }

  console.log(`\n\n═══════════════════════════════════`);
  console.log(`VALIDATION SUMMARY`);
  console.log(`═══════════════════════════════════`);
  console.log(`LEGOs: ${totalLegos}`);
  console.log(`Phrases: ${totalPhrases}`);
  console.log(`GATE violations: ${totalViolations}`);
  console.log(`Distribution warnings: ${totalDistWarnings}`);

  if (totalViolations === 0 && totalDistWarnings === 0) {
    console.log(`\n✅ ALL VALIDATIONS PASSED\n`);
    return {status: 'PASS', violations: 0, warnings: 0};
  } else if (totalViolations === 0) {
    console.log(`\n⚠️  PASS WITH WARNINGS\n`);
    return {status: 'PASS_WITH_WARNINGS', violations: 0, warnings: totalDistWarnings};
  } else {
    console.log(`\n❌ FAILED\n`);
    return {status: 'FAIL', violations: totalViolations, warnings: totalDistWarnings};
  }
}

// Main
const outputPath = process.argv[2] || path.join(__dirname, '..', 'phase5_tests', 'outputs', 'test_1_sample_output.json');
validateTestOutput(outputPath);
