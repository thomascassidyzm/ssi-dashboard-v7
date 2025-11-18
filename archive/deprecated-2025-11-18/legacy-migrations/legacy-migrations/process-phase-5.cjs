#!/usr/bin/env node

/**
 * Phase 5: Basket Generation
 *
 * Generates practice phrase baskets (e-phrases and d-phrases) for each LEGO
 * following APML v7.6 specification with strict quality constraints.
 *
 * Usage:
 *   node process-phase-5.cjs <course_dir>
 *   node process-phase-5.cjs spa_for_eng_30seeds
 */

const fs = require('fs-extra');
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// =============================================================================
// CONFIGURATION
// =============================================================================

const BATCH_SIZE = 10; // Process 10 LEGOs at a time to avoid token limits
const MODEL = 'claude-sonnet-4-20250514';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract all LEGOs from LEGO_BREAKDOWNS_COMPLETE.json in order
 */
function extractLegosInOrder(legoBreakdowns) {
  const allLegos = [];

  for (const seed of legoBreakdowns) {
    const seedId = seed.seed_id;

    for (const lego of seed.lego_pairs) {
      allLegos.push({
        lego_id: lego.lego_id,
        seed_id: seedId,
        target_chunk: lego.target_chunk,
        known_chunk: lego.known_chunk,
        lego_type: lego.lego_type,
        is_culminating: lego.lego_id === seed.lego_pairs[seed.lego_pairs.length - 1].lego_id,
        original_target: seed.original_target,
        original_known: seed.original_known
      });
    }
  }

  return allLegos;
}

/**
 * Generate baskets for a batch of LEGOs using Claude
 */
async function generateBasketBatch(batch, previousLegos, courseLang) {
  const batchIds = batch.map(l => l.lego_id).join(', ');
  console.log(`  Processing batch: ${batchIds}`);

  // Build vocabulary list from previous LEGOs
  const vocabularyList = previousLegos.map(l =>
    `${l.lego_id}: "${l.target_chunk}" / "${l.known_chunk}"`
  ).join('\n');

  const prompt = `Generate Phase 5 baskets for the following LEGOs in ${courseLang}.

## CRITICAL E-PHRASE QUALITY HEURISTICS (NON-NEGOTIABLE)

**Quality Over Quantity:**
- Better to have 2-3 EXCELLENT e-phrases than 5 mediocre ones
- If you cannot create a quality 10-word phrase, DO NOT force it
- Empty baskets are EXPECTED and GOOD for early LEGOs

**Length Target:**
- **TARGET: 10 words** in target language (this is ideal)
- **MINIMUM: 7 words** (but prefer longer)
- **MAXIMUM: 15 words** (hard cap)
- Longer phrases = more practice value (provided they remain natural)

**NO CLUNKY PHRASES ALLOWED:**
- E-phrases MUST sound natural to a native speaker of BOTH languages
- If a phrase feels forced or awkward, DELETE it - don't include it
- Every e-phrase must be something people actually say

**Perfect Grammar Required:**
- Target language grammar must be PERFECT (no exceptions)
- English grammar must be PERFECT (no exceptions)

---

## PROGRESSIVE VOCABULARY CONSTRAINT (ABSOLUTE RULE)

**Available Vocabulary for This Batch:**
${vocabularyList || '(NO VOCABULARY AVAILABLE YET - expect empty baskets)'}

**Rules:**
- EVERY word in e-phrase MUST come from the vocabulary list above
- No exceptions - if vocabulary is insufficient, return empty basket
- Track which LEGOs you're using and verify they're in the list

---

## LEGOs TO PROCESS

${batch.map((lego, idx) => `
**LEGO ${idx + 1}: ${lego.lego_id}**
- Target: "${lego.target_chunk}"
- Known: "${lego.known_chunk}"
- Type: ${lego.lego_type}
${lego.is_culminating ? `- **CULMINATING LEGO** (last in seed ${lego.seed_id})
- Complete seed: "${lego.original_target}" / "${lego.original_known}"
- **E-PHRASE #1 MUST BE THE EXACT COMPLETE SEED SENTENCE**` : ''}
`).join('\n')}

---

## OUTPUT FORMAT

Return ONLY valid JSON (no markdown, no explanation), structured as:

{
  "S0001L01": {
    "lego": ["target", "known"],
    "e": [
      ["10-word natural phrase in target", "10-word natural phrase in English"],
      ...
    ],
    "d": {
      "2": [["2-lego phrase", "English"], ...],
      "3": [["3-lego phrase", "English"], ...],
      "4": [["4-lego phrase", "English"], ...],
      "5": [["5-lego phrase", "English"], ...]
    }
  }
}

**Remember:**
- Empty baskets: {"lego": [...], "e": [], "d": {}}
- Quality over quantity for e-phrases
- D-phrases can be clunky/fragment-like (they're building blocks)
- All d-phrases MUST contain the operative LEGO

Generate the baskets now.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    temperature: 1.0,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const content = response.content[0].text;

  // Extract JSON from response (handle markdown code blocks)
  let jsonText = content;
  if (content.includes('```json')) {
    jsonText = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
  } else if (content.includes('```')) {
    jsonText = content.match(/```\n([\s\S]*?)\n```/)?.[1] || content;
  }

  try {
    const baskets = JSON.parse(jsonText.trim());
    return baskets;
  } catch (error) {
    console.error('Failed to parse JSON response:', error.message);
    console.error('Response was:', jsonText.substring(0, 500));
    throw error;
  }
}

/**
 * Process entire course in batches
 */
async function processCourse(courseDir) {
  const coursePath = path.resolve(courseDir);
  const courseName = path.basename(coursePath);

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`Phase 5: Basket Generation`);
  console.log(`Course: ${courseName}`);
  console.log(`${'═'.repeat(70)}\n`);

  // Read LEGO breakdowns
  const legoPath = path.join(coursePath, 'LEGO_BREAKDOWNS_COMPLETE.json');
  if (!await fs.pathExists(legoPath)) {
    throw new Error(`LEGO_BREAKDOWNS_COMPLETE.json not found in ${courseName}`);
  }

  const legoBreakdowns = await fs.readJson(legoPath);
  const allLegos = extractLegosInOrder(legoBreakdowns);

  console.log(`Found ${allLegos.length} LEGOs to process`);
  console.log(`Processing in batches of ${BATCH_SIZE}\n`);

  // Determine course language from directory name
  const courseLang = courseName.split('_')[0];
  const langMap = {
    'spa': 'Spanish',
    'ita': 'Italian',
    'fra': 'French',
    'cmn': 'Mandarin Chinese'
  };
  const fullLangName = langMap[courseLang] || courseLang;

  // Process in batches
  const allBaskets = {};

  for (let i = 0; i < allLegos.length; i += BATCH_SIZE) {
    const batch = allLegos.slice(i, i + BATCH_SIZE);
    const previousLegos = allLegos.slice(0, i); // Vocabulary from all previous LEGOs

    console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(allLegos.length / BATCH_SIZE)}`);

    try {
      const batchBaskets = await generateBasketBatch(batch, previousLegos, fullLangName);
      Object.assign(allBaskets, batchBaskets);

      // Brief pause to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`Error processing batch starting at ${batch[0].lego_id}:`, error.message);
      throw error;
    }
  }

  // Save baskets
  const outputPath = path.join(coursePath, 'baskets.json');
  await fs.writeJson(outputPath, allBaskets, { spaces: 2 });

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`✅ SUCCESS`);
  console.log(`Generated ${Object.keys(allBaskets).length} baskets`);
  console.log(`Saved to: ${outputPath}`);
  console.log(`${'═'.repeat(70)}\n`);

  // Print statistics
  let nonEmpty = 0;
  let totalEPhrases = 0;
  for (const [id, basket] of Object.entries(allBaskets)) {
    if (basket.e && basket.e.length > 0) {
      nonEmpty++;
      totalEPhrases += basket.e.length;
    }
  }

  console.log(`Statistics:`);
  console.log(`  Total baskets: ${Object.keys(allBaskets).length}`);
  console.log(`  Non-empty baskets: ${nonEmpty}`);
  console.log(`  Empty baskets: ${Object.keys(allBaskets).length - nonEmpty} (expected for early LEGOs)`);
  console.log(`  Total e-phrases: ${totalEPhrases}`);
  console.log(`  Avg e-phrases per non-empty basket: ${(totalEPhrases / nonEmpty).toFixed(1)}\n`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node process-phase-5.cjs <course_dir>');
    console.log('  node process-phase-5.cjs spa_for_eng_30seeds\n');
    process.exit(1);
  }

  const courseDir = args[0];

  try {
    await processCourse(courseDir);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
