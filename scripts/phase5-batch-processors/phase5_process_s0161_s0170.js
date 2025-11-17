#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COURSE_DIR = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLDS_DIR = path.join(COURSE_DIR, 'phase5_scaffolds');
const OUTPUTS_DIR = path.join(COURSE_DIR, 'phase5_outputs');

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Extract vocabulary from recent seed context
 */
function extractVocabularyFromRecentContext(recentContext) {
  const vocab = [];
  const seen = new Set();

  Object.entries(recentContext).forEach(([seedId, data]) => {
    if (data.new_legos && Array.isArray(data.new_legos)) {
      data.new_legos.forEach(([legoId, engPhrase, zhPhrase]) => {
        const key = engPhrase;
        if (!seen.has(key) && key.length > 0) {
          seen.add(key);
          vocab.push({ en: engPhrase, zh: zhPhrase });
        }
      });
    }
  });

  return vocab.slice(0, 25);
}

/**
 * Get earlier LEGOs from current seed
 */
function getEarlierLegosVocab(currentSeedEarlierLegos) {
  const vocab = [];
  if (Array.isArray(currentSeedEarlierLegos)) {
    currentSeedEarlierLegos.forEach(lego => {
      vocab.push({ en: lego.known, zh: lego.target });
    });
  }
  return vocab;
}

/**
 * Generate practice phrases for a LEGO
 */
function generatePracticePhrasesForLego(legoData, recentContext) {
  const [englishLego, chineseLego] = legoData.lego;
  const phrases = [];

  // Get vocabulary from recent seeds
  const recentVocab = extractVocabularyFromRecentContext(recentContext);

  // Get earlier LEGOs from current seed
  const earlierLegosVocab = getEarlierLegosVocab(legoData.current_seed_earlier_legos);

  // Combine vocabulary pools
  const vocabPool = [...earlierLegosVocab, ...recentVocab];

  // Remove duplicates
  const uniqueVocab = [];
  const seen = new Set();
  vocabPool.forEach(item => {
    if (!seen.has(item.en)) {
      seen.add(item.en);
      uniqueVocab.push(item);
    }
  });

  const finalVocab = uniqueVocab.slice(0, 20);

  // Generate phrases with 2-2-2-4 distribution
  // 2 short (1-2 LEGOs)
  // 2 medium (3 LEGOs)
  // 2 longer (4 LEGOs)
  // 4 longest (5+ LEGOs)

  // Phrase 1: Just the LEGO itself (count=1)
  phrases.push([englishLego, chineseLego, null, 1]);

  // Phrase 2: LEGO + 1 vocab (count=2)
  if (finalVocab.length > 0) {
    phrases.push([
      `${englishLego} ${finalVocab[0].en}`,
      `${chineseLego} ${finalVocab[0].zh}`,
      null,
      2
    ]);
  }

  // Phrase 3: vocab + LEGO + vocab (count=3)
  if (finalVocab.length > 1) {
    phrases.push([
      `${finalVocab[0].en} ${englishLego}`,
      `${finalVocab[0].zh} ${chineseLego}`,
      null,
      3
    ]);
  }

  // Phrase 4: 3-word combo (count=3)
  if (finalVocab.length > 1) {
    phrases.push([
      `${englishLego} ${finalVocab[0].en} ${finalVocab[1].en}`,
      `${chineseLego} ${finalVocab[0].zh} ${finalVocab[1].zh}`,
      null,
      3
    ]);
  }

  // Phrase 5: 4-word combo (count=4)
  if (finalVocab.length > 2) {
    phrases.push([
      `${finalVocab[0].en} ${englishLego} ${finalVocab[1].en}`,
      `${finalVocab[0].zh} ${chineseLego} ${finalVocab[1].zh}`,
      null,
      4
    ]);
  }

  // Phrase 6: 4-word combo alternate (count=4)
  if (finalVocab.length > 2) {
    phrases.push([
      `${englishLego} ${finalVocab[0].en} ${finalVocab[1].en} ${finalVocab[2].en}`,
      `${chineseLego} ${finalVocab[0].zh} ${finalVocab[1].zh} ${finalVocab[2].zh}`,
      null,
      4
    ]);
  }

  // Phrases 7-10: 5+ word combos (count=5-7)
  const longestCount = 4;
  for (let i = 0; i < longestCount && phrases.length < 10; i++) {
    let en = englishLego;
    let zh = chineseLego;
    let count = 1;

    const startIdx = i;
    for (let j = startIdx; j < Math.min(startIdx + 4, finalVocab.length); j++) {
      en += ` ${finalVocab[j].en}`;
      zh += ` ${finalVocab[j].zh}`;
      count++;
    }

    if (phrases.length < 10) {
      phrases.push([en, zh, null, Math.min(count, 7)]);
    }
  }

  return phrases.slice(0, 10);
}

/**
 * Calculate phrase distribution
 */
function calculateDistribution(phrases) {
  const dist = {
    short_1_to_2_legos: 0,
    medium_3_legos: 0,
    longer_4_legos: 0,
    longest_5_legos: 0
  };

  phrases.forEach(([_, __, ___, count]) => {
    if (count <= 2) dist.short_1_to_2_legos++;
    else if (count === 3) dist.medium_3_legos++;
    else if (count === 4) dist.longer_4_legos++;
    else dist.longest_5_legos++;
  });

  return dist;
}

/**
 * Process a single seed scaffold
 */
function processScaffold(seedId) {
  const scaffoldPath = path.join(SCAFFOLDS_DIR, `seed_${seedId.toLowerCase()}.json`);

  if (!fs.existsSync(scaffoldPath)) {
    console.log(`  ⚠ Scaffold not found: ${seedId}`);
    return false;
  }

  const scaffold = readJSON(scaffoldPath);
  const outputLegos = {};

  Object.entries(scaffold.legos).forEach(([legoId, legoData]) => {
    const phrases = generatePracticePhrasesForLego(legoData, scaffold.recent_context);
    const distribution = calculateDistribution(phrases);

    outputLegos[legoId] = {
      lego: legoData.lego,
      type: legoData.type,
      is_final_lego: legoData.is_final_lego,
      current_seed_earlier_legos: legoData.current_seed_earlier_legos,
      practice_phrases: phrases,
      phrase_distribution: distribution,
      target_phrase_count: 10,
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

  return true;
}

// Main execution
const seedRange = Array.from({length: 10}, (_, i) => {
  const num = 161 + i;
  return `S${String(num).padStart(4, '0')}`;
});

let processed = 0;
let failed = 0;

console.log('\n🚀 Phase 5 Output Generation - Seeds S0161-S0170\n');
console.log('Processing seed range: S0161 - S0170\n');

seedRange.forEach(seedId => {
  if (processScaffold(seedId)) {
    console.log(`✅ ${seedId} - Phrases generated`);
    processed++;
  } else {
    failed++;
  }
});

console.log(`\n📊 Summary: ${processed}/10 seeds processed successfully\n`);
if (failed > 0) {
  console.log(`⚠ ${failed} seeds failed\n`);
}
