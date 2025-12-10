#!/usr/bin/env node
/**
 * Find all Spanish words with masculine endings from seed sentences
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'public', 'vfs', 'courses', 'spa_for_eng', 'course_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Collect all seed sentence Spanish text
const seedTexts = [];
for (const slice of manifest.slices || []) {
  for (const seed of slice.seeds || []) {
    if (seed.node?.target?.text) {
      seedTexts.push({
        spanish: seed.node.target.text,
        english: seed.node.known?.text || '',
        seedId: seed.id
      });
    }
  }
}

console.log(`Found ${seedTexts.length} seed sentences\n`);

// Extract all words and find masculine endings
const wordCounts = new Map();
const wordContexts = new Map();

for (const seed of seedTexts) {
  // Split into words, remove punctuation
  const words = seed.spanish
    .toLowerCase()
    .replace(/[¿¡.,!?;:'"()]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);

  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);

    if (!wordContexts.has(word)) {
      wordContexts.set(word, []);
    }
    if (wordContexts.get(word).length < 3) {
      wordContexts.get(word).push({ spanish: seed.spanish, english: seed.english });
    }
  }
}

// Filter for masculine endings
const masculinePatterns = [
  { pattern: /o$/, suffix: '-o', feminine: 'a' },
  { pattern: /ado$/, suffix: '-ado', feminine: 'ada' },
  { pattern: /ido$/, suffix: '-ido', feminine: 'ida' },
  { pattern: /or$/, suffix: '-or', feminine: 'ora' },
  { pattern: /ón$/, suffix: '-ón', feminine: 'ona' },
  { pattern: /és$/, suffix: '-és', feminine: 'esa' },
  { pattern: /án$/, suffix: '-án', feminine: 'ana' },
];

const results = {};

for (const { pattern, suffix, feminine } of masculinePatterns) {
  results[suffix] = [];

  for (const [word, count] of wordCounts) {
    if (pattern.test(word)) {
      results[suffix].push({
        word,
        count,
        contexts: wordContexts.get(word)
      });
    }
  }

  // Sort by frequency
  results[suffix].sort((a, b) => b.count - a.count);
}

// Print results
console.log('='.repeat(80));
console.log('WORDS WITH MASCULINE ENDINGS (from seed sentences)');
console.log('='.repeat(80));

for (const [suffix, words] of Object.entries(results)) {
  console.log(`\n--- ${suffix} (${words.length} unique words) ---\n`);

  for (const { word, count, contexts } of words) {
    console.log(`  ${word} (${count}x)`);
    if (contexts[0]) {
      console.log(`    "${contexts[0].spanish}"`);
      console.log(`    "${contexts[0].english}"`);
    }
  }
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
for (const [suffix, words] of Object.entries(results)) {
  console.log(`  ${suffix}: ${words.length} unique words, ${words.reduce((sum, w) => sum + w.count, 0)} total occurrences`);
}

// Save to JSON
const outputPath = path.join(__dirname, 'masculine-endings-raw.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\nSaved to: ${outputPath}`);
