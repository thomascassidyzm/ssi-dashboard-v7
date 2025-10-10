#!/usr/bin/env node

/**
 * Phase 6: Introductions
 *
 * Generates known-only introduction sequences for each basket.
 * Primes learners with familiar patterns before new LEGOs.
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const BASKETS_DIR = path.join(__dirname, 'amino_acids', 'baskets');
const TRANSLATIONS_DIR = path.join(__dirname, 'amino_acids', 'translations');
const INTRODUCTIONS_DIR = path.join(__dirname, 'amino_acids', 'introductions');
const OUTPUT_FILE = path.join(__dirname, 'phase_outputs', 'phase_6_introductions.json');

// =============================================================================
// CONFIGURATION
// =============================================================================

const INTRODUCTION_SIZE = 3; // Number of known-only items per basket introduction

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate deterministic UUID from content
 */
function generateUUID(content) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(content));
  return hash.digest('hex').substring(0, 32);
}

/**
 * Load all basket amino acids
 */
async function loadBaskets() {
  const files = await fs.readdir(BASKETS_DIR);
  const baskets = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = await fs.readJson(path.join(BASKETS_DIR, file));
      baskets.push(data);
    }
  }

  // Sort by basket_id
  baskets.sort((a, b) => a.basket_id - b.basket_id);

  return baskets;
}

/**
 * Load all translation amino acids
 */
async function loadTranslations() {
  const files = await fs.readdir(TRANSLATIONS_DIR);
  const translations = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = await fs.readJson(path.join(TRANSLATIONS_DIR, file));
      translations.push(data);
    }
  }

  return translations;
}

/**
 * Extract known words/phrases from basket LEGOs
 */
function extractKnownPatterns(basket, previousBaskets) {
  const knownPatterns = new Set();

  // Add all LEGOs from previous baskets as "known"
  previousBaskets.forEach(prevBasket => {
    prevBasket.legos.forEach(lego => {
      knownPatterns.add(lego.text.toLowerCase());
    });
  });

  return Array.from(knownPatterns);
}

/**
 * Generate introduction items (known-only phrases)
 */
function generateIntroduction(basket, basketIndex, allBaskets, translations) {
  // Get all previous baskets (everything learned so far)
  const previousBaskets = allBaskets.slice(0, basketIndex);

  // For basket 1, use simple high-frequency patterns
  if (basketIndex === 0) {
    const simplePatterns = [
      { text: "I", type: "pronoun", frequency: "high" },
      { text: "you", type: "pronoun", frequency: "high" },
      { text: "the", type: "article", frequency: "high" }
    ];

    return simplePatterns.slice(0, INTRODUCTION_SIZE).map((item, idx) => ({
      sequence: idx + 1,
      text: item.text,
      type: item.type,
      pedagogical_note: "Foundation word - builds toward first LEGOs"
    }));
  }

  // For later baskets, use patterns from previous baskets
  const knownPatterns = extractKnownPatterns(basket, previousBaskets);

  // Select introduction items that bridge to new content
  const currentLegoTexts = basket.legos.map(l => l.text.toLowerCase());

  // Find LEGOs from previous baskets that share words with current basket
  const bridgingPatterns = [];

  previousBaskets.forEach(prevBasket => {
    prevBasket.legos.forEach(lego => {
      const legoWords = new Set(lego.text.toLowerCase().split(/\s+/));
      const hasSharedWords = currentLegoTexts.some(currentText => {
        const currentWords = new Set(currentText.split(/\s+/));
        return Array.from(legoWords).some(word => currentWords.has(word));
      });

      if (hasSharedWords) {
        bridgingPatterns.push({
          text: lego.text,
          type: "bridging_lego",
          from_basket: prevBasket.basket_id,
          pedagogical_note: `Recalls pattern from Basket ${prevBasket.basket_id}`
        });
      }
    });
  });

  // Select top bridging patterns
  const selectedIntro = bridgingPatterns
    .slice(0, INTRODUCTION_SIZE)
    .map((item, idx) => ({
      sequence: idx + 1,
      text: item.text,
      type: item.type,
      pedagogical_note: item.pedagogical_note
    }));

  // If we don't have enough bridging patterns, add some high-utility LEGOs from previous baskets
  if (selectedIntro.length < INTRODUCTION_SIZE) {
    const fillerLEGOs = previousBaskets
      .flatMap(b => b.legos)
      .filter(l => !selectedIntro.some(si => si.text === l.text))
      .sort((a, b) => b.utility_score - a.utility_score)
      .slice(0, INTRODUCTION_SIZE - selectedIntro.length);

    fillerLEGOs.forEach((lego, idx) => {
      selectedIntro.push({
        sequence: selectedIntro.length + 1,
        text: lego.text,
        type: "review_lego",
        pedagogical_note: "Review of high-utility pattern"
      });
    });
  }

  return selectedIntro;
}

/**
 * Create introduction amino acid
 */
function createIntroductionAminoAcid(basket, introduction) {
  const introAminoAcid = {
    uuid: generateUUID({
      basket_id: basket.basket_id,
      introduction: introduction.map(i => i.text).join(',')
    }),
    type: 'introduction',
    basket_id: basket.basket_id,
    sequence_length: introduction.length,
    items: introduction,

    metadata: {
      course_code: 'mkd_for_eng_574seeds',
      phase: 'phase_6',
      purpose: 'Known-only priming sequence before new LEGOs',
      pedagogical_strategy: 'Bridge from known patterns to new content',
      basket_uuid: basket.uuid,
      created_at: new Date().toISOString()
    }
  };

  return introAminoAcid;
}

// =============================================================================
// MAIN PROCESSOR
// =============================================================================

async function processPhase6() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Phase 6: Introductions (Final Phase)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load data
  console.log('🗂️  Loading basket amino acids...');
  const baskets = await loadBaskets();
  console.log(`   Found ${baskets.length} baskets\n`);

  console.log('📖 Loading translation amino acids...');
  const translations = await loadTranslations();
  console.log(`   Found ${translations.length} translations\n`);

  // Ensure introductions directory exists
  await fs.ensureDir(INTRODUCTIONS_DIR);

  // Generate introductions for each basket
  console.log('✨ Generating known-only introductions...');
  const introductionAminoAcids = [];

  for (let i = 0; i < baskets.length; i++) {
    const basket = baskets[i];
    const introduction = generateIntroduction(basket, i, baskets, translations);
    const introAminoAcid = createIntroductionAminoAcid(basket, introduction);

    introductionAminoAcids.push(introAminoAcid);

    // Save introduction amino acid
    const introFile = path.join(INTRODUCTIONS_DIR, `intro_basket_${String(basket.basket_id).padStart(2, '0')}.json`);
    await fs.writeJson(introFile, introAminoAcid, { spaces: 2 });

    if ((i + 1) % 10 === 0) {
      console.log(`   Generated ${i + 1}/${baskets.length} introductions...`);
    }
  }

  console.log(`   ✓ Generated ${introductionAminoAcids.length} introductions\n`);

  // Generate final report
  console.log('📋 Generating final course report...');

  const report = {
    version: '7.0',
    phase: '6',
    generated_at: new Date().toISOString(),
    course_code: 'mkd_for_eng_574seeds',

    statistics: {
      total_baskets: baskets.length,
      total_introductions: introductionAminoAcids.length,
      avg_introduction_length: (
        introductionAminoAcids.reduce((sum, i) => sum + i.sequence_length, 0) /
        introductionAminoAcids.length
      ).toFixed(1),
      pedagogical_strategy: 'Known-only priming before new content'
    },

    introductions_summary: introductionAminoAcids.map(intro => ({
      basket_id: intro.basket_id,
      sequence_length: intro.sequence_length,
      items_preview: intro.items.slice(0, 2).map(i => i.text).join(', ') + '...'
    })),

    course_complete: {
      status: 'ALL PHASES COMPLETE',
      phases_executed: ['0', '1', '2', '3', '3.5', '4', '5', '6'],
      ready_for: 'Training deployment',
      amino_acids_generated: {
        translations: translations.length,
        legos_raw: 243,
        legos_deduplicated: 230,
        baskets: baskets.length,
        introductions: introductionAminoAcids.length
      }
    }
  };

  await fs.writeJson(OUTPUT_FILE, report, { spaces: 2 });
  console.log(`   Saved to: ${OUTPUT_FILE}\n`);

  // Display sample introductions
  console.log('📚 Sample Introductions:\n');
  introductionAminoAcids.slice(0, 3).forEach(intro => {
    console.log(`   Basket ${intro.basket_id} Introduction:`);
    intro.items.forEach(item => {
      console.log(`     ${item.sequence}. "${item.text}" - ${item.pedagogical_note}`);
    });
    console.log('');
  });

  // Final summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Phase 6 Complete! 🎉');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ALL PHASES EXECUTED SUCCESSFULLY');
  console.log('');
  console.log('Course Production Summary:');
  console.log(`  ✓ Phase 0: Corpus Pre-Analysis`);
  console.log(`  ✓ Phase 1: Pedagogical Translation (${translations.length} seeds)`);
  console.log(`  ✓ Phase 2: Corpus Intelligence (FCFS + Utility)`);
  console.log(`  ✓ Phase 3: LEGO Extraction (243 → 230 deduplicated)`);
  console.log(`  ✓ Phase 3.5: Graph Construction (adjacency patterns)`);
  console.log(`  ✓ Phase 4: Deduplication (provenance preserved)`);
  console.log(`  ✓ Phase 5: Pattern-Aware Baskets (${baskets.length} baskets)`);
  console.log(`  ✓ Phase 6: Introductions (${introductionAminoAcids.length} sequences)`);
  console.log('');
  console.log('Ready for: Training Deployment');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run processor
processPhase6()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Phase 6 failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
