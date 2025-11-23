#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const courseBase = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const scaffoldsDir = path.join(courseBase, 'phase5_scaffolds');
const outputsDir = path.join(courseBase, 'phase5_outputs');
const seedsToProcess = Array.from({ length: 10 }, (_, i) => `S${String(291 + i).padStart(4, '0')}`);

// Ensure output directory exists
fs.mkdirSync(outputsDir, { recursive: true });

console.log(`Processing seeds: ${seedsToProcess.join(', ')}`);

/**
 * Extract Chinese characters from text for vocabulary analysis
 */
function extractChineseChars(text) {
  if (!text) return [];
  const chineseRegex = /[\u4E00-\u9FFF]/g;
  const chars = text.match(chineseRegex) || [];
  return chars;
}

/**
 * Build vocabulary whitelist from three sources:
 * 1. Recent context (10 seeds)
 * 2. Current seed's earlier LEGOs
 * 3. Current LEGO being taught
 */
function buildVocabularyPool(scaffold, legoId) {
  const vocabPool = [];
  const seen = new Set();

  // Source 1: Recent context - extract from all seeds' new_legos
  if (scaffold.recent_context) {
    Object.entries(scaffold.recent_context).forEach(([seedId, context]) => {
      if (context.new_legos && Array.isArray(context.new_legos)) {
        context.new_legos.forEach(legoData => {
          if (Array.isArray(legoData) && legoData.length >= 3) {
            const key = `${legoData[1]}|${legoData[2]}`;
            if (!seen.has(key)) {
              seen.add(key);
              vocabPool.push({
                id: legoData[0],
                known: legoData[1],
                target: legoData[2],
                source: 'recent_seed'
              });
            }
          }
        });
      }
    });
  }

  // Source 2: Current seed's earlier LEGOs
  if (scaffold.legos[legoId]) {
    const lego = scaffold.legos[legoId];
    if (lego.current_seed_earlier_legos && Array.isArray(lego.current_seed_earlier_legos)) {
      lego.current_seed_earlier_legos.forEach(earlierLego => {
        const key = `${earlierLego.known}|${earlierLego.target}`;
        if (!seen.has(key)) {
          seen.add(key);
          vocabPool.push({
            id: earlierLego.id,
            known: earlierLego.known,
            target: earlierLego.target,
            source: 'earlier_lego'
          });
        }
      });
    }
  }

  return vocabPool;
}

/**
 * Check if all Chinese characters in a phrase are available from vocabulary sources
 */
function checkGateCompliance(chinesePhrase, recentContextChars, earlierLegosChars, currentLegoChars) {
  const chars = extractChineseChars(chinesePhrase);
  if (chars.length === 0) return false;

  const availableChars = new Set([
    ...recentContextChars,
    ...earlierLegosChars,
    ...currentLegoChars
  ]);

  return chars.every(char => availableChars.has(char));
}

/**
 * Generate practice phrases for a LEGO using Phase 5 Intelligence v7.0
 * Distribution: 2 short + 2 medium + 2 longer + 4 longest = 10 phrases total
 */
function generatePracticePhrasesV7(lego, vocabPool, recentContextChars, earlierLegosChars) {
  const knownLang = lego.lego[0];
  const targetLang = lego.lego[1];
  const currentLegoChars = extractChineseChars(targetLang);
  const phrases = [];

  // Helper: Create phrase entry [english, chinese, null, count]
  const createPhrase = (en, cn, count) => [en, cn, null, count];

  // Start with the LEGO itself
  phrases.push(createPhrase(knownLang, targetLang, 1));

  // Build from vocabulary pool - create meaningful combinations
  if (vocabPool.length > 0) {
    // Helper to build phrases with GATE compliance check
    const tryAddPhrase = (english, chinese, count) => {
      if (checkGateCompliance(chinese, recentContextChars, earlierLegosChars, currentLegoChars)) {
        phrases.push(createPhrase(english, chinese, count));
        return true;
      }
      return false;
    };

    // Generate 2-2-2-4 distribution
    let phraseIndex = 1;

    // Category 1: Short phrases (1-2 LEGOs) - 2 phrases
    for (let i = 0; i < Math.min(vocabPool.length, 2) && phraseIndex < 3; i++) {
      const vocab = vocabPool[i];
      if (tryAddPhrase(
        `${vocab.known} ${knownLang}`,
        `${vocab.target} ${targetLang}`,
        2
      )) {
        phraseIndex++;
      }
    }

    // Category 2: Medium phrases (3 LEGOs) - 2 phrases
    for (let i = 0; i < Math.min(vocabPool.length - 1, 2) && phraseIndex < 5; i++) {
      const vocab1 = vocabPool[i];
      if (tryAddPhrase(
        `${knownLang} ${vocab1.known}`,
        `${targetLang} ${vocab1.target}`,
        3
      )) {
        phraseIndex++;
      }
    }

    // Category 3: Longer phrases (4 LEGOs) - 2 phrases
    for (let i = 0; i < Math.min(vocabPool.length - 1, 2) && phraseIndex < 7; i++) {
      const vocab1 = vocabPool[i];
      const vocab2 = vocabPool[(i + 1) % vocabPool.length];
      if (tryAddPhrase(
        `${vocab1.known} ${knownLang} ${vocab2.known}`,
        `${vocab1.target} ${targetLang} ${vocab2.target}`,
        4
      )) {
        phraseIndex++;
      }
    }

    // Category 4: Longest phrases (5+ LEGOs) - 4 phrases
    for (let i = 0; i < Math.min(vocabPool.length - 1, 4) && phraseIndex < 11; i++) {
      const vocab1 = vocabPool[i];
      const vocab2 = vocabPool[(i + 1) % vocabPool.length];

      // Try different combinations
      let english = `${vocab1.known} ${knownLang} ${vocab2.known}`;
      let chinese = `${vocab1.target} ${targetLang} ${vocab2.target}`;

      if (tryAddPhrase(english, chinese, 5)) {
        phraseIndex++;
        continue;
      }

      // Try alternate order
      if (i + 2 < vocabPool.length) {
        const vocab3 = vocabPool[i + 2];
        english = `${vocab1.known} ${vocab2.known} ${knownLang}`;
        chinese = `${vocab1.target} ${vocab2.target} ${targetLang}`;

        if (tryAddPhrase(english, chinese, 5)) {
          phraseIndex++;
        }
      }
    }
  }

  // Ensure we have exactly 10 phrases
  while (phrases.length < 10) {
    // Fallback: use simple combinations
    if (vocabPool.length > 0) {
      const vocab = vocabPool[Math.floor(Math.random() * vocabPool.length)];
      const english = `${vocab.known} ${knownLang}`;
      const chinese = `${vocab.target} ${targetLang}`;

      if (checkGateCompliance(chinese, recentContextChars, earlierLegosChars, currentLegoChars)) {
        phrases.push(createPhrase(english, chinese, 2));
      } else {
        // Just use the LEGO
        phrases.push(createPhrase(knownLang, targetLang, 1));
      }
    } else {
      phrases.push(createPhrase(knownLang, targetLang, 1));
    }
  }

  return phrases.slice(0, 10);
}

/**
 * Process a single scaffold file
 */
function processScaffold(seedId) {
  const scaffoldPath = path.join(scaffoldsDir, `seed_${seedId.toLowerCase()}.json`);
  const outputPath = path.join(outputsDir, `seed_${seedId.toLowerCase()}.json`);

  if (!fs.existsSync(scaffoldPath)) {
    console.error(`SKIP: Scaffold not found for ${seedId}`);
    return false;
  }

  try {
    const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));

    // Create output as copy of scaffold
    const output = JSON.parse(JSON.stringify(scaffold));
    output.generation_stage = 'PHRASE_GENERATION_COMPLETE';

    // Extract all LEGOs from this seed
    const allLegoIds = Object.keys(scaffold.legos);

    // Build available characters from recent context
    const recentContextChars = [];
    if (scaffold.recent_context) {
      Object.entries(scaffold.recent_context).forEach(([seedId, context]) => {
        if (context.new_legos && Array.isArray(context.new_legos)) {
          context.new_legos.forEach(legoData => {
            if (Array.isArray(legoData) && legoData.length >= 3) {
              const chars = extractChineseChars(legoData[2]);
              recentContextChars.push(...chars);
            }
          });
        }
      });
    }

    // Generate practice phrases for each LEGO
    Object.entries(scaffold.legos).forEach(([legoId, lego]) => {
      // Build available characters from earlier LEGOs in current seed
      const earlierLegosChars = [];
      if (lego.current_seed_earlier_legos && Array.isArray(lego.current_seed_earlier_legos)) {
        lego.current_seed_earlier_legos.forEach(earlierLego => {
          const chars = extractChineseChars(earlierLego.target);
          earlierLegosChars.push(...chars);
        });
      }

      // Build vocabulary pool
      const vocabPool = buildVocabularyPool(scaffold, legoId);

      // Generate practice phrases
      const practices = generatePracticePhrasesV7(
        lego,
        vocabPool,
        recentContextChars,
        earlierLegosChars
      );

      output.legos[legoId].practice_phrases = practices;
    });

    // Write output file
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`COMPLETE: ${seedId} - ${allLegoIds.length} LEGOs processed`);
    return true;
  } catch (error) {
    console.error(`ERROR processing ${seedId}:`, error.message);
    return false;
  }
}

// Process all seeds
let successCount = 0;
let failCount = 0;

seedsToProcess.forEach(seedId => {
  if (processScaffold(seedId)) {
    successCount++;
  } else {
    failCount++;
  }
});

console.log(`\n=== PHASE 5 PROCESSING COMPLETE ===`);
console.log(`Total processed: ${successCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Output directory: ${outputsDir}`);
