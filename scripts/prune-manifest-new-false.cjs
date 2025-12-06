#!/usr/bin/env node
/**
 * Prune Manifest - Remove introduction_items for LEGOs marked new: false
 * and clean up orphaned samples
 *
 * LEGOs with new: false have already been introduced in earlier seeds,
 * so their introduction_items should not appear again.
 *
 * IMPORTANT: A LEGO like "I want" -> "quiero" can be new:true in S0001
 * but new:false in S0010 (when it reappears). We must match by SEED,
 * not globally.
 *
 * What this script does:
 * 1. Load lego_pairs.json and build a map: seed_sentence -> set of new:true LEGOs
 * 2. For each seed in manifest (matched by seed_sentence):
 *    - Keep introduction_items whose LEGO is new:true for THIS seed
 *    - Remove introduction_items whose LEGO is new:false for THIS seed
 * 3. Collect all text strings still referenced in the manifest
 * 4. Remove any samples not referenced
 * 5. Write the pruned manifest
 *
 * Usage:
 *   node prune-manifest-new-false.cjs <manifest.json> <lego_pairs.json> <output.json>
 */

const fs = require('fs');

// Parse arguments
const [,, manifestPath, legoPairsPath, outputPath] = process.argv;

if (!manifestPath || !legoPairsPath || !outputPath) {
  console.error('Usage: node prune-manifest-new-false.cjs <manifest.json> <lego_pairs.json> <output.json>');
  process.exit(1);
}

// Load files
console.log('Loading files...');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Step 1: Build map of seed_sentence -> set of new:true LEGOs
// Key for seed = lowercase seed_pair.known
// Key for LEGO = lowercase(known) + '|' + lowercase(target)
const seedTrueLegos = new Map();

for (const seed of legoPairs.seeds || []) {
  const seedKey = (seed.seed_pair?.known || '').toLowerCase().trim();
  const trueLegos = new Set();

  for (const lego of seed.legos || []) {
    if (lego.new === true) {
      const known = (lego.lego?.known || '').toLowerCase().trim();
      const target = (lego.lego?.target || '').toLowerCase().trim();
      trueLegos.add(`${known}|${target}`);
    }
  }

  seedTrueLegos.set(seedKey, trueLegos);
}

console.log(`Mapped ${seedTrueLegos.size} seeds from lego_pairs`);

// Step 2: Process manifest - keep only new:true introduction_items per seed
let totalIntroItems = 0;
let removedIntroItems = 0;
let keptIntroItems = 0;
let unmatchedSeeds = 0;

for (const slice of manifest.slices || []) {
  for (const seed of slice.seeds || []) {
    const introItems = seed.introduction_items || [];
    totalIntroItems += introItems.length;

    if (introItems.length === 0) continue;

    // Match seed by canonical sentence
    const seedKey = (seed.seed_sentence?.canonical || '').toLowerCase().trim();
    const trueLegos = seedTrueLegos.get(seedKey);

    if (!trueLegos) {
      // Can't match this seed - keep all items (conservative)
      unmatchedSeeds++;
      keptIntroItems += introItems.length;
      continue;
    }

    const filteredItems = [];

    for (const item of introItems) {
      const node = item.node || {};
      const known = (node.known?.text || '').toLowerCase().trim();
      const target = (node.target?.text || '').toLowerCase().trim();
      const key = `${known}|${target}`;

      if (trueLegos.has(key)) {
        // This LEGO is new:true for this seed - keep it
        filteredItems.push(item);
        keptIntroItems++;
      } else {
        // This LEGO is new:false for this seed - remove it
        removedIntroItems++;
      }
    }

    seed.introduction_items = filteredItems;
  }
}

console.log(`\nIntroduction items:`);
console.log(`  Total: ${totalIntroItems}`);
console.log(`  Removed (new:false): ${removedIntroItems}`);
console.log(`  Kept (new:true): ${keptIntroItems}`);
if (unmatchedSeeds > 0) {
  console.log(`  Warning: ${unmatchedSeeds} seeds could not be matched`);
}

// Step 3: Collect all referenced texts
const referencedTexts = new Set();

for (const slice of manifest.slices || []) {
  // From seeds
  for (const seed of slice.seeds || []) {
    // Seed's own node
    const seedNode = seed.node || {};
    if (seedNode.known?.text) referencedTexts.add(seedNode.known.text);
    if (seedNode.target?.text) referencedTexts.add(seedNode.target.text);

    // From remaining introduction_items
    for (const item of seed.introduction_items || []) {
      // item.node
      const node = item.node || {};
      if (node.known?.text) referencedTexts.add(node.known.text);
      if (node.target?.text) referencedTexts.add(node.target.text);

      // item.nodes (practice phrases)
      for (const n of item.nodes || []) {
        if (n.known?.text) referencedTexts.add(n.known.text);
        if (n.target?.text) referencedTexts.add(n.target.text);
      }

      // item.presentation
      if (item.presentation) {
        referencedTexts.add(item.presentation);
      }
    }
  }

  // From encouragements
  for (const enc of slice.pooledEncouragements || []) {
    if (enc.text) referencedTexts.add(enc.text);
    if (typeof enc === 'string') referencedTexts.add(enc);
  }
  for (const enc of slice.orderedEncouragements || []) {
    if (enc.text) referencedTexts.add(enc.text);
    if (typeof enc === 'string') referencedTexts.add(enc);
  }
}

console.log(`\nReferenced texts: ${referencedTexts.size}`);

// Step 4: Remove orphaned samples
let totalSamples = 0;
let removedSamples = 0;
let keptSamples = 0;

for (const slice of manifest.slices || []) {
  const samples = slice.samples || {};
  const prunedSamples = {};

  for (const [text, sampleData] of Object.entries(samples)) {
    totalSamples++;
    if (referencedTexts.has(text)) {
      prunedSamples[text] = sampleData;
      keptSamples++;
    } else {
      removedSamples++;
    }
  }

  slice.samples = prunedSamples;
}

console.log(`\nSamples:`);
console.log(`  Total: ${totalSamples}`);
console.log(`  Removed (orphaned): ${removedSamples}`);
console.log(`  Kept: ${keptSamples}`);

// Step 5: Write output
console.log(`\nWriting to ${outputPath}...`);
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log('Done.');
