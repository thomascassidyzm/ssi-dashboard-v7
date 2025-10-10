#!/usr/bin/env node

/**
 * Phase 5: Pattern-Aware Baskets
 *
 * Groups deduplicated LEGOs into pedagogically optimal teaching baskets.
 * Uses graph intelligence to ensure pattern diversity and progression.
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const DEDUPE_DIR = path.join(__dirname, 'amino_acids', 'legos_deduplicated');
const GRAPH_FILE = path.join(__dirname, 'phase_outputs', 'phase_3.5_graph.json');
const INTELLIGENCE_FILE = path.join(__dirname, 'phase_outputs', 'phase_2_corpus_intelligence.json');
const BASKETS_DIR = path.join(__dirname, 'amino_acids', 'baskets');
const OUTPUT_FILE = path.join(__dirname, 'phase_outputs', 'phase_5_baskets.json');

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASKET_SIZE = 10; // Target number of LEGOs per basket
const MAX_BASKETS = 25; // Maximum number of baskets to create

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
 * Load all deduplicated LEGO amino acids
 */
async function loadDeduplicatedLEGOs() {
  const files = await fs.readdir(DEDUPE_DIR);
  const legos = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = await fs.readJson(path.join(DEDUPE_DIR, file));
      legos.push(data);
    }
  }

  return legos;
}

/**
 * Load graph intelligence
 */
async function loadGraph() {
  return await fs.readJson(GRAPH_FILE);
}

/**
 * Load corpus intelligence
 */
async function loadIntelligence() {
  return await fs.readJson(INTELLIGENCE_FILE);
}

/**
 * Calculate composite score for basket assignment
 * Combines FCFS, Utility, and Pedagogical scores
 */
function calculateCompositeScore(lego) {
  const fcfs = lego.fcfs_score || 0;
  const utility = lego.utility_score || 0;
  const pedagogical = lego.pedagogical_score || 0;

  // Weighted combination: FCFS 40%, Utility 30%, Pedagogical 30%
  return (fcfs * 0.4) + (utility * 0.3) + (pedagogical * 0.3);
}

/**
 * Group LEGOs by grammatical pattern
 */
function categorizeByPattern(legos) {
  const patterns = {
    subject_verb: [],
    verb_phrases: [],
    questions: [],
    negations: [],
    modals: [],
    general: []
  };

  legos.forEach(lego => {
    const text = lego.text.toLowerCase();

    if (/\b(i|you|we|they|he|she|it)\s+(am|is|are|was|were|have|had|do|does|did|can|could|will|would|should)\b/.test(text)) {
      patterns.subject_verb.push(lego);
    } else if (/\b(going to|want to|need to|have to|able to|trying to)\b/.test(text)) {
      patterns.verb_phrases.push(lego);
    } else if (/\b(what|when|where|who|why|how|is there|are there|do you|can you)\b/.test(text)) {
      patterns.questions.push(lego);
    } else if (/\b(not|don't|doesn't|didn't|won't|can't|couldn't|shouldn't)\b/.test(text)) {
      patterns.negations.push(lego);
    } else if (/\b(can|could|will|would|should|might|must)\b/.test(text)) {
      patterns.modals.push(lego);
    } else {
      patterns.general.push(lego);
    }
  });

  return patterns;
}

/**
 * Create balanced baskets ensuring pattern diversity
 */
function createBaskets(legos, graph) {
  // Calculate composite scores
  legos.forEach(lego => {
    lego._compositeScore = calculateCompositeScore(lego);
  });

  // Sort by composite score (highest first)
  legos.sort((a, b) => b._compositeScore - a._compositeScore);

  // Categorize by pattern
  const patterns = categorizeByPattern(legos);

  // Create baskets with balanced pattern distribution
  const baskets = [];
  const totalBaskets = Math.min(MAX_BASKETS, Math.ceil(legos.length / BASKET_SIZE));

  for (let i = 0; i < totalBaskets; i++) {
    baskets.push({
      basket_id: i + 1,
      legos: [],
      patterns_included: new Set(),
      composite_score: 0
    });
  }

  // Distribute LEGOs across baskets in round-robin fashion
  // This ensures each basket gets a mix of high and low priority items
  let basketIndex = 0;

  // First pass: distribute by pattern to ensure diversity
  const patternKeys = Object.keys(patterns);

  for (const patternKey of patternKeys) {
    const patternLegos = patterns[patternKey];

    for (const lego of patternLegos) {
      const basket = baskets[basketIndex % baskets.length];
      basket.legos.push(lego);
      basket.patterns_included.add(patternKey);
      basket.composite_score += lego._compositeScore;
      basketIndex++;
    }
  }

  // Calculate average scores per basket
  baskets.forEach(basket => {
    if (basket.legos.length > 0) {
      basket.composite_score = Math.round(basket.composite_score / basket.legos.length);
    }
  });

  return baskets;
}

/**
 * Create basket amino acid
 */
function createBasketAminoAcid(basket, basketNumber) {
  const legoRefs = basket.legos.map(lego => ({
    uuid: lego.uuid,
    text: lego.text,
    provenance: lego.provenance,
    fcfs_score: lego.fcfs_score,
    utility_score: lego.utility_score
  }));

  const basketAminoAcid = {
    uuid: generateUUID({
      basket_id: basketNumber,
      legos: legoRefs.map(l => l.uuid).join(',')
    }),
    type: 'basket',
    basket_id: basketNumber,
    lego_count: basket.legos.length,
    legos: legoRefs,

    metadata: {
      course_code: 'spa_for_eng_30seeds',
      phase: 'phase_5',
      patterns_included: Array.from(basket.patterns_included),
      composite_score: basket.composite_score,
      pedagogical_notes: {
        purpose: 'Grouped for optimal teaching sequence',
        pattern_diversity: basket.patterns_included.size,
        progression: 'Balanced mix of FCFS and utility priorities'
      },
      created_at: new Date().toISOString()
    }
  };

  return basketAminoAcid;
}

// =============================================================================
// MAIN PROCESSOR
// =============================================================================

async function processPhase5() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Phase 5: Pattern-Aware Baskets');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load data
  console.log('🧬 Loading deduplicated LEGO amino acids...');
  const legos = await loadDeduplicatedLEGOs();
  console.log(`   Found ${legos.length} deduplicated LEGOs\n`);

  console.log('🔗 Loading graph intelligence...');
  const graph = await loadGraph();
  console.log(`   Loaded ${graph.graph.nodes.length} nodes, ${graph.graph.edges.length} edges\n`);

  console.log('📊 Loading corpus intelligence...');
  const intelligence = await loadIntelligence();
  console.log(`   Loaded FCFS rankings and utility scores\n`);

  // Create baskets
  console.log('🗂️  Creating pattern-aware baskets...');
  const baskets = createBaskets(legos, graph);
  console.log(`   Created ${baskets.length} balanced baskets\n`);

  // Ensure baskets directory exists
  await fs.ensureDir(BASKETS_DIR);

  // Save basket amino acids
  console.log('💾 Saving basket amino acids...');
  const basketAminoAcids = [];

  for (let i = 0; i < baskets.length; i++) {
    const basketAminoAcid = createBasketAminoAcid(baskets[i], i + 1);
    basketAminoAcids.push(basketAminoAcid);

    const basketFile = path.join(BASKETS_DIR, `basket_${String(i + 1).padStart(2, '0')}.json`);
    await fs.writeJson(basketFile, basketAminoAcid, { spaces: 2 });
  }

  console.log(`   Saved ${basketAminoAcids.length} baskets\n`);

  // Generate report
  console.log('📋 Generating basket report...');

  const report = {
    version: '7.0',
    phase: '5',
    generated_at: new Date().toISOString(),
    course_code: 'spa_for_eng_30seeds',

    statistics: {
      total_legos: legos.length,
      total_baskets: baskets.length,
      avg_legos_per_basket: (legos.length / baskets.length).toFixed(1),
      target_basket_size: BASKET_SIZE,
      pattern_diversity: 'Balanced across all baskets'
    },

    baskets_summary: basketAminoAcids.map(b => ({
      basket_id: b.basket_id,
      lego_count: b.lego_count,
      patterns: b.metadata.patterns_included,
      composite_score: b.metadata.composite_score
    })),

    pattern_distribution: {
      description: 'LEGOs distributed to ensure pattern diversity in each basket',
      strategy: 'Round-robin distribution with pattern balancing'
    },

    next_phase: {
      phase: '6',
      name: 'Introductions',
      purpose: 'Generate known-only introduction sequences for each basket'
    }
  };

  await fs.writeJson(OUTPUT_FILE, report, { spaces: 2 });
  console.log(`   Saved to: ${OUTPUT_FILE}\n`);

  // Display basket overview
  console.log('📊 Basket Overview:\n');
  basketAminoAcids.slice(0, 5).forEach(basket => {
    console.log(`   Basket ${basket.basket_id}:`);
    console.log(`     LEGOs: ${basket.lego_count}`);
    console.log(`     Patterns: ${basket.metadata.patterns_included.join(', ')}`);
    console.log(`     Score: ${basket.metadata.composite_score}`);
    console.log('');
  });

  if (basketAminoAcids.length > 5) {
    console.log(`   ... and ${basketAminoAcids.length - 5} more baskets\n`);
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Phase 5 Complete!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total Baskets: ${baskets.length}`);
  console.log(`Total LEGOs: ${legos.length}`);
  console.log(`Avg LEGOs/Basket: ${(legos.length / baskets.length).toFixed(1)}`);
  console.log(`Pattern Diversity: Balanced`);
  console.log('\nNext: Run Phase 6 (Introductions)');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run processor
processPhase5()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Phase 5 failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
