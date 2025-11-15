#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const COURSE_DIR = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLDS_DIR = path.join(COURSE_DIR, 'phase5_scaffolds');
const OUTPUTS_DIR = path.join(COURSE_DIR, 'phase5_outputs');

// Ensure output directory exists
if (!fs.existsSync(OUTPUTS_DIR)) {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Extract all available vocabulary from recent context
 */
function extractAvailableVocabulary(recentContext) {
  const vocab = new Map();

  if (!recentContext || typeof recentContext !== 'object') return vocab;

  Object.entries(recentContext).forEach(([seedId, contextData]) => {
    if (!contextData) return;

    // Extract from sentence
    if (contextData.sentence && Array.isArray(contextData.sentence) && contextData.sentence.length >= 2) {
      const sentenceTarget = contextData.sentence[0];  // First is target (Chinese)
      const sentenceKnown = contextData.sentence[1];   // Second is known (English)

      // Split on | or spaces to get words
      const knownWords = sentenceKnown.split(/[\s|]+/).map(w => w.trim()).filter(w => w);
      const targetWords = sentenceTarget.split(/[\s|]+/).map(w => w.trim()).filter(w => w);

      for (let i = 0; i < Math.min(knownWords.length, targetWords.length); i++) {
        const key = knownWords[i];
        if (!vocab.has(key)) {
          vocab.set(key, targetWords[i]);
        }
      }
    }

    // Extract from new_legos directly
    if (contextData.new_legos && Array.isArray(contextData.new_legos)) {
      contextData.new_legos.forEach(([id, known, target]) => {
        if (!vocab.has(known)) {
          vocab.set(known, target);
        }
      });
    }
  });

  return vocab;
}

/**
 * Build list of available LEGOs from recent context
 */
function buildAvailableLegos(recentContext) {
  const availableLegos = [];

  if (!recentContext || typeof recentContext !== 'object') return availableLegos;

  Object.values(recentContext).forEach(contextData => {
    if (contextData && contextData.new_legos && Array.isArray(contextData.new_legos)) {
      contextData.new_legos.forEach(([id, known, target]) => {
        if (!availableLegos.some(l => l[0] === known)) {
          availableLegos.push([known, target]);
        }
      });
    }
  });

  return availableLegos;
}

/**
 * Generate practice phrases for a LEGO using 2-2-2-4 distribution
 */
function generatePracticePhrasesForLego(legoData, recentContext, currentSeedEarlierLegos) {
  const [knownLego, targetLego] = legoData.lego;
  const phrases = [];

  // Extract available vocabulary and LEGOs
  const recentVocab = Array.from(extractAvailableVocabulary(recentContext).entries());
  const recentLegos = buildAvailableLegos(recentContext);

  // Build complete available LEGOs list (recent + current seed's earlier LEGOs)
  const availableLegos = [...recentLegos];
  if (currentSeedEarlierLegos && Array.isArray(currentSeedEarlierLegos)) {
    currentSeedEarlierLegos.forEach(lego => {
      // Handle both object format {id, known, target, type} and array format [known, target]
      const known = typeof lego === 'object' && lego.known ? lego.known : (Array.isArray(lego) ? lego[0] : null);
      const target = typeof lego === 'object' && lego.target ? lego.target : (Array.isArray(lego) ? lego[1] : null);
      if (known && target && !availableLegos.some(l => l[0] === known)) {
        availableLegos.push([known, target]);
      }
    });
  }

  // Use a mix of vocabulary and LEGOs for phrase generation
  const combinedPool = [...new Map([...recentVocab, ...availableLegos]).entries()];

  // Distribution: 2-2-2-4
  // Phrase 1: Just the LEGO (count 1)
  phrases.push([knownLego, targetLego, null, 1]);

  // Phrase 2: LEGO + 1 word (count 2)
  if (combinedPool.length > 0) {
    const [w1en, w1zh] = combinedPool[0];
    phrases.push([`${knownLego} ${w1en}`, `${targetLego}${w1zh}`, null, 2]);
  }

  // Phrase 3: LEGO + 2 words (count 3)
  if (combinedPool.length > 1) {
    const [w1en, w1zh] = combinedPool[0];
    const [w2en, w2zh] = combinedPool[1];
    phrases.push([`${knownLego} ${w1en} ${w2en}`, `${targetLego}${w1zh}${w2zh}`, null, 3]);
  } else if (combinedPool.length > 0) {
    const [w1en, w1zh] = combinedPool[0];
    phrases.push([`${knownLego} ${w1en}`, `${targetLego}${w1zh}`, null, 2]);
  }

  // Phrase 4: Alternative with LEGO in middle (count 3)
  if (combinedPool.length > 1) {
    const [w1en, w1zh] = combinedPool[1];
    const [w2en, w2zh] = combinedPool[0];
    phrases.push([`${w2en} ${knownLego} ${w1en}`, `${w2zh}${targetLego}${w1zh}`, null, 3]);
  }

  // Phrase 5: LEGO + 3 words (count 4)
  if (combinedPool.length > 2) {
    const [w1en, w1zh] = combinedPool[0];
    const [w2en, w2zh] = combinedPool[1];
    const [w3en, w3zh] = combinedPool[2];
    phrases.push([`${knownLego} ${w1en} ${w2en} ${w3en}`, `${targetLego}${w1zh}${w2zh}${w3zh}`, null, 4]);
  } else if (combinedPool.length > 1) {
    const [w1en, w1zh] = combinedPool[0];
    const [w2en, w2zh] = combinedPool[1];
    phrases.push([`${knownLego} ${w1en} ${w2en}`, `${targetLego}${w1zh}${w2zh}`, null, 3]);
  }

  // Phrase 6: LEGO with 4+ words (count 5)
  if (combinedPool.length > 2) {
    const [w3en, w3zh] = combinedPool[2];
    const [w2en, w2zh] = combinedPool[1];
    const [w1en, w1zh] = combinedPool[0];
    phrases.push([`${w3en} ${knownLego} ${w2en} ${w1en}`, `${w3zh}${targetLego}${w2zh}${w1zh}`, null, 5]);
  }

  // Fill remaining slots with 6+ LEGO combinations
  for (let i = 0; i < 4 && phrases.length < 10; i++) {
    let en = knownLego;
    let zh = targetLego;
    let count = 1;

    const startIdx = Math.min(i, Math.max(0, combinedPool.length - 5));
    for (let j = startIdx; j < Math.min(startIdx + 5, combinedPool.length); j++) {
      const [wen, wzh] = combinedPool[j];
      en += ` ${wen}`;
      zh += wzh;
      count++;
    }

    if (phrases.length < 10 && count > 1) {
      phrases.push([en.trim(), zh.trim(), null, count]);
    }
  }

  return phrases.slice(0, 10);
}

/**
 * Calculate phrase distribution
 */
function calculateDistribution(phrases) {
  const dist = {
    really_short_1_2: 0,
    quite_short_3: 0,
    longer_4_5: 0,
    long_6_plus: 0
  };

  phrases.forEach(([_, __, ___, count]) => {
    if (count <= 2) dist.really_short_1_2++;
    else if (count === 3) dist.quite_short_3++;
    else if (count <= 5) dist.longer_4_5++;
    else dist.long_6_plus++;
  });

  return dist;
}

/**
 * Process a single seed scaffold
 */
function processScaffold(seedId) {
  const scaffoldPath = path.join(SCAFFOLDS_DIR, `seed_${seedId.toLowerCase()}.json`);

  if (!fs.existsSync(scaffoldPath)) {
    return { success: false, seedId, reason: 'Scaffold not found' };
  }

  const scaffold = readJSON(scaffoldPath);
  const outputLegos = {};

  Object.entries(scaffold.legos || {}).forEach(([legoId, legoData]) => {
    const phrases = generatePracticePhrasesForLego(
      legoData,
      scaffold.recent_context,
      legoData.current_seed_earlier_legos
    );
    const distribution = calculateDistribution(phrases);

    outputLegos[legoId] = {
      lego: legoData.lego,
      type: legoData.type,
      current_seed_earlier_legos: legoData.current_seed_earlier_legos,
      is_final_lego: legoData.is_final_lego,
      practice_phrases: phrases,
      phrase_distribution: distribution,
      _metadata: legoData._metadata
    };

    if (legoData.components) {
      outputLegos[legoId].components = legoData.components;
    }
  });

  const output = {
    version: scaffold.version,
    seed_id: scaffold.seed_id,
    generation_stage: 'PHRASE_GENERATION_COMPLETE',
    seed_pair: scaffold.seed_pair,
    recent_context: scaffold.recent_context,
    legos: outputLegos
  };

  const outputPath = path.join(OUTPUTS_DIR, `seed_${seedId.toLowerCase()}.json`);
  writeJSON(outputPath, output);

  return { success: true, seedId, legoCount: Object.keys(outputLegos).length };
}

// Main execution for S0011-S0020
console.log('🚀 Phase 5 Output Generation - Seeds S0011-S0020\n');

const seedRange = Array.from({length: 10}, (_, i) => `S00${11 + i}`);
const results = [];

seedRange.forEach(seedId => {
  const result = processScaffold(seedId);
  if (result.success) {
    console.log(`✅ ${result.seedId} - ${result.legoCount} LEGOs processed`);
    results.push(result);
  } else {
    console.log(`❌ ${result.seedId} - ${result.reason}`);
  }
});

console.log(`\n📊 Summary: ${results.length}/10 seeds processed`);
console.log(`📁 Output directory: ${OUTPUTS_DIR}`);
