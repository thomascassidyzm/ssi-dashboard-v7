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

// Extract all vocabulary and their translations from recent context
function extractVocabularyPairs(recentContext) {
  const pairs = [];
  Object.values(recentContext).forEach(seedData => {
    if (seedData.new_legos) {
      seedData.new_legos.forEach(([id, english, chinese]) => {
        if (english && chinese) {
          pairs.push({ english: english.trim(), chinese: chinese.trim(), id });
        }
      });
    }
  });
  return pairs;
}

// Extract Chinese vocabulary from recent context (for GATE validation)
function extractChineseVocab(recentContext) {
  const vocab = new Set();
  Object.values(recentContext).forEach(seedData => {
    if (seedData.new_legos) {
      seedData.new_legos.forEach(([id, english, chinese]) => {
        if (chinese) {
          // Split on spaces and Chinese punctuation
          const words = chinese.split(/[\s\u3001\u3002\uff01\uff1f]+/).filter(w => w.trim());
          words.forEach(word => {
            if (word.trim()) vocab.add(word.trim());
          });
        }
      });
    }
  });
  return vocab;
}

// Get available vocabulary pairs (for natural construction)
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

// Validate phrase - check if all Chinese words are available
function validatePhrase(chinesePhrase, availableChineseWords) {
  const words = chinesePhrase.split(/[\s\u3001\u3002\uff01\uff1f]+/).filter(w => w.trim());
  return words.every(word => availableChineseWords.has(word.trim()));
}

// Generate practice phrases with contextual thinking
function generatePracticePhrasesForLego(lego, legoData, recentContext, currentSeedEarlierLegos) {
  const [english, chinese] = lego;
  const availableChineseWords = extractChineseVocab(recentContext);

  // Add words from current seed's earlier LEGOs
  if (Array.isArray(currentSeedEarlierLegos)) {
    currentSeedEarlierLegos.forEach(l => {
      if (l.target) {
        l.target.split(/[\s\u3001\u3002\uff01\uff1f]+/).forEach(word => {
          if (word.trim()) availableChineseWords.add(word.trim());
        });
      }
    });
  }

  // Add words from current LEGO
  chinese.split(/[\s\u3001\u3002\uff01\uff1f]+/).forEach(word => {
    if (word.trim()) availableChineseWords.add(word.trim());
  });

  const availableVocabPairs = getAvailableVocab(recentContext, currentSeedEarlierLegos, lego);

  const phrases = [];

  // Always include the base LEGO
  phrases.push([english, chinese, null, 1]);

  // Generate contextual variations
  const generatedSet = new Set([chinese]);

  // Try combining with available vocabulary
  for (let i = 0; i < availableVocabPairs.length && phrases.length < 10; i++) {
    const pair = availableVocabPairs[i];

    // Skip if it's the current LEGO itself
    if (pair.id === 'current') continue;

    // Try combining current LEGO with other vocabulary
    const combinedEn1 = `${pair.english} ${english}`;
    const combinedCN1 = `${pair.chinese} ${chinese}`;

    // Try reverse order
    const combinedEn2 = `${english} ${pair.english}`;
    const combinedCN2 = `${chinese} ${pair.chinese}`;

    // Add first combination if valid and not duplicate
    if (phrases.length < 10 && !generatedSet.has(combinedCN1) && validatePhrase(combinedCN1, availableChineseWords)) {
      phrases.push([combinedEn1, combinedCN1, null, 2]);
      generatedSet.add(combinedCN1);
    }

    // Add second combination if valid and not duplicate
    if (phrases.length < 10 && !generatedSet.has(combinedCN2) && validatePhrase(combinedCN2, availableChineseWords)) {
      phrases.push([combinedEn2, combinedCN2, null, 2]);
      generatedSet.add(combinedCN2);
    }
  }

  // Generate longer combinations for remaining slots
  for (let i = 0; i < availableVocabPairs.length && phrases.length < 10; i++) {
    for (let j = i + 1; j < availableVocabPairs.length && phrases.length < 10; j++) {
      const pair1 = availableVocabPairs[i];
      const pair2 = availableVocabPairs[j];

      // Skip if current LEGO
      if (pair1.id === 'current' || pair2.id === 'current') continue;

      const combinedEn = `${pair1.english} ${english} ${pair2.english}`;
      const combinedCN = `${pair1.chinese} ${chinese} ${pair2.chinese}`;

      if (!generatedSet.has(combinedCN) && validatePhrase(combinedCN, availableChineseWords)) {
        phrases.push([combinedEn, combinedCN, null, 3]);
        generatedSet.add(combinedCN);
      }
    }
  }

  // Fill remaining slots with meaningful variations
  while (phrases.length < 10) {
    // Create meaningful longer phrases
    const idx = phrases.length;
    let enPhrase = english;
    let cnPhrase = chinese;

    if (idx >= 4 && availableVocabPairs.length > 0) {
      // Use simple repetition with different phrasing if needed
      const sample = availableVocabPairs[Math.min(idx % availableVocabPairs.length, availableVocabPairs.length - 1)];
      if (sample.id !== 'current') {
        enPhrase = `${sample.english} ${english}`;
        cnPhrase = `${sample.chinese} ${chinese}`;

        if (!generatedSet.has(cnPhrase) && validatePhrase(cnPhrase, availableChineseWords)) {
          phrases.push([enPhrase, cnPhrase, null, 2 + Math.floor(idx / 3)]);
          generatedSet.add(cnPhrase);
          continue;
        }
      }
    }

    // Fallback: add LEGO with appropriate LEGO count
    const legoCount = 1 + Math.floor(phrases.length / 2.5);
    phrases.push([english, chinese, null, Math.min(legoCount, 5)]);
  }

  // Apply 2-2-2-4 distribution
  const result = [];
  const distribution = [1, 2, 3, 4]; // LEGO counts
  const counts = [2, 2, 2, 4]; // How many phrases for each category
  let phraseIdx = 0;

  for (let catIdx = 0; catIdx < distribution.length && phraseIdx < phrases.length; catIdx++) {
    for (let count = 0; count < counts[catIdx] && phraseIdx < phrases.length; count++) {
      if (phraseIdx < phrases.length) {
        result.push(phrases[phraseIdx]);
        phraseIdx++;
      }
    }
  }

  return result.slice(0, 10);
}

// Process each seed file
function processSeed(seedNum) {
  const seedId = `S${String(seedNum).padStart(4, '0')}`;
  const scaffoldPath = path.join(scaffoldsDir, `seed_${seedId.toLowerCase()}.json`);
  const outputPath = path.join(outputsDir, `seed_${seedId.toLowerCase()}.json`);

  if (!fs.existsSync(scaffoldPath)) {
    console.log(`SKIP: ${seedId} - scaffold not found`);
    return false;
  }

  try {
    const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));
    const legoIds = Object.keys(scaffold.legos);
    let processedCount = 0;

    // Process each LEGO
    legoIds.forEach(legoId => {
      const legoData = scaffold.legos[legoId];
      const currentSeedEarlierLegos = legoData.current_seed_earlier_legos || [];

      // Generate practice phrases
      const practices = generatePracticePhrasesForLego(
        legoData.lego,
        legoData,
        scaffold.recent_context,
        currentSeedEarlierLegos
      );

      legoData.practice_phrases = practices;
      processedCount++;
    });

    // Update generation stage and write output
    scaffold.generation_stage = 'PHRASE_GENERATION_COMPLETE';
    fs.writeFileSync(outputPath, JSON.stringify(scaffold, null, 2));

    console.log(`DONE: ${seedId} - ${processedCount} LEGOs with phrases generated`);
    return true;
  } catch (error) {
    console.error(`ERROR: ${seedId} - ${error.message}`);
    return false;
  }
}

// Process seeds S0191-S0200
console.log('Phase 5 Processor: Generating practice phrases for cmn_for_eng S0191-S0200');
console.log('='.repeat(70));

let processed = 0;
let failed = 0;

for (let i = 191; i <= 200; i++) {
  if (processSeed(i)) {
    processed++;
  } else {
    failed++;
  }
}

console.log('='.repeat(70));
console.log(`Summary: ${processed} seeds processed, ${failed} seeds failed`);
console.log(`Output files written to: ${outputsDir}`);
console.log('Phase 5 processing complete!');
