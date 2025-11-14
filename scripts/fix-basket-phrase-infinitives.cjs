#!/usr/bin/env node

/**
 * Fix bare infinitives at start of English practice phrases
 *
 * Rule: If Spanish phrase starts with an infinitive verb (ends in -ar, -er, -ir),
 * then English phrase must start with "to + verb", not just the bare verb.
 *
 * Example:
 *   Spanish: "hablar español" → English should be: "to speak Spanish" not "speak Spanish"
 */

const fs = require('fs-extra');
const path = require('path');

// Common infinitive verbs that might be bare at start
const INFINITIVE_VERBS = [
  'speak', 'say', 'try', 'remember', 'practise', 'practice', 'talk',
  'happen', 'start', 'learn', 'explain', 'finish', 'think', 'understand',
  'forget', 'know', 'ask', 'tell', 'help', 'want', 'need', 'continue',
  'begin', 'repeat', 'improve', 'change', 'work', 'stop', 'listen',
  'write', 'read', 'hear', 'see', 'feel', 'become', 'stay', 'leave',
  'wait', 'mean', 'believe', 'hope', 'decide', 'seem', 'appear'
];

function isSpanishInfinitive(word) {
  // Spanish infinitives end in -ar, -er, or -ir
  return /^[a-záéíóúñü]+(?:ar|er|ir)$/i.test(word);
}

function startsWithBareInfinitive(phrase) {
  // Check if phrase starts with one of our known infinitive verbs (not "to verb")
  const words = phrase.toLowerCase().split(/\s+/);
  if (words[0] === 'to') return false; // Already has "to"

  return INFINITIVE_VERBS.includes(words[0]);
}

async function fixBasketPhraseInfinitives(courseDir) {
  console.log('\n[Fix Basket Phrases] Starting infinitive phrase fix...');
  console.log(`[Fix Basket Phrases] Course: ${courseDir}\n`);

  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  if (!await fs.pathExists(basketsPath)) {
    throw new Error(`lego_baskets.json not found at: ${basketsPath}`);
  }

  // Read baskets file
  const basketsData = await fs.readJson(basketsPath);

  let phrasesFixed = 0;
  let basketsModified = 0;
  const examples = [];

  // Process each basket
  for (const [legoId, basket] of Object.entries(basketsData.baskets)) {
    let basketModified = false;

    // Check practice phrases
    const phrases = basket.practice_phrases || [];
    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i];
      if (!phrase || phrase.length < 2) continue;

      const englishPhrase = phrase[0];
      const spanishPhrase = phrase[1];

      // Get first word of Spanish phrase
      const spanishWords = spanishPhrase.split(/\s+/);
      const firstSpanishWord = spanishWords[0];

      // Check: Spanish starts with infinitive AND English starts with bare infinitive
      if (isSpanishInfinitive(firstSpanishWord) && startsWithBareInfinitive(englishPhrase)) {
        // Fix: add "to" at the beginning
        const fixedEnglish = 'to ' + englishPhrase;
        phrases[i][0] = fixedEnglish;

        phrasesFixed++;
        basketModified = true;

        if (examples.length < 10) {
          examples.push({
            lego_id: legoId,
            spanish: spanishPhrase,
            before: englishPhrase,
            after: fixedEnglish
          });
        }
      }
    }

    if (basketModified) {
      basketsModified++;
    }
  }

  // Write updated baskets
  await fs.writeJson(basketsPath, basketsData, { spaces: 2 });

  console.log(`[Fix Basket Phrases] Examples of fixes:\n`);
  for (const ex of examples) {
    console.log(`[${ex.lego_id}] "${ex.spanish}"`);
    console.log(`  ✗ ${ex.before}`);
    console.log(`  ✓ ${ex.after}\n`);
  }

  console.log(`[Fix Basket Phrases] ✅ Complete!`);
  console.log(`[Fix Basket Phrases]    Baskets modified: ${basketsModified}`);
  console.log(`[Fix Basket Phrases]    Phrases fixed: ${phrasesFixed}`);
  console.log(`[Fix Basket Phrases]    Output: ${basketsPath}\n`);

  return {
    success: true,
    basketsModified,
    phrasesFixed
  };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/fix-basket-phrase-infinitives.cjs <courseDir>');
    console.error('Example: node scripts/fix-basket-phrase-infinitives.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  fixBasketPhraseInfinitives(courseDir)
    .then(result => {
      console.log(`[Fix Basket Phrases] ✅ Fixed ${result.phrasesFixed} phrases in ${result.basketsModified} baskets!`);
      process.exit(0);
    })
    .catch(error => {
      console.error('[Fix Basket Phrases] ❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { fixBasketPhraseInfinitives };
