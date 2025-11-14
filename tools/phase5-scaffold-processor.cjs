#!/usr/bin/env node

/**
 * Phase 5: Scaffold Processor for cmn_for_eng course (S0461-S0469)
 *
 * Processes pre-built scaffolds and fills practice_phrases arrays using
 * extended thinking for linguistic quality.
 *
 * Usage:
 *   node phase5-scaffold-processor.js
 */

const fs = require('fs-extra');
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Configuration
const COURSE_DIR = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLDS_DIR = path.join(COURSE_DIR, 'phase5_scaffolds');
const OUTPUT_DIR = path.join(COURSE_DIR, 'phase5_outputs');
const SEEDS_TO_PROCESS = Array.from({length: 9}, (_, i) =>
  `s${String(461 + i).padStart(4, '0')}`
);

// Extended thinking is recommended for linguistic tasks
const MODEL = 'claude-sonnet-4-20250514';
const THINKING_BUDGET = 8000; // tokens for extended thinking

/**
 * Generate practice phrases for a single LEGO using extended thinking
 */
async function generatePhrasesForLego(scaffold, legoId, legoData, seedLegos) {
  const { lego, type, is_final_lego, current_seed_earlier_legos } = legoData;
  const [english, chinese] = lego;
  const { known: seedKnown, target: seedTarget } = scaffold.seed_pair;

  // Build vocabulary list from current seed's earlier LEGOs
  const vocabularyList = current_seed_earlier_legos
    .map(lego => `${lego.target} (${lego.known})`)
    .join('\n');

  const prompt = `You are a Mandarin Chinese language pedagogy expert. Generate exactly 10 practice phrases for this LEGO (language element).

CRITICAL CONSTRAINTS:
1. Generate EXACTLY 10 phrases (no more, no less)
2. Distribution MUST be: 2 short (1-2 words) + 2 medium (3 words) + 2 longer (4-5 words) + 4 long (6+ words)
3. EVERY Chinese word MUST come ONLY from available vocabulary
4. All phrases must sound natural to native speakers
5. English and Chinese grammar must be perfect
6. Format: ["English phrase", "Chinese phrase"] - both exactly as shown

LEGO DETAILS:
- ID: ${legoId}
- English: "${english}"
- Chinese: "${chinese}"
- Type: ${type} (${type === 'A' ? 'atomic/single word' : 'molecular/phrase'})
- Seed sentence: "${seedTarget}" / "${seedKnown}"
- Is final LEGO: ${is_final_lego}

AVAILABLE VOCABULARY (from earlier LEGOs in this seed):
${vocabularyList || '(NO VOCABULARY YET - ok for first LEGO)'}

RECENT LEGOS FROM PREVIOUS SEEDS (also available):
${seedLegos
  .slice(0, 10)
  .map(l => `- ${l.target} (${l.known})`)
  .join('\n')}

TASK:
Generate 10 natural practice phrases that progressively build in complexity.
${is_final_lego ? 'CRITICAL: Phrase #10 MUST be the complete seed sentence: "${seedTarget}"' : ''}

Return ONLY valid JSON array with 10 items, each [english, chinese]:
[
  ["short phrase", "短语"],
  ...
  (total 10 items with the distribution above)
]`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 10000,
      thinking: {
        type: 'enabled',
        budget_tokens: THINKING_BUDGET
      },
      temperature: 1.0,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Extract the JSON from the response
    let jsonText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        jsonText = block.text;
        break;
      }
    }

    // Parse the response
    if (!jsonText.trim().startsWith('[')) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }

    const phrases = JSON.parse(jsonText.trim());

    if (!Array.isArray(phrases) || phrases.length !== 10) {
      console.error(`Invalid phrase count for ${legoId}: got ${phrases.length} phrases`);
      return null;
    }

    // Convert to the required format with word count
    const formattedPhrases = phrases.map(([eng, chn]) => [eng, chn, null, chn.split(/\s+/).length]);

    // Calculate distribution
    const distribution = {
      short_1_to_2_legos: 0,
      medium_3_legos: 0,
      longer_4_legos: 0,
      longest_5_legos: 0
    };

    formattedPhrases.forEach(phrase => {
      const wordCount = phrase[3];
      if (wordCount <= 2) distribution.short_1_to_2_legos++;
      else if (wordCount === 3) distribution.medium_3_legos++;
      else if (wordCount === 4) distribution.longer_4_legos++;
      else distribution.longest_5_legos++;
    });

    return { phrases: formattedPhrases, distribution };

  } catch (error) {
    console.error(`Error generating phrases for ${legoId}:`, error.message);
    return null;
  }
}

/**
 * Process a single scaffold file
 */
async function processScaffold(seedFile) {
  const seedPath = path.join(SCAFFOLDS_DIR, seedFile);
  console.log(`\nProcessing: ${seedFile}`);

  try {
    const scaffold = await fs.readJson(seedPath);
    const seedId = scaffold.seed_id;

    // Collect all recent legos from recent_context
    const seedLegos = [];
    for (const [recentSeed, data] of Object.entries(scaffold.recent_context || {})) {
      if (data.new_legos) {
        data.new_legos.forEach(([id, eng, chn]) => {
          seedLegos.push({ target: chn, known: eng });
        });
      }
    }

    // Process each LEGO
    const legos = scaffold.legos;
    const legoIds = Object.keys(legos).sort();

    console.log(`  Found ${legoIds.length} LEGOs to process`);

    for (const legoId of legoIds) {
      const legoData = legos[legoId];

      console.log(`    Generating phrases for ${legoId}...`);
      const result = await generatePhrasesForLego(scaffold, legoId, legoData, seedLegos);

      if (result) {
        legoData.practice_phrases = result.phrases;
        legoData.phrase_distribution = result.distribution;
      } else {
        console.warn(`    Failed to generate phrases for ${legoId}`);
        legoData.practice_phrases = [];
      }

      // Brief pause to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update generation stage
    scaffold.generation_stage = 'PHRASES_GENERATED';

    // Save output
    const outputPath = path.join(OUTPUT_DIR, seedFile);
    await fs.ensureDir(OUTPUT_DIR);
    await fs.writeJson(outputPath, scaffold, { spaces: 2 });

    console.log(`  ✅ Saved to: ${outputPath}`);
    return true;

  } catch (error) {
    console.error(`  ❌ Error processing ${seedFile}:`, error.message);
    return false;
  }
}

/**
 * Main processing function
 */
async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('Phase 5: Scaffold Processor');
  console.log('Course: cmn_for_eng (Mandarin Chinese for English Speakers)');
  console.log(`Seeds: S0461-S0469`);
  console.log('═'.repeat(70));

  const seedFiles = SEEDS_TO_PROCESS.map(seed => `seed_${seed}.json`);
  let processed = 0;

  for (const seedFile of seedFiles) {
    const success = await processScaffold(seedFile);
    if (success) processed++;
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`✅ PROCESSING COMPLETE`);
  console.log(`Successfully processed: ${processed}/${seedFiles.length} seeds`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('═'.repeat(70) + '\n');
}

// Run
main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
