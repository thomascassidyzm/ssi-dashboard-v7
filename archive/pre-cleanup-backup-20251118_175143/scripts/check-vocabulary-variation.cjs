#!/usr/bin/env node

/**
 * Vocabulary Variation Checker
 *
 * Scans seed_pairs.json to find English concepts that map to multiple Italian words.
 * Critical for audio courses - learner must know exactly which Italian word to say.
 */

const fs = require('fs-extra');
const path = require('path');

async function checkVariations(courseCode) {
  const seedPairsPath = path.join(__dirname, '..', 'vfs', 'courses', courseCode, 'seed_pairs.json');
  const data = await fs.readJson(seedPairsPath);

  // Build English→Italian mapping
  const mappings = {};

  for (const [seedId, [italian, english]] of Object.entries(data.translations)) {
    // Extract key English verbs/phrases and their Italian equivalents
    const patterns = [
      { en: /\bto try\b/gi, extract: /\b(provare|tentare|cercare)\b/gi },
      { en: /\bto speak\b/gi, extract: /\b(parlare|dire)\b/gi },
      { en: /\bto talk\b/gi, extract: /\b(parlare|dire|raccontare)\b/gi },
      { en: /\bto learn\b/gi, extract: /\b(imparare|apprendere)\b/gi },
      { en: /\bto remember\b/gi, extract: /\b(ricordare|ricordarsi)\b/gi },
      { en: /\bto understand\b/gi, extract: /\b(capire|comprendere)\b/gi },
      { en: /\bto want\b/gi, extract: /\b(volere|desiderare)\b/gi },
      { en: /\bto practice\b/gi, extract: /\b(praticare|esercitare)\b/gi },
      { en: /\ba little\b/gi, extract: /\bun po'/gi },
      { en: /\bas .* as possible\b/gi, extract: /\bil più .* possibile\b/gi }
    ];

    for (const pattern of patterns) {
      if (pattern.en.test(english)) {
        const enMatch = english.match(pattern.en);
        const itMatch = italian.match(pattern.extract);

        if (enMatch && itMatch) {
          const enKey = enMatch[0].toLowerCase();
          const itValue = itMatch[0].toLowerCase();

          if (!mappings[enKey]) {
            mappings[enKey] = {};
          }
          if (!mappings[enKey][itValue]) {
            mappings[enKey][itValue] = [];
          }
          mappings[enKey][itValue].push(seedId);
        }
      }
    }
  }

  // Report variations
  console.log('\n' + '='.repeat(80));
  console.log('VOCABULARY VARIATION REPORT');
  console.log('='.repeat(80) + '\n');

  let totalVariations = 0;
  const problematic = [];

  for (const [enPhrase, itVariants] of Object.entries(mappings)) {
    const variants = Object.keys(itVariants);

    console.log(`📝 English: "${enPhrase}"`);

    if (variants.length > 1) {
      console.log(`   ⚠️  VARIATION (${variants.length} Italian words):`);
      totalVariations++;
      problematic.push(enPhrase);
    } else {
      console.log(`   ✓ Consistent:`);
    }

    for (const [itWord, seeds] of Object.entries(itVariants)) {
      console.log(`      "${itWord}" - ${seeds.length} occurrences (${seeds.slice(0, 3).join(', ')}${seeds.length > 3 ? '...' : ''})`);
    }
    console.log();
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`Total concepts checked: ${Object.keys(mappings).length}`);
  console.log(`Concepts with variation: ${totalVariations}`);
  console.log(`Consistency rate: ${((1 - totalVariations / Object.keys(mappings).length) * 100).toFixed(1)}%\n`);

  if (problematic.length > 0) {
    console.log('⚠️  PROBLEMATIC (multiple Italian words for same English):');
    for (const phrase of problematic) {
      console.log(`   - "${phrase}"`);
    }
    console.log();
    console.log('🎯 AUDIO COURSE IMPACT:');
    console.log('   Learner hears English prompt but doesn\'t know which Italian word to say!');
    console.log('   MUST FIX before course is usable.\n');
  } else {
    console.log('✅ NO PROBLEMATIC VARIATIONS FOUND\n');
  }
}

const courseCode = process.argv[2] || 'ita_for_eng_668seeds';
checkVariations(courseCode).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
