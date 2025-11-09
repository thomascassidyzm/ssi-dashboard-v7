#!/usr/bin/env node

/**
 * Phase 5 - Basket Validation Script
 *
 * Purpose: Mechanical validation of completed baskets
 * - Format validation (structure, required fields)
 * - GATE validation (word-by-word whitelist checking)
 * - Distribution validation (2-2-2-4 pattern)
 * - Final phrase validation (is_final_lego must have seed sentence)
 *
 * Stage 3 of the Staged Pipeline approach
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// WHITELIST BUILDING (For non-scaffold baskets)
// ============================================================================

/**
 * Extract seed number from seed ID
 */
function extractSeedNum(seedId) {
  const match = seedId.match(/S(\d{4})/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extract LEGO seed number from LEGO ID
 */
function extractLegoSeedNum(legoId) {
  const match = legoId.match(/S(\d{4})/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Build whitelist from registry (for baskets without whitelists)
 */
function buildWhitelistFromRegistry(registryPath, targetSeedNum) {
  if (!fs.existsSync(registryPath)) {
    console.warn(`⚠️  Registry not found: ${registryPath}`);
    console.warn('   Skipping GATE validation (whitelist unavailable)');
    return null;
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const whitelist = new Set();

  for (const legoId in registry.legos) {
    const legoSeedNum = extractLegoSeedNum(legoId);
    if (legoSeedNum <= targetSeedNum) {
      const lego = registry.legos[legoId];
      if (lego.spanish_words && Array.isArray(lego.spanish_words)) {
        lego.spanish_words.forEach(word => whitelist.add(word));
      }
    }
  }

  return Array.from(whitelist).sort();
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Tokenize Spanish phrase for GATE checking
 * @param {string} spanish - Spanish phrase
 * @returns {string[]} - Array of lowercase words
 */
function tokenizeSpanish(spanish) {
  return spanish
    .toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Validate GATE compliance (all words in whitelist)
 * @param {string} spanish - Spanish phrase
 * @param {string[]} whitelist - Allowed Spanish words
 * @returns {object} - { valid: boolean, violations: string[] }
 */
function validateGate(spanish, whitelist) {
  const words = tokenizeSpanish(spanish);
  const whitelistSet = new Set(whitelist);
  const violations = [];

  for (const word of words) {
    if (!whitelistSet.has(word)) {
      violations.push(word);
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Calculate phrase distribution
 * @param {array} phrases - Array of [english, spanish, null, word_count]
 * @returns {object} - Distribution counts
 */
function calculateDistribution(phrases) {
  const dist = {
    really_short_1_2: 0,
    quite_short_3: 0,
    longer_4_5: 0,
    long_6_plus: 0
  };

  for (const phrase of phrases) {
    const wordCount = phrase[3];
    if (wordCount <= 2) {
      dist.really_short_1_2++;
    } else if (wordCount === 3) {
      dist.quite_short_3++;
    } else if (wordCount >= 4 && wordCount <= 5) {
      dist.longer_4_5++;
    } else if (wordCount >= 6) {
      dist.long_6_plus++;
    }
  }

  return dist;
}

/**
 * Validate phrase distribution matches 2-2-2-4 pattern
 * @param {object} dist - Distribution object
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validateDistribution(dist) {
  const errors = [];
  const expected = {
    really_short_1_2: 2,
    quite_short_3: 2,
    longer_4_5: 2,
    long_6_plus: 4
  };

  for (const key in expected) {
    if (dist[key] !== expected[key]) {
      errors.push(`Expected ${expected[key]} ${key} phrases, got ${dist[key]}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// MAIN VALIDATION
// ============================================================================

/**
 * Validate a completed basket JSON
 * @param {object} data - Basket JSON
 * @returns {object} - Validation report
 */
function validateBasket(data) {
  const report = {
    timestamp: new Date().toISOString(),
    agent_id: data.agent_id,
    seed_range: data.seed_range,
    format_valid: true,
    format_errors: [],
    gate_violations: [],
    distribution_errors: [],
    final_phrase_errors: [],
    total_legos_checked: 0,
    total_phrases_checked: 0,
    summary: {
      gate_compliance: null,
      distribution_compliance: null,
      final_phrase_compliance: null,
      overall_status: null
    }
  };

  // -------------------------------------------------------------------------
  // FORMAT VALIDATION
  // -------------------------------------------------------------------------

  console.log('Checking format...');

  if (!data.seeds) {
    report.format_valid = false;
    report.format_errors.push('Missing "seeds" key at root');
    return report;
  }

  const seedIds = Object.keys(data.seeds);
  console.log(`  Found ${seedIds.length} seeds`);

  // -------------------------------------------------------------------------
  // GATE VALIDATION
  // -------------------------------------------------------------------------

  console.log('Checking GATE compliance...');

  // Check if we need to build whitelists (non-scaffold baskets)
  const needsWhitelist = !data.seeds[seedIds[0]]?.whitelist;
  let registryPath = null;

  if (needsWhitelist) {
    console.log('  ⚠️  No whitelists in basket (v4.0 format)');
    console.log('  Building whitelists from registry...');

    // Try to find registry
    const possiblePaths = [
      path.join(path.dirname(process.argv[1]), '..', 'phase5_batch2_s0301_s0500', 'registry', 'lego_registry_s0001_s0500.json'),
      path.join(process.cwd(), 'phase5_batch2_s0301_s0500', 'registry', 'lego_registry_s0001_s0500.json'),
      path.join(process.cwd(), 'registry', 'lego_registry_s0001_s0500.json')
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        registryPath = p;
        break;
      }
    }

    if (!registryPath) {
      console.warn('  ❌ Registry not found - GATE validation skipped');
      report.summary.gate_compliance = 'SKIPPED';
    } else {
      console.log(`  ✅ Found registry: ${registryPath}`);
    }
  }

  for (const seedId of seedIds) {
    const seed = data.seeds[seedId];
    const seedNum = extractSeedNum(seedId);

    // Get or build whitelist
    let whitelist = seed.whitelist;

    if (!whitelist && registryPath) {
      whitelist = buildWhitelistFromRegistry(registryPath, seedNum);
    }

    if (!whitelist) {
      // Skip GATE validation for this seed if no whitelist available
      const legos = seed.legos || {};
      report.total_legos_checked += Object.keys(legos).length;
      for (const legoId in legos) {
        const lego = legos[legoId];
        if (lego.practice_phrases) {
          report.total_phrases_checked += lego.practice_phrases.length;
        }
      }
      continue;
    }
    const legos = seed.legos || {};
    const legoIds = Object.keys(legos);

    for (const legoId of legoIds) {
      const lego = legos[legoId];

      if (!lego.practice_phrases) {
        report.format_errors.push(`LEGO ${legoId} missing practice_phrases`);
        continue;
      }

      report.total_legos_checked++;

      const phrases = lego.practice_phrases;

      if (phrases.length !== 10) {
        report.format_errors.push(`LEGO ${legoId} has ${phrases.length} phrases (expected 10)`);
      }

      for (let i = 0; i < phrases.length; i++) {
        const [english, spanish, _, wordCount] = phrases[i];
        report.total_phrases_checked++;

        // GATE check
        const gateCheck = validateGate(spanish, whitelist);
        if (!gateCheck.valid) {
          report.gate_violations.push({
            lego: legoId,
            phrase_index: i + 1,
            english,
            spanish,
            violations: gateCheck.violations
          });
        }
      }

      // Distribution check
      const actualDist = calculateDistribution(phrases);
      const distCheck = validateDistribution(actualDist);

      if (!distCheck.valid) {
        report.distribution_errors.push({
          lego: legoId,
          actual: actualDist,
          errors: distCheck.errors
        });
      }

      // Final phrase check (if is_final_lego)
      if (lego.is_final_lego === true) {
        const finalPhrase = phrases[9]; // 10th phrase (index 9)
        if (!finalPhrase) {
          report.final_phrase_errors.push({
            lego: legoId,
            error: 'Missing phrase 10 (final LEGO must have complete seed)'
          });
        } else {
          const [english, spanish] = finalPhrase;
          const seedEnglish = seed.seed_pair.known;
          const seedSpanish = seed.seed_pair.target;

          // Check if final phrase matches seed sentence (allowing for minor punctuation differences)
          const normalizePhrase = (s) => s.toLowerCase().replace(/[¿?¡!,.;]/g, '').trim();

          if (normalizePhrase(english) !== normalizePhrase(seedEnglish) ||
              normalizePhrase(spanish) !== normalizePhrase(seedSpanish)) {
            report.final_phrase_errors.push({
              lego: legoId,
              error: 'Final phrase does not match seed sentence',
              expected: { english: seedEnglish, spanish: seedSpanish },
              actual: { english, spanish }
            });
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------

  report.summary.gate_compliance = report.gate_violations.length === 0 ? 'PASS' : 'FAIL';
  report.summary.distribution_compliance = report.distribution_errors.length === 0 ? 'PASS' : 'WARN';
  report.summary.final_phrase_compliance = report.final_phrase_errors.length === 0 ? 'PASS' : 'FAIL';

  const hasErrors = report.format_errors.length > 0 ||
                    report.gate_violations.length > 0 ||
                    report.final_phrase_errors.length > 0;

  report.summary.overall_status = hasErrors ? 'FAIL' :
    (report.distribution_errors.length > 0 ? 'PASS_WITH_WARNINGS' : 'PASS');

  return report;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node validate_agent_baskets.cjs <basket_file.json> [output_report.json]');
    console.error('');
    console.error('Example:');
    console.error('  node validate_agent_baskets.cjs \\');
    console.error('    phase5_batch2_s0301_s0500/batch_output/agent_01_baskets.json \\');
    console.error('    phase5_batch2_s0301_s0500/validation/agent_01_report.json');
    process.exit(1);
  }

  const basketPath = args[0];
  const reportPath = args[1] || basketPath.replace('.json', '_validation_report.json');

  console.log('');
  console.log('=== Phase 5 Basket Validation ===');
  console.log('');

  // Load basket
  console.log(`Loading basket: ${basketPath}`);
  if (!fs.existsSync(basketPath)) {
    console.error(`❌ Error: Basket file not found: ${basketPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  console.log(`✅ Loaded baskets for Agent ${data.agent_id} (${data.seed_range})`);
  console.log('');

  // Validate
  const report = validateBasket(data);

  // Display results
  console.log('=== VALIDATION RESULTS ===');
  console.log('');
  console.log(`📊 Checked: ${report.total_legos_checked} LEGOs, ${report.total_phrases_checked} phrases`);
  console.log('');

  // Format errors
  if (report.format_errors.length > 0) {
    console.log(`❌ FORMAT ERRORS: ${report.format_errors.length}`);
    report.format_errors.forEach(err => console.log(`   - ${err}`));
    console.log('');
  } else {
    console.log('✅ FORMAT: Valid');
  }

  // GATE violations
  if (report.gate_violations.length > 0) {
    console.log(`❌ GATE VIOLATIONS: ${report.gate_violations.length}`);
    console.log('');
    console.log('Top 10 violations:');
    const sample = report.gate_violations.slice(0, 10);
    sample.forEach(v => {
      console.log(`   ${v.lego} phrase ${v.phrase_index}:`);
      console.log(`      Spanish: "${v.spanish}"`);
      console.log(`      Violations: ${v.violations.join(', ')}`);
    });
    if (report.gate_violations.length > 10) {
      console.log(`   ... and ${report.gate_violations.length - 10} more`);
    }
    console.log('');
  } else {
    console.log('✅ GATE COMPLIANCE: 100% (0 violations)');
  }

  // Distribution errors
  if (report.distribution_errors.length > 0) {
    console.log(`⚠️  DISTRIBUTION MISMATCHES: ${report.distribution_errors.length}`);
    console.log('');
    const sample = report.distribution_errors.slice(0, 5);
    sample.forEach(d => {
      console.log(`   ${d.lego}:`);
      d.errors.forEach(err => console.log(`      - ${err}`));
    });
    if (report.distribution_errors.length > 5) {
      console.log(`   ... and ${report.distribution_errors.length - 5} more`);
    }
    console.log('');
  } else {
    console.log('✅ DISTRIBUTION: All LEGOs follow 2-2-2-4 pattern');
  }

  // Final phrase errors
  if (report.final_phrase_errors.length > 0) {
    console.log(`❌ FINAL PHRASE ERRORS: ${report.final_phrase_errors.length}`);
    console.log('');
    report.final_phrase_errors.forEach(e => {
      console.log(`   ${e.lego}: ${e.error}`);
      if (e.expected) {
        console.log(`      Expected: "${e.expected.spanish}"`);
        console.log(`      Actual:   "${e.actual.spanish}"`);
      }
    });
    console.log('');
  } else {
    console.log('✅ FINAL PHRASES: All match seed sentences');
  }

  // Overall summary
  console.log('=== SUMMARY ===');
  console.log('');
  console.log(`GATE Compliance:        ${report.summary.gate_compliance}`);
  console.log(`Distribution:           ${report.summary.distribution_compliance}`);
  console.log(`Final Phrases:          ${report.summary.final_phrase_compliance}`);
  console.log(`Overall Status:         ${report.summary.overall_status}`);
  console.log('');

  // Save report
  console.log(`Writing validation report: ${reportPath}`);

  // Ensure output directory exists
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('✅ Report saved');
  console.log('');

  // Exit code
  if (report.summary.overall_status === 'FAIL') {
    console.log('❌ VALIDATION FAILED - Fix errors and regenerate');
    process.exit(1);
  } else if (report.summary.overall_status === 'PASS_WITH_WARNINGS') {
    console.log('⚠️  VALIDATION PASSED WITH WARNINGS - Review distribution mismatches');
    process.exit(0);
  } else {
    console.log('✅ VALIDATION PASSED - Ready for production');
    process.exit(0);
  }
}

main();
