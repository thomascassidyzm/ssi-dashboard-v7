#!/usr/bin/env node

const fs = require('fs');

// Load the complete baskets
const baskets = JSON.parse(fs.readFileSync('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/worker7_complete_baskets.json', 'utf8'));

// Count Chinese syllables (characters)
function countChineseSyllables(text) {
  return text.replace(/[^\u4e00-\u9fa5]/g, '').length;
}

// Count Chinese words (characters + punctuation)
function countChineseWords(text) {
  return text.length;
}

// Count English words
function countEnglishWords(text) {
  return text.trim().split(/\s+/).length;
}

// Estimate LEGO count based on phrase length (rough heuristic)
function estimateLegoCount(knownPhrase, targetPhrase, position) {
  // Simple heuristic: more complex phrases have more LEGOs
  const knownWords = countEnglishWords(knownPhrase);

  if (knownWords <= 2) return 1;
  if (knownWords <= 4) return 2;
  if (knownWords <= 6) return 3;
  if (knownWords <= 8) return 4;
  return 5;
}

// Enrich phrases with metadata
function enrichPhrases(phrases, isFinalLego = false) {
  return phrases.map((phrase, index) => {
    const syllableCount = countChineseSyllables(phrase.target);
    const wordCount = countChineseWords(phrase.target);
    const legoCount = estimateLegoCount(phrase.known, phrase.target, index + 1);

    return {
      ...phrase,
      syllable_count: syllableCount,
      word_count: wordCount,
      lego_count: legoCount,
      position: index + 1
    };
  });
}

// Process each seed
const enrichedSeeds = {};

Object.keys(baskets).forEach(seedId => {
  const seed = baskets[seedId];
  enrichedSeeds[seedId] = {};

  const legoIds = Object.keys(seed);
  const finalLegoId = legoIds[legoIds.length - 1];

  legoIds.forEach(legoId => {
    const basket = seed[legoId];
    const isFinalLego = legoId === finalLegoId;

    enrichedSeeds[seedId][legoId] = {
      lego: basket.lego,
      practice_phrases: enrichPhrases(basket.practice_phrases, isFinalLego),
      is_final_lego: isFinalLego,
      phrase_count: basket.practice_phrases.length
    };
  });
});

// Save individual seed files
Object.keys(enrichedSeeds).forEach(seedId => {
  const outputPath = `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/zho_for_eng/phase3_outputs/seed_${seedId}_baskets.json`;
  fs.writeFileSync(outputPath, JSON.stringify(enrichedSeeds[seedId], null, 2));
  console.log(`✅ Created ${outputPath}`);
});

console.log('\n✅ All seed basket files created successfully!');
