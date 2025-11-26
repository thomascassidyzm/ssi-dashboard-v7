#!/usr/bin/env node

/**
 * Validate and Fix Course Manifest Samples
 *
 * Complete validation based on popty-bach's 01_clean_up_course.py
 * Checks for:
 * - Missing samples (source, target1, target2, presentation)
 * - Tagged examples in presentation text (e.g., {target1}'quiero')
 * - Orphaned samples (exist but not referenced)
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Extract tagged examples from presentation/explanation text
 * Pattern: {role}'text' or {role}"text"
 * Handles apostrophes by matching opening and closing quotes
 */
function extractTaggedExamples(text) {
  if (!text) return [];

  // Pattern from Python: r'\{(\w+(?:-\w+)?)\}[\s]*([\'\"])(.*?)\2(?=[\s,.;:!?)]|$)'
  const pattern = /\{(\w+(?:-\w+)?)\}\s*(["'])(.*?)\2(?=[\s,.;:!?)]|$)/g;
  const results = [];

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const tag = match[1];
    const exampleText = match[3];
    results.push({ tag, text: exampleText });
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
  // Default for unknown/combined tags
  return 'target1';
}

/**
 * Validate course and find missing/orphaned samples
 */
function validateCourse(manifest) {
  const expectedSamples = new Set(); // Set of "text|role"
  const actualSamples = new Set();
  const slice = manifest.slices[0];
  const samples = slice.samples || {};

  console.log('📋 Validating course structure...\n');

  // Collect actual samples
  for (const [text, sampleList] of Object.entries(samples)) {
    for (const sample of sampleList) {
      const role = sample.role;
      if (role) {
        actualSamples.add(`${text}|${role}`);
      }
    }
  }

  console.log(`Found ${actualSamples.size} actual samples in manifest`);

  // Skip encouragements - they will be added later in Phase 8 before S3 check
  // This prevents generating TTS for them during audio generation

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

      if (knownText) {
        expectedSamples.add(`${knownText}|source`);
      }
      if (targetText) {
        expectedSamples.add(`${targetText}|target1`);
        expectedSamples.add(`${targetText}|target2`);
      }
    }

    // Introduction items
    for (const introItem of seed.introduction_items || []) {
      introItemCount++;

      // Introduction item node
      if (introItem.node) {
        const knownText = introItem.node.known?.text;
        const targetText = introItem.node.target?.text;

        if (knownText) {
          expectedSamples.add(`${knownText}|source`);
        }
        if (targetText) {
          expectedSamples.add(`${targetText}|target1`);
          expectedSamples.add(`${targetText}|target2`);
        }
      }

      // Presentation text
      if (introItem.presentation) {
        expectedSamples.add(`${introItem.presentation}|presentation`);

        // Extract tagged examples from presentation
        const examples = extractTaggedExamples(introItem.presentation);
        for (const { tag, text } of examples) {
          const role = tagToRole(tag);
          expectedSamples.add(`${text}|${role}`);
          taggedExampleCount++;
        }
      }

      // Nodes array
      for (const node of introItem.nodes || []) {
        nodesCount++;

        const knownText = node.known?.text;
        const targetText = node.target?.text;

        if (knownText) {
          expectedSamples.add(`${knownText}|source`);
        }
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
  console.log(`  Tagged examples in presentations: ${taggedExampleCount}`);
  console.log(`\nExpected samples: ${expectedSamples.size}`);

  // Find missing and orphaned
  const missing = new Set();
  const orphaned = new Set();

  for (const expected of expectedSamples) {
    if (!actualSamples.has(expected)) {
      missing.add(expected);
    }
  }

  for (const actual of actualSamples) {
    if (!expectedSamples.has(actual)) {
      orphaned.add(actual);
    }
  }

  return {
    expectedSamples,
    actualSamples,
    missing,
    orphaned,
    stats: {
      seedCount,
      introItemCount,
      nodesCount,
      taggedExampleCount
    }
  };
}

/**
 * Add missing samples to manifest
 */
function addMissingSamples(manifest, missingSamples) {
  const slice = manifest.slices[0];
  if (!slice.samples) {
    slice.samples = {};
  }

  const added = {
    source: 0,
    target1: 0,
    target2: 0,
    presentation: 0,
    presentation_encouragement: 0
  };

  for (const key of missingSamples) {
    const [text, role] = key.split('|');

    if (!slice.samples[text]) {
      slice.samples[text] = [];
    }

    // Check if already exists (shouldn't, but safety check)
    const exists = slice.samples[text].some(s => s.role === role);
    if (!exists) {
      // Use "slow" cadence for target1 and target2, "natural" for others
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
 * Normalize text for deduplication (match MAR normalization)
 */
function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\.+$/, '');
}

/**
 * Deduplicate samples by normalized text
 * Groups "Hablo" and "hablo" together, keeps only normalized version
 */
function deduplicateSamples(manifest) {
  const slice = manifest.slices[0];
  const samples = slice.samples || {};

  // Track what we're deduplicating
  const deduplicated = {
    removed: 0,
    groups: 0
  };

  // Group samples by normalized text
  const groups = {};
  for (const [text, sampleList] of Object.entries(samples)) {
    const normalized = normalizeText(text);

    if (!groups[normalized]) {
      groups[normalized] = [];
    }
    groups[normalized].push({ originalText: text, samples: sampleList });
  }

  // For each group, keep only the normalized version
  const newSamples = {};
  for (const [normalized, variants] of Object.entries(groups)) {
    if (variants.length > 1) {
      deduplicated.groups++;
      deduplicated.removed += variants.length - 1;
    }

    // Merge all samples from variants into normalized key
    const mergedSamples = [];
    const seenRoles = new Set();

    for (const { originalText, samples: sampleList } of variants) {
      for (const sample of sampleList) {
        const roleKey = `${sample.role}|${sample.cadence || 'natural'}`;
        if (!seenRoles.has(roleKey)) {
          mergedSamples.push(sample);
          seenRoles.add(roleKey);
        }
      }
    }

    newSamples[normalized] = mergedSamples;
  }

  // Replace samples with deduplicated version
  slice.samples = newSamples;

  return { deduplicated };
}

/**
 * Check for duplicate seeds (by canonical or known/target text)
 */
function findDuplicateSeeds(manifest) {
  const slice = manifest.slices[0];
  const seeds = slice.seeds || [];

  const duplicates = [];
  const seedsByCanonical = {};
  const seedsByText = {};

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const canonical = seed.seed_sentence?.canonical;
    const knownText = seed.node?.known?.text;
    const targetText = seed.node?.target?.text;

    // Check canonical duplicates
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

    // Check known/target duplicates
    if (knownText && targetText) {
      const textKey = `${knownText}|${targetText}`;
      if (seedsByText[textKey]) {
        // Only report if not already reported as canonical duplicate
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
  const seeds = slice.seeds || [];

  const duplicates = [];
  const introsByText = {};

  for (const seed of seeds) {
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
  const seeds = slice.seeds || [];

  const duplicates = [];
  const seedNodes = {};
  const introNodes = {};
  const allNodesSeenInIntros = {};

  // First pass: collect all seed nodes and intro item nodes
  for (const seed of seeds) {
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

  // Second pass: check nodes within intro items
  for (const seed of seeds) {
    for (const introItem of seed.introduction_items || []) {
      for (const node of introItem.nodes || []) {
        const key = `${node.known?.text}|${node.target?.text}`;

        // Check if node duplicates a seed node
        if (seedNodes[key]) {
          duplicates.push({
            type: 'seed_node',
            original: seedNodes[key],
            duplicate: node,
            text: `${node.known?.text} / ${node.target?.text}`,
            introItemId: introItem.id
          });
        }
        // Check if node duplicates an intro item node
        else if (introNodes[key]) {
          duplicates.push({
            type: 'intro_node',
            original: introNodes[key],
            duplicate: node,
            text: `${node.known?.text} / ${node.target?.text}`,
            introItemId: introItem.id
          });
        }
        // Check if node duplicates earlier node
        else if (allNodesSeenInIntros[key]) {
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

/**
 * Remove duplicate seeds from manifest
 */
function removeDuplicateSeeds(manifest, duplicateSeeds) {
  const slice = manifest.slices[0];
  const seedsToRemove = new Set();

  // Collect IDs of seeds to remove (the duplicates, not originals)
  for (const dup of duplicateSeeds) {
    seedsToRemove.add(dup.duplicate.id);
  }

  // Remove duplicate seeds
  slice.seeds = slice.seeds.filter(seed => !seedsToRemove.has(seed.id));

  return seedsToRemove.size;
}

/**
 * Remove duplicate introduction items from manifest
 */
function removeDuplicateIntroItems(manifest, duplicateIntros) {
  const slice = manifest.slices[0];
  const introsToRemove = new Set();

  // Collect IDs of intro items to remove
  for (const dup of duplicateIntros) {
    introsToRemove.add(dup.duplicate.id);
  }

  // Remove duplicate intro items
  for (const seed of slice.seeds) {
    seed.introduction_items = seed.introduction_items.filter(
      item => !introsToRemove.has(item.id)
    );
  }

  return introsToRemove.size;
}

/**
 * Remove duplicate nodes from intro items
 */
function removeDuplicateNodes(manifest, duplicateNodes) {
  const slice = manifest.slices[0];
  const nodesToRemove = new Set();

  // Collect node keys to remove
  for (const dup of duplicateNodes) {
    const key = `${dup.duplicate.known?.text}|${dup.duplicate.target?.text}`;
    nodesToRemove.add(key);
  }

  let removedCount = 0;

  // Remove duplicate nodes from intro items
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

/**
 * Remove orphaned samples
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

      // Remove empty text entries
      if (samples[text].length === 0) {
        delete samples[text];
      }
    }
  }

  return removed;
}

async function main() {
  const manifestPath = process.argv[2] || '/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/public/vfs/courses/spa_for_eng/course_manifest.json';

  console.log('🔍 Course Manifest Validation\n');
  console.log(`📖 Reading: ${manifestPath}\n`);

  const manifest = await fs.readJson(manifestPath);

  // Check for duplicates first
  console.log('🔍 Checking for duplicates...\n');

  const duplicateSeeds = findDuplicateSeeds(manifest);
  const duplicateIntros = findDuplicateIntroItems(manifest);
  const duplicateNodes = findDuplicateNodes(manifest);

  if (duplicateSeeds.length > 0) {
    console.log(`\n⚠️  Found ${duplicateSeeds.length} duplicate seeds:\n`);
    for (const dup of duplicateSeeds.slice(0, 5)) {
      console.log(`  ${dup.type === 'canonical' ? 'Canonical' : 'Text'}: "${dup.text}"`);
      console.log(`    Original: ${dup.original.id}`);
      console.log(`    Duplicate: ${dup.duplicate.id}`);
    }
    if (duplicateSeeds.length > 5) {
      console.log(`  ... and ${duplicateSeeds.length - 5} more`);
    }
  }

  if (duplicateIntros.length > 0) {
    console.log(`\n⚠️  Found ${duplicateIntros.length} duplicate introduction items:\n`);
    for (const dup of duplicateIntros.slice(0, 5)) {
      console.log(`  Text: "${dup.text}"`);
      console.log(`    Original: ${dup.original.id}`);
      console.log(`    Duplicate: ${dup.duplicate.id} (in seed ${dup.seedId})`);
    }
    if (duplicateIntros.length > 5) {
      console.log(`  ... and ${duplicateIntros.length - 5} more`);
    }
  }

  if (duplicateNodes.length > 0) {
    console.log(`\n⚠️  Found ${duplicateNodes.length} duplicate nodes in intro items:\n`);
    for (const dup of duplicateNodes.slice(0, 5)) {
      console.log(`  Text: "${dup.text}" (intro ${dup.introItemId})`);
      console.log(`    Duplicates a ${dup.type.replace('_', ' ')}`);
    }
    if (duplicateNodes.length > 5) {
      console.log(`  ... and ${duplicateNodes.length - 5} more`);
    }
  }

  if (duplicateSeeds.length === 0 && duplicateIntros.length === 0 && duplicateNodes.length === 0) {
    console.log('✅ No duplicates found!');
  } else {
    // Create backup before deduplication
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + new Date().toTimeString().split(' ')[0].replace(/:/g, '');
    const backupPath = manifestPath.replace('.json', `_backup_${timestamp}.json`);

    console.log(`\n📦 Creating backup: ${backupPath}`);
    await fs.copy(manifestPath, backupPath);

    // Auto-remove duplicates
    console.log('\n🔧 Auto-removing duplicates...\n');
    let modified = false;

    if (duplicateSeeds.length > 0) {
      const removed = removeDuplicateSeeds(manifest, duplicateSeeds);
      console.log(`✅ Removed ${removed} duplicate seeds`);
      modified = true;
    }

    if (duplicateIntros.length > 0) {
      const removed = removeDuplicateIntroItems(manifest, duplicateIntros);
      console.log(`✅ Removed ${removed} duplicate introduction items`);
      modified = true;
    }

    if (duplicateNodes.length > 0) {
      const removed = removeDuplicateNodes(manifest, duplicateNodes);
      console.log(`✅ Removed ${removed} duplicate nodes`);
      modified = true;
    }

    if (modified) {
      // Save deduplicated manifest
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
      console.log(`\n💾 Saved deduplicated manifest`);
    }
  }

  // Validate
  const validation = validateCourse(manifest);

  // Report missing
  if (validation.missing.size > 0) {
    console.log(`\n❌ Missing ${validation.missing.size} samples:\n`);

    const byRole = {};
    for (const key of validation.missing) {
      const [text, role] = key.split('|');
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(text);
    }

    for (const [role, texts] of Object.entries(byRole)) {
      console.log(`  ${role}: ${texts.length} samples`);
      if (texts.length <= 5) {
        for (const text of texts) {
          console.log(`    - "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
        }
      }
    }
  } else {
    console.log('\n✅ No missing samples found!');
  }

  // Report orphaned
  if (validation.orphaned.size > 0) {
    console.log(`\n⚠️  Orphaned ${validation.orphaned.size} samples (exist but not referenced):\n`);

    const byRole = {};
    for (const key of validation.orphaned) {
      const [text, role] = key.split('|');
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(text);
    }

    for (const [role, texts] of Object.entries(byRole)) {
      console.log(`  ${role}: ${texts.length} samples`);
      if (texts.length <= 5) {
        for (const text of texts) {
          console.log(`    - "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
        }
      }
    }
  } else {
    console.log('\n✅ No orphaned samples found!');
  }

  // Fix if requested
  if (validation.missing.size > 0 || validation.orphaned.size > 0) {
    console.log('\n🔧 Fixes available:');
    if (validation.missing.size > 0) {
      console.log(`   - Add ${validation.missing.size} missing samples`);
    }
    if (validation.orphaned.size > 0) {
      console.log(`   - Remove ${validation.orphaned.size} orphaned samples`);
    }

    // Auto-fix for now
    let modified = false;

    if (validation.missing.size > 0) {
      const added = addMissingSamples(manifest, validation.missing);
      console.log('\n✅ Added missing samples:');
      for (const [role, count] of Object.entries(added)) {
        if (count > 0) {
          console.log(`   ${role}: ${count}`);
        }
      }
      modified = true;
    }

    if (validation.orphaned.size > 0) {
      const removed = removeOrphanedSamples(manifest, validation.orphaned);
      console.log('\n✅ Removed orphaned samples:');
      for (const [role, count] of Object.entries(removed)) {
        if (count > 0) {
          console.log(`   ${role}: ${count}`);
        }
      }
      modified = true;
    }

    if (modified) {
      // Deduplicate samples before saving
      console.log('\n🔄 Deduplicating samples...');
      const { deduplicated } = deduplicateSamples(manifest);

      if (deduplicated.groups > 0) {
        console.log(`✅ Deduplicated ${deduplicated.groups} groups (removed ${deduplicated.removed} duplicate entries)`);
      } else {
        console.log('✅ No duplicates found');
      }

      console.log(`\n💾 Writing: ${manifestPath}`);
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });

      const stats = await fs.stat(manifestPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`✅ Done! Updated manifest: ${sizeMB} MB\n`);
    }
  } else {
    console.log('\n✨ Manifest is perfect! No changes needed.\n');
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
