#!/usr/bin/env node

/**
 * Phase 5 Basket Merge - Validate and Merge Practice Baskets
 *
 * This script does ALL the mechanical post-generation work:
 * 1. Reads per-seed outputs from phase5_outputs
 * 2. Validates format (10 phrases per LEGO, 2-2-2-4 distribution)
 * 3. Validates GATE compliance (all Spanish words in whitelist)
 * 4. Validates final LEGO phrase #10 = complete seed sentence
 * 5. Writes final basket files per seed
 *
 * Usage: node scripts/phase5_merge_baskets.cjs <courseDir>
 *
 * Reads: <courseDir>/phase5_outputs/seed_sXXXX.json (one per seed)
 * Writes: <courseDir>/baskets/lego_baskets_sXXXX.json (one per seed)
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Extract Spanish words from phrase for validation
 */
function extractSpanishWords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[¿?¡!,;:.()[\]{}""«»]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Validate GATE compliance (all Spanish words in whitelist pairs)
 */
function validateGateCompliance(phrase, whitelistPairs, currentLego, legoId, phraseIndex) {
  const [english, spanish] = phrase;
  const words = extractSpanishWords(spanish);
  const violations = [];

  // Build a set of available Spanish words from whitelist pairs
  const availableWords = new Set(
    whitelistPairs.map(pair => pair[0].toLowerCase())
  );

  // Add the current LEGO being taught (always available)
  if (currentLego && currentLego.lego && currentLego.lego[1]) {
    const legoWords = extractSpanishWords(currentLego.lego[1]);
    legoWords.forEach(word => availableWords.add(word));
  }

  for (const word of words) {
    if (!availableWords.has(word)) {
      violations.push({
        lego: legoId,
        phrase: phraseIndex + 1,
        word: word,
        spanish: spanish,
        english: english
      });
    }
  }

  return violations;
}

/**
 * Validate phrase distribution (2-2-2-4 rule)
 */
function validateDistribution(distribution, legoId) {
  const errors = [];

  if (distribution.really_short_1_2 !== 2) {
    errors.push(`${legoId}: Short = ${distribution.really_short_1_2}, expected 2`);
  }
  if (distribution.quite_short_3 !== 2) {
    errors.push(`${legoId}: Quite short = ${distribution.quite_short_3}, expected 2`);
  }
  if (distribution.longer_4_5 !== 2) {
    errors.push(`${legoId}: Longer = ${distribution.longer_4_5}, expected 2`);
  }
  if (distribution.long_6_plus !== 4) {
    errors.push(`${legoId}: Long = ${distribution.long_6_plus}, expected 4`);
  }

  return errors;
}

/**
 * Validate final LEGO phrase #10 matches seed sentence
 */
function validateFinalLego(lego, seedPair, legoId) {
  if (!lego.is_final_lego) return null;

  const finalPhrase = lego.practice_phrases[9]; // Phrase #10 (0-indexed)
  if (!finalPhrase) {
    return `${legoId}: Missing phrase #10 (final LEGO)`;
  }

  const [englishPhrase, spanishPhrase] = finalPhrase;
  const expectedSeed = seedPair.known;

  // Normalize for comparison (remove punctuation, lowercase, trim)
  const normalizedPhrase = englishPhrase.replace(/[.!?]/g, '').trim().toLowerCase();
  const normalizedSeed = expectedSeed.replace(/[.!?]/g, '').trim().toLowerCase();

  if (normalizedPhrase !== normalizedSeed) {
    return {
      lego: legoId,
      error: "Final LEGO phrase #10 must match seed sentence",
      expected: expectedSeed,
      got: englishPhrase
    };
  }

  return null;
}

/**
 * Merge all seed outputs
 */
async function mergePhase5Baskets(courseDir) {
  console.log(`[Phase 5 Merge] Starting validation and merge for: ${courseDir}`);

  const outputsDir = path.join(courseDir, 'phase5_outputs');

  // Check if outputs directory exists
  if (!await fs.pathExists(outputsDir)) {
    throw new Error(`Phase 5 outputs directory not found: ${outputsDir}`);
  }

  // Read all seed output files
  const files = await fs.readdir(outputsDir);
  const seedFiles = files
    .filter(f => f.match(/^seed_S\d{4}_baskets\.json$/))
    .sort();

  if (seedFiles.length === 0) {
    throw new Error(`No seed output files found in ${outputsDir}`);
  }

  console.log(`[Phase 5 Merge] Found ${seedFiles.length} seed outputs`);

  // Load all seed outputs
  const seedData = await Promise.all(
    seedFiles.map(async (file) => {
      const filePath = path.join(outputsDir, file);
      const data = await fs.readJson(filePath);
      const legoCount = Object.keys(data.legos || {}).length;
      console.log(`[Phase 5 Merge] Loaded ${data.seed_id}: ${legoCount} LEGOs`);
      return data;
    })
  );

  // Collect statistics
  let totalSeeds = seedData.length;
  let totalLegos = 0;
  let totalPhrases = 0;

  for (const seed of seedData) {
    if (seed.legos) {
      const legoCount = Object.keys(seed.legos).length;
      totalLegos += legoCount;

      for (const lego of Object.values(seed.legos)) {
        if (lego.practice_phrases) {
          totalPhrases += lego.practice_phrases.length;
        }
      }
    }
  }

  console.log(`[Phase 5 Merge] Total seeds: ${totalSeeds}`);
  console.log(`[Phase 5 Merge] Total LEGOs: ${totalLegos}`);
  console.log(`[Phase 5 Merge] Total phrases: ${totalPhrases}`);

  // Validation
  console.log(`[Phase 5 Merge] Running validation...`);

  const gateViolations = [];
  const distributionErrors = [];
  const finalLegoErrors = [];
  const formatErrors = [];

  for (const seed of seedData) {
    const seedId = seed.seed_id;

    if (!seed.legos) {
      formatErrors.push(`${seedId}: Missing legos object`);
      continue;
    }

    for (const [legoId, lego] of Object.entries(seed.legos)) {
      // Validate format
      if (!lego.practice_phrases) {
        formatErrors.push(`${legoId}: Missing practice_phrases`);
        continue;
      }

      if (lego.practice_phrases.length !== 10) {
        formatErrors.push(`${legoId}: Expected 10 phrases, got ${lego.practice_phrases.length}`);
      }

      // Validate GATE compliance
      if (lego._metadata && lego._metadata.whitelist_pairs) {
        for (let i = 0; i < lego.practice_phrases.length; i++) {
          const violations = validateGateCompliance(
            lego.practice_phrases[i],
            lego._metadata.whitelist_pairs,
            lego,
            legoId,
            i
          );
          gateViolations.push(...violations);
        }
      }

      // Validate distribution
      if (lego.phrase_distribution) {
        const distErrors = validateDistribution(lego.phrase_distribution, legoId);
        distributionErrors.push(...distErrors);
      }

      // Validate final LEGO
      if (lego.is_final_lego) {
        const finalError = validateFinalLego(lego, seed.seed_pair, legoId);
        if (finalError) {
          finalLegoErrors.push(finalError);
        }
      }
    }
  }

  // Report validation results
  console.log(`\n[Phase 5 Merge] === VALIDATION RESULTS ===`);
  console.log(`Format errors: ${formatErrors.length}`);
  console.log(`GATE violations: ${gateViolations.length}`);
  console.log(`Distribution errors: ${distributionErrors.length}`);
  console.log(`Final LEGO errors: ${finalLegoErrors.length}`);

  if (formatErrors.length > 0) {
    console.log(`\n❌ FORMAT ERRORS (first 10):`);
    formatErrors.slice(0, 10).forEach(e => console.log(`  ${e}`));
  }

  if (gateViolations.length > 0) {
    console.log(`\n❌ GATE VIOLATIONS (first 10):`);
    gateViolations.slice(0, 10).forEach(v => {
      console.log(`  ${v.lego} phrase ${v.phrase}: "${v.word}" not in whitelist`);
      console.log(`    Spanish: "${v.spanish}"`);
      console.log(`    English: "${v.english}"`);
    });
    if (gateViolations.length > 10) {
      console.log(`  ... and ${gateViolations.length - 10} more violations`);
    }
  }

  if (distributionErrors.length > 0) {
    console.log(`\n⚠️  DISTRIBUTION ERRORS (first 10):`);
    distributionErrors.slice(0, 10).forEach(e => console.log(`  ${e}`));
  }

  if (finalLegoErrors.length > 0) {
    console.log(`\n❌ FINAL LEGO ERRORS (first 10):`);
    finalLegoErrors.slice(0, 10).forEach(e => {
      if (typeof e === 'string') {
        console.log(`  ${e}`);
      } else {
        console.log(`  ${e.lego}: ${e.error}`);
        console.log(`    Expected: "${e.expected}"`);
        console.log(`    Got:      "${e.got}"`);
      }
    });
  }

  // Decide pass/fail
  const criticalErrors = formatErrors.length + gateViolations.length + finalLegoErrors.length;

  if (criticalErrors > 0) {
    console.log(`\n❌ VALIDATION FAILED: ${criticalErrors} critical errors`);
    console.log(`\nPlease fix agent outputs and re-run merge.`);
    throw new Error(`Validation failed with ${criticalErrors} critical errors`);
  }

  if (distributionErrors.length > 0) {
    console.log(`\n⚠️  ${distributionErrors.length} distribution warnings (non-critical)`);
  }

  console.log(`\n✅ VALIDATION PASSED: All critical checks passed`);

  // Write individual basket files
  console.log(`\n[Phase 5 Merge] Writing individual basket files...`);

  const basketsDir = path.join(courseDir, 'baskets');
  await fs.ensureDir(basketsDir);

  let filesWritten = 0;

  for (const seed of seedData) {
    const seedId = seed.seed_id;
    // Build basket file structure (matching existing format)
    const basket = {
      version: "curated_v7_spanish",
      seed: seedId,
      course_direction: "Spanish for English speakers",
      mapping: "KNOWN (English) → TARGET (Spanish)",
      seed_pair: seed.seed_pair
    };

    // Add each LEGO at root level (matching existing format)
    for (const [legoId, lego] of Object.entries(seed.legos)) {
      basket[legoId] = {
        lego: lego.lego,
        type: lego.type,
        available_legos: lego.available_legos,
        practice_phrases: lego.practice_phrases,
        phrase_distribution: lego.phrase_distribution,
        gate_compliance: "STRICT - All words from taught LEGOs only"
      };

      // Add is_final_lego flag if true
      if (lego.is_final_lego) {
        basket[legoId].full_seed_included = "YES - phrase 10";
      }
    }

    // Write file
    const seedNum = String(parseInt(seedId.substring(1))).padStart(4, '0');
    const basketPath = path.join(basketsDir, `lego_baskets_s${seedNum}.json`);
    await fs.writeJson(basketPath, basket, { spaces: 2 });

    filesWritten++;
  }

  console.log(`[Phase 5 Merge] ✅ Wrote ${filesWritten} basket files`);

  console.log(`\n[Phase 5 Merge] ✅ Merge complete!`);
  console.log(`Output directory: ${basketsDir}`);

  return {
    success: true,
    totalSeeds,
    totalLegos,
    totalPhrases,
    basketsDir,
    validation: {
      passed: true,
      formatErrors: formatErrors.length,
      gateViolations: gateViolations.length,
      distributionWarnings: distributionErrors.length,
      finalLegoErrors: finalLegoErrors.length
    }
  };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/phase5_merge_baskets.cjs <courseDir>');
    console.error('Example: node scripts/phase5_merge_baskets.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  mergePhase5Baskets(courseDir)
    .then(result => {
      console.log(`\n✅ Phase 5 merge complete!`);
      console.log(`   Total seeds: ${result.totalSeeds}`);
      console.log(`   Total LEGOs: ${result.totalLegos}`);
      console.log(`   Total phrases: ${result.totalPhrases}`);
      console.log(`   Baskets directory: ${result.basketsDir}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Merge failed:', error.message);
      process.exit(1);
    });
}

module.exports = { mergePhase5Baskets };
