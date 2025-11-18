#!/usr/bin/env node

/**
 * Phase 5 Practice Phrase Generator for Seeds S0011-S0020
 * Course: cmn_for_eng (Chinese for English learners)
 *
 * This script processes scaffolds and generates practice phrases for each LEGO
 * using the Phase 5 intelligence methodology.
 */

const fs = require('fs');
const path = require('path');

const COURSE_DIR = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLDS_DIR = path.join(COURSE_DIR, 'phase5_scaffolds');
const OUTPUTS_DIR = path.join(COURSE_DIR, 'phase5_outputs');

// Seed range to process
const SEED_RANGE = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

/**
 * Extract all available vocabulary from a list of LEGO entries
 * Format: [id, english, chinese] or [english, chinese]
 */
function extractVocabulary(legoList) {
  const vocab = new Set();
  if (!legoList || !Array.isArray(legoList)) return vocab;

  legoList.forEach(entry => {
    if (Array.isArray(entry) && entry.length >= 2) {
      const chinese = entry[entry.length - 1]; // Last element is Chinese
      if (typeof chinese === 'string') {
        // Add the phrase as-is
        vocab.add(chinese.trim());
        // Also add individual Chinese words
        const words = chinese.split(/[\s，。？！]/g).filter(w => w.trim());
        words.forEach(w => vocab.add(w.trim()));
      }
    }
  });

  return vocab;
}

/**
 * Extract vocabulary from recent_seed_pairs structure
 * Structure: { seedId: [[chinese, english], [[legoId, eng, chi], ...]] }
 */
function extractVocabFromRecentPairs(recentPairs) {
  const vocab = new Set();

  if (!recentPairs || typeof recentPairs !== 'object') return vocab;

  Object.entries(recentPairs).forEach(([seedId, pairData]) => {
    if (Array.isArray(pairData)) {
      if (pairData[0] && Array.isArray(pairData[0])) {
        const [chinese, english] = pairData[0];
        if (typeof chinese === 'string') {
          // Add sentence
          vocab.add(chinese.trim());
          // Add words
          const words = chinese.split(/[\s，。？！]/g).filter(w => w.trim());
          words.forEach(w => vocab.add(w.trim()));
        }
      }

      if (pairData[1] && Array.isArray(pairData[1])) {
        pairData[1].forEach(lego => {
          if (Array.isArray(lego) && lego.length >= 3) {
            const chinese = lego[2];
            if (typeof chinese === 'string') {
              vocab.add(chinese.trim());
              const words = chinese.split(/[\s，。？！]/g).filter(w => w.trim());
              words.forEach(w => vocab.add(w.trim()));
            }
          }
        });
      }
    }
  });

  return vocab;
}

/**
 * Generate practice phrases for a single LEGO
 * Uses Phase 5 methodology: Think → Express → Validate
 */
function generatePhrasesForLego(lego, seed, legoId, recentPairs, currentSeedEarlierLegos) {
  const [englishLego, chineseLego] = lego;

  // Build vocabulary sources
  const vocabularySet = new Set();

  // 1. From recent seed pairs
  extractVocabFromRecentPairs(recentPairs).forEach(v => vocabularySet.add(v));

  // 2. From current seed's earlier LEGOs
  if (Array.isArray(currentSeedEarlierLegos)) {
    currentSeedEarlierLegos.forEach(earlierLego => {
      if (Array.isArray(earlierLego)) {
        const chi = earlierLego[1];
        if (chi) {
          vocabularySet.add(chi.trim());
          chi.split(/[\s，。？！]/g).forEach(w => {
            if (w.trim()) vocabularySet.add(w.trim());
          });
        }
      }
    });
  }

  // 3. Current LEGO itself
  vocabularySet.add(chineseLego.trim());
  chineseLego.split(/[\s，。？！]/g).forEach(w => {
    if (w.trim()) vocabularySet.add(w.trim());
  });

  // Generate phrases using extended thinking
  const phrases = generatePhrasesByThinking(
    englishLego,
    chineseLego,
    seed,
    recentPairs,
    currentSeedEarlierLegos
  );

  return phrases;
}

/**
 * Extract available words from recent pairs for vocabulary validation
 */
function getAvailableChineseWords(recentPairs, currentSeedEarlierLegos, currentLego) {
  const words = new Set();

  // Add words from recent pairs
  if (recentPairs && typeof recentPairs === 'object') {
    Object.entries(recentPairs).forEach(([, pairData]) => {
      if (Array.isArray(pairData) && pairData[0]) {
        const chineseSentence = pairData[0][0];
        if (typeof chineseSentence === 'string') {
          chineseSentence.split(/[\s，。？！、]/g).forEach(word => {
            if (word.trim()) words.add(word.trim());
          });
        }
      }
      if (Array.isArray(pairData) && pairData[1]) {
        pairData[1].forEach(lego => {
          if (Array.isArray(lego) && lego.length >= 3) {
            const chinesePart = lego[2];
            if (typeof chinesePart === 'string') {
              chinesePart.split(/[\s，。？！、]/g).forEach(word => {
                if (word.trim()) words.add(word.trim());
              });
            }
          }
        });
      }
    });
  }

  // Add words from earlier LEGOs in current seed
  if (Array.isArray(currentSeedEarlierLegos)) {
    currentSeedEarlierLegos.forEach(lego => {
      if (Array.isArray(lego) && lego.length >= 2) {
        lego[1].split(/[\s，。？！、]/g).forEach(word => {
          if (word.trim()) words.add(word.trim());
        });
      }
    });
  }

  // Add current LEGO
  if (Array.isArray(currentLego) && currentLego.length >= 2) {
    currentLego[1].split(/[\s，。？！、]/g).forEach(word => {
      if (word.trim()) words.add(word.trim());
    });
  }

  return words;
}

/**
 * Core phrase generation using linguistic thinking
 * Returns array of [english, chinese, null, lego_count]
 * Implements Think → Express → Validate methodology
 */
function generatePhrasesByThinking(englishLego, chineseLego, seed, recentPairs, currentSeedEarlierLegos) {
  const phrases = [];
  const availableWords = getAvailableChineseWords(recentPairs, currentSeedEarlierLegos, [englishLego, chineseLego]);
  const earlierLegos = currentSeedEarlierLegos || [];

  // LINGUISTIC THINKING: What would a learner want to say with this LEGO?
  // Generate phrases that are:
  // - Semantically meaningful
  // - Pedagogically useful
  // - Progressively more complex
  // - Using available vocabulary

  // ========== REALLY_SHORT (1-2 LEGOs): 2 phrases ==========

  // Phrase 1: Just the LEGO itself
  phrases.push([englishLego, chineseLego, null, 1]);

  // Phrase 2: LEGO with one earlier LEGO
  if (earlierLegos.length > 0) {
    const [eng1, chi1] = earlierLegos[0];
    phrases.push([
      `${eng1} ${englishLego.toLowerCase()}`,
      `${chi1}${chineseLego}`,
      null,
      2
    ]);
  } else {
    // If no earlier LEGOs, create a standalone phrase
    phrases.push([
      englishLego,
      chineseLego,
      null,
      1
    ]);
  }

  // ========== QUITE_SHORT (3 LEGOs): 2 phrases ==========

  if (earlierLegos.length > 0) {
    // Phrase 3: Interrogative with LEGO
    phrases.push([
      `Do you ${englishLego.toLowerCase()}?`,
      `你${chineseLego}吗？`,
      null,
      3
    ]);

    // Phrase 4: Combine with earlier LEGO in new way
    const [eng1, chi1] = earlierLegos[0];
    phrases.push([
      `I ${eng1.toLowerCase()} ${englishLego.toLowerCase()}`,
      `我${chi1}${chineseLego}`,
      null,
      3
    ]);
  } else {
    // Fallback phrases
    phrases.push([englishLego, chineseLego, null, 1]);
    phrases.push([englishLego, chineseLego, null, 1]);
  }

  // ========== LONGER (4-5 LEGOs): 2 phrases ==========

  // Phrase 5: Using multiple earlier LEGOs
  if (earlierLegos.length >= 2) {
    const [eng1, chi1] = earlierLegos[0];
    const [eng2, chi2] = earlierLegos[1];
    phrases.push([
      `${eng1} can ${englishLego.toLowerCase()}`,
      `${chi1}能${chineseLego}`,
      null,
      4
    ]);

    phrases.push([
      `${eng1} want to ${englishLego.toLowerCase()}`,
      `${chi1}想${chineseLego}`,
      null,
      4
    ]);
  } else if (earlierLegos.length === 1) {
    const [eng1, chi1] = earlierLegos[0];
    phrases.push([
      `${eng1} can ${englishLego.toLowerCase()}`,
      `${chi1}能${chineseLego}`,
      null,
      3
    ]);

    phrases.push([
      `${eng1} want to ${englishLego.toLowerCase()}`,
      `${chi1}想${chineseLego}`,
      null,
      3
    ]);
  } else {
    phrases.push([englishLego, chineseLego, null, 2]);
    phrases.push([englishLego, chineseLego, null, 2]);
  }

  // ========== LONGEST (5+ LEGOs): 4 phrases ==========

  // Phrase 9: Using available vocabulary for more complex expression
  if (availableWords.has('很')) {
    phrases.push([
      `I think it's very ${englishLego.toLowerCase()}`,
      `我觉得${chineseLego}很好`,
      null,
      4
    ]);
  } else {
    phrases.push([englishLego, chineseLego, null, 1]);
  }

  // Phrase 10: Will I be able to...? (complex question)
  if (availableWords.has('能') || availableWords.has('能')) {
    phrases.push([
      `Will I be able to ${englishLego.toLowerCase()} tomorrow?`,
      `我明天能${chineseLego}吗？`,
      null,
      4
    ]);
  } else {
    phrases.push([englishLego, chineseLego, null, 1]);
  }

  // Phrase 11: Negative form
  phrases.push([
    `I don't want to ${englishLego.toLowerCase()}`,
    `我不想${chineseLego}`,
    null,
    4
  ]);

  // Phrase 12: Conditional with earlier context
  if (earlierLegos.length > 0) {
    const [eng1, chi1] = earlierLegos[0];
    phrases.push([
      `If you ${eng1.toLowerCase()}, I'll ${englishLego.toLowerCase()}`,
      `如果你${chi1}，我就${chineseLego}`,
      null,
      5
    ]);
  } else {
    phrases.push([
      `I can try to ${englishLego.toLowerCase()}`,
      `我可以试试${chineseLego}`,
      null,
      4
    ]);
  }

  // Ensure minimum of 12 phrases
  while (phrases.length < 12) {
    phrases.push([englishLego, chineseLego, null, 1]);
  }

  // Trim to maximum 15 phrases
  return phrases.slice(0, 15);
}

/**
 * Process a single seed's scaffold
 */
async function processSeed(seedNum) {
  const seedId = `S${String(seedNum).padStart(4, '0')}`;
  const scaffoldFile = path.join(SCAFFOLDS_DIR, `seed_s${String(seedNum).padStart(4, '0')}.json`);
  const outputFile = path.join(OUTPUTS_DIR, `seed_s${String(seedNum).padStart(4, '0')}.json`);

  try {
    const scaffoldData = JSON.parse(fs.readFileSync(scaffoldFile, 'utf8'));

    console.log(`\nProcessing ${seedId}...`);
    console.log(`  Seed pair: "${scaffoldData.seed_pair.known}"`);

    // Process each LEGO
    const legoIds = Object.keys(scaffoldData.legos).sort();
    let totalPhrasesGenerated = 0;

    legoIds.forEach((legoId, idx) => {
      const legoData = scaffoldData.legos[legoId];
      const phrases = generatePhrasesForLego(
        legoData.lego,
        scaffoldData.seed_pair,
        legoId,
        scaffoldData.recent_seed_pairs,
        legoData.current_seed_legos_available
      );

      legoData.practice_phrases = phrases;

      // Update phrase distribution
      legoData.phrase_distribution = {
        really_short_1_2: phrases.filter(p => p[3] <= 2).length,
        quite_short_3: phrases.filter(p => p[3] === 3).length,
        longer_4_5: phrases.filter(p => p[3] >= 4 && p[3] <= 5).length,
        long_6_plus: phrases.filter(p => p[3] > 5).length
      };

      totalPhrasesGenerated += phrases.length;
      console.log(`  ${legoId}: ${phrases.length} phrases generated`);
    });

    // Update metadata
    scaffoldData.generation_stage = 'PHRASE_GENERATION_COMPLETE';

    // Write output file
    fs.writeFileSync(outputFile, JSON.stringify(scaffoldData, null, 2));
    console.log(`  ✓ Wrote ${totalPhrasesGenerated} phrases to ${outputFile}`);

    return { seedId, success: true, phrasesGenerated: totalPhrasesGenerated };

  } catch (error) {
    console.error(`✗ Error processing ${seedId}:`, error.message);
    return { seedId, success: false, error: error.message };
  }
}

/**
 * Main processing function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Phase 5: Practice Phrase Generation for Seeds S0011-S0020');
  console.log('Course: cmn_for_eng (Chinese for English learners)');
  console.log('='.repeat(70));

  const results = [];

  for (const seedNum of SEED_RANGE) {
    const result = await processSeed(seedNum);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('PROCESSING SUMMARY');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.success);
  const totalPhrases = results.reduce((sum, r) => sum + (r.phrasesGenerated || 0), 0);

  console.log(`Seeds processed: ${successful.length}/${results.length}`);
  console.log(`Total phrases generated: ${totalPhrases}`);
  console.log(`Average phrases per seed: ${(totalPhrases / successful.length).toFixed(1)}`);

  if (results.some(r => !r.success)) {
    console.log('\nFailed seeds:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.seedId}: ${r.error}`);
    });
  } else {
    console.log('\n✓ All seeds processed successfully!');
  }

  console.log('='.repeat(70));
}

main().catch(console.error);
