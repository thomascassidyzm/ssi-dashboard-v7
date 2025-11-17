#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const courseBase = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const scaffoldsDir = path.join(courseBase, 'phase5_scaffolds');
const outputsDir = path.join(courseBase, 'phase5_outputs');
const seedsToProcess = Array.from({ length: 10 }, (_, i) => `S${String(281 + i).padStart(4, '0')}`);

// Ensure output directory exists
fs.mkdirSync(outputsDir, { recursive: true });

console.log(`Processing seeds: ${seedsToProcess.join(', ')}`);

/**
 * Generate practice phrases for a LEGO based on Phase 5 Intelligence
 * Distribution: 2 short + 2 medium + 2 longer + 4 longest = 10 phrases total
 */
function generatePracticePhrasesV7(lego, allCurrentLegosBefore, recentContext) {
  const knownLang = lego.lego[0];
  const targetLang = lego.lego[1];
  const phrases = [];

  // Helper: Create phrase entry [english, chinese, null, count]
  const createPhrase = (en, cn, count) => [en, cn, null, count];

  // 1. Start with the LEGO itself (count=1)
  phrases.push(createPhrase(knownLang, targetLang, 1));

  // 2. Collect vocabulary sources from recent context and earlier LEGOs
  const vocabPool = [];

  // Add vocabulary from recent seeds (from recent_context)
  // Format: [legoId, english, chinese]
  if (recentContext) {
    Object.entries(recentContext).forEach(([seedId, context]) => {
      if (context.new_legos && Array.isArray(context.new_legos)) {
        context.new_legos.forEach(legoData => {
          if (Array.isArray(legoData) && legoData.length >= 3) {
            vocabPool.push({
              id: legoData[0],
              known: legoData[1],  // English
              target: legoData[2], // Chinese
              source: 'recent_seed'
            });
          }
        });
      }
    });
  }

  // Add current seed's earlier LEGOs
  if (allCurrentLegosBefore && Array.isArray(allCurrentLegosBefore)) {
    allCurrentLegosBefore.forEach(prevLego => {
      vocabPool.push({
        id: prevLego.id,
        known: prevLego.known,
        target: prevLego.target,
        source: 'earlier_lego'
      });
    });
  }

  // Remove duplicates and limit vocabulary pool
  const uniqueVocab = [];
  const seen = new Set();
  vocabPool.forEach(vocab => {
    const key = `${vocab.known}|${vocab.target}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueVocab.push(vocab);
    }
  });

  // 3. Generate phrases with different complexity levels
  const shortPhrases = [];
  const mediumPhrases = [];
  const longerPhrases = [];
  const longestPhrases = [];

  // Generate variations by combining with vocabulary
  if (uniqueVocab.length > 0) {
    // Short phrases (1-2 components): VOCAB + LEGO
    for (let i = 0; i < Math.min(3, uniqueVocab.length); i++) {
      const vocab = uniqueVocab[i];
      shortPhrases.push(createPhrase(
        `${vocab.known} ${knownLang}`,
        `${vocab.target} ${targetLang}`,
        2
      ));
    }

    // Medium phrases (3 components): VOCAB + LEGO + VOCAB
    for (let i = 0; i < Math.min(2, uniqueVocab.length - 1); i++) {
      mediumPhrases.push(createPhrase(
        `${knownLang} ${uniqueVocab[i].known}`,
        `${targetLang} ${uniqueVocab[i].target}`,
        3
      ));
    }

    // Longer phrases (4-5 components): VOCAB1 + LEGO + VOCAB2
    for (let i = 0; i < Math.min(3, uniqueVocab.length - 1); i++) {
      const vocab1 = uniqueVocab[i];
      const vocab2 = uniqueVocab[(i + 1) % uniqueVocab.length];
      longerPhrases.push(createPhrase(
        `${vocab1.known} ${knownLang} ${vocab2.known}`,
        `${vocab1.target} ${targetLang} ${vocab2.target}`,
        4
      ));
    }

    // Longest phrases (5+ components): Complex combinations
    for (let i = 0; i < Math.min(4, uniqueVocab.length - 1); i++) {
      const vocab1 = uniqueVocab[i];
      const vocab2 = uniqueVocab[(i + 1) % uniqueVocab.length];
      const vocab3 = uniqueVocab[(i + 2) % uniqueVocab.length];

      // Variation 1: V1 + LEGO + V2 + V3
      longestPhrases.push(createPhrase(
        `${vocab1.known} ${knownLang} ${vocab2.known} ${vocab3.known}`,
        `${vocab1.target} ${targetLang} ${vocab2.target} ${vocab3.target}`,
        5
      ));

      // Variation 2: V1 + V2 + LEGO + V3
      if (i < uniqueVocab.length - 2) {
        longestPhrases.push(createPhrase(
          `${vocab1.known} ${vocab2.known} ${knownLang} ${vocab3.known}`,
          `${vocab1.target} ${vocab2.target} ${targetLang} ${vocab3.target}`,
          5
        ));
      }
    }
  }

  // 4. Assemble according to distribution: 2-2-2-4 (10 total)
  const result = [
    phrases[0], // The LEGO itself (count=1)
    ...shortPhrases.slice(0, 2),
    ...mediumPhrases.slice(0, 2),
    ...longerPhrases.slice(0, 2),
    ...longestPhrases.slice(0, 4)
  ];

  // Ensure we have exactly 10 phrases
  while (result.length < 10) {
    if (uniqueVocab.length > 0) {
      const vocab = uniqueVocab[Math.floor(Math.random() * uniqueVocab.length)];
      result.push(createPhrase(
        `${vocab.known} ${knownLang}`,
        `${vocab.target} ${targetLang}`,
        2
      ));
    } else {
      result.push(createPhrase(knownLang, targetLang, 1));
    }
  }

  return result.slice(0, 10);
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

    // Generate practice phrases for each LEGO
    Object.entries(scaffold.legos).forEach(([legoId, lego]) => {
      // Get all earlier LEGOs in this seed
      const legoIndex = allLegoIds.indexOf(legoId);
      const currentSeedEarlierLegos = allLegoIds
        .slice(0, legoIndex)
        .map(id => {
          const earlierLego = scaffold.legos[id];
          return {
            id: id,
            known: earlierLego.lego[0],
            target: earlierLego.lego[1]
          };
        });

      // Generate practice phrases
      const practices = generatePracticePhrasesV7(
        lego,
        currentSeedEarlierLegos,
        scaffold.recent_context
      );

      output.legos[legoId].practice_phrases = practices;
      output.legos[legoId].current_seed_legos_available = currentSeedEarlierLegos
        .map(l => [l.known, l.target]);
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
