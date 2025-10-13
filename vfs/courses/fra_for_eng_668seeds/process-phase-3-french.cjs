#!/usr/bin/env node

/**
 * Phase 3: LEGO Extraction for French
 *
 * French-specific implementation with:
 * - IRON RULE enforcement (no preposition boundaries)
 * - French grammar preservation (ne...pas, articles, elision, liaison)
 * - Quality scoring (0-10 scale)
 * - Self-review and improvement cycles
 *
 * Quality Scoring Components:
 * - Iron Rule Compliance (35%): No preposition splits
 * - Naturalness (25%): Phrasal patterns intact, natural boundaries
 * - Pedagogical Value (20%): High-frequency, reusable
 * - Consistency (10%): Uniform patterns
 * - Edge Cases (10%): Contractions, elision, liaison
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const TRANSLATIONS_FILE = path.join(__dirname, '..', '..', '..', 'fra_for_eng_668seeds_translations.json');
const LEGOS_DIR = path.join(__dirname, 'amino_acids', 'legos');
const OUTPUT_FILE = path.join(__dirname, 'phase_outputs', 'phase_3_lego_extraction.json');
const QUALITY_LOG_FILE = path.join(__dirname, 'phase_outputs', 'quality_scores.json');
const RULES_FILE = path.join(__dirname, 'phase_outputs', 'learned_rules.json');

// =============================================================================
// FRENCH LINGUISTIC CONSTANTS
// =============================================================================

// IRON RULE: French prepositions that MUST NOT start or end a LEGO
const FRENCH_PREPOSITIONS = new Set([
  'à', 'de', 'en', 'dans', 'pour', 'par', 'sur', 'avec', 'sans',
  'sous', 'vers', 'chez', 'contre', 'entre', 'parmi', 'depuis',
  'pendant', 'avant', 'après', 'devant', 'derrière', 'au', 'aux',
  'du', 'des', // Contracted articles act as prepositions
]);

// Compound prepositions (must stay together)
const COMPOUND_PREPOSITIONS = [
  'au lieu de',
  'à cause de',
  'grâce à',
  'à côté de',
  'en face de',
  'au milieu de',
  'à travers',
  'à partir de',
  'jusqu\'à',
  'loin de',
  'près de',
];

// Ne...pas negation patterns (must stay together)
const NEGATION_PATTERNS = [
  'ne\\s+\\w+\\s+pas',
  'n\'\\w+\\s+pas',
  'ne\\s+\\w+\\s+jamais',
  'ne\\s+\\w+\\s+plus',
  'ne\\s+\\w+\\s+rien',
];

// Articles (must stay with nouns)
const ARTICLES = new Set([
  'le', 'la', 'l\'', 'les',
  'un', 'une', 'des',
  'du', 'de la', 'de l\'',
  'au', 'aux', // à + le/les
  'ce', 'cet', 'cette', 'ces',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
]);

// Reflexive pronouns (must stay with verbs)
const REFLEXIVE_PRONOUNS = new Set([
  'me', 'm\'', 'te', 't\'', 'se', 's\'',
  'nous', 'vous',
]);

// Modal + infinitive constructions
const MODAL_VERBS = new Set([
  'peux', 'peut', 'pouvons', 'pouvez', 'peuvent',
  'veux', 'veut', 'voulons', 'voulez', 'veulent',
  'dois', 'doit', 'devons', 'devez', 'doivent',
  'sais', 'sait', 'savons', 'savez', 'savent',
  'peux', 'pourr', 'devr', 'voudr', 'saur', // stems for conditional
]);

// =============================================================================
// QUALITY SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate comprehensive quality score (0-10) for a LEGO
 */
function calculateQualityScore(lego, translation, rules = []) {
  let score = {
    ironRule: 0,
    naturalness: 0,
    pedagogical: 0,
    consistency: 0,
    edgeCases: 0,
    total: 0
  };

  // Component 1: Iron Rule Compliance (35%)
  score.ironRule = assessIronRuleCompliance(lego) * 3.5;

  // Component 2: Naturalness (25%)
  score.naturalness = assessNaturalness(lego, translation) * 2.5;

  // Component 3: Pedagogical Value (20%)
  score.pedagogical = assessPedagogicalValue(lego) * 2.0;

  // Component 4: Consistency (10%)
  score.consistency = assessConsistency(lego, rules) * 1.0;

  // Component 5: Edge Cases (10%)
  score.edgeCases = assessEdgeCases(lego) * 1.0;

  // Calculate total
  score.total = score.ironRule + score.naturalness + score.pedagogical + score.consistency + score.edgeCases;

  return score;
}

/**
 * Assess IRON RULE compliance: No preposition boundaries
 */
function assessIronRuleCompliance(lego) {
  const words = tokenize(lego.text);
  if (words.length === 0) return 0;

  const firstWord = words[0].toLowerCase();
  const lastWord = words[words.length - 1].toLowerCase();

  // Check for preposition at boundaries
  if (FRENCH_PREPOSITIONS.has(firstWord) || FRENCH_PREPOSITIONS.has(lastWord)) {
    return 0; // FAIL
  }

  // Check for split compound prepositions
  for (const compound of COMPOUND_PREPOSITIONS) {
    const compoundWords = compound.split(' ');
    if (lego.text.includes(compoundWords[0]) && !lego.text.includes(compound)) {
      return 5; // Partial split
    }
  }

  return 10; // PASS
}

/**
 * Assess naturalness: Phrasal patterns intact, natural boundaries
 */
function assessNaturalness(lego, translation) {
  let score = 10;
  const text = lego.text.toLowerCase();

  // Deduct for split negation (ne...pas)
  if ((text.includes('ne ') || text.includes('n\'')) && !text.includes(' pas') && !text.includes(' jamais') && !text.includes(' plus')) {
    score -= 4;
  }

  // Deduct for articles without nouns
  for (const article of ARTICLES) {
    if (text.startsWith(article + ' ') || text.endsWith(' ' + article)) {
      score -= 3;
    }
  }

  // Deduct for split reflexive verbs
  for (const reflexive of REFLEXIVE_PRONOUNS) {
    if (text.includes(reflexive) && !hasVerbAfterReflexive(text, reflexive)) {
      score -= 3;
    }
  }

  // Bonus for complete phrasal units
  if (text.match(/je (ne )?\w+ (pas )?[a-zéèêàâîôûù]+/)) {
    score += 2;
  }

  return Math.max(0, Math.min(10, score));
}

/**
 * Assess pedagogical value: High-frequency, reusable
 */
function assessPedagogicalValue(lego) {
  let score = 5; // base score
  const text = lego.text.toLowerCase();

  // Bonus for high-frequency patterns
  const highFrequency = [
    'je ', 'tu ', 'il ', 'elle ', 'nous ', 'vous ', 'ils ', 'elles ',
    'est-ce que', 'qu\'est-ce que',
    'veux', 'peux', 'dois',
    'aller', 'faire', 'dire', 'savoir',
    'ai besoin', 'j\'ai', 'tu as', 'il a',
  ];

  for (const pattern of highFrequency) {
    if (text.includes(pattern)) {
      score += 1;
      break;
    }
  }

  // Bonus for reusable constructions
  if (text.match(/\w+ (veux|peux|dois|vais) \w+/)) {
    score += 2; // Modal + verb
  }

  if (text.match(/je (ne )?\w+ (pas )?[a-zéèêàâîôûù]+/)) {
    score += 1; // Complete subject-verb-object
  }

  // Penalty for very short or very long phrases
  const wordCount = tokenize(text).length;
  if (wordCount < 2) score -= 2;
  if (wordCount > 8) score -= 1;

  return Math.max(0, Math.min(10, score));
}

/**
 * Assess consistency: Uniform patterns across extraction
 */
function assessConsistency(lego, rules) {
  let score = 10;

  // This would check against learned rules from previous cycles
  // For now, basic consistency checks
  const text = lego.text.toLowerCase();

  // Check for consistent negation handling
  if (text.includes('ne ') && text.includes('pas') && text.indexOf('ne') > text.indexOf('pas')) {
    score -= 3; // Wrong order
  }

  return Math.max(0, Math.min(10, score));
}

/**
 * Assess edge cases: Contractions, elision, liaison
 */
function assessEdgeCases(lego) {
  let score = 10;
  const text = lego.text;

  // Check for proper elision
  const elisionErrors = [
    /\bje [aeéèêiouà]/i, // Should be j'
    /\bme [aeéèêiouà]/i, // Should be m'
    /\bte [aeéèêiouà]/i, // Should be t'
    /\bse [aeéèêiouà]/i, // Should be s'
    /\ble [aeéèêiouà]/i, // Should be l'
    /\bla [aeéèêiouà]/i, // Should be l'
    /\bde [aeéèêiouà]/i, // Should be d'
    /\bne [aeéèêiouà]/i, // Should be n'
  ];

  for (const pattern of elisionErrors) {
    if (pattern.test(text)) {
      score -= 2;
    }
  }

  // Check for proper contracted articles
  if (text.includes('à le ')) score -= 2; // Should be "au"
  if (text.includes('à les ')) score -= 2; // Should be "aux"
  if (text.includes('de le ')) score -= 2; // Should be "du"
  if (text.includes('de les ')) score -= 2; // Should be "des"

  return Math.max(0, Math.min(10, score));
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function tokenize(text) {
  return text
    .replace(/['']/g, "'")
    .replace(/[.,!?;:]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

function hasVerbAfterReflexive(text, reflexive) {
  const reflexiveIndex = text.indexOf(reflexive);
  if (reflexiveIndex === -1) return false;

  const afterReflexive = text.substring(reflexiveIndex + reflexive.length).trim();
  const words = afterReflexive.split(/\s+/);

  return words.length > 0 && words[0].length > 2; // Simple heuristic
}

function generateUUID(content) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(content));
  return hash.digest('hex').substring(0, 32);
}

/**
 * Extract n-grams from tokenized text
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
 * Extract LEGOs from a translation with French-specific rules
 */
function extractLEGOs(translation) {
  const words = tokenize(translation.target_french);
  const ngrams = extractNGrams(words);
  const legos = [];

  for (const ngram of ngrams) {
    // Apply IRON RULE
    const ironRuleScore = assessIronRuleCompliance(ngram);
    if (ironRuleScore === 0) continue; // FAIL

    // Calculate quality
    const qualityScore = calculateQualityScore(ngram, translation);

    // Only accept LEGOs with minimum quality threshold
    if (qualityScore.total >= 5.0) {
      const lego = {
        uuid: generateUUID({ text: ngram.text, seed_id: translation.seed_id }),
        text: ngram.text,
        provenance: `S${translation.seed_id}L${legos.length + 1}`,
        source_translation_uuid: translation.seed_id,
        source_english: translation.source_english,
        quality_score: qualityScore,
        metadata: {
          extracted_at: new Date().toISOString(),
          attempt: 1,
          rules_applied: []
        }
      };

      legos.push(lego);
    }
  }

  return legos;
}

// =============================================================================
// MAIN PROCESSING
// =============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('Phase 3: LEGO Extraction (French with Quality Scoring)');
  console.log('═══════════════════════════════════════════════════════\n');

  // Ensure output directories
  await fs.ensureDir(LEGOS_DIR);
  await fs.ensureDir(path.dirname(OUTPUT_FILE));

  // Load translations
  console.log('[1/4] Loading French translations...');
  const translationsData = await fs.readJson(TRANSLATIONS_FILE);
  const translations = translationsData.translations;
  console.log(`   ✓ Loaded ${translations.length} translations\n`);

  // Extract LEGOs
  console.log('[2/4] Extracting LEGOs with French-specific rules...');
  const allLegos = [];
  const qualityScores = [];

  for (let i = 0; i < translations.length; i++) {
    const translation = translations[i];

    // Skip translations that are pending or invalid
    if (translation.target_french.startsWith('[TODO:')) {
      continue;
    }

    const legos = extractLEGOs(translation);
    allLegos.push(...legos);

    // Track quality scores
    for (const lego of legos) {
      qualityScores.push({
        seed_id: translation.seed_id,
        lego_text: lego.text,
        quality_score: lego.quality_score.total,
        iron_rule: lego.quality_score.ironRule,
        naturalness: lego.quality_score.naturalness,
        pedagogical: lego.quality_score.pedagogical,
        consistency: lego.quality_score.consistency,
        edge_cases: lego.quality_score.edgeCases
      });
    }

    if ((i + 1) % 50 === 0) {
      console.log(`   Progress: ${i + 1}/${translations.length} translations processed`);
    }
  }

  console.log(`   ✓ Extracted ${allLegos.length} LEGOs\n`);

  // Calculate statistics
  console.log('[3/4] Calculating quality statistics...');
  const avgQuality = qualityScores.reduce((sum, s) => sum + s.quality_score, 0) / qualityScores.length;
  const accepted = qualityScores.filter(s => s.quality_score >= 8.0).length;
  const flagged = qualityScores.filter(s => s.quality_score >= 5.0 && s.quality_score < 8.0).length;
  const failed = qualityScores.filter(s => s.quality_score < 5.0).length;

  console.log(`   Average Quality Score: ${avgQuality.toFixed(2)}/10`);
  console.log(`   Accepted (≥8.0): ${accepted} (${(accepted/qualityScores.length*100).toFixed(1)}%)`);
  console.log(`   Flagged (5.0-7.9): ${flagged} (${(flagged/qualityScores.length*100).toFixed(1)}%)`);
  console.log(`   Failed (<5.0): ${failed} (${(failed/qualityScores.length*100).toFixed(1)}%)\n`);

  // Save LEGOs
  console.log('[4/4] Saving results...');
  for (const lego of allLegos) {
    await fs.writeJson(path.join(LEGOS_DIR, `${lego.uuid}.json`), lego, { spaces: 2 });
  }

  // Save quality log
  await fs.writeJson(QUALITY_LOG_FILE, {
    timestamp: new Date().toISOString(),
    cycle: 1,
    total_legos: allLegos.length,
    avg_quality: avgQuality,
    accepted_count: accepted,
    flagged_count: flagged,
    failed_count: failed,
    scores: qualityScores
  }, { spaces: 2 });

  // Save extraction summary
  await fs.writeJson(OUTPUT_FILE, {
    phase: 'phase_3_lego_extraction',
    timestamp: new Date().toISOString(),
    cycle: 1,
    total_translations: translations.length,
    total_legos: allLegos.length,
    quality_metrics: {
      average_score: avgQuality,
      accepted_count: accepted,
      accepted_rate: accepted / qualityScores.length,
      flagged_count: flagged,
      flagged_rate: flagged / qualityScores.length,
      failed_count: failed,
      failed_rate: failed / qualityScores.length
    }
  }, { spaces: 2 });

  console.log(`   ✓ Saved ${allLegos.length} LEGO amino acids`);
  console.log(`   ✓ Saved quality scores to: ${QUALITY_LOG_FILE}`);
  console.log(`   ✓ Saved extraction summary to: ${OUTPUT_FILE}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('Phase 3 Complete!');
  console.log(`Quality Status: ${avgQuality.toFixed(2)}/10 average`);
  if (avgQuality < 8.5) {
    console.log('⚠ Quality below 8.5 target - self-review cycles needed');
  } else {
    console.log('✓ Quality target achieved!');
  }
  console.log('═══════════════════════════════════════════════════════');
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  extractLEGOs,
  calculateQualityScore,
  assessIronRuleCompliance,
  assessNaturalness,
  assessPedagogicalValue
};
