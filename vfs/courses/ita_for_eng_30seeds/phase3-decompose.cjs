#!/usr/bin/env node

/**
 * Phase 3: LEGO Decomposition
 * Decompose each SEED_PAIR into LEGO_PAIRS
 * Stores decomposition in translations.json
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_DIR = __dirname;
const TRANSLATIONS_FILE = path.join(COURSE_DIR, 'translations.json');

async function decomposeSeeds() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Phase 3: LEGO Decomposition');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load translations
  const translations = await fs.readJson(TRANSLATIONS_FILE);

  console.log(`📖 Loaded ${Object.keys(translations).length} SEED_PAIRS\n`);

  // For now, let's do a simple word-by-word decomposition
  // Later we can make this smarter with the LLM

  const translationsWithLegos = {};

  for (const [seedId, seedPair] of Object.entries(translations)) {
    const [targetText, knownText] = seedPair;

    // Simple tokenization
    const targetWords = targetText.replace(/[.,!?;:]$/, '').split(/\s+/);
    const knownWords = knownText.replace(/[.,!?;:]$/, '').split(/\s+/);

    // Create LEGO_PAIRS for each word
    const legoPairs = [];
    const maxLen = Math.min(targetWords.length, knownWords.length);

    for (let i = 0; i < targetWords.length; i++) {
      const legoId = `${seedId}L${String(i + 1).padStart(2, '0')}`;

      // Very simple 1:1 word mapping for now
      // In reality, this should be smarter about phrase boundaries
      legoPairs.push({
        lego_id: legoId,
        target: targetWords[i],
        known: knownWords[i] || '???',  // Placeholder if mismatch
        position: i + 1
      });
    }

    translationsWithLegos[seedId] = {
      seed_pair: seedPair,
      lego_pairs: legoPairs
    };

    console.log(`✓ ${seedId}: ${targetWords.length} LEGOs`);
  }

  // Save augmented translations
  const outputFile = path.join(COURSE_DIR, 'translations_with_legos.json');
  await fs.writeJson(outputFile, translationsWithLegos, { spaces: 2 });

  console.log(`\n✅ Saved decomposition to: ${outputFile}\n`);

  // Stats
  const totalLegos = Object.values(translationsWithLegos).reduce(
    (sum, t) => sum + t.lego_pairs.length,
    0
  );

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total SEED_PAIRS: ${Object.keys(translationsWithLegos).length}`);
  console.log(`Total LEGO_PAIRS: ${totalLegos}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

decomposeSeeds()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
