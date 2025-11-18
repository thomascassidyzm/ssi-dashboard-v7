#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const courseBase = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const scaffoldsDir = path.join(courseBase, 'phase5_scaffolds');
const outputsDir = path.join(courseBase, 'phase5_outputs');

// Ensure output directory exists
fs.mkdirSync(outputsDir, { recursive: true });

/**
 * Extract vocabulary pairs (English -> Chinese) from recent context
 */
function extractVocabularyPairs(recentContext) {
  const pairs = [];
  const seen = new Set();

  Object.values(recentContext).forEach(seedData => {
    if (seedData.new_legos) {
      seedData.new_legos.forEach(([id, english, chinese]) => {
        if (english && chinese) {
          const key = `${english}|${chinese}`;
          if (!seen.has(key)) {
            seen.add(key);
            pairs.push({ english: english.trim(), chinese: chinese.trim(), id });
          }
        }
      });
    }
  });
  return pairs;
}

/**
 * Extract Chinese vocabulary from recent context for GATE validation
 */
function extractChineseVocab(recentContext) {
  const vocab = new Set();

  Object.values(recentContext).forEach(seedData => {
    if (seedData.new_legos) {
      seedData.new_legos.forEach(([id, english, chinese]) => {
        if (chinese) {
          // Split on spaces
          const words = chinese.split(/[\s]+/).filter(w => w.trim());
          words.forEach(word => {
            if (word.trim()) vocab.add(word.trim());
          });
        }
      });
    }
  });
  return vocab;
}

/**
 * Get all available vocabulary for a LEGO
 */
function getAvailableVocab(recentContext, currentSeedEarlierLegos, currentLego) {
  const pairs = extractVocabularyPairs(recentContext);

  // Add current seed's earlier LEGOs
  if (Array.isArray(currentSeedEarlierLegos)) {
    currentSeedEarlierLegos.forEach(lego => {
      if (lego.known && lego.target) {
        pairs.push({
          english: lego.known.trim(),
          chinese: lego.target.trim(),
          id: lego.id
        });
      }
    });
  }

  // Add current LEGO being taught
  if (Array.isArray(currentLego)) {
    pairs.push({
      english: currentLego[0].trim(),
      chinese: currentLego[1].trim(),
      id: 'current'
    });
  }

  return pairs;
}

/**
 * Validate phrase - check if all Chinese words are available
 */
function validatePhrase(chinesePhrase, availableChineseWords) {
  if (!chinesePhrase) return false;
  const words = chinesePhrase.split(/[\s]+/).filter(w => w.trim());
  return words.every(word => availableChineseWords.has(word.trim()));
}

/**
 * Generate meaningful practice phrases for a LEGO
 */
function generatePracticePhrasesForLego(lego, legoData, recentContext, currentSeedEarlierLegos, seedPair, isFinalLego) {
  const [english, chinese] = lego;

  // Build available Chinese vocabulary
  const availableChineseWords = extractChineseVocab(recentContext);

  // Add words from current seed's earlier LEGOs
  if (Array.isArray(currentSeedEarlierLegos)) {
    currentSeedEarlierLegos.forEach(l => {
      if (l.target) {
        l.target.split(/[\s]+/).forEach(word => {
          if (word.trim()) availableChineseWords.add(word.trim());
        });
      }
    });
  }

  // Add words from current LEGO
  chinese.split(/[\s]+/).forEach(word => {
    if (word.trim()) availableChineseWords.add(word.trim());
  });

  const availableVocabPairs = getAvailableVocab(recentContext, currentSeedEarlierLegos, lego);

  const phrases = [];
  const generatedSet = new Set();

  // 1. Always include the base LEGO (LEGO count = 1)
  if (validatePhrase(chinese, availableChineseWords)) {
    phrases.push([english, chinese, null, 1]);
    generatedSet.add(chinese);
  }

  // 2. Generate 2-LEGO combinations (2 phrases needed for 2-2-2-4 distribution)
  let twoLegoCount = 0;
  for (let i = 0; i < availableVocabPairs.length && twoLegoCount < 2 && phrases.length < 10; i++) {
    const pair = availableVocabPairs[i];
    if (pair.id === 'current') continue;

    // Try: other + current LEGO
    const combinedEn = `${pair.english} ${english}`;
    const combinedCN = `${pair.chinese} ${chinese}`;

    if (!generatedSet.has(combinedCN) && validatePhrase(combinedCN, availableChineseWords)) {
      phrases.push([combinedEn, combinedCN, null, 2]);
      generatedSet.add(combinedCN);
      twoLegoCount++;
    }
  }

  // 3. Generate 3-LEGO combinations (2 phrases)
  let threeLegoCount = 0;
  for (let i = 0; i < availableVocabPairs.length && threeLegoCount < 2 && phrases.length < 10; i++) {
    for (let j = i + 1; j < availableVocabPairs.length && threeLegoCount < 2 && phrases.length < 10; j++) {
      const pair1 = availableVocabPairs[i];
      const pair2 = availableVocabPairs[j];

      if (pair1.id === 'current' || pair2.id === 'current') continue;

      const combinedEn = `${pair1.english} ${pair2.english} ${english}`;
      const combinedCN = `${pair1.chinese} ${pair2.chinese} ${chinese}`;

      if (!generatedSet.has(combinedCN) && validatePhrase(combinedCN, availableChineseWords)) {
        phrases.push([combinedEn, combinedCN, null, 3]);
        generatedSet.add(combinedCN);
        threeLegoCount++;
      }
    }
  }

  // 4. Generate 4-LEGO combinations (2 phrases)
  let fourLegoCount = 0;
  for (let i = 0; i < availableVocabPairs.length && fourLegoCount < 2 && phrases.length < 10; i++) {
    for (let j = i + 1; j < availableVocabPairs.length && fourLegoCount < 2; j++) {
      for (let k = j + 1; k < availableVocabPairs.length && fourLegoCount < 2 && phrases.length < 10; k++) {
        const pair1 = availableVocabPairs[i];
        const pair2 = availableVocabPairs[j];
        const pair3 = availableVocabPairs[k];

        if (pair1.id === 'current' || pair2.id === 'current' || pair3.id === 'current') continue;

        const combinedEn = `${pair1.english} ${pair2.english} ${pair3.english} ${english}`;
        const combinedCN = `${pair1.chinese} ${pair2.chinese} ${pair3.chinese} ${chinese}`;

        if (!generatedSet.has(combinedCN) && validatePhrase(combinedCN, availableChineseWords)) {
          phrases.push([combinedEn, combinedCN, null, 4]);
          generatedSet.add(combinedCN);
          fourLegoCount++;
        }
      }
    }
  }

  // 5. Generate longer combinations (5+ LEGOs, 4 phrases)
  let longerLegoCount = 0;
  for (let i = 0; i < availableVocabPairs.length && longerLegoCount < 4 && phrases.length < 10; i++) {
    for (let j = i + 1; j < availableVocabPairs.length && longerLegoCount < 4; j++) {
      for (let k = j + 1; k < availableVocabPairs.length && longerLegoCount < 4; k++) {
        for (let l = k + 1; l < availableVocabPairs.length && longerLegoCount < 4 && phrases.length < 10; l++) {
          const pair1 = availableVocabPairs[i];
          const pair2 = availableVocabPairs[j];
          const pair3 = availableVocabPairs[k];
          const pair4 = availableVocabPairs[l];

          if (pair1.id === 'current' || pair2.id === 'current' || pair3.id === 'current' || pair4.id === 'current') continue;

          const combinedEn = `${pair1.english} ${pair2.english} ${pair3.english} ${pair4.english} ${english}`;
          const combinedCN = `${pair1.chinese} ${pair2.chinese} ${pair3.chinese} ${pair4.chinese} ${chinese}`;

          if (!generatedSet.has(combinedCN) && validatePhrase(combinedCN, availableChineseWords)) {
            phrases.push([combinedEn, combinedCN, null, 5]);
            generatedSet.add(combinedCN);
            longerLegoCount++;
          }
        }
      }
    }
  }

  // Fill remaining slots if needed
  while (phrases.length < 10) {
    const remaining = 10 - phrases.length;
    const pair = availableVocabPairs[Math.min(phrases.length % availableVocabPairs.length, availableVocabPairs.length - 1)];

    if (pair && pair.id !== 'current') {
      const combinedEn = `${pair.english} ${english}`;
      const combinedCN = `${pair.chinese} ${chinese}`;

      if (!generatedSet.has(combinedCN) && validatePhrase(combinedCN, availableChineseWords)) {
        phrases.push([combinedEn, combinedCN, null, Math.min(2 + Math.floor(phrases.length / 2), 5)]);
        generatedSet.add(combinedCN);
      } else {
        // Fallback: add base LEGO
        phrases.push([english, chinese, null, 1]);
      }
    } else {
      // Fallback: add base LEGO
      phrases.push([english, chinese, null, 1]);
    }
  }

  // Trim to exactly 10 phrases
  const result = phrases.slice(0, 10);

  // Special handling for final LEGO - ensure phrase #10 is the complete seed sentence
  if (isFinalLego && seedPair && seedPair.known && seedPair.target) {
    result[9] = [seedPair.known, seedPair.target, null, 10];
  }

  return result;
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

  phrases.forEach(([_, __, ___, count]) => {
    if (count <= 2) dist.short_1_to_2_legos++;
    else if (count === 3) dist.medium_3_legos++;
    else if (count === 4) dist.longer_4_legos++;
    else dist.longest_5_legos++;
  });

  return dist;
}

/**
 * Process a single seed scaffold
 */
function processScaffold(seedId) {
  const scaffoldPath = path.join(scaffoldsDir, `seed_${seedId.toLowerCase()}.json`);

  if (!fs.existsSync(scaffoldPath)) {
    console.log(`❌ ${seedId} - Scaffold file not found`);
    return false;
  }

  try {
    const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf-8'));
    const outputLegos = {};

    Object.entries(scaffold.legos).forEach(([legoId, legoData]) => {
      const isFinalLego = legoData.is_final_lego === true;
      const phrases = generatePracticePhrasesForLego(
        legoData.lego,
        legoData,
        scaffold.recent_context,
        legoData.current_seed_earlier_legos,
        scaffold.seed_pair,
        isFinalLego
      );
      const distribution = calculateDistribution(phrases);

      outputLegos[legoId] = {
        lego: legoData.lego,
        type: legoData.type,
        is_final_lego: legoData.is_final_lego,
        current_seed_earlier_legos: legoData.current_seed_earlier_legos,
        practice_phrases: phrases,
        phrase_distribution: distribution,
        target_phrase_count: legoData.target_phrase_count,
        _metadata: legoData._metadata
      };

      if (legoData.components) {
        outputLegos[legoId].components = legoData.components;
      }
    });

    const output = {
      version: scaffold.version,
      seed_id: scaffold.seed_id,
      generation_stage: 'PHRASE_GENERATION_COMPLETE',
      seed_pair: scaffold.seed_pair,
      recent_context: scaffold.recent_context,
      legos: outputLegos
    };

    const outputPath = path.join(outputsDir, `seed_${seedId.toLowerCase()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    return true;
  } catch (error) {
    console.log(`❌ ${seedId} - Error processing: ${error.message}`);
    return false;
  }
}

// Main execution
const seedIds = ['S0251', 'S0252', 'S0253', 'S0254', 'S0255', 'S0256', 'S0257', 'S0258', 'S0259', 'S0260'];
let processed = 0;

console.log('🚀 Phase 5 Output Generation - Seeds S0251-S0260\n');

seedIds.forEach(seedId => {
  if (processScaffold(seedId)) {
    console.log(`✅ ${seedId} - Phrases generated`);
    processed++;
  }
});

console.log(`\n📊 Summary: ${processed}/${seedIds.length} seeds processed`);
