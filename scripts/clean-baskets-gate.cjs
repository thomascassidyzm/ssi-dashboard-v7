#!/usr/bin/env node
/**
 * Clean LEGO Baskets - Remove GATE Violating Phrases
 *
 * Removes practice phrases that violate vocabulary constraints
 * (using words not yet taught). Keeps all valid phrases.
 */

const fs = require('fs');
const path = require('path');

const courseCode = process.argv[2] || 'spa_for_eng';
const courseDir = path.join(__dirname, '../public/vfs/courses', courseCode);

console.log(`\n🧹 Cleaning LEGO Baskets - Removing GATE Violations`);
console.log(`Course: ${courseCode}\n`);

// Read files
const legoPairsPath = path.join(courseDir, 'lego_pairs.json');
const legoBasketsPath = path.join(courseDir, 'lego_baskets.json');
const backupPath = path.join(courseDir, `lego_baskets_before_clean_${Date.now()}.json`);

const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
const legoBasketsData = JSON.parse(fs.readFileSync(legoBasketsPath, 'utf8'));
const baskets = legoBasketsData.baskets || legoBasketsData;

// Build LEGO sequence
console.log(`📊 Building LEGO sequence...`);
const sequence = new Map();
let position = 0;
for (const seed of legoPairs.seeds) {
  for (const lego of seed.legos) {
    sequence.set(lego.id, {
      position: position++,
      target: lego.lego?.target,
      known: lego.lego?.known
    });
  }
}

console.log(`   ${sequence.size} LEGOs in sequence\n`);

/**
 * Extract words from a phrase
 */
function extractWords(phrase) {
  if (!phrase || typeof phrase !== 'string') return [];
  return phrase
    .toLowerCase()
    .replace(/[^\wáéíóúàèéìòùäëïöüñç\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Build available vocabulary up to and including a position
 */
function buildAvailableVocab(targetPosition, legoSequence) {
  const vocab = new Set();
  for (const [legoId, info] of legoSequence.entries()) {
    if (info.position <= targetPosition && info.target) {
      const words = extractWords(info.target);
      words.forEach(w => vocab.add(w));
    }
  }
  return vocab;
}

/**
 * Check if a phrase uses only available vocabulary
 */
function isValidPhrase(phrase, availableVocab) {
  if (!phrase || !phrase.target) return false;

  const words = extractWords(phrase.target);
  for (const word of words) {
    if (!availableVocab.has(word)) {
      return false;
    }
  }
  return true;
}

// Clean baskets
console.log(`🧹 Cleaning baskets...\n`);

let totalBaskets = 0;
let basketsModified = 0;
let totalPhrasesRemoved = 0;
let totalPhrasesKept = 0;

const cleanedBaskets = {};

for (const [legoId, basket] of Object.entries(baskets)) {
  totalBaskets++;
  const legoInfo = sequence.get(legoId);

  if (!legoInfo) {
    // Keep basket as-is if not in sequence
    cleanedBaskets[legoId] = basket;
    continue;
  }

  const availableVocab = buildAvailableVocab(legoInfo.position, sequence);

  if (!basket.practice_phrases || !Array.isArray(basket.practice_phrases)) {
    // Keep basket as-is if no practice phrases
    cleanedBaskets[legoId] = basket;
    continue;
  }

  const originalCount = basket.practice_phrases.length;
  const validPhrases = basket.practice_phrases.filter(phrase =>
    isValidPhrase(phrase, availableVocab)
  );

  const removedCount = originalCount - validPhrases.length;

  if (removedCount > 0) {
    basketsModified++;
    totalPhrasesRemoved += removedCount;

    if (removedCount <= 3) {
      console.log(`   ${legoId}: removed ${removedCount} phrase(s), kept ${validPhrases.length}`);
    }
  }

  totalPhrasesKept += validPhrases.length;

  // Update basket
  cleanedBaskets[legoId] = {
    ...basket,
    practice_phrases: validPhrases,
    phrase_count: validPhrases.length
  };
}

// Report statistics
console.log(`\n${'='.repeat(60)}`);
console.log('CLEANING SUMMARY');
console.log('='.repeat(60));
console.log(`Total baskets: ${totalBaskets}`);
console.log(`Baskets modified: ${basketsModified}`);
console.log(`Baskets unchanged: ${totalBaskets - basketsModified}`);
console.log(`\nTotal phrases removed: ${totalPhrasesRemoved}`);
console.log(`Total phrases kept: ${totalPhrasesKept}`);
console.log(`\nAverage phrases per basket: ${(totalPhrasesKept / totalBaskets).toFixed(1)}`);

// Show baskets with most removals
const modificationStats = [];
for (const [legoId, basket] of Object.entries(baskets)) {
  const cleanedBasket = cleanedBaskets[legoId];
  const original = basket.practice_phrases?.length || 0;
  const cleaned = cleanedBasket.practice_phrases?.length || 0;
  const removed = original - cleaned;
  if (removed > 0) {
    modificationStats.push({ legoId, removed, kept: cleaned, original });
  }
}

modificationStats.sort((a, b) => b.removed - a.removed);

console.log(`\n${'='.repeat(60)}`);
console.log('TOP 10 MOST CLEANED BASKETS');
console.log('='.repeat(60));
for (let i = 0; i < Math.min(10, modificationStats.length); i++) {
  const stat = modificationStats[i];
  console.log(`${stat.legoId}: removed ${stat.removed}/${stat.original} (kept ${stat.kept})`);
}

// Count by phrase count
const countDistribution = {};
for (const basket of Object.values(cleanedBaskets)) {
  const count = basket.practice_phrases?.length || 0;
  countDistribution[count] = (countDistribution[count] || 0) + 1;
}

console.log(`\n${'='.repeat(60)}`);
console.log('PHRASE COUNT DISTRIBUTION');
console.log('='.repeat(60));
for (let i = 0; i <= 10; i++) {
  const count = countDistribution[i] || 0;
  if (count > 0) {
    console.log(`${i} phrases: ${count} baskets`);
  }
}

// Create backup
console.log(`\n💾 Creating backup: ${path.basename(backupPath)}`);
fs.writeFileSync(backupPath, JSON.stringify(legoBasketsData, null, 2));

// Write cleaned baskets
legoBasketsData.baskets = cleanedBaskets;
legoBasketsData.metadata = legoBasketsData.metadata || {};
legoBasketsData.metadata.cleaned_at = new Date().toISOString();
legoBasketsData.metadata.cleaning = {
  baskets_modified: basketsModified,
  phrases_removed: totalPhrasesRemoved,
  phrases_kept: totalPhrasesKept
};

fs.writeFileSync(legoBasketsPath, JSON.stringify(legoBasketsData, null, 2));

const fileSize = (fs.statSync(legoBasketsPath).size / (1024 * 1024)).toFixed(2);

console.log(`\n✅ Cleaned baskets written!`);
console.log(`   File: ${legoBasketsPath}`);
console.log(`   Size: ${fileSize} MB`);
console.log(`   Backup: ${backupPath}\n`);
