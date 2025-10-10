#!/usr/bin/env node

/**
 * Phase 3: LEGO Extraction
 *
 * Extracts optimal teaching phrases (LEGOs) from translations.
 * Enforces IRON RULE: No LEGO begins or ends with a preposition.
 * Assigns provenance: S{seed}L{position}
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const TRANSLATIONS_DIR = path.join(__dirname, 'amino_acids', 'translations');
const INTELLIGENCE_FILE = path.join(__dirname, 'phase_outputs', 'phase_2_corpus_intelligence.json');
const LEGOS_DIR = path.join(__dirname, 'amino_acids', 'legos');
const OUTPUT_FILE = path.join(__dirname, 'phase_outputs', 'phase_3_lego_extraction.json');

// =============================================================================
// CONSTANTS
// =============================================================================

// IRON RULE: Prepositions that MUST NOT start or end a LEGO
const PREPOSITIONS = new Set([
  'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'of', 'about',
  'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out',
  'against', 'during', 'without', 'before', 'under', 'around', 'among'
]);

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

  translations.sort((a, b) => a.seed_id.localeCompare(b.seed_id));
  return translations;
}

/**
 * Load corpus intelligence data
 */
async function loadIntelligence() {
  return await fs.readJson(INTELLIGENCE_FILE);
}

/**
 * Tokenize text into words
 */
function tokenize(text) {
  return text
    .replace(/['']/g, "'")
    .replace(/[.,!?;:]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Check if a word is a preposition
 */
function isPreposition(word) {
  return PREPOSITIONS.has(word.toLowerCase());
}

/**
 * Extract all possible n-gram candidates from text
 */
function extractNGrams(words, minN = 2, maxN = 6) {
  const ngrams = [];

  for (let n = minN; n <= Math.min(maxN, words.length); n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const gram = words.slice(i, i + n);
      const text = gram.join(' ');
      ngrams.push({
        text,
        words: gram,
        startIndex: i,
        endIndex: i + n - 1,
        length: n
      });
    }
  }

  return ngrams;
}

/**
 * Apply IRON RULE filter: reject LEGOs with preposition boundaries
 */
function applyIronRule(ngram) {
  const firstWord = ngram.words[0];
  const lastWord = ngram.words[ngram.words.length - 1];

  // IRON RULE: Must not start or end with preposition
  if (isPreposition(firstWord) || isPreposition(lastWord)) {
    return false;
  }

  return true;
}

/**
 * Score a LEGO candidate based on linguistic quality
 */
function scoreLEGO(ngram, translation) {
  let score = 50; // base score

  // Prefer complete grammatical units
  const text = ngram.text.toLowerCase();

  // Bonus for subject-verb combinations
  if (/\b(i|you|we|they|he|she|it)\s+(am|is|are|was|were|have|had|do|does|did|can|could|will|would|should)/.test(text)) {
    score += 20;
  }

  // Bonus for verb phrases
  if (/\b(going to|want to|need to|have to|able to)\b/.test(text)) {
    score += 15;
  }

  // Bonus for common useful phrases
  if (/\b(I think|I know|I want|I need|you know|you can|you should)\b/i.test(text)) {
    score += 10;
  }

  // Penalty for very short phrases (less pedagogically useful)
  if (ngram.length === 2) {
    score -= 10;
  }

  // Penalty for very long phrases (harder to learn)
  if (ngram.length > 5) {
    score -= 5 * (ngram.length - 5);
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Extract LEGOs from a single translation
 */
function extractLEGOsFromTranslation(translation, intelligence) {
  const words = tokenize(translation.source);
  const ngrams = extractNGrams(words);

  // Filter by IRON RULE
  const validNGrams = ngrams.filter(applyIronRule);

  // Score and rank LEGOs
  const scoredLEGOs = validNGrams.map(ngram => ({
    ...ngram,
    pedagogicalScore: scoreLEGO(ngram, translation)
  }));

  // Sort by score and select top LEGOs (avoid overwhelming amount)
  scoredLEGOs.sort((a, b) => b.pedagogicalScore - a.pedagogicalScore);

  // Take top 5 LEGOs per translation (quality over quantity)
  const selectedLEGOs = scoredLEGOs.slice(0, 5);

  // Get FCFS and utility scores for this translation
  const fcfsData = intelligence.fcfs_order.find(item => item.uuid === translation.uuid);
  const utilityScore = intelligence.utility_scores[translation.uuid];

  // Create LEGO amino acids with provenance
  const legoAminoAcids = selectedLEGOs.map((lego, position) => {
    // Extract seed number from seed_id (e.g., "C0044" -> "44")
    const seedNum = parseInt(translation.seed_id.replace(/\D/g, ''), 10);

    const aminoAcid = {
      uuid: generateUUID({
        text: lego.text,
        source_translation: translation.uuid,
        position: position + 1
      }),
      type: 'lego',
      text: lego.text,
      provenance: `S${seedNum}L${position + 1}`,
      source_translation_uuid: translation.uuid,
      source_seed_id: translation.seed_id,
      fcfs_score: fcfsData?.fcfs_score || 0,
      utility_score: utilityScore || 0,
      pedagogical_score: lego.pedagogicalScore,
      metadata: {
        course_code: 'spa_for_eng_30seeds',
        phase: 'phase_3',
        word_count: lego.length,
        start_index: lego.startIndex,
        end_index: lego.endIndex,
        iron_rule_compliant: true,
        created_at: new Date().toISOString()
      }
    };

    return aminoAcid;
  });

  return legoAminoAcids;
}

// =============================================================================
// MAIN PROCESSOR
// =============================================================================

async function processPhase3() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('Phase 3: LEGO Extraction');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load data
  console.log('📖 Loading translation amino acids...');
  const translations = await loadTranslations();
  console.log(`   Found ${translations.length} translations\n`);

  console.log('📊 Loading corpus intelligence...');
  const intelligence = await loadIntelligence();
  console.log(`   Loaded FCFS rankings and utility scores\n`);

  // Ensure LEGOs directory exists
  await fs.ensureDir(LEGOS_DIR);

  // Extract LEGOs from each translation
  console.log('🧬 Extracting LEGOs with IRON RULE enforcement...');
  let totalLEGOs = 0;
  let ironRuleRejections = 0;
  const extractionLog = [];

  for (const translation of translations) {
    const legos = extractLEGOsFromTranslation(translation, intelligence);

    // Save each LEGO amino acid
    for (const lego of legos) {
      const legoPath = path.join(LEGOS_DIR, `${lego.uuid}.json`);
      await fs.writeJson(legoPath, lego, { spaces: 2 });
      totalLEGOs++;
    }

    extractionLog.push({
      translation_uuid: translation.uuid,
      seed_id: translation.seed_id,
      source_text: translation.source,
      legos_extracted: legos.length,
      provenance_range: legos.length > 0
        ? `${legos[0].provenance} - ${legos[legos.length - 1].provenance}`
        : 'none'
    });

    if (totalLEGOs % 25 === 0 && totalLEGOs > 0) {
      console.log(`   Extracted ${totalLEGOs} LEGOs so far...`);
    }
  }

  console.log(`   ✓ Extracted ${totalLEGOs} total LEGOs\n`);

  // Generate summary report
  console.log('📋 Generating extraction report...');

  const report = {
    version: '7.0',
    phase: '3',
    generated_at: new Date().toISOString(),
    course_code: 'spa_for_eng_30seeds',

    statistics: {
      total_translations: translations.length,
      total_legos_extracted: totalLEGOs,
      avg_legos_per_translation: (totalLEGOs / translations.length).toFixed(2),
      iron_rule_compliant: '100%',
      provenance_format: 'S{seed}L{position}'
    },

    extraction_log: extractionLog,

    iron_rule: {
      description: 'No LEGO begins or ends with a preposition',
      prepositions_blocked: Array.from(PREPOSITIONS).sort(),
      compliance: '100% (enforced)',
      rejections: ironRuleRejections
    },

    next_phase: {
      phase: '3.5',
      name: 'Graph Construction',
      purpose: 'Build adjacency graph for pattern-aware basket construction'
    }
  };

  await fs.writeJson(OUTPUT_FILE, report, { spaces: 2 });
  console.log(`   Saved to: ${OUTPUT_FILE}\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Phase 3 Complete!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Translations Processed: ${translations.length}`);
  console.log(`LEGOs Extracted: ${totalLEGOs}`);
  console.log(`Avg LEGOs/Translation: ${(totalLEGOs / translations.length).toFixed(1)}`);
  console.log(`IRON RULE Compliance: 100%`);
  console.log(`Provenance Format: S{seed}L{position}`);
  console.log('\nNext: Run Phase 3.5 (Graph Construction)');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run processor
processPhase3()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Phase 3 failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
