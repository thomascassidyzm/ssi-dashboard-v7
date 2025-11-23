#!/usr/bin/env node

/**
 * Phase 5 Enhanced Agent: AI-Powered Practice Phrase Generator
 *
 * Uses Claude to generate natural, meaningful practice phrases
 * for cmn_for_eng (S0001-S0010) following Phase 5 intelligence
 */

const fs = require('fs-extra');
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Configuration
const COURSE_DIR = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLD_DIR = path.join(COURSE_DIR, 'phase5_scaffolds');
const OUTPUT_DIR = path.join(COURSE_DIR, 'phase5_outputs');
const MODEL = 'claude-opus-4-1-20250805';
const BATCH_SIZE = 3; // Process 3 LEGOs at a time

/**
 * Extract available vocabulary from scaffold context
 */
function extractAvailableVocabulary(scaffold, legoId) {
  const legoObj = scaffold.legos[legoId];
  const availableVocab = { chinese: new Set(), english: new Set() };

  // Add from recent seed pairs
  if (scaffold.recent_seed_pairs) {
    Object.entries(scaffold.recent_seed_pairs).forEach(([seedId, seedData]) => {
      if (Array.isArray(seedData) && seedData[0]) {
        const sentence = seedData[0];
        if (Array.isArray(sentence)) {
          // Format: [englishSentence, chineseSentence]
          if (sentence[0]) {
            sentence[0].split(/\s+/).forEach(word => {
              if (word.trim()) availableVocab.english.add(word.trim());
            });
          }
          if (sentence[1]) {
            sentence[1].split(/\s+/).forEach(word => {
              if (word.trim()) availableVocab.chinese.add(word.trim());
            });
          }
        } else if (typeof sentence === 'string') {
          sentence.split(/\s+/).forEach(word => {
            if (word.trim()) availableVocab.english.add(word.trim());
          });
        }
      }

      // Extract from LEGO pairs if present
      if (seedData[1] && Array.isArray(seedData[1])) {
        seedData[1].forEach(legoPair => {
          if (Array.isArray(legoPair) && legoPair.length >= 3) {
            if (legoPair[1]) availableVocab.english.add(legoPair[1].toLowerCase());
            if (legoPair[2]) {
              legoPair[2].split(/\s+/).forEach(word => {
                if (word.trim()) availableVocab.chinese.add(word.trim());
              });
            }
          }
        });
      }
    });
  }

  // Add from current seed LEGOs available
  if (legoObj && legoObj.current_seed_legos_available) {
    legoObj.current_seed_legos_available.forEach(prevLego => {
      if (Array.isArray(prevLego)) {
        if (prevLego[0]) availableVocab.english.add(prevLego[0].toLowerCase());
        if (prevLego[1]) {
          prevLego[1].split(/\s+/).forEach(word => {
            if (word.trim()) availableVocab.chinese.add(word.trim());
          });
        }
      }
    });
  }

  // Add the current LEGO
  if (legoObj && legoObj.lego) {
    if (legoObj.lego[0]) availableVocab.english.add(legoObj.lego[0].toLowerCase());
    if (legoObj.lego[1]) {
      legoObj.lego[1].split(/\s+/).forEach(word => {
        if (word.trim()) availableVocab.chinese.add(word.trim());
      });
    }
  }

  return availableVocab;
}

/**
 * Generate phrases using Claude for a batch of LEGOs
 */
async function generatePhraseBatchWithClaude(scaffold, legoIds) {
  const legoDetails = legoIds.map(legoId => {
    const legoObj = scaffold.legos[legoId];
    const vocab = extractAvailableVocabulary(scaffold, legoId);
    const availLegos = legoObj.current_seed_legos_available || [];

    return {
      legoId,
      english: legoObj.lego[0],
      chinese: legoObj.lego[1],
      type: legoObj.type,
      isFinal: legoObj.is_final_lego,
      availablePrevLegos: availLegos,
      availableChinese: Array.from(vocab.chinese).slice(0, 50),
      availableEnglish: Array.from(vocab.english).slice(0, 30)
    };
  });

  const prompt = `You are a master of creating natural practice phrases for English speakers learning Mandarin Chinese.

For each LEGO below, generate exactly 10 natural, meaningful practice phrases in the distribution: 2-2-2-4
- 2 phrases using 1-2 LEGOs (simple, short)
- 2 phrases using 3 LEGOs (medium)
- 2 phrases using 4-5 LEGOs (longer)
- 4 phrases using 5+ LEGOs (longest, most complex)

CRITICAL RULES:
1. EVERY Chinese word MUST be from the available vocabulary list
2. Phrases must be natural and meaningful - what a learner would actually say
3. Start simple, build to complex
4. For final LEGOs, phrase #10 must be the complete seed sentence
5. Return ONLY valid JSON, no markdown

Seed: "${scaffold.seed_pair.target}"
(Chinese: "${scaffold.seed_pair.known}")

${legoDetails.map((lego, idx) => {
    const prevLegoStr = lego.availablePrevLegos.map(l => `"${l[0]}"→"${l[1]}"`).join(', ') || 'none';
    return `
LEGOs[${idx}]:
- ID: ${lego.legoId}
- English: "${lego.english}"
- Chinese: "${lego.chinese}"
- Type: ${lego.type}
- Final LEGO: ${lego.isFinal}
- Available previous LEGOs this seed: ${prevLegoStr}
- Available Chinese words: ${lego.availableChinese.join(', ')}
- Available English words: ${lego.availableEnglish.join(', ')}
`;
  }).join('\n')}

Return JSON format:
{
  "${legoIds[0]}": [
    ["English phrase", "Chinese phrase", null, lego_count],
    ...
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0].text;
    let jsonText = content;

    // Extract JSON from response
    if (content.includes('```json')) {
      jsonText = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
    } else if (content.includes('```')) {
      jsonText = content.match(/```\n([\s\S]*?)\n```/)?.[1] || content;
    }

    const result = JSON.parse(jsonText.trim());
    return result;
  } catch (error) {
    console.error('Claude generation error:', error.message);
    return {}; // Return empty so we use fallback
  }
}

/**
 * Fallback phrase generation when Claude fails
 */
function generatePhrasesLocally(scaffold, legoId) {
  const legoObj = scaffold.legos[legoId];
  const [englishLego, chineseLego] = legoObj.lego;
  const prevLegos = legoObj.current_seed_legos_available || [];

  const phrases = [];

  // Simple progression from easy to complex
  phrases.push([englishLego, chineseLego, null, 1]);

  if (prevLegos.length > 0) {
    phrases.push([`${prevLego[0]} ${englishLego}`, `${prevLegos[0][1]}${chineseLego}`, null, 2]);
  } else {
    phrases.push([`can ${englishLego}`, `能${chineseLego}`, null, 2]);
  }

  phrases.push([`want to ${englishLego}`, `想${chineseLego}`, null, 3]);
  phrases.push([`I ${englishLego}`, `我${chineseLego}`, null, 3]);

  phrases.push([`I want ${englishLego}`, `我想${chineseLego}`, null, 4]);
  phrases.push([`can ${englishLego} now`, `能现在${chineseLego}`, null, 4]);

  // 5+ phrases
  for (let i = 0; i < 4; i++) {
    if (legoObj.is_final_lego && i === 3) {
      phrases.push([scaffold.seed_pair.target, scaffold.seed_pair.known, null, 10]);
    } else {
      phrases.push([
        `I want to ${englishLego} with you`,
        `我想和你${chineseLego}`,
        null,
        5 + i
      ]);
    }
  }

  return phrases.slice(0, 10);
}

/**
 * Process a single scaffold
 */
async function processScaffold(scaffoldPath, outputPath) {
  const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));
  const seedId = scaffold.seed_id;

  console.log(`\nProcessing ${seedId}...`);

  const legoIds = Object.keys(scaffold.legos).sort();

  // Process in batches
  for (let i = 0; i < legoIds.length; i += BATCH_SIZE) {
    const batchLegoIds = legoIds.slice(i, Math.min(i + BATCH_SIZE, legoIds.length));

    console.log(`  Batch: ${batchLegoIds.join(', ')}`);

    let phrasesMap = {};

    // Try Claude generation
    try {
      phrasesMap = await generatePhraseBatchWithClaude(scaffold, batchLegoIds);
    } catch (error) {
      console.warn('    Claude generation failed, using fallback');
    }

    // Apply results and fallback for any failures
    for (const legoId of batchLegoIds) {
      if (phrasesMap[legoId] && Array.isArray(phrasesMap[legoId])) {
        scaffold.legos[legoId].practice_phrases = phrasesMap[legoId].slice(0, 10);
      } else {
        scaffold.legos[legoId].practice_phrases = generatePhrasesLocally(scaffold, legoId);
      }

      // Update phrase distribution
      const phrases = scaffold.legos[legoId].practice_phrases;
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

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  scaffold.generation_stage = 'PHRASE_GENERATION_COMPLETE';

  fs.writeJsonSync(outputPath, scaffold, { spaces: 2 });
  console.log(`  ✓ Completed ${legoIds.length} LEGOs`);
}

/**
 * Main
 */
async function main() {
  console.log('Phase 5 Enhanced Agent: AI-Powered Generator');
  console.log('=============================================');
  console.log(`Course: cmn_for_eng`);
  console.log(`Seeds: S0001-S0010`);
  console.log(`Model: ${MODEL}`);
  console.log();

  fs.ensureDirSync(OUTPUT_DIR);

  for (let i = 1; i <= 10; i++) {
    const seedNum = String(i).padStart(4, '0');
    const seedId = `s${seedNum}`;
    const scaffoldPath = path.join(SCAFFOLD_DIR, `seed_${seedId}.json`);
    const outputPath = path.join(OUTPUT_DIR, `seed_${seedId}.json`);

    if (fs.existsSync(scaffoldPath)) {
      try {
        await processScaffold(scaffoldPath, outputPath);
      } catch (error) {
        console.error(`✗ Error processing ${seedId}:`, error.message);
      }
    }
  }

  console.log('\n=============================================');
  console.log('Enhanced Generation Complete');
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('=============================================\n');
}

main().catch(console.error);
