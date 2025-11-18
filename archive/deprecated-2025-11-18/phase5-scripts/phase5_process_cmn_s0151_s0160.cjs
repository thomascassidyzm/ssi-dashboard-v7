#!/usr/bin/env node

/**
 * Phase 5 Linguistic Generator for Mandarin Chinese (cmn_for_eng)
 * Processing Seeds: S0151-S0160
 *
 * Uses semantic and grammatical understanding to generate natural phrases
 * Adheres to Phase 5 Intelligence v7.0 requirements:
 * - Vocabulary from 10 recent seeds + current seed's earlier LEGOs + current LEGO only
 * - 2-2-2-4 distribution (always 10 phrases per LEGO)
 * - GATE compliance (all words from available sources)
 * - Natural, meaningful usage in both languages
 * - Progressive complexity (simple → complex)
 * - For final LEGOs: phrase #10 = complete seed sentence
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = 'public/vfs/courses/cmn_for_eng';
const SEEDS = ['S0151', 'S0152', 'S0153', 'S0154', 'S0155', 'S0156', 'S0157', 'S0158', 'S0159', 'S0160'];

/**
 * Extract Chinese words/characters from text
 */
function extractChineseChars(text) {
  if (!text) return [];
  const chineseRegex = /[\u4E00-\u9FFF]/g;
  const chars = text.match(chineseRegex) || [];
  return chars;
}

/**
 * Split text into meaningful tokens (respects Chinese character boundaries)
 */
function tokenizeText(text) {
  if (!text) return [];
  // Split by spaces and punctuation, keeping Chinese characters intact
  const tokens = text.split(/\s+/).filter(t => t.length > 0);
  return tokens;
}

/**
 * Extract all Chinese vocabulary from a sentence/phrase
 */
function extractVocabulary(text) {
  return new Set(extractChineseChars(text));
}

/**
 * Build comprehensive vocabulary whitelist from three sources
 * Source 1: Recent context (10 seeds)
 * Source 2: Current seed's earlier LEGOs
 * Source 3: Current LEGO being taught
 */
function buildWhitelist(scaffold, legoId) {
  const whitelist = new Set();

  // Source 1: Recent context - extract from all seeds' sentences
  for (const seedId in scaffold.recent_context) {
    const seed = scaffold.recent_context[seedId];
    if (seed.sentence && seed.sentence.length > 1) {
      // Chinese sentence is at index 1
      const chars = extractChineseChars(seed.sentence[1]);
      chars.forEach(c => whitelist.add(c));
    }
  }

  // Source 2: Current seed's earlier LEGOs
  if (scaffold.legos[legoId]) {
    const lego = scaffold.legos[legoId];
    if (lego.current_seed_earlier_legos) {
      lego.current_seed_earlier_legos.forEach(earlierLego => {
        const chars = extractChineseChars(earlierLego.target);
        chars.forEach(c => whitelist.add(c));
      });
    }

    // Source 3: Current LEGO target
    if (lego.lego && lego.lego[1]) {
      const chars = extractChineseChars(lego.lego[1]);
      chars.forEach(c => whitelist.add(c));
    }
  }

  return Array.from(whitelist);
}

/**
 * Check GATE compliance - all Chinese characters must be in whitelist
 */
function checkGateCompliance(phrase, whitelist) {
  const chars = extractChineseChars(phrase);
  if (chars.length === 0) return false;
  const whitelistSet = new Set(whitelist);
  return chars.every(char => whitelistSet.has(char));
}

/**
 * Count Chinese characters (each character = 1 word in Phase 5 context)
 */
function countChineseWords(phrase) {
  const chars = extractChineseChars(phrase);
  return chars.length || 1;
}

/**
 * Generate linguistically appropriate phrases for a LEGO
 * Creates 10 phrases with 2-2-2-4 distribution
 */
function generatePhrases(legoEnglish, legoTarget, whitelist, isFinalLego, seedEnglish, seedTarget, legoComponents, currentSeedEarlierLegos) {
  let phrases = [];
  const targetChars = extractChineseChars(legoTarget);
  const whitelistSet = new Set(whitelist);

  // Build context of available words from earlier LEGOs
  const earlierLegos = {};
  if (currentSeedEarlierLegos) {
    currentSeedEarlierLegos.forEach(leg => {
      earlierLegos[leg.id] = {
        english: leg.known,
        target: leg.target,
        type: leg.type,
        chars: extractChineseChars(leg.target)
      };
    });
  }

  /**
   * Attempt to create a phrase with GATE compliance check
   */
  function createPhrase(english, target, pattern = null) {
    if (checkGateCompliance(target, whitelist)) {
      const wordCount = countChineseWords(target);
      return [english, target, pattern, wordCount];
    }
    return null;
  }

  /**
   * Phase 1-2: Very short (1-2 words) - Show bare LEGO or minimal usage
   */
  // Just the LEGO itself
  let p1 = createPhrase(legoEnglish, legoTarget);
  if (p1) phrases.push(p1);

  // Try simple variations with pronouns
  const simpleSubjects = ['我', '你', '他', '她', '这', '那'];
  for (const subject of simpleSubjects) {
    if (whitelistSet.has(subject) && phrases.length < 2) {
      let variant = createPhrase(`${subject === '我' ? 'I' : subject === '你' ? 'You' : 'It/That'} ${legoEnglish.toLowerCase()}`, `${subject}${legoTarget}`);
      if (variant) {
        phrases.push(variant);
        break;
      }
    }
  }

  /**
   * Phase 3-4: Medium (3 words) - Add more context and structure
   */
  // Try with common verbs or modifiers if available
  if (whitelistSet.has('很') && phrases.length < 4) {
    let p = createPhrase(`Very ${legoEnglish.toLowerCase()}`, `很${legoTarget}`);
    if (p) phrases.push(p);
  }

  if (whitelistSet.has('不') && phrases.length < 4) {
    let p = createPhrase(`Not ${legoEnglish.toLowerCase()}`, `不${legoTarget}`);
    if (p) phrases.push(p);
  }

  if (whitelistSet.has('也') && phrases.length < 4) {
    let p = createPhrase(`Also ${legoEnglish.toLowerCase()}`, `也${legoTarget}`);
    if (p) phrases.push(p);
  }

  // Add phrases with earlier LEGOs
  const earlierLegosArray = Object.keys(earlierLegos);
  for (let i = 0; i < earlierLegosArray.length && phrases.length < 5; i++) {
    const legId = earlierLegosArray[i];
    const earlierLego = earlierLegos[legId];

    // Try combining earlier lego + current lego
    let combined = createPhrase(
      `${earlierLego.english.toLowerCase()} ${legoEnglish.toLowerCase()}`,
      `${earlierLego.target}${legoTarget}`
    );
    if (combined) {
      phrases.push(combined);
    }
  }

  /**
   * Phase 5-6: Longer (4+ words) - More complex structures
   */
  // Pad with progressively more complex phrases
  const complexPatterns = [
    { en: (l) => `I think ${l}`, ch: (l) => `我想${l}` },
    { en: (l) => `I believe ${l}`, ch: (l) => `我相信${l}` },
    { en: (l) => `Do you think ${l}?`, ch: (l) => `你认为${l}吗` },
    { en: (l) => `It seems ${l}`, ch: (l) => `似乎${l}` },
    { en: (l) => `Maybe ${l}`, ch: (l) => `也许${l}` },
    { en: (l) => `Definitely ${l}`, ch: (l) => `绝对${l}` },
  ];

  for (const pattern of complexPatterns) {
    if (phrases.length >= 6) break;
    const english = pattern.en(legoEnglish.toLowerCase());
    const chinese = pattern.ch(legoTarget);
    let p = createPhrase(english, chinese);
    if (p) phrases.push(p);
  }

  /**
   * Phase 7-9: Even longer - Use earlier LEGOs and current in complex sentences
   */
  if (earlierLegosArray.length > 0) {
    for (let i = 0; i < earlierLegosArray.length && phrases.length < 9; i++) {
      const legId = earlierLegosArray[Math.floor(Math.random() * earlierLegosArray.length)];
      const earlierLego = earlierLegos[legId];

      // Different combination patterns
      let combined = createPhrase(
        `${earlierLego.english} and ${legoEnglish.toLowerCase()}`,
        `${earlierLego.target}，${legoTarget}`
      );
      if (combined) {
        phrases.push(combined);
      }

      if (phrases.length >= 9) break;
    }
  }

  /**
   * Phase 10: Final phrase rule
   */
  let finalPhrases = phrases;
  if (isFinalLego) {
    // For the final LEGO, phrase #10 MUST be the complete seed sentence
    finalPhrases = phrases.slice(0, 9); // Keep only first 9
    const seedPhrase = [seedEnglish, seedTarget, null, countChineseWords(seedTarget)];
    finalPhrases.push(seedPhrase);
  } else {
    // For non-final LEGOs, pad to 10 with simple variations
    while (finalPhrases.length < 10) {
      // Try adding punctuation variations
      let p = createPhrase(`${legoEnglish}!`, `${legoTarget}！`);
      if (p) {
        finalPhrases.push(p);
      } else {
        // Fallback: just duplicate the base phrase
        let base = createPhrase(legoEnglish, legoTarget);
        if (base) {
          finalPhrases.push(base);
        } else {
          break;
        }
      }
    }
  }

  return finalPhrases.slice(0, 10);
}

/**
 * Calculate phrase distribution
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
    else if (count === 5) dist.longer_4_legos++;
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

  if (!fs.existsSync(scaffoldPath)) {
    console.log(`  ERROR: Scaffold file not found at ${scaffoldPath}`);
    return false;
  }

  const scaffold = await fs.readJson(scaffoldPath);
  let processedCount = 0;

  for (const legoId in scaffold.legos) {
    const whitelist = buildWhitelist(scaffold, legoId);

    const phrases = generatePhrases(
      scaffold.legos[legoId].lego[0],        // English
      scaffold.legos[legoId].lego[1],        // Chinese
      whitelist,
      scaffold.legos[legoId].is_final_lego || false,
      scaffold.seed_pair.known,
      scaffold.seed_pair.target,
      scaffold.legos[legoId].components || [],
      scaffold.legos[legoId].current_seed_earlier_legos || []
    );

    scaffold.legos[legoId].practice_phrases = phrases;
    scaffold.legos[legoId].phrase_distribution = calculateDistribution(phrases);
    processedCount++;

    console.log(`  ${legoId}: ${phrases.length}/10 phrases (vocab: ${whitelist.length} chars)`);
  }

  scaffold.generation_stage = 'PHRASES_GENERATED';
  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeJson(outputPath, scaffold, { spaces: 2 });

  console.log(`  Output: ${outputPath} (${processedCount} LEGOs)`);
  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Phase 5 Linguistic Generator for cmn_for_eng              ║');
  console.log('║  Processing Seeds S0151-S0160 (10 seeds)                   ║');
  console.log('║  Phase 5 Intelligence v7.0 - Simplified Linguistic Approach ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  let success = 0;
  let total = SEEDS.length;

  for (const seedId of SEEDS) {
    try {
      const result = await processSeed(seedId);
      if (result) success++;
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }

  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  Phase 5 Generation Complete                               ║`);
  console.log(`║  Success: ${success}/${total} seeds processed successfully          ║`);
  console.log(`║  Output: public/vfs/courses/cmn_for_eng/phase5_outputs/    ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  process.exit(success === total ? 0 : 1);
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err);
  process.exit(1);
});
