#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const courseBase = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const scaffoldsDir = path.join(courseBase, 'phase5_scaffolds');
const outputsDir = path.join(courseBase, 'phase5_outputs');

// Ensure output directory exists
fs.mkdirSync(outputsDir, { recursive: true });

// Extract vocabulary from recent context
function extractVocabularyPairs(recentContext) {
  const pairs = [];
  Object.values(recentContext || {}).forEach(seedData => {
    if (seedData.new_legos && Array.isArray(seedData.new_legos)) {
      seedData.new_legos.forEach(([id, english, chinese]) => {
        if (english && chinese) {
          pairs.push({ 
            english: english.trim(), 
            chinese: chinese.trim(), 
            id,
            from: 'recent'
          });
        }
      });
    }
    // Also extract from sentence arrays if present
    if (seedData.sentence && Array.isArray(seedData.sentence) && seedData.sentence.length >= 2) {
      const enSentence = seedData.sentence[1]; // English side
      const cnSentence = seedData.sentence[0]; // Chinese side
      
      // Extract pipe-separated phrases
      if (enSentence && cnSentence) {
        const enParts = enSentence.split('|').map(p => p.trim());
        const cnParts = cnSentence.split('|').map(p => p.trim());
        
        for (let i = 0; i < Math.min(enParts.length, cnParts.length); i++) {
          if (enParts[i] && cnParts[i]) {
            pairs.push({
              english: enParts[i],
              chinese: cnParts[i],
              from: 'sentence'
            });
          }
        }
      }
    }
  });
  return pairs;
}

// Extract Chinese words for GATE validation
function extractChineseWords(text) {
  const words = new Set();
  if (!text) return words;
  // Split on spaces and Chinese punctuation
  const parts = text.split(/[\s\u3001\u3002\uff01\uff1f\uff0c\uff1a\u3000]+/).filter(p => p.trim());
  parts.forEach(p => {
    if (p.trim()) words.add(p.trim());
  });
  return words;
}

// Build available vocabulary knowledge base
function buildVocabBase(recentContext, currentSeedEarlierLegos, currentLego) {
  const allWords = new Set();
  const allPairs = [];
  
  // From recent context
  extractVocabularyPairs(recentContext).forEach(pair => {
    allPairs.push(pair);
    const words = extractChineseWords(pair.chinese);
    words.forEach(w => allWords.add(w));
  });
  
  // From current seed's earlier LEGOs
  if (Array.isArray(currentSeedEarlierLegos)) {
    currentSeedEarlierLegos.forEach(lego => {
      if (lego.known && lego.target) {
        allPairs.push({
          english: lego.known.trim(),
          chinese: lego.target.trim(),
          id: lego.id,
          from: 'earlier'
        });
        const words = extractChineseWords(lego.target);
        words.forEach(w => allWords.add(w));
      }
    });
  }
  
  // From current LEGO being taught
  if (Array.isArray(currentLego) && currentLego.length >= 2) {
    allPairs.push({
      english: currentLego[0].trim(),
      chinese: currentLego[1].trim(),
      id: 'current',
      from: 'current'
    });
    const words = extractChineseWords(currentLego[1]);
    words.forEach(w => allWords.add(w));
  }
  
  return { words: allWords, pairs: allPairs };
}

// Validate if a Chinese phrase uses only available words
function validateChinese(phrase, availableWords) {
  const words = extractChineseWords(phrase);
  for (const word of words) {
    if (!availableWords.has(word)) {
      return false;
    }
  }
  return true;
}

// Generate practice phrases for a LEGO using intelligent combinations
function generatePracticePhrasesForLego(legoData, seedPair, recentContext, currentSeedEarlierLegos, legoIndex, totalLegos) {
  const [english, chinese] = legoData.lego;
  const vocabBase = buildVocabBase(recentContext, currentSeedEarlierLegos, legoData.lego);
  
  const phrases = [];
  const generated = new Set();
  
  // 1. Always start with the base LEGO
  phrases.push([english, chinese, null, 1]);
  generated.add(chinese);
  
  // 2. Get available combinations
  const vocabPairs = vocabBase.pairs.filter(p => p.id !== 'current');
  
  // 3. Simple 2-word combinations (phrases 2-3)
  let idx = 1;
  for (const pair of vocabPairs.slice(0, 10)) {
    if (phrases.length >= 3) break;
    
    const combo1 = `${pair.chinese} ${chinese}`;
    const combo2 = `${chinese} ${pair.chinese}`;
    
    if (!generated.has(combo1) && validateChinese(combo1, vocabBase.words)) {
      phrases.push([`${pair.english} ${english}`, combo1, null, 2]);
      generated.add(combo1);
    }
    if (phrases.length < 3 && !generated.has(combo2) && validateChinese(combo2, vocabBase.words)) {
      phrases.push([`${english} ${pair.english}`, combo2, null, 2]);
      generated.add(combo2);
    }
  }
  
  // Pad to get 2 phrases of length 2
  while (phrases.length < 3) {
    const combo = `${chinese} ${chinese}`;
    if (!generated.has(combo) && validateChinese(combo, vocabBase.words)) {
      phrases.push([`${english} ${english}`, combo, null, 2]);
      generated.add(combo);
    } else {
      // Use first vocab pair as fallback
      if (vocabPairs.length > 0) {
        const pair = vocabPairs[0];
        const combo = `${pair.chinese} ${chinese}`;
        if (!generated.has(combo)) {
          phrases.push([`${pair.english} ${english}`, combo, null, 2]);
          generated.add(combo);
        }
      }
      break;
    }
  }
  
  // 4. 3-word combinations (phrases 4-5)
  for (let i = 0; i < vocabPairs.length && phrases.length < 5; i++) {
    for (let j = i; j < vocabPairs.length && phrases.length < 5; j++) {
      const p1 = vocabPairs[i];
      const p2 = vocabPairs[j];
      
      const combo = `${p1.chinese} ${p2.chinese} ${chinese}`;
      const comboEn = `${p1.english} ${p2.english} ${english}`;
      
      if (!generated.has(combo) && validateChinese(combo, vocabBase.words)) {
        phrases.push([comboEn, combo, null, 3]);
        generated.add(combo);
        break;
      }
    }
  }
  
  // Pad 3-word to 2 phrases
  while (phrases.length < 5) {
    const pair = vocabPairs[Math.floor(Math.random() * vocabPairs.length)] || vocabPairs[0];
    const combo = `${pair.chinese} ${pair.chinese} ${chinese}`;
    if (!generated.has(combo) && validateChinese(combo, vocabBase.words)) {
      phrases.push([`${pair.english} ${pair.english} ${english}`, combo, null, 3]);
      generated.add(combo);
    } else {
      break;
    }
  }
  
  // 5. 4+ word combinations (phrases 6-9)
  for (let i = 0; i < vocabPairs.length && phrases.length < 9; i++) {
    for (let j = i; j < vocabPairs.length && phrases.length < 9; j++) {
      for (let k = j; k < vocabPairs.length && phrases.length < 9; k++) {
        const p1 = vocabPairs[i];
        const p2 = vocabPairs[j];
        const p3 = vocabPairs[k];
        
        const combo = `${p1.chinese} ${p2.chinese} ${p3.chinese} ${chinese}`;
        const comboEn = `${p1.english} ${p2.english} ${p3.english} ${english}`;
        
        if (!generated.has(combo) && validateChinese(combo, vocabBase.words)) {
          phrases.push([comboEn, combo, null, 4]);
          generated.add(combo);
        }
      }
    }
    if (phrases.length >= 7) break;
  }
  
  // 6. Fill remaining slots with longer combinations
  while (phrases.length < 10) {
    // Try different length compositions
    const combo = `${vocabPairs[0]?.chinese || chinese} ${vocabPairs[1]?.chinese || chinese} ${vocabPairs[2]?.chinese || chinese} ${chinese}`;
    const comboEn = `${vocabPairs[0]?.english || english} ${vocabPairs[1]?.english || english} ${vocabPairs[2]?.english || english} ${english}`;
    
    if (!generated.has(combo) && validateChinese(combo, vocabBase.words)) {
      const legoCount = Math.min(5 + Math.floor((phrases.length - 9) / 2), 8);
      phrases.push([comboEn, combo, null, legoCount]);
      generated.add(combo);
    } else {
      // Add the seed pair itself for final LEGO
      if (legoIndex === totalLegos - 1) {
        phrases.push([seedPair.known, seedPair.target, null, 10]);
      } else {
        // Fallback: just repeat the base
        const legoCount = 1 + Math.floor(phrases.length / 3);
        phrases.push([english, chinese, null, legoCount]);
      }
    }
  }
  
  return phrases.slice(0, 10);
}

// Process a single seed
function processSeed(seedNum) {
  const seedId = `S${String(seedNum).padStart(4, '0')}`;
  const scaffoldPath = path.join(scaffoldsDir, `seed_${seedId.toLowerCase()}.json`);
  const outputPath = path.join(outputsDir, `seed_${seedId.toLowerCase()}.json`);
  
  if (!fs.existsSync(scaffoldPath)) {
    console.log(`SKIP: ${seedId} - scaffold not found`);
    return false;
  }
  
  try {
    const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));
    const legoIds = Object.keys(scaffold.legos || {});
    const totalLegos = legoIds.length;
    let processedCount = 0;
    
    // Process each LEGO
    legoIds.forEach((legoId, legoIndex) => {
      const legoData = scaffold.legos[legoId];
      if (!legoData.lego || !Array.isArray(legoData.lego) || legoData.lego.length < 2) {
        return;
      }
      
      const currentSeedEarlierLegos = legoData.current_seed_earlier_legos || [];
      
      // Generate practice phrases
      const phrases = generatePracticePhrasesForLego(
        legoData,
        scaffold.seed_pair,
        scaffold.recent_context || {},
        currentSeedEarlierLegos,
        legoIndex,
        totalLegos
      );
      
      legoData.practice_phrases = phrases;
      processedCount++;
    });
    
    // Update generation stage
    scaffold.generation_stage = 'PHRASE_GENERATION_COMPLETE';
    
    // Write output
    fs.writeFileSync(outputPath, JSON.stringify(scaffold, null, 2));
    
    console.log(`DONE: ${seedId} - ${processedCount} LEGOs processed`);
    return true;
  } catch (error) {
    console.error(`ERROR: ${seedId} - ${error.message}`);
    return false;
  }
}

// Main execution
console.log('Phase 5 Processor: S0241-S0250 for cmn_for_eng');
console.log('=' .repeat(70));

let processed = 0;
let failed = 0;

for (let i = 241; i <= 250; i++) {
  if (processSeed(i)) {
    processed++;
  } else {
    failed++;
  }
}

console.log('='.repeat(70));
console.log(`Summary: ${processed} seeds processed, ${failed} seeds failed`);
console.log(`Output files written to: ${outputsDir}`);
