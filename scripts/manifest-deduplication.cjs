#!/usr/bin/env node

/**
 * Manifest Deduplication (Pre-Generation Cleanup)
 *
 * Prepares course manifest for audio generation by:
 * 1. Removing encouragements (added back post-generation)
 * 2. Finding and removing duplicate seeds/intro_items/nodes
 * 3. Validating expected vs actual samples
 * 4. Adding missing sample placeholders
 * 5. Checking orphaned samples exist in MAR before removing
 * 6. Deduplicating samples by normalized text ("Hablo" + "hablo." → "hablo")
 *
 * Usage: node scripts/manifest-deduplication.cjs <course_code>
 */

const fs = require('fs-extra');
const path = require('path');

// Paths
const VFS_COURSES_PATH = path.join(__dirname, '..', 'public', 'vfs', 'courses');
const MAR_PERMANENT_PATH = path.join(__dirname, '..', 'samples_database', 'voices');
const MAR_TEMP_PATH = path.join(__dirname, '..', 'temp', 'mar', 'voices');

// ============================================================================
// TEXT UTILITIES
// ============================================================================

/**
 * Normalize text for deduplication (matches MAR normalization)
 * Lowercase, trim, remove trailing periods, normalize whitespace
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Extract tagged examples from presentation text
 * Pattern: {role}'text' or {role}"text"
 */
function extractTaggedExamples(text) {
  if (!text) return [];
  const pattern = /\{(\w+(?:-\w+)?)\}\s*(["'])(.*?)\2(?=[\s,.;:!?)]|$)/g;
  const results = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    results.push({ tag: match[1], text: match[3] });
  }
  return results;
}

/**
 * Determine role from tag
 */
function tagToRole(tag) {
  if (tag === 'target1' || tag === 'target2') return tag;
  if (tag === 'source') return 'source';
  if (tag === 'presentation') return 'presentation';
  return 'target1';
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate course structure and find missing/orphaned samples
 */
function validateCourse(manifest) {
  const expectedSamples = new Set();
  const actualSamples = new Set();
  const slice = manifest.slices[0];
  const samples = slice.samples || {};

  console.log('Validating course structure...\n');

  // Collect actual samples
  for (const [text, sampleList] of Object.entries(samples)) {
    for (const sample of sampleList) {
      if (sample.role) {
        actualSamples.add(`${text}|${sample.role}`);
      }
    }
  }

  console.log(`Found ${actualSamples.size} actual samples in manifest`);

  // Note: encouragements should already be removed at this point
  // but include any remaining for validation
  for (const enc of slice.orderedEncouragements || []) {
    if (enc.text) expectedSamples.add(`${enc.text}|presentation`);
  }
  for (const enc of slice.pooledEncouragements || []) {
    if (enc.text) expectedSamples.add(`${enc.text}|presentation`);
  }

  // Process seeds
  let seedCount = 0;
  let introItemCount = 0;
  let nodesCount = 0;
  let taggedExampleCount = 0;

  for (const seed of slice.seeds) {
    seedCount++;

    // Seed node
    if (seed.node) {
      const knownText = seed.node.known?.text;
      const targetText = seed.node.target?.text;
      if (knownText) expectedSamples.add(`${knownText}|source`);
      if (targetText) {
        expectedSamples.add(`${targetText}|target1`);
        expectedSamples.add(`${targetText}|target2`);
      }
    }

    // Introduction items
    for (const introItem of seed.introduction_items || []) {
      introItemCount++;

      if (introItem.node) {
        const knownText = introItem.node.known?.text;
        const targetText = introItem.node.target?.text;
        if (knownText) expectedSamples.add(`${knownText}|source`);
        if (targetText) {
          expectedSamples.add(`${targetText}|target1`);
          expectedSamples.add(`${targetText}|target2`);
        }
      }

      // Presentation text
      if (introItem.presentation) {
        expectedSamples.add(`${introItem.presentation}|presentation`);

        // Tagged examples
        const examples = extractTaggedExamples(introItem.presentation);
        for (const { tag, text } of examples) {
          expectedSamples.add(`${text}|${tagToRole(tag)}`);
          taggedExampleCount++;
        }
      }

      // Nodes array
      for (const node of introItem.nodes || []) {
        nodesCount++;
        const knownText = node.known?.text;
        const targetText = node.target?.text;
        if (knownText) expectedSamples.add(`${knownText}|source`);
        if (targetText) {
          expectedSamples.add(`${targetText}|target1`);
          expectedSamples.add(`${targetText}|target2`);
        }
      }
    }
  }

  console.log(`\nProcessed structure:`);
  console.log(`  Seeds: ${seedCount}`);
  console.log(`  Introduction items: ${introItemCount}`);
  console.log(`  Nodes in intro items: ${nodesCount}`);
  console.log(`  Tagged examples: ${taggedExampleCount}`);
  console.log(`\nExpected samples: ${expectedSamples.size}`);

  // Find missing and orphaned
  const missing = new Set();
  const orphaned = new Set();

  for (const expected of expectedSamples) {
    if (!actualSamples.has(expected)) missing.add(expected);
  }
  for (const actual of actualSamples) {
    if (!expectedSamples.has(actual)) orphaned.add(actual);
  }

  return {
    expectedSamples,
    actualSamples,
    missing,
    orphaned,
    stats: { seedCount, introItemCount, nodesCount, taggedExampleCount }
  };
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Check for duplicate seeds
 */
function findDuplicateSeeds(manifest) {
  const slice = manifest.slices[0];
  const seeds = slice.seeds || [];
  const duplicates = [];
  const seedsByCanonical = {};
  const seedsByText = {};

  for (const seed of seeds) {
    const canonical = seed.seed_sentence?.canonical;
    const knownText = seed.node?.known?.text;
    const targetText = seed.node?.target?.text;

    if (canonical) {
      if (seedsByCanonical[canonical]) {
        duplicates.push({
          type: 'canonical',
          original: seedsByCanonical[canonical],
          duplicate: seed,
          text: canonical
        });
      } else {
        seedsByCanonical[canonical] = seed;
      }
    }

    if (knownText && targetText) {
      const textKey = `${knownText}|${targetText}`;
      if (seedsByText[textKey]) {
        const alreadyReported = duplicates.some(d =>
          d.original.id === seedsByText[textKey].id && d.duplicate.id === seed.id
        );
        if (!alreadyReported) {
          duplicates.push({
            type: 'text',
            original: seedsByText[textKey],
            duplicate: seed,
            text: `${knownText} / ${targetText}`
          });
        }
      } else {
        seedsByText[textKey] = seed;
      }
    }
  }

  return duplicates;
}

/**
 * Check for duplicate introduction items
 */
function findDuplicateIntroItems(manifest) {
  const slice = manifest.slices[0];
  const duplicates = [];
  const introsByText = {};

  for (const seed of slice.seeds || []) {
    for (const introItem of seed.introduction_items || []) {
      const knownText = introItem.node?.known?.text;
      const targetText = introItem.node?.target?.text;

      if (knownText && targetText) {
        const textKey = `${knownText}|${targetText}`;
        if (introsByText[textKey]) {
          duplicates.push({
            original: introsByText[textKey],
            duplicate: introItem,
            text: `${knownText} / ${targetText}`,
            seedId: seed.id
          });
        } else {
          introsByText[textKey] = introItem;
        }
      }
    }
  }

  return duplicates;
}

/**
 * Check for duplicate nodes within intro items
 */
function findDuplicateNodes(manifest) {
  const slice = manifest.slices[0];
  const duplicates = [];
  const seedNodes = {};
  const introNodes = {};
  const allNodesSeenInIntros = {};

  for (const seed of slice.seeds || []) {
    if (seed.node) {
      const key = `${seed.node.known?.text}|${seed.node.target?.text}`;
      seedNodes[key] = seed.node;
    }

    for (const introItem of seed.introduction_items || []) {
      if (introItem.node) {
        const key = `${introItem.node.known?.text}|${introItem.node.target?.text}`;
        introNodes[key] = introItem.node;
      }
    }
  }

  for (const seed of slice.seeds || []) {
    for (const introItem of seed.introduction_items || []) {
      for (const node of introItem.nodes || []) {
        const key = `${node.known?.text}|${node.target?.text}`;

        if (seedNodes[key]) {
          duplicates.push({
            type: 'seed_node',
            original: seedNodes[key],
            duplicate: node,
            text: `${node.known?.text} / ${node.target?.text}`,
            introItemId: introItem.id
          });
        } else if (introNodes[key]) {
          duplicates.push({
            type: 'intro_node',
            original: introNodes[key],
            duplicate: node,
            text: `${node.known?.text} / ${node.target?.text}`,
            introItemId: introItem.id
          });
        } else if (allNodesSeenInIntros[key]) {
          duplicates.push({
            type: 'earlier_node',
            original: allNodesSeenInIntros[key],
            duplicate: node,
            text: `${node.known?.text} / ${node.target?.text}`,
            introItemId: introItem.id
          });
        } else {
          allNodesSeenInIntros[key] = node;
        }
      }
    }
  }

  return duplicates;
}

// ============================================================================
// DUPLICATE REMOVAL
// ============================================================================

function removeDuplicateSeeds(manifest, duplicates) {
  const slice = manifest.slices[0];
  const toRemove = new Set(duplicates.map(d => d.duplicate.id));
  slice.seeds = slice.seeds.filter(seed => !toRemove.has(seed.id));
  return toRemove.size;
}

function removeDuplicateIntroItems(manifest, duplicates) {
  const slice = manifest.slices[0];
  const toRemove = new Set(duplicates.map(d => d.duplicate.id));
  for (const seed of slice.seeds) {
    seed.introduction_items = seed.introduction_items.filter(
      item => !toRemove.has(item.id)
    );
  }
  return toRemove.size;
}

function removeDuplicateNodes(manifest, duplicates) {
  const slice = manifest.slices[0];
  const nodesToRemove = new Set(
    duplicates.map(d => `${d.duplicate.known?.text}|${d.duplicate.target?.text}`)
  );
  let removedCount = 0;

  for (const seed of slice.seeds) {
    for (const introItem of seed.introduction_items || []) {
      if (introItem.nodes && introItem.nodes.length > 0) {
        const originalLength = introItem.nodes.length;
        introItem.nodes = introItem.nodes.filter(node => {
          const key = `${node.known?.text}|${node.target?.text}`;
          return !nodesToRemove.has(key);
        });
        removedCount += originalLength - introItem.nodes.length;
      }
    }
  }

  return removedCount;
}

// ============================================================================
// ENCOURAGEMENT REMOVAL
// ============================================================================

/**
 * Remove encouragements from manifest (added back post-generation)
 */
function removeEncouragements(manifest) {
  const slice = manifest.slices[0];
  const removed = { pooled: 0, ordered: 0 };

  if (slice.pooledEncouragements) {
    removed.pooled = slice.pooledEncouragements.length;
    delete slice.pooledEncouragements;
  }

  if (slice.orderedEncouragements) {
    removed.ordered = slice.orderedEncouragements.length;
    delete slice.orderedEncouragements;
  }

  return removed;
}

// ============================================================================
// SAMPLE MANAGEMENT
// ============================================================================

/**
 * Add missing samples to manifest with placeholder metadata
 */
function addMissingSamples(manifest, missingSamples) {
  const slice = manifest.slices[0];
  if (!slice.samples) slice.samples = {};

  const added = { source: 0, target1: 0, target2: 0, presentation: 0 };

  for (const key of missingSamples) {
    const [text, role] = key.split('|');

    if (!slice.samples[text]) slice.samples[text] = [];

    const exists = slice.samples[text].some(s => s.role === role);
    if (!exists) {
      const cadence = (role === 'target1' || role === 'target2') ? 'slow' : 'natural';
      slice.samples[text].push({
        id: '',
        cadence: cadence,
        role: role,
        duration: 0
      });
      added[role] = (added[role] || 0) + 1;
    }
  }

  return added;
}

/**
 * Check if orphaned samples are safely stored in MAR
 */
async function checkOrphanedInMAR(orphanedSamples) {
  const notInMAR = [];
  const textIndex = {};

  console.log('   Building MAR text index...');

  for (const marPath of [MAR_PERMANENT_PATH, MAR_TEMP_PATH]) {
    if (!await fs.pathExists(marPath)) continue;

    const voiceDirs = await fs.readdir(marPath).catch(() => []);
    for (const voiceId of voiceDirs) {
      const samplesFile = path.join(marPath, voiceId, 'samples.json');
      if (!await fs.pathExists(samplesFile)) continue;

      try {
        const marData = await fs.readJson(samplesFile);
        for (const [uuid, sample] of Object.entries(marData.samples || {})) {
          if (sample.text) {
            textIndex[normalizeText(sample.text)] = true;
          }
        }
      } catch (e) {
        console.warn(`   Warning: Could not read ${samplesFile}: ${e.message}`);
      }
    }
  }

  console.log(`   MAR index contains ${Object.keys(textIndex).length} unique texts`);

  for (const key of orphanedSamples) {
    const [text] = key.split('|');
    if (!textIndex[normalizeText(text)]) {
      notInMAR.push(key);
    }
  }

  return notInMAR;
}

/**
 * Remove orphaned samples from manifest
 */
function removeOrphanedSamples(manifest, orphanedSamples) {
  const slice = manifest.slices[0];
  const samples = slice.samples || {};
  const removed = {};

  for (const key of orphanedSamples) {
    const [text, role] = key.split('|');

    if (samples[text]) {
      const originalLength = samples[text].length;
      samples[text] = samples[text].filter(s => s.role !== role);
      const removedCount = originalLength - samples[text].length;
      if (removedCount > 0) {
        removed[role] = (removed[role] || 0) + removedCount;
      }
      if (samples[text].length === 0) {
        delete samples[text];
      }
    }
  }

  return removed;
}

/**
 * Deduplicate samples by normalized text
 * Groups "Hablo" and "hablo." together, keeps only normalized version
 * Preserves samples with IDs (existing audio references)
 */
function deduplicateSamples(manifest) {
  const slice = manifest.slices[0];
  const samples = slice.samples || {};
  const deduplicated = { removed: 0, groups: 0 };

  // Group samples by normalized text
  const groups = {};
  for (const [text, sampleList] of Object.entries(samples)) {
    const normalized = normalizeText(text);
    if (!groups[normalized]) groups[normalized] = [];
    groups[normalized].push({ originalText: text, samples: sampleList });
  }

  // Merge groups, keeping samples with IDs
  const newSamples = {};
  for (const [normalized, variants] of Object.entries(groups)) {
    if (variants.length > 1) {
      deduplicated.groups++;
      deduplicated.removed += variants.length - 1;
    }

    const mergedSamples = {};
    for (const { samples: sampleList } of variants) {
      for (const sample of sampleList) {
        const roleKey = `${sample.role}|${sample.cadence || 'natural'}`;
        if (!mergedSamples[roleKey] || (sample.id && !mergedSamples[roleKey].id)) {
          mergedSamples[roleKey] = sample;
        }
      }
    }

    newSamples[normalized] = Object.values(mergedSamples);
  }

  slice.samples = newSamples;
  return { deduplicated };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const courseCode = args.find(a => !a.startsWith('--'));

  if (!courseCode) {
    console.error('Usage: node scripts/manifest-deduplication.cjs <course_code>');
    console.error('Example: node scripts/manifest-deduplication.cjs spa_for_eng');
    process.exit(1);
  }

  const manifestPath = path.join(VFS_COURSES_PATH, courseCode, 'course_manifest.json');

  console.log('='.repeat(60));
  console.log('Manifest Deduplication (Pre-Generation Cleanup)');
  console.log('='.repeat(60));
  console.log(`\nCourse: ${courseCode}`);
  console.log(`Manifest: ${manifestPath}\n`);

  if (!await fs.pathExists(manifestPath)) {
    console.error(`Error: Manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  const manifest = await fs.readJson(manifestPath);
  let modified = false;

  // Step 1: Remove encouragements
  console.log('Step 1: Removing encouragements...\n');
  const encRemoved = removeEncouragements(manifest);
  if (encRemoved.pooled > 0 || encRemoved.ordered > 0) {
    console.log(`  Removed: ${encRemoved.pooled} pooled, ${encRemoved.ordered} ordered`);
    modified = true;
  } else {
    console.log('  No encouragements found');
  }

  // Step 2: Find and remove duplicates
  console.log('\nStep 2: Finding duplicates...\n');

  const duplicateSeeds = findDuplicateSeeds(manifest);
  const duplicateIntros = findDuplicateIntroItems(manifest);
  const duplicateNodes = findDuplicateNodes(manifest);

  if (duplicateSeeds.length > 0) {
    const removed = removeDuplicateSeeds(manifest, duplicateSeeds);
    console.log(`  Removed ${removed} duplicate seeds`);
    modified = true;
  }
  if (duplicateIntros.length > 0) {
    const removed = removeDuplicateIntroItems(manifest, duplicateIntros);
    console.log(`  Removed ${removed} duplicate intro items`);
    modified = true;
  }
  if (duplicateNodes.length > 0) {
    const removed = removeDuplicateNodes(manifest, duplicateNodes);
    console.log(`  Removed ${removed} duplicate nodes`);
    modified = true;
  }
  if (duplicateSeeds.length === 0 && duplicateIntros.length === 0 && duplicateNodes.length === 0) {
    console.log('  No duplicates found');
  }

  // Step 3: Validate samples
  console.log('\nStep 3: Validating samples...\n');
  const validation = validateCourse(manifest);

  // Step 4: Add missing samples
  if (validation.missing.size > 0) {
    console.log(`\nStep 4: Adding ${validation.missing.size} missing samples...\n`);
    const added = addMissingSamples(manifest, validation.missing);
    for (const [role, count] of Object.entries(added)) {
      if (count > 0) console.log(`  ${role}: ${count}`);
    }
    modified = true;
  }

  // Step 5: Handle orphaned samples
  if (validation.orphaned.size > 0) {
    console.log(`\nStep 5: Checking ${validation.orphaned.size} orphaned samples...\n`);
    const notInMAR = await checkOrphanedInMAR(validation.orphaned);

    if (notInMAR.length > 0) {
      console.log(`\n  WARNING: ${notInMAR.length} orphaned samples NOT in MAR:`);
      for (const key of notInMAR.slice(0, 5)) {
        const [text, role] = key.split('|');
        console.log(`    ${role}: "${text.substring(0, 50)}..."`);
      }
      if (notInMAR.length > 5) console.log(`    ... and ${notInMAR.length - 5} more`);
      console.log('\n  Skipping orphan removal - run audio generation first');
    } else {
      console.log('  All orphaned samples found in MAR - safe to remove');
      const removed = removeOrphanedSamples(manifest, validation.orphaned);
      for (const [role, count] of Object.entries(removed)) {
        if (count > 0) console.log(`  Removed ${role}: ${count}`);
      }
      modified = true;
    }
  }

  // Step 6: Deduplicate samples
  console.log('\nStep 6: Deduplicating samples...\n');
  const { deduplicated } = deduplicateSamples(manifest);
  if (deduplicated.groups > 0) {
    console.log(`  Merged ${deduplicated.groups} text variants (removed ${deduplicated.removed} duplicates)`);
    modified = true;
  } else {
    console.log('  No duplicates found');
  }

  // Save
  if (modified) {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = manifestPath.replace('.json', `_backup_${timestamp}.json`);
    await fs.copy(manifestPath, backupPath);
    console.log(`\nBackup: ${backupPath}`);

    // Save
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    const stats = await fs.stat(manifestPath);
    console.log(`Saved: ${manifestPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.log('\nNo changes needed - manifest is already clean');
  }

  // Summary
  const finalSampleCount = Object.keys(manifest.slices[0].samples || {}).length;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Done! ${finalSampleCount} unique samples ready for audio generation`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
