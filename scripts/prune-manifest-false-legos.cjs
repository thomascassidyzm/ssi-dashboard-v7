#!/usr/bin/env node
/**
 * Prune Manifest - Remove intro_items for LEGOs marked new: false
 *
 * LEGOs with new: false in lego_pairs.json are reused LEGOs that shouldn't
 * have their own introduction_items in the manifest (they were already
 * introduced in an earlier seed).
 *
 * This script:
 * 1. Loads all new: false LEGOs from lego_pairs.json
 * 2. Finds matching intro_items in the manifest by known|target text
 * 3. Removes those intro_items
 * 4. Removes corresponding samples from slice.samples (keyed by text)
 * 5. Outputs a pruned manifest
 */

const fs = require('fs');

// Paths
const LEGO_PAIRS_PATH = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/lego_pairs.json';
const MANIFEST_PATH = '/Users/tomcassidy/Downloads/course_manifest (5).json';
const OUTPUT_PATH = '/Users/tomcassidy/Downloads/course_manifest_pruned.json';

// Normalize text for matching
function normalize(text) {
  if (!text) return '';
  return text.toLowerCase().trim();
}

// Build a lookup key from known and target text
function buildKey(known, target) {
  return `${normalize(known)}|${normalize(target)}`;
}

async function main() {
  console.log('Loading files...\n');

  // Load lego_pairs
  const legoPairs = JSON.parse(fs.readFileSync(LEGO_PAIRS_PATH, 'utf8'));

  // Load manifest
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  // Build set of new: false LEGO keys
  const falseLegos = new Set();
  for (const seed of legoPairs.seeds) {
    for (const lego of seed.legos) {
      if (lego.new === false) {
        const key = buildKey(lego.lego.known, lego.lego.target);
        falseLegos.add(key);
      }
    }
  }

  console.log(`Found ${falseLegos.size} LEGOs with new: false\n`);

  // Track what we remove
  const removedIntroItems = [];
  const removedTexts = new Set(); // Texts to remove from samples

  // Process each slice and seed
  for (const slice of manifest.slices) {
    for (const seed of slice.seeds) {
      if (!seed.introduction_items) continue;

      // Filter introduction_items
      const originalCount = seed.introduction_items.length;
      const keptItems = [];

      for (const item of seed.introduction_items) {
        const known = item.node?.known?.text;
        const target = item.node?.target?.text;
        const key = buildKey(known, target);

        if (falseLegos.has(key)) {
          // This intro_item is for a new: false LEGO - remove it
          removedIntroItems.push({
            seed_id: seed.id,
            known,
            target,
            item_id: item.id
          });

          // Track texts to remove from samples
          // The LEGO's known and target text
          if (known) removedTexts.add(known);
          if (target) removedTexts.add(target);

          // Also track texts from child nodes (practice sentences)
          if (item.nodes) {
            for (const node of item.nodes) {
              if (node.known?.text) removedTexts.add(node.known.text);
              if (node.target?.text) removedTexts.add(node.target.text);
            }
          }
        } else {
          keptItems.push(item);
        }
      }

      seed.introduction_items = keptItems;

      if (originalCount !== keptItems.length) {
        console.log(`  Seed ${seed.id}: removed ${originalCount - keptItems.length} intro_items`);
      }
    }

    // Now remove samples from slice.samples (keyed by text)
    if (slice.samples && typeof slice.samples === 'object') {
      const originalSampleCount = Object.keys(slice.samples).length;
      let removedCount = 0;

      for (const text of removedTexts) {
        if (slice.samples[text]) {
          delete slice.samples[text];
          removedCount++;
        }
      }

      const newSampleCount = Object.keys(slice.samples).length;
      console.log(`\nSamples: ${originalSampleCount} -> ${newSampleCount} (removed ${removedCount} text keys)`);
    }
  }

  console.log(`\nTotal intro_items removed: ${removedIntroItems.length}`);
  console.log(`Unique texts marked for sample removal: ${removedTexts.size}`);

  // Write pruned manifest
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nPruned manifest written to: ${OUTPUT_PATH}`);

  // Show first few removed items
  console.log('\nFirst 10 removed intro_items:');
  for (const item of removedIntroItems.slice(0, 10)) {
    console.log(`  "${item.known}" -> "${item.target}"`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
