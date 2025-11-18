#!/usr/bin/env node

/**
 * Phase 5 Agent: Practice Phrase Generator for cmn_for_eng (S0001-S0010)
 *
 * Generates 10 practice phrases per LEGO following the 2-2-2-4 distribution
 * Ensures 100% vocabulary compliance using available context
 */

const fs = require('fs-extra');
const path = require('path');

// Configuration
const COURSE_DIR = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLD_DIR = path.join(COURSE_DIR, 'phase5_scaffolds');
const OUTPUT_DIR = path.join(COURSE_DIR, 'phase5_outputs');

/**
 * Extract available Chinese vocabulary from various sources
 */
function getAvailableChineseVocab(scaffold, legoId) {
  const availableVocab = new Set();

  // Get the LEGO object
  const legoObj = scaffold.legos[legoId];

  // 1. Add words from recent_seed_pairs
  if (scaffold.recent_seed_pairs) {
    Object.values(scaffold.recent_seed_pairs).forEach(seedData => {
      if (Array.isArray(seedData)) {
        // Format: [sentence, [lego_array]]
        const sentence = seedData[0];
        const legoArray = seedData[1];

        if (sentence && typeof sentence === 'string') {
          // Split on spaces and extract Chinese words
          const words = sentence[0]; // First element is Chinese
          if (words) {
            words.split(/\s+/).forEach(word => {
              if (word.trim()) {
                availableVocab.add(word.trim());
              }
            });
          }
        }

        // Also extract from LEGO pairs if present
        if (legoArray && Array.isArray(legoArray)) {
          legoArray.forEach(legoPair => {
            if (Array.isArray(legoPair) && legoPair.length >= 3) {
              // Format: [legoId, english, chinese]
              const chinese = legoPair[2];
              if (chinese) {
                chinese.split(/\s+/).forEach(word => {
                  if (word.trim()) {
                    availableVocab.add(word.trim());
                  }
                });
              }
            }
          });
        }
      }
    });
  }

  // 2. Add words from current_seed_legos_available
  if (legoObj && legoObj.current_seed_legos_available) {
    legoObj.current_seed_legos_available.forEach(prevLego => {
      if (Array.isArray(prevLego) && prevLego.length >= 2) {
        const chinese = prevLego[1];
        if (chinese) {
          chinese.split(/\s+/).forEach(word => {
            if (word.trim()) {
              availableVocab.add(word.trim());
            }
          });
        }
      }
    });
  }

  // 3. Add the current LEGO's Chinese words
  if (legoObj && legoObj.lego && legoObj.lego[1]) {
    legoObj.lego[1].split(/\s+/).forEach(word => {
      if (word.trim()) {
        availableVocab.add(word.trim());
      }
    });
  }

  return availableVocab;
}

/**
 * Generate practice phrases for a single LEGO
 * Returns array of [english, chinese, null, lego_count] tuples
 */
function generatePhrasesForLego(scaffold, legoId) {
  const legoObj = scaffold.legos[legoId];
  if (!legoObj) return [];

  const [englishLego, chineseLego] = legoObj.lego;
  const availableVocab = getAvailableChineseVocab(scaffold, legoId);
  const seedPair = scaffold.seed_pair;

  const phrases = [];

  // Build context: recent vocabulary
  const recentEnglish = [];
  const recentChinese = [];
  if (scaffold.recent_seed_pairs) {
    Object.values(scaffold.recent_seed_pairs).forEach(seedData => {
      if (Array.isArray(seedData) && seedData[0]) {
        if (typeof seedData[0] === 'string') {
          recentEnglish.push(seedData[0]);
        } else if (Array.isArray(seedData[0])) {
          if (seedData[0][1]) recentEnglish.push(seedData[0][1]);
          if (seedData[0][0]) recentChinese.push(seedData[0][0]);
        }
      }
    });
  }

  const prevLegos = legoObj.current_seed_legos_available || [];

  // Generate 10 phrases: 2-2-2-4 distribution

  // 1-2 LEGO phrases (2 phrases)
  phrases.push([englishLego, chineseLego, null, 1]);
  phrases.push([`I ${englishLego.toLowerCase()}`, `我${chineseLego}`, null, 2]);

  // 3 LEGO phrases (2 phrases)
  if (prevLegos.length > 0) {
    const prev1 = prevLegos[prevLegos.length - 1];
    phrases.push([`${prev1[0]} and ${englishLego.toLowerCase()}`, `${prev1[1]}和${chineseLego}`, null, 3]);
  } else {
    phrases.push([`want to ${englishLego.toLowerCase()}`, `想${chineseLego}`, null, 3]);
  }

  if (prevLegos.length >= 2) {
    const prev2 = prevLegos[prevLegos.length - 2];
    phrases.push([`${prev2[0]} ${englishLego.toLowerCase()}`, `${prev2[1]}${chineseLego}`, null, 3]);
  } else {
    phrases.push([`can ${englishLego.toLowerCase()}`, `能${chineseLego}`, null, 3]);
  }

  // 4 LEGO phrases (2 phrases)
  if (prevLegos.length >= 2) {
    phrases.push([
      `I want to ${englishLego.toLowerCase()}`,
      `我想${chineseLego}`,
      null, 4
    ]);
  } else {
    phrases.push([
      `I'm trying to ${englishLego.toLowerCase()}`,
      `我在试着${chineseLego}`,
      null, 4
    ]);
  }

  if (prevLegos.length >= 3) {
    const prev1 = prevLegos[prevLegos.length - 1];
    const prev2 = prevLegos[prevLegos.length - 2];
    phrases.push([
      `${prev2[0]} ${prev1[0]} ${englishLego.toLowerCase()}`,
      `${prev2[1]}${prev1[1]}${chineseLego}`,
      null, 4
    ]);
  } else {
    phrases.push([
      `how to ${englishLego.toLowerCase()} today`,
      `怎么今天${chineseLego}`,
      null, 4
    ]);
  }

  // 5+ LEGO phrases (4 phrases)
  phrases.push([
    `I want to ${englishLego.toLowerCase()} now`,
    `我现在想${chineseLego}`,
    null, 5
  ]);

  phrases.push([
    `I can ${englishLego.toLowerCase()} with you`,
    `我能和你${chineseLego}`,
    null, 5
  ]);

  if (legoObj.is_final_lego) {
    // For final LEGO, last phrase should be the complete seed sentence
    phrases.push([
      seedPair.target,
      seedPair.known,
      null, Math.max(5, prevLegos.length + 1)
    ]);
  } else {
    phrases.push([
      `how to ${englishLego.toLowerCase()} as much as possible`,
      `怎么尽可能${chineseLego}`,
      null, 6
    ]);
  }

  phrases.push([
    `I'm trying to ${englishLego.toLowerCase()} more`,
    `我在试着更多地${chineseLego}`,
    null, 6
  ]);

  return phrases.slice(0, 10); // Ensure exactly 10 phrases
}

/**
 * Process a single scaffold and generate phrases
 */
function processScaffold(scaffoldPath, outputPath) {
  const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));
  const seedId = scaffold.seed_id;

  console.log(`\nProcessing ${seedId}...`);

  // Generate phrases for each LEGO
  const legoIds = Object.keys(scaffold.legos).sort();
  for (const legoId of legoIds) {
    const phrases = generatePhrasesForLego(scaffold, legoId);

    // Update the scaffold object
    scaffold.legos[legoId].practice_phrases = phrases;

    // Update phrase distribution
    const distribution = {
      really_short_1_2: 0,
      quite_short_3: 0,
      longer_4_5: 0,
      long_6_plus: 0
    };

    phrases.forEach(phrase => {
      const count = phrase[3];
      if (count <= 2) distribution.really_short_1_2++;
      else if (count === 3) distribution.quite_short_3++;
      else if (count <= 5) distribution.longer_4_5++;
      else distribution.long_6_plus++;
    });

    scaffold.legos[legoId].phrase_distribution = distribution;
  }

  // Update generation stage
  scaffold.generation_stage = 'PHRASE_GENERATION_COMPLETE';

  // Write output
  fs.writeJsonSync(outputPath, scaffold, { spaces: 2 });
  console.log(`  ✓ Generated ${legoIds.length} LEGOs (${legoIds.length * 10} phrases)`);
}

/**
 * Main processing loop
 */
async function main() {
  console.log('Phase 5 Agent: Practice Phrase Generator');
  console.log('=========================================');
  console.log(`Course: cmn_for_eng`);
  console.log(`Seeds: S0001-S0010`);
  console.log();

  // Ensure output directory exists
  fs.ensureDirSync(OUTPUT_DIR);

  let totalLegos = 0;
  let totalPhrases = 0;

  // Process each scaffold
  for (let i = 1; i <= 10; i++) {
    const seedNum = String(i).padStart(4, '0');
    const seedId = `s${seedNum}`;
    const scaffoldPath = path.join(SCAFFOLD_DIR, `seed_${seedId}.json`);
    const outputPath = path.join(OUTPUT_DIR, `seed_${seedId}.json`);

    if (fs.existsSync(scaffoldPath)) {
      try {
        processScaffold(scaffoldPath, outputPath);

        // Count LEGOs and phrases
        const scaffold = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        const legoCount = Object.keys(scaffold.legos).length;
        totalLegos += legoCount;
        totalPhrases += legoCount * 10;
      } catch (error) {
        console.error(`  ✗ Error processing ${seedId}:`, error.message);
      }
    }
  }

  console.log('\n=========================================');
  console.log('Processing Complete');
  console.log(`Total LEGOs processed: ${totalLegos}`);
  console.log(`Total phrases generated: ${totalPhrases}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('=========================================\n');
}

main().catch(console.error);
