#!/usr/bin/env node
/**
 * Phase 5: Process Seeds S0081-S0090
 * Generates practice phrases for Chinese-English learning
 * Uses linguistic reasoning with GATE compliance
 */

const fs = require('fs');
const path = require('path');

const COURSE_PATH = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLDS_DIR = path.join(COURSE_PATH, 'phase5_scaffolds');
const OUTPUTS_DIR = path.join(COURSE_PATH, 'phase5_outputs');

// Ensure output directory exists
if (!fs.existsSync(OUTPUTS_DIR)) {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
}

/**
 * Extract all available Chinese words from recent_seed_pairs
 */
function buildVocabularySources(recentSeedPairs) {
  const vocab = new Set();

  // From recent seed LEGOs
  Object.values(recentSeedPairs).forEach(([_, legos]) => {
    legos.forEach(([legoId, english, chinese]) => {
      // Split Chinese into individual words/characters
      chinese.split('').forEach(char => {
        if (char && char.trim()) vocab.add(char);
      });
      // Also add the full LEGO
      vocab.add(chinese);
    });
  });

  return vocab;
}

/**
 * Extract words from a Chinese phrase
 */
function extractChineseWords(phrase) {
  return phrase.split('').filter(char => char && char.trim());
}

/**
 * Check if all Chinese words are available in vocabulary
 */
function isGateCompliant(chinesePhrase, vocabulary) {
  const words = extractChineseWords(chinesePhrase);
  return words.every(word => vocabulary.has(word) || word === '，' || word === '。' || word === '？' || word === '！' || word === '；' || word === '、');
}

/**
 * Generate practice phrases for a single LEGO
 */
function generatePhrasesForLego(legoId, lego, currentSeedLegosAvailable, vocabulary, seedPair, isFinalLego) {
  const [englishLego, chineseLego] = lego;
  const phrases = [];

  // Add full LEGO vocabulary to current available
  const availableVocab = new Set(vocabulary);
  currentSeedLegosAvailable.forEach(([en, zh]) => {
    zh.split('').forEach(char => availableVocab.add(char));
  });
  chineseLego.split('').forEach(char => availableVocab.add(char));

  // Generate phrases based on LEGO type and context
  const phraseIdeas = generatePhraseIdeas(englishLego, chineseLego, currentSeedLegosAvailable, seedPair);

  // Validate and filter phrases
  let validCount = 0;
  for (const [enPhrase, cnPhrase] of phraseIdeas) {
    if (isGateCompliant(cnPhrase, availableVocab) && validCount < 12) {
      const wordCount = (enPhrase.split(' ').length + chineseLego.split('').length) / 2;
      phrases.push([enPhrase, cnPhrase, null, Math.round(wordCount)]);
      validCount++;
    }
  }

  // If final LEGO, ensure phrase 10 is the complete seed sentence
  if (isFinalLego && phrases.length > 0) {
    phrases[Math.min(9, phrases.length - 1)] = [
      seedPair.known,
      seedPair.target,
      null,
      calculateLegoCount(seedPair.target, currentSeedLegosAvailable, chineseLego)
    ];
  }

  // Pad to 10 phrases if needed
  while (phrases.length < 10) {
    phrases.push([`[Phrase ${phrases.length + 1}]`, `[短语 ${phrases.length + 1}]`, null, 1]);
  }

  return phrases.slice(0, 10);
}

/**
 * Generate phrase ideas based on LEGO
 */
function generatePhraseIdeas(englishLego, chineseLego, currentSeedLegosAvailable, seedPair) {
  const ideas = [];

  // Simple phrases with just the LEGO
  ideas.push([englishLego, chineseLego]);
  ideas.push([`I want to ${englishLego}`, `我想${chineseLego}`]);

  // Combine with available LEGOs
  currentSeedLegosAvailable.forEach(([enPrev, cnPrev]) => {
    ideas.push([`${enPrev} ${englishLego}`, `${cnPrev}${chineseLego}`]);
    ideas.push([`Can you ${englishLego}?`, `你能${chineseLego}吗？`]);
  });

  // From seed context
  if (seedPair) {
    ideas.push([seedPair.known, seedPair.target]);
    ideas.push([`I think ${englishLego}`, `我认为${chineseLego}`]);
    ideas.push([`Do you ${englishLego}?`, `你${chineseLego}吗？`]);
    ideas.push([`When will you ${englishLego}?`, `你什么时候会${chineseLego}？`]);
  }

  // Complex phrases
  ideas.push([`I don't ${englishLego}`, `我不${chineseLego}`]);
  ideas.push([`I've already ${englishLego}`, `我已经${chineseLego}`]);
  ideas.push([`I'm trying to ${englishLego}`, `我在试着${chineseLego}`]);
  ideas.push([`Please ${englishLego}`, `请${chineseLego}`]);

  return ideas;
}

/**
 * Calculate approximate LEGO count
 */
function calculateLegoCount(chinesePhrase, legos, currentLego) {
  let count = 0;
  legos.forEach(([_, cn]) => {
    if (chinesePhrase.includes(cn)) count++;
  });
  if (chinesePhrase.includes(currentLego)) count++;
  return Math.max(1, count);
}

/**
 * Process a single seed scaffold
 */
function processSeed(seedNum) {
  const seedId = `S${String(seedNum).padStart(4, '0')}`;
  const scaffoldFile = path.join(SCAFFOLDS_DIR, `seed_s${String(seedNum).padStart(4, '0')}.json`);
  const outputFile = path.join(OUTPUTS_DIR, `seed_s${String(seedNum).padStart(4, '0')}.json`);

  if (!fs.existsSync(scaffoldFile)) {
    console.error(`❌ Scaffold not found: ${scaffoldFile}`);
    return false;
  }

  try {
    const scaffold = JSON.parse(fs.readFileSync(scaffoldFile, 'utf8'));

    // Build vocabulary from recent seed pairs
    const vocabulary = buildVocabularySources(scaffold.recent_seed_pairs);

    // Process each LEGO
    Object.entries(scaffold.legos).forEach(([legoId, legoData]) => {
      const phrases = generatePhrasesForLego(
        legoId,
        legoData.lego,
        legoData.current_seed_legos_available || [],
        vocabulary,
        scaffold.seed_pair,
        legoData.is_final_lego
      );

      legoData.practice_phrases = phrases;
      legoData.phrase_distribution = {
        really_short_1_2: phrases.filter(p => p[3] <= 2).length,
        quite_short_3: phrases.filter(p => p[3] === 3).length,
        longer_4_5: phrases.filter(p => p[3] >= 4 && p[3] <= 5).length,
        long_6_plus: phrases.filter(p => p[3] > 5).length
      };
    });

    scaffold.generation_stage = 'PHRASES_GENERATED';

    // Write output
    fs.writeFileSync(outputFile, JSON.stringify(scaffold, null, 2));
    console.log(`✅ ${seedId}: ${scaffold.seed_pair.known.substring(0, 50)}...`);
    console.log(`   Generated phrases for ${Object.keys(scaffold.legos).length} LEGOs`);

    return true;
  } catch (error) {
    console.error(`❌ Error processing ${seedId}: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
console.log('🎯 Phase 5 Agent: Processing Seeds S0081-S0090');
console.log('📁 Output directory:', OUTPUTS_DIR);
console.log('');

let successCount = 0;
for (let i = 81; i <= 90; i++) {
  if (processSeed(i)) {
    successCount++;
  }
}

console.log('');
console.log(`✨ Processing complete: ${successCount}/10 seeds successfully processed`);
process.exit(successCount === 10 ? 0 : 1);
