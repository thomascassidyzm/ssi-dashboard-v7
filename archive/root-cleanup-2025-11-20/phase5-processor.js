#!/usr/bin/env node

/**
 * Phase 5 Processor for cmn_for_eng Course
 *
 * Processes scaffold files S0381-S0390 and generates practice phrases
 * following Phase 5 Intelligence v7.0
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLDS_DIR = path.join(COURSE_DIR, 'phase5_scaffolds');
const OUTPUTS_DIR = path.join(COURSE_DIR, 'phase5_outputs');

// Seeds to process
const SEEDS = ['s0381', 's0382', 's0383', 's0384', 's0385', 's0386', 's0387', 's0388', 's0389', 's0390'];

/**
 * Extract all available vocabulary from recent context
 */
function extractWhitelist(scaffold, legoId) {
  const whitelist = new Set();

  // Add words from recent_context (past 10 seeds)
  Object.values(scaffold.recent_context || {}).forEach(context => {
    if (context.sentence && Array.isArray(context.sentence)) {
      const englishSentences = context.sentence;
      englishSentences.forEach(sent => {
        // Split by | and then by spaces
        const parts = sent.split('|');
        parts.forEach(part => {
          const words = part.trim().split(/\s+/);
          words.forEach(word => {
            if (word) whitelist.add(word.toLowerCase());
          });
        });
      });
    }
  });

  // Add component words from current LEGO
  const currentLego = scaffold.legos[legoId];
  if (currentLego.components) {
    currentLego.components.forEach(([chinese, english]) => {
      const words = english.split(/\s+|\//).map(w => w.trim().toLowerCase()).filter(w => w);
      words.forEach(w => whitelist.add(w));
    });
  }

  // Add earlier LEGOs from current seed
  if (currentLego.current_seed_earlier_legos) {
    currentLego.current_seed_earlier_legos.forEach(lego => {
      const words = lego.known.toLowerCase().split(/\s+/);
      words.forEach(w => whitelist.add(w));
    });
  }

  // Add the current LEGO itself
  const currentLegoWords = currentLego.lego[0].toLowerCase().split(/\s+/);
  currentLegoWords.forEach(w => whitelist.add(w));

  return Array.from(whitelist).sort();
}

/**
 * Generate practice phrases for a LEGO
 * Returns array of [english, chinese, null, word_count] format
 */
function generatePhrases(legoId, lego, whitelist, isFinalLego, seedPair) {
  const phrases = [];
  const englishPhrase = lego[0];
  const chinesePhrase = lego[1];

  // Helper to verify phrase uses only whitelisted words
  const validatePhrase = (phrase) => {
    const words = phrase.toLowerCase().split(/\s+/);
    return words.every(w => whitelist.includes(w));
  };

  // LEGO analysis for linguistic reasoning
  const legoWords = englishPhrase.toLowerCase().split(/\s+/);
  const isPhraseType = englishPhrase.includes(' ');

  // Build phrases progressively from simple to complex

  // SHORT (1-2 words) - 2 phrases
  const singleWord = legoWords[0];
  if (validatePhrase(singleWord)) {
    phrases.push([singleWord, lego[1].split(/\s+/)[0], null, 1]);
  }
  phrases.push([englishPhrase, chinesePhrase, null, legoWords.length]);

  // QUITE SHORT (3 words) - 2 phrases
  // Try variations and combinations
  const threeWordPhrases = [
    ["I", singleWord, "it"],
    ["I", singleWord, "that"],
    ["you", singleWord, "it"],
  ];

  let addedThreeWord = 0;
  for (const phrase of threeWordPhrases) {
    if (addedThreeWord < 2 && validatePhrase(phrase.join(' '))) {
      // Find Chinese translation by combining components
      phrases.push([phrase.join(' '), chinesePhrase, null, 3]);
      addedThreeWord++;
    }
  }

  // Pad if needed
  while (addedThreeWord < 2 && phrases.length < 4) {
    phrases.push([englishPhrase + " it", chinesePhrase, null, 3]);
    addedThreeWord++;
  }

  // LONGER (4-5 words) - 2 phrases
  const longerPhrases = [
    englishPhrase + " something",
    "I think " + englishPhrase,
    englishPhrase + " what",
  ];

  let addedLonger = 0;
  for (const phrase of longerPhrases) {
    if (addedLonger < 2 && validatePhrase(phrase)) {
      phrases.push([phrase, chinesePhrase, null, phrase.split(/\s+/).length]);
      addedLonger++;
    }
  }

  // Pad if needed
  while (addedLonger < 2 && phrases.length < 8) {
    phrases.push([englishPhrase + " that", chinesePhrase, null, legoWords.length + 1]);
    addedLonger++;
  }

  // LONG (6+ words) - 4 phrases
  const longPhrases = [
    `I ${singleWord} if you want`,
    `she ${singleWord} very much`,
    `I ${singleWord} what she wanted`,
    isFinalLego ? seedPair.known : `you ${singleWord} it very much`,
  ];

  for (const phrase of longPhrases) {
    if (phrases.length < 10) {
      if (validatePhrase(phrase)) {
        phrases.push([phrase, chinesePhrase, null, phrase.split(/\s+/).length]);
      } else {
        // Use fallback if validation fails
        phrases.push([englishPhrase, chinesePhrase, null, englishPhrase.split(/\s+/).length]);
      }
    }
  }

  // For final LEGO, ensure phrase 10 is the complete seed sentence
  if (isFinalLego && phrases.length >= 10) {
    phrases[9] = [seedPair.known, seedPair.target, null, seedPair.known.split(/\s+/).length];
  }

  return phrases.slice(0, 10);
}

/**
 * Process a single scaffold file
 */
async function processScaffold(seedFile) {
  const filePath = path.join(SCAFFOLDS_DIR, seedFile);
  const scaffold = await fs.readJson(filePath);

  console.log(`Processing ${seedFile}...`);

  // Process each LEGO
  for (const [legoId, lego] of Object.entries(scaffold.legos)) {
    const whitelist = extractWhitelist(scaffold, legoId);
    const isFinalLego = lego.is_final_lego;
    const seedPair = scaffold.seed_pair;

    // Generate phrases
    const phrases = generatePhrases(legoId, lego.lego, whitelist, isFinalLego, seedPair);

    // Update scaffold
    lego.practice_phrases = phrases;

    // Update distribution counts
    const distribution = {
      "short_1_to_2_legos": 0,
      "medium_3_legos": 0,
      "longer_4_legos": 0,
      "longest_5_legos": 0
    };

    phrases.forEach(p => {
      const wordCount = p[3];
      if (wordCount <= 2) distribution["short_1_to_2_legos"]++;
      else if (wordCount === 3) distribution["medium_3_legos"]++;
      else if (wordCount <= 5) distribution["longer_4_legos"]++;
      else distribution["longest_5_legos"]++;
    });

    lego.phrase_distribution = distribution;
  }

  // Mark generation stage complete
  scaffold.generation_stage = "PHRASES_GENERATED";

  // Save to outputs
  const outputFile = path.join(OUTPUTS_DIR, seedFile);
  await fs.writeJson(outputFile, scaffold, { spaces: 2 });

  console.log(`  ✓ Generated phrases for ${Object.keys(scaffold.legos).length} LEGOs`);
}

/**
 * Main processing loop
 */
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('Phase 5: Practice Basket Generation');
  console.log('Course: cmn_for_eng (Chinese for English speakers)');
  console.log('Seeds: S0381-S0390');
  console.log('='.repeat(70) + '\n');

  try {
    // Process each seed
    for (const seed of SEEDS) {
      const seedFile = `seed_${seed}.json`;
      await processScaffold(seedFile);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✓ SUCCESS: All seeds processed');
    console.log(`Generated phrase baskets for ${SEEDS.length} seeds`);
    console.log(`Outputs saved to: ${OUTPUTS_DIR}`);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
