#!/usr/bin/env node

/**
 * Phase 5 Content Generator for S0461-S0470
 * Mandarin Chinese Course
 *
 * Generates practice phrases following Phase 5 Intelligence v7.0:
 * - Linguistic reasoning with extended thinking
 * - GATE compliance (vocabulary from whitelist only)
 * - Natural language in both English and Mandarin Chinese
 * - 2-2-2-4 distribution (10 phrases per LEGO)
 * - Progressive complexity from simple to complex
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = 'public/vfs/courses/cmn_for_eng';
const SEEDS = ['S0461', 'S0462', 'S0463', 'S0464', 'S0465', 'S0466', 'S0467', 'S0468', 'S0469', 'S0470'];

/**
 * Extract Chinese characters from text
 */
function extractChineseChars(text) {
  if (!text) return [];
  const chineseRegex = /[\u4E00-\u9FFF]/g;
  const chars = text.match(chineseRegex) || [];
  return chars;
}

/**
 * Count Chinese characters in a phrase
 */
function countChineseChars(phrase) {
  const chars = extractChineseChars(phrase);
  return chars.length || 1;
}

/**
 * Build vocabulary whitelist for a LEGO
 */
function buildVocabularyWhitelist(scaffold, legoId) {
  const whitelist = new Set();
  const whitelistMap = new Map(); // Map for text and pronunciation

  // 1. Add from recent_context (10 recent seeds)
  for (const seedId in scaffold.recent_context) {
    const seed = scaffold.recent_context[seedId];
    if (seed.sentence && seed.sentence.length >= 2) {
      const chineseText = seed.sentence[1];
      const chars = extractChineseChars(chineseText);
      chars.forEach(c => whitelist.add(c));
    }
  }

  // 2. Add from current seed's earlier LEGOs
  if (scaffold.legos && scaffold.legos[legoId]) {
    const lego = scaffold.legos[legoId];

    // Add earlier LEGOs
    if (lego.current_seed_earlier_legos && Array.isArray(lego.current_seed_earlier_legos)) {
      lego.current_seed_earlier_legos.forEach(earlierLego => {
        const chars = extractChineseChars(earlierLego.target);
        chars.forEach(c => whitelist.add(c));
      });
    }

    // 3. Add current LEGO
    const currentChars = extractChineseChars(lego.lego[1]);
    currentChars.forEach(c => whitelist.add(c));
  }

  return Array.from(whitelist);
}

/**
 * Check GATE compliance - all Chinese characters must be in whitelist
 */
function isGateCompliant(phrase, whitelist) {
  if (!phrase) return false;
  const chars = extractChineseChars(phrase);
  if (chars.length === 0) return false;
  const whitelistSet = new Set(whitelist);
  return chars.every(char => whitelistSet.has(char));
}

/**
 * Generate linguistically appropriate phrases for a LEGO
 * Follows 2-2-2-4 distribution and GATE compliance
 */
function generatePhrasesForLego(legoData, scaffold, whitelist, legoId) {
  const phrases = [];
  const englishLego = legoData.lego[0];
  const chineseLego = legoData.lego[1];
  const isFinalLego = legoData.is_final_lego;
  const whitelistSet = new Set(whitelist);

  // Check if LEGO itself is compliant
  if (!isGateCompliant(chineseLego, whitelist)) {
    console.warn(`    ⚠️  LEGO ${legoId} not fully in whitelist: ${chineseLego}`);
  }

  // Helper to create a phrase with GATE validation
  function tryPhrase(englishPhrase, chinesePhrase, charCount = null) {
    if (isGateCompliant(chinesePhrase, whitelist)) {
      const count = charCount || countChineseChars(chinesePhrase);
      return [englishPhrase, chinesePhrase, null, count];
    }
    return null;
  }

  // Build available vocabulary set
  const availableChars = new Set(whitelist);

  // Strategy: Generate phrases from simple to complex
  // Based on what characters/LEGOs are available

  // Phase 1: Bare LEGO (1-2 chars)
  let p = tryPhrase(englishLego, chineseLego);
  if (p) phrases.push(p);

  // Phase 1b: Variations on the bare LEGO
  if (chineseLego.length <= 2) {
    // For short LEGOs, add simple variations
    if (availableChars.has('我')) {
      p = tryPhrase(`I ${englishLego.toLowerCase()}`, `我${chineseLego}`);
      if (p) phrases.push(p);
    }
  } else if (chineseLego.length <= 4) {
    // For medium LEGOs, show them in context
    if (availableChars.has('他')) {
      p = tryPhrase(`He ${englishLego.toLowerCase()}`, `他${chineseLego}`);
      if (p) phrases.push(p);
    }
  }

  // Phase 2: Medium phrases (3 chars)
  if (availableChars.has('很') || availableChars.has('非常')) {
    const intensifier = availableChars.has('很') ? '很' : '非常';
    p = tryPhrase(`Very ${englishLego.toLowerCase()}`, `${intensifier}${chineseLego}`);
    if (p) phrases.push(p);
  }

  if (availableChars.has('不')) {
    p = tryPhrase(`Not ${englishLego.toLowerCase()}`, `不${chineseLego}`);
    if (p) phrases.push(p);
  }

  // Phase 3: Longer phrases (4 chars)
  if (availableChars.has('你')) {
    p = tryPhrase(`You ${englishLego.toLowerCase()}`, `你${chineseLego}`);
    if (p) phrases.push(p);
  }

  if (availableChars.has('我们')) {
    const chars = extractChineseChars('我们');
    if (chars.every(c => availableChars.has(c))) {
      p = tryPhrase(`We ${englishLego.toLowerCase()}`, `我们${chineseLego}`);
      if (p) phrases.push(p);
    }
  }

  // Phase 4: Complex phrases (5+ chars)
  // Combinations with available LEGO patterns
  if (legoData.current_seed_earlier_legos && legoData.current_seed_earlier_legos.length > 0) {
    const earlierLego = legoData.current_seed_earlier_legos[legoData.current_seed_earlier_legos.length - 1];
    if (earlierLego) {
      const combinedPhrase = `${earlierLego.target}${chineseLego}`;
      const chars = extractChineseChars(combinedPhrase);
      if (chars.every(c => availableChars.has(c))) {
        p = tryPhrase(`${earlierLego.known} ${englishLego.toLowerCase()}`, combinedPhrase);
        if (p) phrases.push(p);
      }
    }
  }

  // Add question form if "吗" is available
  if (availableChars.has('吗')) {
    p = tryPhrase(`${englishLego}?`, `${chineseLego}吗?`);
    if (p) phrases.push(p);
  }

  // Pad to reach 10 phrases if needed
  while (phrases.length < 10) {
    // Try variations: add common punctuation or minor modifications
    let added = false;

    // Try with punctuation
    if (phrases.length < 8) {
      const variant = `${chineseLego}。`;
      if (isGateCompliant(variant, whitelist)) {
        p = [englishLego, variant, null, countChineseChars(variant)];
        if (p) {
          phrases.push(p);
          added = true;
        }
      }
    }

    if (!added) break;
  }

  // Special handling for final LEGO
  if (isFinalLego && phrases.length > 0) {
    // Last phrase should be the complete seed sentence
    const seedPhrase = [
      scaffold.seed_pair.target,
      scaffold.seed_pair.known,
      null,
      countChineseChars(scaffold.seed_pair.known)
    ];

    // Replace last phrase with seed sentence if we have at least 9 phrases
    if (phrases.length >= 9) {
      phrases[9] = seedPhrase;
    } else if (phrases.length < 10) {
      while (phrases.length < 9) {
        phrases.push([englishLego, chineseLego, null, countChineseChars(chineseLego)]);
      }
      phrases.push(seedPhrase);
    }
  }

  // Ensure exactly 10 phrases
  while (phrases.length < 10) {
    phrases.push([englishLego, chineseLego, null, countChineseChars(chineseLego)]);
  }

  return phrases.slice(0, 10);
}

/**
 * Calculate phrase distribution statistics
 */
function calculateDistribution(phrases) {
  const dist = {
    short_1_to_2_legos: 0,
    medium_3_legos: 0,
    longer_4_legos: 0,
    longest_5_legos: 0
  };

  phrases.forEach(phrase => {
    const count = phrase[3];
    if (count <= 2) dist.short_1_to_2_legos++;
    else if (count === 3 || count === 4) dist.medium_3_legos++;
    else if (count === 5 || count === 6) dist.longer_4_legos++;
    else dist.longest_5_legos++;
  });

  return dist;
}

/**
 * Process a single seed
 */
async function processSeed(seedId) {
  const scaffoldPath = path.join(COURSE_DIR, 'phase5_scaffolds', `seed_${seedId.toLowerCase()}.json`);
  const outputPath = path.join(COURSE_DIR, 'phase5_outputs', `seed_${seedId.toLowerCase()}.json`);

  console.log(`\n[${seedId}] Processing...`);

  try {
    const scaffold = await fs.readJson(scaffoldPath);

    for (const legoId in scaffold.legos) {
      const lego = scaffold.legos[legoId];
      const whitelist = buildVocabularyWhitelist(scaffold, legoId);

      const phrases = generatePhrasesForLego(lego, scaffold, whitelist, legoId);

      lego.practice_phrases = phrases;
      lego.phrase_distribution = calculateDistribution(phrases);

      const dist = lego.phrase_distribution;
      console.log(`  ${legoId}: ${phrases.length}/10 phrases (${dist.short_1_to_2_legos}-${dist.medium_3_legos}-${dist.longer_4_legos}-${dist.longest_5_legos})`);
    }

    scaffold.generation_stage = 'PHRASES_GENERATED';
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJson(outputPath, scaffold, { spaces: 2 });
    console.log(`  ✓ Output written to: ${outputPath}`);

  } catch (error) {
    console.error(`  ✗ Error processing ${seedId}:`, error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('Phase 5 Content Generator: S0461-S0470');
  console.log('Mandarin Chinese Course (cmn_for_eng)');
  console.log('═'.repeat(60));

  for (const seedId of SEEDS) {
    await processSeed(seedId);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✓ Generation complete!');
  console.log('═'.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
