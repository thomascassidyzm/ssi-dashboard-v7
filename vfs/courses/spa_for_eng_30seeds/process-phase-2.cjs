#!/usr/bin/env node

/**
 * Phase 2: Corpus Intelligence Processor
 *
 * Analyzes translation corpus to determine:
 * - FCFS (First-Can-First-Say) order
 * - Utility scores (Frequency × Versatility × Simplicity)
 * - Dependency mappings
 */

const fs = require('fs-extra');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, 'amino_acids', 'translations');
const OUTPUT_FILE = path.join(__dirname, 'phase_outputs', 'phase_2_corpus_intelligence.json');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Read all translation amino acids
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

  // Sort by seed_id for consistent processing
  translations.sort((a, b) => a.seed_id.localeCompare(b.seed_id));

  return translations;
}

/**
 * Tokenize English text into words
 */
function tokenize(text) {
  return text.toLowerCase()
    .replace(/['']/g, "'") // normalize apostrophes
    .replace(/[.,!?;:]/g, '') // remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Calculate word frequency across all translations
 */
function analyzeWordFrequency(translations) {
  const wordFreq = new Map();
  const wordContexts = new Map(); // track which translations contain each word

  translations.forEach((trans, idx) => {
    const words = tokenize(trans.source);
    const uniqueWords = new Set(words);

    uniqueWords.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);

      if (!wordContexts.has(word)) {
        wordContexts.set(word, new Set());
      }
      wordContexts.get(word).add(idx);
    });
  });

  return { wordFreq, wordContexts };
}

/**
 * Calculate utility score for a translation
 * Formula: Frequency × Versatility × Simplicity
 */
function calculateUtility(translation, wordFreq, wordContexts, totalTranslations) {
  const words = tokenize(translation.source);

  // Frequency: average word frequency normalized to 0-1
  const avgFreq = words.reduce((sum, word) => sum + (wordFreq.get(word) || 0), 0) / words.length;
  const frequency = Math.min(avgFreq / 10, 1); // cap at 10 occurrences = 1.0

  // Versatility: how many different contexts the words appear in
  const avgContexts = words.reduce((sum, word) =>
    sum + (wordContexts.get(word)?.size || 0), 0) / words.length;
  const versatility = Math.min(avgContexts / totalTranslations, 1);

  // Simplicity: inverse of sentence length (shorter = simpler)
  const simplicity = Math.max(0, 1 - (words.length / 20)); // 20+ words = 0 simplicity

  // Combined utility score (0-100)
  const utility = (frequency * 0.4 + versatility * 0.3 + simplicity * 0.3) * 100;

  return Math.round(utility);
}

/**
 * Determine FCFS (First-Can-First-Say) order
 * Based on linguistic complexity and prerequisite knowledge
 */
function determineFCFS(translations, wordFreq) {
  const scored = translations.map((trans, idx) => {
    const words = tokenize(trans.source);

    // FCFS factors:
    // 1. Sentence length (shorter first)
    const lengthScore = Math.max(0, 20 - words.length);

    // 2. Word familiarity (common words first)
    const familiarityScore = words.reduce((sum, word) =>
      sum + (wordFreq.get(word) || 0), 0) / words.length;

    // 3. Grammatical complexity (simple present tense first)
    const hasComplexTense = /(?:were|was|will|would|could|should|might|have been|had been)/i.test(trans.source);
    const complexityPenalty = hasComplexTense ? -10 : 0;

    // 4. Question vs statement (statements first)
    const isQuestion = trans.source.includes('?');
    const questionPenalty = isQuestion ? -5 : 0;

    const fcfsScore = lengthScore + (familiarityScore * 2) + complexityPenalty + questionPenalty;

    return {
      uuid: trans.uuid,
      seed_id: trans.seed_id,
      fcfsScore: Math.round(fcfsScore * 10) / 10,
      originalIndex: idx
    };
  });

  // Sort by FCFS score (highest first)
  scored.sort((a, b) => b.fcfsScore - a.fcfsScore);

  return scored.map((item, idx) => ({
    rank: idx + 1,
    uuid: item.uuid,
    seed_id: item.seed_id,
    fcfs_score: item.fcfsScore
  }));
}

/**
 * Detect linguistic dependencies between translations
 */
function analyzeDependencies(translations) {
  const dependencies = {};

  // Simple dependency detection based on shared key phrases
  const keyPhrases = new Map();

  translations.forEach(trans => {
    const text = trans.source.toLowerCase();

    // Extract key grammatical patterns
    const patterns = [
      /\b(i am|i'm)\b/,
      /\b(you are|you're)\b/,
      /\b(he is|she is|it is|he's|she's|it's)\b/,
      /\b(we are|we're)\b/,
      /\b(they are|they're)\b/,
      /\b(can|could|will|would|should)\b/,
      /\b(going to)\b/,
      /\b(want to|need to)\b/
    ];

    patterns.forEach((pattern, idx) => {
      if (pattern.test(text)) {
        if (!keyPhrases.has(idx)) {
          keyPhrases.set(idx, []);
        }
        keyPhrases.get(idx).push(trans.uuid);
      }
    });
  });

  // Create dependency map
  translations.forEach(trans => {
    const deps = [];

    // If a translation uses complex patterns, it depends on simpler ones
    const text = trans.source.toLowerCase();
    if (/going to|want to|need to/.test(text)) {
      deps.push('basic_verbs');
    }
    if (/\?$/.test(trans.source)) {
      deps.push('statement_forms');
    }

    if (deps.length > 0) {
      dependencies[trans.uuid] = deps;
    }
  });

  return dependencies;
}

/**
 * Generate teaching sequence recommendations
 */
function generateRecommendations(fcfsOrder, utilityScores) {
  const highUtility = Object.entries(utilityScores)
    .filter(([_, score]) => score > 70)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const earlyTeachers = fcfsOrder.slice(0, 10);

  return {
    priority_teaching_sequence: earlyTeachers.map(item => item.uuid),
    high_utility_translations: highUtility.map(([uuid, score]) => ({
      uuid,
      utility_score: score
    })),
    pedagogical_notes: {
      total_analyzed: fcfsOrder.length,
      recommended_start: "Begin with highest FCFS-ranked translations",
      utility_override: "Consider inserting high-utility translations earlier",
      dependency_aware: "Ensure prerequisite patterns taught before complex ones"
    }
  };
}

// =============================================================================
// MAIN PROCESSOR
// =============================================================================

async function processPhase2() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Phase 2: Corpus Intelligence Analysis');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load translations
  console.log('📖 Loading translation amino acids...');
  const translations = await loadTranslations();
  console.log(`   Found ${translations.length} translations\n`);

  // Analyze word frequency and versatility
  console.log('📊 Analyzing word frequency and versatility...');
  const { wordFreq, wordContexts } = analyzeWordFrequency(translations);
  console.log(`   Analyzed ${wordFreq.size} unique words\n`);

  // Calculate utility scores
  console.log('🎯 Calculating utility scores...');
  const utilityScores = {};
  translations.forEach(trans => {
    utilityScores[trans.uuid] = calculateUtility(
      trans,
      wordFreq,
      wordContexts,
      translations.length
    );
  });
  console.log(`   Calculated utility for ${Object.keys(utilityScores).length} translations\n`);

  // Determine FCFS order
  console.log('📋 Determining FCFS (First-Can-First-Say) order...');
  const fcfsOrder = determineFCFS(translations, wordFreq);
  console.log(`   Ranked ${fcfsOrder.length} translations by FCFS score\n`);

  // Analyze dependencies
  console.log('🔗 Analyzing linguistic dependencies...');
  const dependencies = analyzeDependencies(translations);
  console.log(`   Detected ${Object.keys(dependencies).length} dependency relationships\n`);

  // Generate recommendations
  console.log('💡 Generating teaching recommendations...');
  const recommendations = generateRecommendations(fcfsOrder, utilityScores);
  console.log(`   Generated priority sequence and high-utility list\n`);

  // Compile corpus intelligence report
  const corpusIntelligence = {
    version: '7.0',
    phase: '2',
    generated_at: new Date().toISOString(),
    course_code: 'spa_for_eng_30seeds',

    fcfs_order: fcfsOrder,

    utility_scores: utilityScores,

    dependencies: dependencies,

    recommendations: recommendations,

    statistics: {
      total_translations: translations.length,
      unique_words: wordFreq.size,
      avg_utility_score: Math.round(
        Object.values(utilityScores).reduce((a, b) => a + b, 0) / translations.length
      ),
      high_utility_count: Object.values(utilityScores).filter(s => s > 70).length
    }
  };

  // Save output
  console.log('💾 Saving corpus intelligence report...');
  await fs.ensureDir(path.dirname(OUTPUT_FILE));
  await fs.writeJson(OUTPUT_FILE, corpusIntelligence, { spaces: 2 });
  console.log(`   Saved to: ${OUTPUT_FILE}\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Phase 2 Complete!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`FCFS Rankings: ${fcfsOrder.length}`);
  console.log(`Utility Scores: ${Object.keys(utilityScores).length}`);
  console.log(`Dependencies: ${Object.keys(dependencies).length}`);
  console.log(`Average Utility: ${corpusIntelligence.statistics.avg_utility_score}/100`);
  console.log('\nNext: Run Phase 3 (LEGO Extraction)');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run processor
processPhase2()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Phase 2 failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
