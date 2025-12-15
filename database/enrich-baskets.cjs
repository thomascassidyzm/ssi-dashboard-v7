#!/usr/bin/env node
/**
 * Basket Enrichment Script
 *
 * Adds word_count, lego_count, and position to existing practice phrases
 * in lego_baskets.json WITHOUT regenerating through Phase 3.
 *
 * Usage:
 *   node database/enrich-baskets.cjs <course_code> [--dry-run]
 *
 * Example:
 *   node database/enrich-baskets.cjs spa_for_eng_v2 --dry-run
 *   node database/enrich-baskets.cjs spa_for_eng_v2
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const COURSE_CODE = process.argv[2];
const DRY_RUN = process.argv.includes('--dry-run');

if (!COURSE_CODE) {
  console.error('Usage: node database/enrich-baskets.cjs <course_code> [--dry-run]');
  console.error('Example: node database/enrich-baskets.cjs spa_for_eng_v2');
  process.exit(1);
}

const COURSES_DIR = path.join(__dirname, '..', 'public', 'vfs', 'courses', COURSE_CODE);
const LEGO_PAIRS_PATH = path.join(COURSES_DIR, 'lego_pairs.json');
const LEGO_BASKETS_PATH = path.join(COURSES_DIR, 'lego_baskets.json');
const OUTPUT_PATH = DRY_RUN
  ? path.join(COURSES_DIR, 'lego_baskets_enriched_preview.json')
  : LEGO_BASKETS_PATH;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Count words in a text string.
 * Uses simple whitespace splitting after trimming.
 * @param {string} text - The text to count words in
 * @returns {number} - Word count
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

/**
 * Check if a phrase contains a LEGO's target text.
 * Uses case-insensitive word boundary matching.
 * @param {string} phraseTarget - The phrase's target text
 * @param {string} legoTarget - The LEGO's target text
 * @returns {boolean} - True if the LEGO appears in the phrase
 */
function phraseContainsLego(phraseTarget, legoTarget) {
  if (!phraseTarget || !legoTarget) return false;

  // Normalize both strings: lowercase, trim
  const normalizedPhrase = phraseTarget.toLowerCase().trim();
  const normalizedLego = legoTarget.toLowerCase().trim();

  // Check if the LEGO text appears in the phrase
  // This handles multi-word LEGOs like "estoy intentando"
  return normalizedPhrase.includes(normalizedLego);
}

/**
 * Count how many LEGOs from a seed appear in a phrase.
 * @param {string} phraseTarget - The phrase's target text
 * @param {Array} legoTargets - Array of LEGO target texts from the seed
 * @returns {number} - Count of matching LEGOs
 */
function countLegosInPhrase(phraseTarget, legoTargets) {
  if (!phraseTarget || !Array.isArray(legoTargets)) return 0;

  let count = 0;
  for (const legoTarget of legoTargets) {
    if (phraseContainsLego(phraseTarget, legoTarget)) {
      count++;
    }
  }
  return count;
}

/**
 * Parse seed number from lego_id (e.g., "S0010L01" -> 10)
 * @param {string} legoId - The LEGO ID
 * @returns {number} - Seed number
 */
function parseSeedNumber(legoId) {
  // Format: S####L## where #### is 4-digit seed number
  const seedPart = legoId.substring(1, 5); // Get "0010" from "S0010L01"
  return parseInt(seedPart, 10);
}

/**
 * Parse lego index from lego_id (e.g., "S0010L01" -> 1)
 * @param {string} legoId - The LEGO ID
 * @returns {number} - LEGO index
 */
function parseLegoIndex(legoId) {
  // Format: S####L## where ## is 2-digit lego index
  const legoPart = legoId.substring(6); // Get "01" from "S0010L01"
  return parseInt(legoPart, 10);
}

/**
 * Get seed ID from lego_id (e.g., "S0010L01" -> "S0010")
 * @param {string} legoId - The LEGO ID
 * @returns {string} - Seed ID
 */
function getSeedIdFromLegoId(legoId) {
  return legoId.substring(0, 5); // Get "S0010" from "S0010L01"
}

// =============================================================================
// MAIN LOGIC
// =============================================================================

function main() {
  console.log('='.repeat(70));
  console.log('BASKET ENRICHMENT SCRIPT');
  console.log('='.repeat(70));
  console.log(`Course: ${COURSE_CODE}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'LIVE (will modify files)'}`);
  console.log('');

  // -------------------------------------------------------------------------
  // 1. Load input files
  // -------------------------------------------------------------------------

  console.log('Loading input files...');

  if (!fs.existsSync(LEGO_PAIRS_PATH)) {
    console.error(`ERROR: lego_pairs.json not found at ${LEGO_PAIRS_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(LEGO_BASKETS_PATH)) {
    console.error(`ERROR: lego_baskets.json not found at ${LEGO_BASKETS_PATH}`);
    process.exit(1);
  }

  const legoPairs = JSON.parse(fs.readFileSync(LEGO_PAIRS_PATH, 'utf-8'));
  const legoBaskets = JSON.parse(fs.readFileSync(LEGO_BASKETS_PATH, 'utf-8'));

  console.log(`  - lego_pairs.json: ${legoPairs.seeds.length} seeds`);
  console.log(`  - lego_baskets.json: ${Object.keys(legoBaskets.baskets).length} baskets`);
  console.log('');

  // -------------------------------------------------------------------------
  // 2. Build LEGO lookup by seed
  // -------------------------------------------------------------------------

  console.log('Building LEGO lookup index...');

  // Map: seedId -> array of LEGO target texts
  const legosBySeed = new Map();

  for (const seed of legoPairs.seeds) {
    const seedId = seed.seed_id;
    const legoTargets = seed.legos.map(lego => lego.lego.target);
    legosBySeed.set(seedId, legoTargets);
  }

  console.log(`  - Indexed ${legosBySeed.size} seeds with their LEGOs`);
  console.log('');

  // -------------------------------------------------------------------------
  // 3. Enrich each basket's practice phrases
  // -------------------------------------------------------------------------

  console.log('Enriching practice phrases...');

  let totalPhrases = 0;
  let enrichedPhrases = 0;
  let skippedBaskets = 0;

  const enrichedBaskets = { ...legoBaskets };

  for (const [legoId, basket] of Object.entries(enrichedBaskets.baskets)) {
    // Get the seed ID for this basket
    const seedId = getSeedIdFromLegoId(legoId);

    // Get all LEGO targets for this seed
    const legoTargets = legosBySeed.get(seedId);

    if (!legoTargets) {
      console.warn(`  WARNING: No LEGOs found for seed ${seedId} (basket ${legoId})`);
      skippedBaskets++;
      continue;
    }

    // Enrich each practice phrase
    if (basket.practice_phrases && Array.isArray(basket.practice_phrases)) {
      basket.practice_phrases = basket.practice_phrases.map((phrase, index) => {
        totalPhrases++;
        enrichedPhrases++;

        return {
          ...phrase,
          word_count: countWords(phrase.target),
          lego_count: countLegosInPhrase(phrase.target, legoTargets),
          position: index + 1  // 1-based position
        };
      });
    }
  }

  console.log(`  - Processed ${Object.keys(enrichedBaskets.baskets).length} baskets`);
  console.log(`  - Enriched ${enrichedPhrases} phrases`);
  if (skippedBaskets > 0) {
    console.log(`  - Skipped ${skippedBaskets} baskets (no matching seed)`);
  }
  console.log('');

  // -------------------------------------------------------------------------
  // 4. Show sample output
  // -------------------------------------------------------------------------

  console.log('Sample enriched phrases:');
  console.log('-'.repeat(70));

  // Get first 3 baskets with phrases
  const sampleBaskets = Object.entries(enrichedBaskets.baskets)
    .filter(([_, b]) => b.practice_phrases && b.practice_phrases.length > 0)
    .slice(0, 2);

  for (const [legoId, basket] of sampleBaskets) {
    console.log(`\n${legoId}:`);
    // Show first 3 phrases from each basket
    for (const phrase of basket.practice_phrases.slice(0, 3)) {
      console.log(`  "${phrase.target}"`);
      console.log(`    word_count: ${phrase.word_count}, lego_count: ${phrase.lego_count}, position: ${phrase.position}`);
    }
    if (basket.practice_phrases.length > 3) {
      console.log(`  ... and ${basket.practice_phrases.length - 3} more phrases`);
    }
  }

  console.log('');
  console.log('-'.repeat(70));

  // -------------------------------------------------------------------------
  // 5. Write output
  // -------------------------------------------------------------------------

  if (DRY_RUN) {
    console.log(`\nDRY RUN: Writing preview to ${path.basename(OUTPUT_PATH)}`);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(enrichedBaskets, null, 2));
    console.log('Preview file created. Review it and run without --dry-run to apply.');
  } else {
    // Backup original first
    const backupPath = LEGO_BASKETS_PATH.replace('.json', '_backup.json');
    console.log(`\nCreating backup at ${path.basename(backupPath)}`);
    fs.copyFileSync(LEGO_BASKETS_PATH, backupPath);

    console.log(`Writing enriched baskets to ${path.basename(OUTPUT_PATH)}`);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(enrichedBaskets, null, 2));
    console.log('Done! Original backed up, enriched version saved.');
  }

  // -------------------------------------------------------------------------
  // 6. Summary statistics
  // -------------------------------------------------------------------------

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Total baskets: ${Object.keys(enrichedBaskets.baskets).length}`);
  console.log(`  Total phrases enriched: ${enrichedPhrases}`);
  console.log(`  Fields added: word_count, lego_count, position`);
  console.log('');

  // Calculate some stats
  const allPhrases = Object.values(enrichedBaskets.baskets)
    .flatMap(b => b.practice_phrases || []);

  if (allPhrases.length > 0) {
    const wordCounts = allPhrases.map(p => p.word_count);
    const legoCounts = allPhrases.map(p => p.lego_count);

    console.log('Word count distribution:');
    console.log(`  Min: ${Math.min(...wordCounts)}, Max: ${Math.max(...wordCounts)}, Avg: ${(wordCounts.reduce((a,b) => a+b, 0) / wordCounts.length).toFixed(1)}`);

    console.log('LEGO count distribution:');
    console.log(`  Min: ${Math.min(...legoCounts)}, Max: ${Math.max(...legoCounts)}, Avg: ${(legoCounts.reduce((a,b) => a+b, 0) / legoCounts.length).toFixed(1)}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(DRY_RUN ? 'DRY RUN COMPLETE' : 'ENRICHMENT COMPLETE');
  console.log('='.repeat(70));
}

// Run
main();
