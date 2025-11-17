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

  // Process encouragements (ignoring as per user request)
  // But still track them
  for (const encouragement of slice.pooledEncouragements || []) {
    if (encouragement.text) {
      expectedSamples.add(`${encouragement.text}|presentation_encouragement`);
      expectedSamples.add(`${encouragement.text}|presentation`);
    }
  }
  for (const encouragement of slice.orderedEncouragements || []) {
    if (encouragement.text) {
      expectedSamples.add(`${encouragement.text}|presentation_encouragement`);
      expectedSamples.add(`${encouragement.text}|presentation`);
    }
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
      slice.samples[text].push({
        id: '',
        cadence: 'natural',
        role: role,
        duration: 0
      });
      added[role] = (added[role] || 0) + 1;
    }
  }

  return added;
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
