#!/usr/bin/env node

/**
 * Fix bare infinitives in practice phrases
 *
 * Rule: If Spanish phrase starts with infinitive verb (-ar, -er, -ir)
 * AND English phrase does NOT start with "to ",
 * THEN prepend "to " to English phrase.
 */

const fs = require('fs-extra');
const path = require('path');

// Known Spanish infinitive verbs (common ones from the course)
const SPANISH_INFINITIVES = [
  'hablar', 'decir', 'aprender', 'intentar', 'practicar', 'recordar',
  'explicar', 'empezar', 'comenzar', 'pensar', 'entender', 'olvidar',
  'saber', 'preguntar', 'contestar', 'responder', 'ayudar', 'necesitar',
  'continuar', 'repetir', 'mejorar', 'cambiar', 'trabajar', 'parar',
  'escuchar', 'escribir', 'leer', 'oír', 'ver', 'sentir', 'parecer',
  'esperar', 'decidir', 'creer', 'reunir', 'volver', 'descubrir',
  'encontrar', 'considerar', 'cuidar', 'evaluar'
];

function isSpanishInfinitive(word) {
  return SPANISH_INFINITIVES.includes(word.toLowerCase());
}

async function fixBareInfinitives(courseDir) {
  console.log('\n[Fix Bare Infinitives] Starting fix...');
  console.log(`[Fix Bare Infinitives] Course: ${courseDir}\n`);

  const basketsPath = path.join(courseDir, 'lego_baskets.json');

  if (!await fs.pathExists(basketsPath)) {
    throw new Error(`lego_baskets.json not found at: ${basketsPath}`);
  }

  const data = await fs.readJson(basketsPath);

  let phrasesFixed = 0;
  const examples = [];

  // Process each basket
  for (const [legoId, basket] of Object.entries(data.baskets)) {
    const phrases = basket.practice_phrases || [];

    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i];
      if (!phrase || phrase.length < 2) continue;

      const english = phrase[0];
      const spanish = phrase[1];

      // Get first Spanish word
      const spanishWords = spanish.split(/\s+/);
      if (!spanishWords.length) continue;
      const firstSpanishWord = spanishWords[0];

      // Check if Spanish starts with infinitive
      if (!isSpanishInfinitive(firstSpanishWord)) continue;

      // Check if English does NOT start with "to "
      if (english.substring(0, 3).toLowerCase() === 'to ') continue;

      // Check if English starts with gerund (-ing form) - these are correct as-is
      const firstWord = english.split(/\s+/)[0];
      if (firstWord && firstWord.toLowerCase().endsWith('ing')) continue;

      // FIX: Prepend "to " and lowercase first letter if it's capitalized
      let fixedEnglish = english;

      // If first character is uppercase, lowercase it
      if (english[0] === english[0].toUpperCase()) {
        fixedEnglish = english[0].toLowerCase() + english.slice(1);
      }

      fixedEnglish = 'to ' + fixedEnglish;
      phrases[i][0] = fixedEnglish;
      phrasesFixed++;

      if (examples.length < 15) {
        examples.push({
          lego_id: legoId,
          spanish: spanish,
          before: english,
          after: fixedEnglish
        });
      }
    }
  }

  // Write updated file
  await fs.writeJson(basketsPath, data, { spaces: 2 });

  console.log(`[Fix Bare Infinitives] Examples of fixes:\n`);
  for (const ex of examples) {
    console.log(`[${ex.lego_id}] "${ex.spanish}"`);
    console.log(`  ✗ ${ex.before}`);
    console.log(`  ✓ ${ex.after}\n`);
  }

  console.log(`[Fix Bare Infinitives] ✅ Complete!`);
  console.log(`[Fix Bare Infinitives]    Phrases fixed: ${phrasesFixed}`);
  console.log(`[Fix Bare Infinitives]    Output: ${basketsPath}\n`);

  return {
    success: true,
    phrasesFixed
  };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/fix-bare-infinitives-final.cjs <courseDir>');
    console.error('Example: node scripts/fix-bare-infinitives-final.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  fixBareInfinitives(courseDir)
    .then(result => {
      console.log(`[Fix Bare Infinitives] ✅ Fixed ${result.phrasesFixed} phrases!`);
      process.exit(0);
    })
    .catch(error => {
      console.error('[Fix Bare Infinitives] ❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { fixBareInfinitives };
