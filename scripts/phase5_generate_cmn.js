#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
 * Extract vocabulary from recent seed pairs
 */
function extractVocabularyFromRecentPairs(recentSeedPairs) {
  const vocab = [];
  const seen = new Set();
  
  Object.entries(recentSeedPairs).forEach(([seedId, data]) => {
    if (Array.isArray(data) && data.length >= 1) {
      const sentence = data[0];
      if (Array.isArray(sentence) && sentence.length >= 2) {
        const engSentence = sentence[0];
        const zhSentence = sentence[1];
        const engParts = engSentence.split('|').map(s => s.trim()).filter(s => s);
        const zhParts = zhSentence.split('|').map(s => s.trim()).filter(s => s);
        
        for (let i = 0; i < Math.min(engParts.length, zhParts.length); i++) {
          const key = engParts[i];
          if (!seen.has(key) && key.length > 0) {
            seen.add(key);
            vocab.push({ en: engParts[i], zh: zhParts[i] });
          }
        }
      }
    }
  });
  
  return vocab.slice(0, 25);
}

/**
 * Generate practice phrases for a LEGO
 */
function generatePracticePhrasesForLego(legoData, recentSeedPairs) {
  const [englishLego, chineseLego] = legoData.lego;
  const phrases = [];
  const recentVocab = extractVocabularyFromRecentPairs(recentSeedPairs);
  const availableLegos = legoData.current_seed_legos_available || [];
  
  // Create vocabulary pool
  const vocabPool = [...recentVocab];
  availableLegos.forEach(([en, zh]) => {
    if (!vocabPool.some(v => v.en === en)) {
      vocabPool.push({ en, zh });
    }
  });
  
  // Generate with 2-2-2-4 distribution (total 10 phrases)
  phrases.push([englishLego, chineseLego, null, 1]);
  
  if (vocabPool.length > 0) {
    phrases.push([`${englishLego} ${vocabPool[0].en}`, `${chineseLego}${vocabPool[0].zh}`, null, 2]);
  }
  
  if (vocabPool.length > 1) {
    phrases.push([`${englishLego} ${vocabPool[0].en} ${vocabPool[1].en}`, `${chineseLego}${vocabPool[0].zh}${vocabPool[1].zh}`, null, 3]);
  }
  
  if (vocabPool.length > 1) {
    phrases.push([`${vocabPool[0].en} ${englishLego} ${vocabPool[1].en}`, `${vocabPool[0].zh}${chineseLego}${vocabPool[1].zh}`, null, 3]);
  }
  
  if (vocabPool.length > 2) {
    phrases.push([`${englishLego} ${vocabPool[0].en} ${vocabPool[1].en} ${vocabPool[2].en}`, `${chineseLego}${vocabPool[0].zh}${vocabPool[1].zh}${vocabPool[2].zh}`, null, 4]);
  }
  
  if (vocabPool.length > 2) {
    const v3 = vocabPool[3] ? vocabPool[3].en : '';
    const v3zh = vocabPool[3] ? vocabPool[3].zh : '';
    phrases.push([`${vocabPool[0].en} ${englishLego} ${vocabPool[1].en} ${vocabPool[2].en} ${v3}`.trim(), `${vocabPool[0].zh}${chineseLego}${vocabPool[1].zh}${vocabPool[2].zh}${v3zh}`, null, 5]);
  }
  
  // Fill remaining with 6+ LEGO combinations
  for (let i = 0; i < 4 && phrases.length < 10; i++) {
    let en = englishLego;
    let zh = chineseLego;
    let count = 1;
    
    for (let j = i; j < Math.min(i + 5, vocabPool.length); j++) {
      en += ` ${vocabPool[j].en}`;
      zh += vocabPool[j].zh;
      count++;
    }
    
    if (phrases.length < 10) {
      phrases.push([en, zh, null, count]);
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
    return false;
  }
  
  const scaffold = readJSON(scaffoldPath);
  const outputLegos = {};
  
  Object.entries(scaffold.legos).forEach(([legoId, legoData]) => {
    const phrases = generatePracticePhrasesForLego(legoData, scaffold.recent_seed_pairs);
    const distribution = calculateDistribution(phrases);
    
    outputLegos[legoId] = {
      lego: legoData.lego,
      type: legoData.type,
      current_seed_legos_available: legoData.current_seed_legos_available,
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
    recent_seed_pairs: scaffold.recent_seed_pairs,
    legos: outputLegos
  };
  
  const outputPath = path.join(OUTPUTS_DIR, `seed_${seedId.toLowerCase()}.json`);
  writeJSON(outputPath, output);
  
  return true;
}

// Main execution
const seedRange = Array.from({length: 10}, (_, i) => `S00${21 + i}`);
let processed = 0;

console.log('🚀 Phase 5 Output Generation - Seeds S0021-S0030\n');

seedRange.forEach(seedId => {
  if (processScaffold(seedId)) {
    console.log(`✅ ${seedId} - Phrases generated`);
    processed++;
  }
});

console.log(`\n📊 Summary: ${processed}/10 seeds processed`);
