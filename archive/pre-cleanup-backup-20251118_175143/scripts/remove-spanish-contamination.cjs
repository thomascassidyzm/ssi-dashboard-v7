const fs = require('fs');

const inputPath = 'public/vfs/courses/cmn_for_eng/lego_baskets.json';
const outputPath = 'public/vfs/courses/cmn_for_eng/lego_baskets_clean.json';

console.log('Loading lego_baskets.json...');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

/**
 * Detect if text contains Chinese characters
 */
function hasChinese(text) {
  return /[\u4e00-\u9fa5]/.test(text);
}

/**
 * Detect if text contains Spanish characters or patterns
 */
function hasSpanish(text) {
  // Spanish-specific characters
  if (/[áéíóúñ¿¡]/i.test(text)) return true;

  // Common Spanish words
  const spanishWords = /\b(cuando|que|el|la|los|las|un|una|es|no|podría|creo|necesita|hacer|algo|nuevo|nuestro)\b/i;
  return spanishWords.test(text);
}

/**
 * Check if a basket entry appears to be Spanish contamination
 */
function isSpanishContamination(basket) {
  // Check lego field
  let legoText = '';
  if (Array.isArray(basket.lego)) {
    legoText = basket.lego.join(' ');
  } else if (basket.lego && typeof basket.lego === 'object') {
    legoText = Object.values(basket.lego).join(' ');
  }

  // Check practice phrases
  let phraseText = '';
  if (basket.practice_phrases && Array.isArray(basket.practice_phrases)) {
    phraseText = basket.practice_phrases
      .map(p => Array.isArray(p) ? p.join(' ') : '')
      .join(' ');
  }

  // Check metadata
  let metadataText = '';
  if (basket._metadata?.seed_context) {
    const ctx = basket._metadata.seed_context;
    metadataText = (ctx.known || '') + ' ' + (ctx.target || '');
  }

  const allText = legoText + ' ' + phraseText + ' ' + metadataText;

  // If has Spanish but NO Chinese, it's contamination
  const containsSpanish = hasSpanish(allText);
  const containsChinese = hasChinese(allText);

  return containsSpanish && !containsChinese;
}

console.log('Scanning for Spanish contamination...');

const cleanBaskets = {};
let totalBaskets = 0;
let removedBaskets = 0;
const removedIds = [];

for (const [basketId, basket] of Object.entries(data.baskets)) {
  totalBaskets++;

  if (isSpanishContamination(basket)) {
    removedBaskets++;
    removedIds.push(basketId);
    console.log(`  Removing ${basketId} (Spanish contamination)`);
  } else {
    cleanBaskets[basketId] = basket;
  }
}

console.log(`\n=== Cleanup Results ===`);
console.log(`  Total baskets: ${totalBaskets}`);
console.log(`  Removed (Spanish): ${removedBaskets}`);
console.log(`  Remaining (Chinese): ${Object.keys(cleanBaskets).length}`);

if (removedIds.length > 0) {
  console.log(`\n  Removed basket IDs:`);
  console.log(`  ${removedIds.slice(0, 20).join(', ')}${removedIds.length > 20 ? '...' : ''}`);
}

// Create cleaned output
const cleanedData = {
  metadata: {
    ...data.metadata,
    cleaned_at: new Date().toISOString(),
    spanish_contamination_removed: removedBaskets,
    total_baskets: Object.keys(cleanBaskets).length
  },
  baskets: cleanBaskets
};

console.log(`\nWriting cleaned file to: ${outputPath}`);
fs.writeFileSync(outputPath, JSON.stringify(cleanedData, null, 2));

console.log('✅ Done! Spanish contamination removed.');
console.log(`\nNext step: Transform to v10 format`);
