#!/usr/bin/env node

/**
 * Phase 3: LEGO Decomposition
 *
 * Decomposes each SEED_PAIR into LEGO_PAIRS
 * Following new APML: Create ALL LEGO_PAIRS (deduplication happens later in Phase 5.5)
 *
 * Input: translations.json
 * Output: lego_decomposition.json
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = __dirname;
const TRANSLATIONS_FILE = path.join(COURSE_DIR, 'translations.json');
const OUTPUT_FILE = path.join(COURSE_DIR, 'phase_outputs', 'phase_3_lego_decomposition.json');

/**
 * Simple word-by-word decomposition
 * In production, this would use LLM for proper phrase chunking
 */
function decomposeIntoLegos(targetText, knownText, seedId) {
  // Clean punctuation
  const cleanTarget = targetText.replace(/[.,!?;:]$/, '');
  const cleanKnown = knownText.replace(/[.,!?;:]$/, '');

  // Split into words
  const targetWords = cleanTarget.split(/\s+/);
  const knownWords = cleanKnown.split(/\s+/);

  const legoPairs = [];

  // Simple 1:1 word mapping for now
  // TODO: Use LLM to identify proper phrase boundaries
  for (let i = 0; i < targetWords.length; i++) {
    const legoId = `${seedId}L${String(i + 1).padStart(2, '0')}`;

    legoPairs.push({
      lego_id: legoId,
      target: targetWords[i],
      known: knownWords[i] || '???',
      position: i + 1
    });
  }

  return legoPairs;
}

async function processPhase3() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Phase 3: LEGO Decomposition');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Ensure output directory exists
  await fs.ensureDir(path.dirname(OUTPUT_FILE));

  // Load translations
  console.log('📖 Loading SEED_PAIRS...');
  const translations = await fs.readJson(TRANSLATIONS_FILE);
  const seedIds = Object.keys(translations).sort();
  console.log(`   Found ${seedIds.length} SEED_PAIRS\n`);

  // Decompose each seed
  console.log('🧬 Decomposing SEED_PAIRS into LEGO_PAIRS...');

  const decomposition = {};
  let totalLegos = 0;

  for (const seedId of seedIds) {
    const [targetText, knownText] = translations[seedId];
    const legoPairs = decomposeIntoLegos(targetText, knownText, seedId);

    decomposition[seedId] = {
      seed_pair: {
        target: targetText,
        known: knownText
      },
      lego_pairs: legoPairs
    };

    totalLegos += legoPairs.length;
    console.log(`   ${seedId}: ${legoPairs.length} LEGOs`);
  }

  // Save decomposition
  const report = {
    version: '7.0',
    phase: '3',
    generated_at: new Date().toISOString(),
    course_code: 'ita_for_eng_30seeds',

    statistics: {
      total_seed_pairs: seedIds.length,
      total_lego_pairs: totalLegos,
      avg_legos_per_seed: (totalLegos / seedIds.length).toFixed(2)
    },

    decomposition: decomposition,

    next_phase: {
      phase: '5',
      name: 'Basket Generation',
      purpose: 'Create baskets for ALL LEGO_PAIRS (before deduplication)'
    }
  };

  await fs.writeJson(OUTPUT_FILE, report, { spaces: 2 });

  console.log(`\n✅ Saved to: ${OUTPUT_FILE}\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Phase 3 Complete!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`SEED_PAIRS: ${seedIds.length}`);
  console.log(`LEGO_PAIRS: ${totalLegos}`);
  console.log(`Avg LEGOs/Seed: ${(totalLegos / seedIds.length).toFixed(1)}`);
  console.log('\nNext: Run Phase 5 (Basket Generation)');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

processPhase3()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Phase 3 failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
